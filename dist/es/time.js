import { cons } from "./datastructures";
import { Stream } from "./stream";
import { Behavior, fromFunction } from "./behavior";
import { sample, perform } from "./now";
/*
 * Time related behaviors and functions
 */
export class DelayStream extends Stream {
    constructor(parent, ms) {
        super();
        this.ms = ms;
        this.parents = cons(parent);
    }
    pushS(t, a) {
        setTimeout(() => {
            this.pushSToChildren(t, a);
        }, this.ms);
    }
}
export function delay(ms, stream) {
    return perform(() => new DelayStream(stream, ms));
}
class ThrottleStream extends Stream {
    constructor(parent, ms) {
        super();
        this.ms = ms;
        this.isSilenced = false;
        this.parents = cons(parent);
    }
    pushS(t, a) {
        if (!this.isSilenced) {
            this.pushSToChildren(t, a);
            this.isSilenced = true;
            setTimeout(() => {
                this.isSilenced = false;
            }, this.ms);
        }
    }
}
export function throttle(ms, stream) {
    return perform(() => new ThrottleStream(stream, ms));
}
class DebounceStream extends Stream {
    constructor(parent, ms) {
        super();
        this.ms = ms;
        this.timer = undefined;
        this.parents = cons(parent);
    }
    pushS(t, a) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.pushSToChildren(t, a);
        }, this.ms);
    }
}
export function debounce(ms, stream) {
    return perform(() => new DebounceStream(stream, ms));
}
/**
 * A behavior whose value is the number of milliseconds elapsed in
 * UNIX epoch. I.e. its current value is equal to the value got by
 * calling `Date.now`.
 */
export const time = fromFunction((_) => Date.now());
/**
 * A behavior giving access to continuous time. When sampled the outer
 * behavior gives a behavior with values that contain the difference
 * between the current sample time and the time at which the outer
 * behavior was sampled.
 */
export const measureTimeFrom = time.map((from) => time.map((t) => t - from));
export const measureTime = sample(measureTimeFrom);
class IntegrateBehavior extends Behavior {
    constructor(parent, t) {
        super();
        this.parent = parent;
        this.lastPullTime = time.at(t);
        this.state = 2 /* Pull */;
        this.last = 0;
        this.pulledAt = t;
        this.changedAt = t;
        this.parents = cons(parent, cons(time));
    }
    update(_t) {
        const currentPullTime = time.last;
        const deltaMs = currentPullTime - this.lastPullTime;
        const value = this.last + deltaMs * this.parent.last;
        this.lastPullTime = currentPullTime;
        return value;
    }
    changeStateDown(_) {
        // No-op as an `IntegrateBehavior` is always in `Pull` state
    }
}
/**
 * Returns a `Now` computation of a behavior of the integral of the given behavior.
 */
export function integrate(behavior) {
    return sample(integrateFrom(behavior));
}
/**
 * Integrate a behavior with respect to time.
 *
 * The value of the behavior is treated as a rate of change per millisecond.
 */
export function integrateFrom(behavior) {
    return fromFunction((t) => new IntegrateBehavior(behavior, t));
}
