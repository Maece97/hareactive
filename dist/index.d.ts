import { Now, MapNowTuple } from "./now";
import { Behavior, SinkBehavior, MapBehaviorTuple } from "./behavior";
import { Stream, SinkStream } from "./stream";
import { Future, MapFutureTuple } from "./future";
export * from "./common";
export * from "./now";
export * from "./behavior";
export * from "./stream";
export * from "./future";
export * from "./time";
export * from "./placeholder";
export * from "./animation";
export * from "./clock";
export interface UnknownMappable<A> {
    readonly map: <B>(f: (a: A) => B) => UnknownMappable<B>;
}
/**
 * Map a function over a behavior or stream. This means that if at some point in
 * time the value of `b` is `bVal` then the value of the returned
 * behavior is `fn(bVal)`.
 */
export declare function map<A, B>(fn: (a: A) => B, future: Future<A>): Future<B>;
export declare function map<A, B>(fn: (a: A) => B, stream: Stream<A>): Stream<B>;
export declare function map<A, B>(fn: (a: A) => B, behavior: Behavior<A>): Behavior<B>;
export declare function map<A, B>(fn: (a: A) => B, behavior: Now<A>): Now<B>;
export declare function lift<A extends any[], R>(f: (...args: A) => R, ...args: MapFutureTuple<A>): Future<R>;
export declare function lift<A extends any[], R>(f: (...args: A) => R, ...args: MapBehaviorTuple<A>): Behavior<R>;
export declare function lift<A extends any[], R>(f: (...args: A) => R, ...args: MapNowTuple<A>): Now<R>;
export declare function flat<A>(b: Behavior<Behavior<A>>): Behavior<A>;
export declare function flat<A>(f: Future<Future<A>>): Future<A>;
export declare function flat<A>(n: Now<Now<A>>): Now<A>;
export declare function push<A>(a: A, sink: SinkBehavior<A> | SinkStream<A>): void;
export declare function combine<A>(...futures: Future<A>[]): Future<A>;
export declare function combine<A>(...streams: Stream<A>[]): Stream<A>;
