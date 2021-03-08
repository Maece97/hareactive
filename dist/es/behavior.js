import { cons, DoubleLinkedList, Node, fromArray, nil } from "./datastructures";
import { combine, isPlaceholder } from "./index";
import { Reactive } from "./common";
import { Future, BehaviorFuture } from "./future";
import * as F from "./future";
import { FlatFuturesOrdered, FlatFuturesLatest, FlatFutures } from "./stream";
import { tick, getTime } from "./clock";
import { sample } from "./now";
/**
 * A behavior is a value that changes over time. Conceptually it can
 * be thought of as a function from time to a value. I.e. `type
 * Behavior<A> = (t: Time) => A`.
 */
export class Behavior extends Reactive {
    constructor() {
        super();
        this.children = new DoubleLinkedList();
        this.multi = true;
    }
    static is(a) {
        return isBehavior(a);
    }
    map(fn) {
        return new MapBehavior(this, fn);
    }
    mapTo(v) {
        return new ConstantBehavior(v);
    }
    static of(v) {
        return new ConstantBehavior(v);
    }
    of(v) {
        return new ConstantBehavior(v);
    }
    ap(f) {
        return new ApBehavior(f, this);
    }
    lift(f, ...args) {
        return new LiftBehavior(f, args);
    }
    flatMap(fn) {
        return new FlatMapBehavior(this, fn);
    }
    chain(fn) {
        return new FlatMapBehavior(this, fn);
    }
    flat() {
        return new FlatMapBehavior(this, (a) => a);
    }
    at(t) {
        if (this.state !== 1 /* Push */) {
            const time = t === undefined ? tick() : t;
            this.pull(time);
        }
        return this.last;
    }
    pushB(t) {
        if (this.state !== 3 /* Inactive */ && this.pulledAt !== t) {
            this.pull(t);
            if (this.changedAt === t && this.state === 1 /* Push */) {
                pushToChildren(t, this);
            }
        }
    }
    pull(t) {
        if (this.pulledAt === undefined || this.pulledAt < t) {
            this.pulledAt = t;
            let shouldRefresh = this.changedAt === undefined;
            for (const parent of this.parents) {
                if (isBehavior(parent)) {
                    parent.pull(t);
                    shouldRefresh = shouldRefresh || this.changedAt < parent.changedAt;
                }
            }
            if (shouldRefresh) {
                refresh(this, t);
            }
        }
    }
    activate(t) {
        super.activate(t);
        if (this.state === 1 /* Push */) {
            refresh(this, t);
        }
    }
    log(prefix, ms = 100) {
        this.observe((a) => (prefix !== undefined ? console.log(prefix, a) : console.log(a)), (pull) => {
            let stop = false;
            (function repeat() {
                if (!stop) {
                    pull();
                    setTimeout(repeat, ms);
                }
            })();
            return () => {
                stop = true;
            };
        });
        return this;
    }
}
Behavior.multi = true;
export function pushToChildren(t, b) {
    for (const child of b.children) {
        child.pushB(t);
    }
}
function refresh(b, t) {
    const newValue = b.update(t);
    if (newValue === b.last) {
        return;
    }
    b.changedAt = t;
    b.last = newValue;
}
export function isBehavior(b) {
    return ((typeof b === "object" && "at" in b && !isPlaceholder(b)) ||
        (isPlaceholder(b) && (b.source === undefined || isBehavior(b.source))));
}
export class ProducerBehavior extends Behavior {
    newValue(a) {
        if (a === this.last) {
            return;
        }
        const t = tick();
        this.last = a;
        this.changedAt = t;
        if (this.state === 1 /* Push */) {
            this.pulledAt = t;
            pushToChildren(t, this);
        }
    }
    pull(t) {
        refresh(this, t);
    }
    activate(t) {
        if (this.state === 3 /* Inactive */) {
            this.activateProducer();
        }
        this.state = 1 /* Push */;
        this.changedAt = t;
    }
    deactivate() {
        this.state = 3 /* Inactive */;
        this.deactivateProducer();
    }
}
class ProducerBehaviorFromFunction extends ProducerBehavior {
    constructor(activateFn, update) {
        super();
        this.activateFn = activateFn;
        this.update = update;
    }
    activateProducer() {
        this.state = 1 /* Push */;
        this.deactivateFn = this.activateFn(this.newValue.bind(this));
    }
    deactivateProducer() {
        this.state = 3 /* Inactive */;
        this.deactivateFn();
    }
}
export function producerBehavior(activate, getValue) {
    return new ProducerBehaviorFromFunction(activate, getValue);
}
export class SinkBehavior extends ProducerBehavior {
    constructor(last) {
        super();
        this.last = last;
    }
    push(a) {
        if (this.last !== a) {
            const t = tick();
            this.last = a;
            this.changedAt = t;
            this.pulledAt = t;
            pushToChildren(t, this);
        }
    }
    update() {
        return this.last;
    }
    activateProducer() { }
    deactivateProducer() { }
}
/**
 * Creates a behavior for imperative pushing.
 */
export function sinkBehavior(initial) {
    return new SinkBehavior(initial);
}
/**
 * Impure function that gets the current value of a behavior. For a
 * pure variant see `sample`.
 */
export function at(b, t) {
    return b.at(t);
}
export class MapBehavior extends Behavior {
    constructor(parent, f) {
        super();
        this.parent = parent;
        this.f = f;
        this.parents = cons(parent);
    }
    update(_t) {
        return this.f(this.parent.last);
    }
}
class ApBehavior extends Behavior {
    constructor(fn, val) {
        super();
        this.fn = fn;
        this.val = val;
        this.parents = cons(fn, cons(val));
    }
    update(_t) {
        return this.fn.last(this.val.last);
    }
}
/**
 * Apply a function valued behavior to a value behavior.
 *
 * @param fnB behavior of functions from `A` to `B`
 * @param valB A behavior of `A`
 * @returns Behavior of the function in `fnB` applied to the value in `valB`
 */
export function ap(fnB, valB) {
    return valB.ap(fnB);
}
export class LiftBehavior extends Behavior {
    constructor(f, bs) {
        super();
        this.f = f;
        this.bs = bs;
        this.parents = fromArray(bs);
    }
    update(_t) {
        return this.f(...this.bs.map((b) => b.last));
    }
    changeStateDown(_) {
        let state = 0 /* Done */;
        for (const p of this.parents) {
            state = Math.max(state, p.state);
        }
        if (this.state !== state) {
            this.state = state;
            for (const child of this.children) {
                child.changeStateDown(state);
            }
        }
    }
}
class FlatMapBehavior extends Behavior {
    constructor(outer, fn) {
        super();
        this.outer = outer;
        this.fn = fn;
        this.innerNode = new Node(this);
        this.parents = cons(this.outer);
    }
    update(t) {
        const outerChanged = this.outer.changedAt > this.changedAt;
        if (outerChanged || this.changedAt === undefined) {
            if (this.innerB !== undefined) {
                this.innerB.removeListener(this.innerNode);
            }
            this.innerB = this.fn(this.outer.last);
            this.innerB.addListener(this.innerNode, t);
            if (this.state !== this.innerB.state) {
                this.changeStateDown(this.innerB.state);
            }
            this.parents = cons(this.outer, cons(this.innerB));
            if (this.innerB.state !== 1 /* Push */) {
                this.innerB.pull(t);
            }
        }
        return this.innerB.last;
    }
}
/** @private */
class WhenBehavior extends Behavior {
    constructor(parent) {
        super();
        this.parent = parent;
        this.parents = cons(parent);
    }
    update(_t) {
        return this.parent.last === true
            ? Future.of({})
            : new BehaviorFuture(this.parent);
    }
}
export function whenFrom(b) {
    return new WhenBehavior(b);
}
export function when(b) {
    return sample(whenFrom(b));
}
class SnapshotBehavior extends Behavior {
    constructor(parent, future) {
        super();
        this.parent = parent;
        this.future = future;
        this.node = new Node(this);
        if (future.state === 0 /* Done */) {
            // Future has occurred at some point in the past
            this.state = parent.state;
            this.parents = cons(parent);
            this.last = Future.of(at(parent));
        }
        else {
            this.state = 1 /* Push */;
            this.parents = nil;
            this.last = F.sinkFuture();
            future.addListener(this.node, tick());
        }
    }
    pushS(t, _val) {
        this.last.resolve(this.parent.at(t), t);
        this.parents = cons(this.parent);
        this.changeStateDown(this.state);
        this.parent.addListener(this.node, t);
    }
    update(t) {
        if (this.future.state === 0 /* Done */) {
            return Future.of(this.parent.at(t));
        }
        else {
            return this.last;
        }
    }
}
export function snapshotAt(b, f) {
    return new SnapshotBehavior(b, f);
}
/** Behaviors that are always active */
export class ActiveBehavior extends Behavior {
    // noop methods, behavior is always active
    activate() { }
    deactivate() { }
}
export class ConstantBehavior extends ActiveBehavior {
    constructor(last) {
        super();
        this.last = last;
        this.state = 1 /* Push */;
        this.changedAt = getTime();
        this.parents = nil;
    }
    update(_t) {
        return this.last;
    }
}
/** @private */
export class FunctionBehavior extends ActiveBehavior {
    constructor(f) {
        super();
        this.f = f;
        this.state = 2 /* Pull */;
        this.parents = nil;
    }
    pull(t) {
        if (this.pulledAt === t) {
            return;
        }
        this.pulledAt = t;
        refresh(this, t);
    }
    update(t) {
        return this.f(t);
    }
}
export function fromFunction(f) {
    return new FunctionBehavior(f);
}
/** @private */
class SwitcherBehavior extends ActiveBehavior {
    constructor(b, next, t) {
        super();
        this.b = b;
        this.bNode = new Node(this);
        this.nNode = new Node(this);
        this.parents = cons(b);
        b.addListener(this.bNode, t);
        this.state = b.state;
        this.last = b.last;
        next.addListener(this.nNode, t);
    }
    update(_t) {
        return this.b.last;
    }
    pushS(t, value) {
        this.doSwitch(t, value);
    }
    doSwitch(t, newB) {
        this.b.removeListener(this.bNode);
        this.b = newB;
        this.parents = cons(newB);
        newB.addListener(this.bNode, t);
        this.changeStateDown(newB.state);
        refresh(this, t);
        if (this.changedAt === t && this.state === 1 /* Push */) {
            pushToChildren(t, this);
        }
    }
    changeStateDown(_) {
        super.changeStateDown(this.b.state);
    }
}
/**
 * From an initial value and a future value, `stepTo` creates a new behavior
 * that has the initial value until `next` occurs, after which it has the value
 * of the future.
 */
export function stepTo(init, next) {
    return new SwitcherBehavior(Behavior.of(init), next.map(Behavior.of), tick());
}
/**
 * From an initial behavior and a future of a behavior, `switcher`
 * creates a new behavior that acts exactly like `initial` until
 * `next` occurs, after which it acts like the behavior it contains.
 */
export function switchTo(init, next) {
    return new SwitcherBehavior(init, next, tick());
}
export function switcherFrom(init, stream) {
    return fromFunction((t) => new SwitcherBehavior(init, stream, t));
}
export function switcher(init, stream) {
    return sample(switcherFrom(init, stream));
}
export function freezeTo(init, freezeValue) {
    return switchTo(init, freezeValue.map(Behavior.of));
}
export function freezeAtFrom(behavior, shouldFreeze) {
    return snapshotAt(behavior, shouldFreeze).map((f) => freezeTo(behavior, f));
}
export function freezeAt(behavior, shouldFreeze) {
    return sample(freezeAtFrom(behavior, shouldFreeze));
}
/** @private */
class ActiveAccumBehavior extends ActiveBehavior {
    constructor(f, last, parent, t) {
        super();
        this.f = f;
        this.last = last;
        this.node = new Node(this);
        this.state = 1 /* Push */;
        parent.addListener(this.node, t);
    }
    pushS(t, value) {
        const newValue = this.f(value, this.last);
        if (newValue !== this.last) {
            this.changedAt = t;
            this.last = newValue;
            pushToChildren(t, this);
        }
    }
    pull(_t) { }
    update(_t) {
        throw new Error("Update should never be called.");
    }
    changeStateDown(_) {
        // No-op as an `ActiveAccumBehavior` is always in `Push` state
    }
}
export class AccumBehavior extends ActiveBehavior {
    constructor(f, initial, source) {
        super();
        this.f = f;
        this.initial = initial;
        this.source = source;
        this.state = 2 /* Pull */;
    }
    update(t) {
        return new ActiveAccumBehavior(this.f, this.initial, this.source, t);
    }
    pull(t) {
        this.last = this.update(t);
        this.changedAt = t;
        this.pulledAt = t;
    }
}
export function accumFrom(f, initial, source) {
    return new AccumBehavior(f, initial, source);
}
export function accum(f, initial, source) {
    return sample(accumFrom(f, initial, source));
}
function accumPairToApp([stream, fn]) {
    return stream.map((a) => (b) => fn(a, b));
}
export function accumCombineFrom(pairs, initial) {
    return accumFrom((a, b) => a(b), initial, combine(...pairs.map(accumPairToApp)));
}
export function accumCombine(pairs, initial) {
    return sample(accumCombineFrom(pairs, initial));
}
const firstArg = (a, _) => a;
/**
 * Creates a Behavior whose value is the last occurrence in the stream.
 * @param initial - the initial value that the behavior has
 * @param steps - the stream that will change the value of the behavior
 */
export function stepperFrom(initial, steps) {
    return accumFrom(firstArg, initial, steps);
}
/**
 * Creates a Behavior whose value is the last occurrence in the stream.
 * @param initial - the initial value that the behavior has
 * @param steps - the stream that will change the value of the behavior
 */
export function stepper(initial, steps) {
    return sample(stepperFrom(initial, steps));
}
/**
 * Creates a Behavior whose value is `true` after `turnOn` occurring and `false` after `turnOff` occurring.
 * @param initial the initial value
 * @param turnOn the streams that turn the behavior on
 * @param turnOff the streams that turn the behavior off
 */
export function toggleFrom(initial, turnOn, turnOff) {
    return stepperFrom(initial, turnOn.mapTo(true).combine(turnOff.mapTo(false)));
}
/**
 * Creates a Behavior whose value is `true` after `turnOn` occurring and `false` after `turnOff` occurring.
 * @param initial the initial value
 * @param turnOn the streams that turn the behavior on
 * @param turnOff the streams that turn the behavior off
 */
export function toggle(initial, turnOn, turnOff) {
    return sample(toggleFrom(initial, turnOn, turnOff));
}
class MomentBehavior extends Behavior {
    constructor(f) {
        super();
        this.f = f;
        this.sampleBound = (b) => this.sample(b);
    }
    activate(t) {
        this.currentSampleTime = t;
        try {
            this.last = this.f(this.sampleBound);
            this.state = 1 /* Push */;
        }
        catch (error) {
            if ("placeholder" in error) {
                const placeholder = error.placeholder;
                if (this.listenerNodes !== undefined) {
                    for (const { node, parent } of this.listenerNodes) {
                        parent.removeListener(node);
                    }
                }
                const node = new Node(this);
                this.listenerNodes = cons({ node, parent: placeholder }, this.listenerNodes);
                placeholder.addListener(node);
                this.parents = cons(placeholder);
            }
            else {
                throw error;
            }
        }
    }
    pull(t) {
        this.pulledAt = t;
        refresh(this, t);
    }
    update(t) {
        this.currentSampleTime = t;
        if (this.listenerNodes !== undefined) {
            for (const { node, parent } of this.listenerNodes) {
                parent.removeListener(node);
            }
        }
        this.parents = undefined;
        const value = this.f(this.sampleBound);
        return value;
    }
    sample(b) {
        const node = new Node(this);
        this.listenerNodes = cons({ node, parent: b }, this.listenerNodes);
        b.addListener(node, this.currentSampleTime);
        b.at(this.currentSampleTime);
        this.parents = cons(b, this.parents);
        return b.last;
    }
}
export function moment(f) {
    return new MomentBehavior(f);
}
class FormatBehavior extends Behavior {
    constructor(strings, behaviors) {
        super();
        this.strings = strings;
        this.behaviors = behaviors;
        let parents = undefined;
        for (const b of behaviors) {
            if (isBehavior(b)) {
                parents = cons(b, parents);
            }
        }
        this.parents = parents;
    }
    update(_t) {
        let resultString = this.strings[0];
        for (let i = 0; i < this.behaviors.length; ++i) {
            const b = this.behaviors[i];
            const value = isBehavior(b) ? b.last : b;
            resultString += value.toString() + this.strings[i + 1];
        }
        return resultString;
    }
}
export function format(strings, ...behaviors) {
    return new FormatBehavior(strings, behaviors);
}
export const flatFuturesFrom = (stream) => fromFunction(() => new FlatFutures(stream));
export function flatFutures(stream) {
    return sample(flatFuturesFrom(stream));
}
export const flatFuturesOrderedFrom = (stream) => fromFunction(() => new FlatFuturesOrdered(stream));
export function flatFuturesOrdered(stream) {
    return sample(flatFuturesOrderedFrom(stream));
}
export const flatFuturesLatestFrom = (stream) => fromFunction(() => new FlatFuturesLatest(stream));
export function flatFuturesLatest(stream) {
    return sample(flatFuturesLatestFrom(stream));
}
