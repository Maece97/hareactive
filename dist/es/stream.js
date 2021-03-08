import { Reactive } from "./common";
import { cons, Node, DoubleLinkedList } from "./datastructures";
import { fromFunction, accumFrom, at, stepper, stepperFrom, accum } from "./behavior";
import { tick } from "./clock";
import { sample } from "./now";
/**
 * A stream is a list of occurrences over time. Each occurrence
 * happens at a point in time and has an associated value.
 */
export class Stream extends Reactive {
    constructor() {
        super();
        this.children = new DoubleLinkedList();
    }
    combine(stream) {
        return new CombineStream(stream, this);
    }
    map(f) {
        return new MapStream(this, f);
    }
    mapTo(b) {
        return new MapToStream(this, b);
    }
    filter(fn) {
        return new FilterStream(this, fn);
    }
    scan(fn, startingValue) {
        return scan(fn, startingValue, this);
    }
    scanFrom(fn, startingValue) {
        return fromFunction((t) => new ScanStream(fn, startingValue, this, t));
    }
    accum(fn, init) {
        return accum(fn, init, this);
    }
    accumFrom(fn, init) {
        return accumFrom(fn, init, this);
    }
    log(prefix) {
        this.subscribe((a) => prefix !== undefined ? console.log(prefix, a) : console.log(a));
        return this;
    }
    pushSToChildren(t, value) {
        for (const child of this.children) {
            child.pushS(t, value);
        }
    }
}
export class MapStream extends Stream {
    constructor(parent, f) {
        super();
        this.parent = parent;
        this.f = f;
        this.parents = cons(parent);
    }
    pushS(t, v) {
        this.pushSToChildren(t, this.f(v));
    }
}
export class MapToStream extends Stream {
    constructor(parent, b) {
        super();
        this.parent = parent;
        this.b = b;
        this.parents = cons(parent);
    }
    pushS(t, _v) {
        this.pushSToChildren(t, this.b);
    }
}
export class FilterStream extends Stream {
    constructor(parent, fn) {
        super();
        this.parent = parent;
        this.fn = fn;
        this.parents = cons(parent);
    }
    pushS(t, v) {
        if (this.fn(v) === true) {
            this.pushSToChildren(t, v);
        }
    }
}
export function apply(behavior, stream) {
    // FIXME: The implementation here should propagate clock
    return stream.map((a) => behavior.at()(a));
}
/**
 * @param predicate A predicate function that returns a boolean for `A`.
 * @param s The stream to filter.
 * @returns Stream that only contains the occurrences from `stream`
 * for which `fn` returns true.
 */
export function filter(predicate, s) {
    return s.filter(predicate);
}
export function split(predicate, stream) {
    // It should be possible to implement this in a faster way where
    // `predicate` is only called once for each occurrence
    return [stream.filter(predicate), stream.filter((a) => !predicate(a))];
}
export function filterApply(predicate, stream) {
    // FIXME: The implementation here should propagate clock
    return stream.filter((a) => predicate.at()(a));
}
export function keepWhen(stream, behavior) {
    // FIXME: The implementation here should propagate clock
    return stream.filter((_) => behavior.at());
}
/** For stateful streams that are always active */
export class ActiveStream extends Stream {
    activate() { }
    deactivate() { }
}
class EmptyStream extends ActiveStream {
    constructor() {
        super();
    }
    /* istanbul ignore next */
    pushS() {
        throw new Error("You cannot push to an empty stream");
    }
}
export const empty = new EmptyStream();
export class ScanStream extends ActiveStream {
    constructor(f, last, parent, t) {
        super();
        this.f = f;
        this.last = last;
        this.parent = parent;
        this.t = t;
        this.node = new Node(this);
        this.parents = cons(parent);
        parent.addListener(this.node, t);
    }
    pushS(t, a) {
        this.last = this.f(a, this.last);
        this.pushSToChildren(t, this.last);
    }
}
/**
 * For each occurrence on `stream` the function `f` is applied to its value. As
 * its second argument `f` initially receives `initial` and afterwards its own
 * previous return value. The returned stream has an occurrence with the result
 * of each call to `f`.
 */
export function scanFrom(f, initial, stream) {
    return stream.scanFrom(f, initial);
}
export function scan(f, initial, source) {
    return sample(scanFrom(f, initial, source));
}
class ShiftBehaviorStream extends Stream {
    constructor(b) {
        super();
        this.b = b;
        this.bNode = new Node(this);
        this.sNode = new Node(this);
    }
    activate(t) {
        this.b.addListener(this.bNode, t);
        if (this.b.state !== 3 /* Inactive */) {
            this.currentSource = this.b.last;
            this.currentSource.addListener(this.sNode, t);
        }
    }
    deactivate() {
        this.b.removeListener(this.bNode);
        this.currentSource.removeListener(this.sNode);
    }
    pushB(t) {
        const newStream = this.b.last;
        if (this.currentSource !== undefined) {
            this.currentSource.removeListener(this.sNode);
        }
        newStream.addListener(this.sNode, t);
        this.currentSource = newStream;
    }
    pushS(t, a) {
        this.pushSToChildren(t, a);
    }
}
/**
 * Takes a behavior of a stream and returns a stream that emits from the last
 * stream.
 */
export function shiftCurrent(b) {
    return new ShiftBehaviorStream(b);
}
/**
 * Takes a stream of a stream and returns a stream that emits from the last
 * stream.
 */
export function shift(s) {
    return stepper(empty, s).map(shiftCurrent);
}
/**
 * Takes a stream of a stream and returns a stream that emits from the last
 * stream.
 */
export function shiftFrom(s) {
    return stepperFrom(empty, s).map(shiftCurrent);
}
class ChangesStream extends Stream {
    constructor(parent, comparator) {
        super();
        this.parent = parent;
        this.comparator = comparator;
        this.parents = cons(parent);
        this.initialized = false;
    }
    activate(t) {
        super.activate(t);
        // The parent may be an unreplaced placeholder and in that case
        // we can't read its current value.
        if (this.parent.state === 1 /* Push */) {
            this.last = this.parent.last;
            this.initialized = true;
        }
    }
    pushB(t) {
        if (!this.initialized) {
            this.initialized = true;
            this.last = this.parent.last;
        }
        else if (!this.comparator(this.last, this.parent.last)) {
            this.pushSToChildren(t, this.parent.last);
            this.last = this.parent.last;
        }
    }
    pushS(_t, _a) { }
}
export function changes(b, comparator = (v, u) => v === u) {
    if (b.state === 2 /* Pull */) {
        throw new Error("You invoked changes on a pull behavior which is not supported.");
    }
    return new ChangesStream(b, comparator);
}
export class CombineStream extends Stream {
    constructor(s1, s2) {
        super();
        this.s1 = s1;
        this.s2 = s2;
        this.parents = cons(s1, cons(s2));
    }
    pushS(t, a) {
        this.pushSToChildren(t, a);
    }
}
export class ProducerStream extends Stream {
    constructor() {
        super();
        this.state = 1 /* Push */;
    }
    pushS(t = tick(), a) {
        this.pushSToChildren(t, a);
    }
}
class ProducerStreamFromFunction extends ProducerStream {
    constructor(activateFn) {
        super();
        this.activateFn = activateFn;
    }
    publish(a, t = tick()) {
        this.pushS(t, a);
    }
    activate() {
        this.state = 1 /* Push */;
        this.deactivateFn = this.activateFn(this.publish.bind(this));
    }
    deactivate() {
        this.state = 3 /* Inactive */;
        this.deactivateFn();
    }
}
export function producerStream(activate) {
    return new ProducerStreamFromFunction(activate);
}
export class SinkStream extends ProducerStream {
    constructor() {
        super();
        this.pushing = false;
    }
    pushS(t, a) {
        if (this.pushing === true) {
            this.pushSToChildren(t, a);
        }
    }
    push(a) {
        const t = tick();
        this.pushSToChildren(t, a);
    }
    activate() {
        this.pushing = true;
    }
    deactivate() {
        this.pushing = false;
    }
}
export function sinkStream() {
    return new SinkStream();
}
export function subscribe(fn, stream) {
    stream.subscribe(fn);
}
export class SnapshotStream extends Stream {
    constructor(target, trigger) {
        super();
        this.target = target;
        this.trigger = trigger;
        this.node = new Node(this);
        this.parents = cons(trigger);
    }
    pushS(t) {
        const b = this.target.at(t);
        this.pushSToChildren(t, b);
    }
    activate(t) {
        this.trigger.addListener(this.node, t);
    }
    deactivate() {
        this.trigger.removeListener(this.node);
    }
}
export function snapshot(target, trigger) {
    return new SnapshotStream(target, trigger);
}
class SnapshotWithStream extends Stream {
    constructor(fn, target, trigger) {
        super();
        this.fn = fn;
        this.target = target;
        this.trigger = trigger;
        this.node = new Node(this);
    }
    pushS(t, a) {
        const c = this.fn(a, this.target.at(t));
        this.pushSToChildren(t, c);
    }
    activate(t) {
        this.trigger.addListener(this.node, t);
    }
    deactivate() {
        this.trigger.removeListener(this.node);
    }
}
export function snapshotWith(f, target, trigger) {
    return new SnapshotWithStream(f, target, trigger);
}
export class SelfieStream extends Stream {
    constructor(parent) {
        super();
        this.parents = cons(parent);
    }
    pushS(t, target) {
        this.pushSToChildren(t, at(target, t));
    }
}
/**
 * On each occurrence the behavior is sampled at the time of the occurrence.
 */
export function selfie(stream) {
    return new SelfieStream(stream);
}
export function isStream(s) {
    return typeof s === "object" && "scanFrom" in s;
}
class PerformCbStream extends ActiveStream {
    constructor(cb, stream) {
        super();
        this.cb = cb;
        this.node = new Node(this);
        this.doneCb = (result) => this.pushSToChildren(tick(), result);
        stream.addListener(this.node, tick());
    }
    pushS(_, value) {
        this.cb(value, this.doneCb);
    }
}
/**
 * Invokes the callback for each occurrence on the given stream.
 *
 * This function is intended to be a low-level function used as the
 * basis for other operators.
 */
export function mapCbStream(cb, stream) {
    return new PerformCbStream(cb, stream);
}
export class FlatFutures extends Stream {
    constructor(stream) {
        super();
        this.parents = cons(stream);
    }
    pushS(_t, fut) {
        fut.subscribe((a) => this.pushSToChildren(tick(), a));
    }
}
export class FlatFuturesOrdered extends Stream {
    constructor(stream) {
        super();
        this.nextId = 0;
        this.next = 0;
        this.buffer = []; // Object-wrapper to support a result as undefined
        this.parents = cons(stream);
    }
    pushS(_t, fut) {
        const id = this.nextId++;
        fut.subscribe((a) => {
            if (id === this.next) {
                this.buffer[0] = { value: a };
                this.pushFromBuffer();
            }
            else {
                this.buffer[id - this.next] = { value: a };
            }
        });
    }
    pushFromBuffer() {
        while (this.buffer[0] !== undefined) {
            const t = tick();
            const { value } = this.buffer.shift();
            this.pushSToChildren(t, value);
            this.next++;
        }
    }
}
export class FlatFuturesLatest extends Stream {
    constructor(stream) {
        super();
        this.next = 0;
        this.newest = 0;
        this.running = 0;
        this.parents = cons(stream);
    }
    pushS(_t, fut) {
        const time = ++this.next;
        this.running++;
        fut.subscribe((a) => {
            this.running--;
            if (time > this.newest) {
                const t = tick();
                if (this.running === 0) {
                    this.next = 0;
                    this.newest = 0;
                }
                else {
                    this.newest = time;
                }
                this.pushSToChildren(t, a);
            }
        });
    }
}
