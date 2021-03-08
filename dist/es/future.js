import { Reactive } from "./common";
import { cons, fromArray, Node } from "./datastructures";
import { FunctionBehavior } from "./behavior";
import { tick } from "./clock";
import { sample } from "./now";
/**
 * A future is a thing that occurs at some point in time with a value.
 * It can be understood as a pair consisting of the time the future
 * occurs and its associated value. It is quite like a JavaScript
 * promise.
 */
export class Future extends Reactive {
    constructor() {
        super();
        this.multi = false;
    }
    pull() {
        throw new Error("Pull not implemented on future");
    }
    resolve(val, t = tick()) {
        this.deactivate(true);
        this.value = val;
        this.pushSToChildren(t, val);
    }
    pushSToChildren(t, val) {
        for (const child of this.children) {
            child.pushS(t, val);
        }
    }
    addListener(node, t) {
        if (this.state === 0 /* Done */) {
            node.value.pushS(t, this.value);
            return 0 /* Done */;
        }
        else {
            return super.addListener(node, t);
        }
    }
    combine(future) {
        return new CombineFuture(this, future);
    }
    // A future is a functor, when the future occurs we can feed its
    // result through the mapping function
    map(f) {
        return new MapFuture(f, this);
    }
    mapTo(b) {
        return new MapToFuture(b, this);
    }
    // A future is an applicative. `of` gives a future that has always
    // occurred at all points in time.
    static of(b) {
        return new OfFuture(b);
    }
    of(b) {
        return new OfFuture(b);
    }
    lift(f, ...args) {
        return args.length === 1
            ? new MapFuture(f, args[0])
            : new LiftFuture(f, args);
    }
    // A future is a monad. Once the first future occurs `flatMap` passes its
    // value through the function and the future it returns is the one returned by
    // `flatMap`.
    flatMap(f) {
        return new FlatMapFuture(f, this);
    }
    chain(f) {
        return new FlatMapFuture(f, this);
    }
    flat() {
        return new FlatMapFuture((f) => f, this);
    }
}
export function isFuture(a) {
    return typeof a === "object" && "resolve" in a;
}
export class CombineFuture extends Future {
    constructor(parentA, parentB) {
        super();
        this.parentA = parentA;
        this.parentB = parentB;
        this.parents = cons(parentA, cons(parentB));
    }
    pushS(t, val) {
        this.resolve(val, t);
    }
}
export class MapFuture extends Future {
    constructor(f, parent) {
        super();
        this.f = f;
        this.parent = parent;
        this.parents = cons(parent);
    }
    pushS(t, val) {
        this.resolve(this.f(val), t);
    }
}
export class MapToFuture extends Future {
    constructor(value, parent) {
        super();
        this.value = value;
        this.parent = parent;
        this.parents = cons(parent);
    }
    pushS(t) {
        this.resolve(this.value, t);
    }
}
export class OfFuture extends Future {
    constructor(value) {
        super();
        this.value = value;
        this.state = 0 /* Done */;
    }
    /* istanbul ignore next */
    pushS() {
        throw new Error("A PureFuture should never be pushed to.");
    }
}
export class NeverFuture extends Future {
    constructor() {
        super();
        this.state = 0 /* Done */;
    }
    addListener() {
        return 0 /* Done */;
    }
    /* istanbul ignore next */
    pushS() {
        throw new Error("A NeverFuture should never be pushed to.");
    }
}
export const never = new NeverFuture();
/** For stateful futures that are always active */
export class ActiveFuture extends Future {
    constructor() {
        super();
        this.state = 1 /* Push */;
    }
    activate() { }
}
export class LiftFuture extends Future {
    constructor(f, futures) {
        super();
        this.f = f;
        this.futures = futures;
        this.missing = futures.length;
        this.parents = fromArray(futures);
    }
    pushS(t) {
        if (--this.missing === 0) {
            // All the dependencies have occurred.
            for (let i = 0; i < this.futures.length; ++i) {
                this.futures[i] = this.futures[i].value;
            }
            this.resolve(this.f.apply(undefined, this.futures), t);
        }
    }
}
export class FlatMapFuture extends Future {
    constructor(f, parent) {
        super();
        this.f = f;
        this.parent = parent;
        this.parentOccurred = false;
        this.node = new Node(this);
        this.parents = cons(parent);
    }
    //FIXME: remove any by splitting listeners to accept A and forward it to B through f
    pushS(t, val) {
        if (this.parentOccurred === false) {
            // The first future occurred. We can now call `f` with its value
            // and listen to the future it returns.
            this.parentOccurred = true;
            const newFuture = this.f(val);
            newFuture.addListener(this.node, t);
        }
        else {
            this.resolve(val, t);
        }
    }
}
/**
 * A Sink is a producer that one can imperatively resolve.
 * @private
 */
export class SinkFuture extends ActiveFuture {
    /* istanbul ignore next */
    pushS() {
        throw new Error("A sink should not be pushed to.");
    }
}
export function sinkFuture() {
    return new SinkFuture();
}
export function fromPromise(promise) {
    const future = sinkFuture();
    promise.then(future.resolve.bind(future));
    return future;
}
export function toPromise(future) {
    return new Promise((resolve, _reject) => {
        future.subscribe(resolve);
    });
}
/**
 * Create a future from a pushing behavior. The future occurs when the
 * behavior pushes its next value. Constructing a BehaviorFuture is
 * impure and should not be done directly.
 * @private
 */
export class BehaviorFuture extends SinkFuture {
    constructor(b) {
        super();
        this.b = b;
        this.node = new Node(this);
        b.addListener(this.node, tick());
    }
    /* istanbul ignore next */
    changeStateDown(_state) {
        throw new Error("Behavior future does not support pulling behavior");
    }
    pushB(t) {
        this.b.removeListener(this.node);
        this.resolve(this.b.last, t);
    }
}
export class NextOccurrenceFuture extends Future {
    constructor(s, time) {
        super();
        this.s = s;
        this.time = time;
        this.parents = cons(s);
    }
    pushS(t, val) {
        this.resolve(val, t);
    }
}
export function nextOccurrenceFrom(stream) {
    return new FunctionBehavior((t) => new NextOccurrenceFuture(stream, t));
}
export function nextOccurrence(stream) {
    return sample(nextOccurrenceFrom(stream));
}
class MapCbFuture extends ActiveFuture {
    constructor(cb, parent) {
        super();
        this.cb = cb;
        this.node = new Node(this);
        this.doneCb = (result) => this.resolve(result);
        this.parents = cons(parent);
        parent.addListener(this.node, tick());
    }
    pushS(_, value) {
        this.cb(value, this.doneCb);
    }
}
/**
 * Invokes the callback when the future occurs.
 *
 * This function is intended to be a low-level function used as the
 * basis for other operators.
 */
export function mapCbFuture(cb, future) {
    return new MapCbFuture(cb, future);
}
