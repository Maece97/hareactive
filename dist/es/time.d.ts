import { Time } from "./common";
import { Stream } from "./stream";
import { Behavior } from "./behavior";
import { Now } from "./now";
export declare class DelayStream<A> extends Stream<A> {
    readonly ms: number;
    constructor(parent: Stream<A>, ms: number);
    pushS(t: number, a: A): void;
}
export declare function delay<A>(ms: number, stream: Stream<A>): Now<Stream<A>>;
export declare function throttle<A>(ms: number, stream: Stream<A>): Now<Stream<A>>;
export declare function debounce<A>(ms: number, stream: Stream<A>): Now<Stream<A>>;
/**
 * A behavior whose value is the number of milliseconds elapsed in
 * UNIX epoch. I.e. its current value is equal to the value got by
 * calling `Date.now`.
 */
export declare const time: Behavior<Time>;
/**
 * A behavior giving access to continuous time. When sampled the outer
 * behavior gives a behavior with values that contain the difference
 * between the current sample time and the time at which the outer
 * behavior was sampled.
 */
export declare const measureTimeFrom: Behavior<Behavior<number>>;
export declare const measureTime: Now<Behavior<number>>;
/**
 * Returns a `Now` computation of a behavior of the integral of the given behavior.
 */
export declare function integrate(behavior: Behavior<number>): Now<Behavior<number>>;
/**
 * Integrate a behavior with respect to time.
 *
 * The value of the behavior is treated as a rate of change per millisecond.
 */
export declare function integrateFrom(behavior: Behavior<number>): Behavior<Behavior<number>>;
