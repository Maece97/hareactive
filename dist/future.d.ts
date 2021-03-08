import { State, SListener, Parent, BListener, Time } from "./common";
import { Reactive } from "./common";
import { Node } from "./datastructures";
import { Behavior } from "./behavior";
import { Stream } from "./stream";
import { Now } from "./now";
export declare type MapFutureTuple<A> = {
    [K in keyof A]: Future<A[K]>;
};
/**
 * A future is a thing that occurs at some point in time with a value.
 * It can be understood as a pair consisting of the time the future
 * occurs and its associated value. It is quite like a JavaScript
 * promise.
 */
export declare abstract class Future<A> extends Reactive<A, SListener<A>> implements Parent<SListener<unknown>> {
    value: A;
    constructor();
    abstract pushS(t: number, val: unknown): void;
    pull(): A;
    resolve(val: A, t?: Time): void;
    pushSToChildren(t: number, val: A): void;
    addListener(node: Node<SListener<A>>, t: number): State;
    combine(future: Future<A>): Future<A>;
    map<B>(f: (a: A) => B): Future<B>;
    mapTo<B>(b: B): Future<B>;
    static of<B>(b: B): Future<B>;
    of<B>(b: B): Future<B>;
    ap: <B>(f: Future<(a: A) => B>) => Future<B>;
    lift<A extends unknown[], R>(f: (...args: A) => R, ...args: MapFutureTuple<A>): Future<R>;
    static multi: false;
    multi: false;
    flatMap<B>(f: (a: A) => Future<B>): Future<B>;
    chain<B>(f: (a: A) => Future<B>): Future<B>;
    flat<B>(this: Future<Future<B>>): Future<B>;
}
export declare function isFuture(a: unknown): a is Future<unknown>;
export declare class CombineFuture<A> extends Future<A> {
    readonly parentA: Future<A>;
    readonly parentB: Future<A>;
    constructor(parentA: Future<A>, parentB: Future<A>);
    pushS(t: number, val: A): void;
}
export declare class MapFuture<A, B> extends Future<B> {
    private f;
    readonly parent: Future<A>;
    constructor(f: (a: A) => B, parent: Future<A>);
    pushS(t: number, val: A): void;
}
export declare class MapToFuture<A> extends Future<A> {
    value: A;
    readonly parent: Future<unknown>;
    constructor(value: A, parent: Future<unknown>);
    pushS(t: Time): void;
}
export declare class OfFuture<A> extends Future<A> {
    value: A;
    constructor(value: A);
    pushS(): void;
}
export declare class NeverFuture extends Future<never> {
    constructor();
    addListener(): State;
    pushS(): void;
}
export declare const never: NeverFuture;
/** For stateful futures that are always active */
export declare abstract class ActiveFuture<A> extends Future<A> {
    constructor();
    activate(): void;
}
export declare class LiftFuture<A> extends Future<A> {
    private f;
    private futures;
    private missing;
    constructor(f: Function, futures: Future<any>[]);
    pushS(t: Time): void;
}
export declare class FlatMapFuture<A, B> extends Future<B> implements SListener<A> {
    private f;
    readonly parent: Future<A>;
    private parentOccurred;
    private node;
    constructor(f: (a: A) => Future<B>, parent: Future<A>);
    pushS(t: number, val: any): void;
}
/**
 * A Sink is a producer that one can imperatively resolve.
 * @private
 */
export declare class SinkFuture<A> extends ActiveFuture<A> {
    pushS(): void;
}
export declare function sinkFuture<A>(): Future<A>;
export declare function fromPromise<A>(promise: Promise<A>): Future<A>;
export declare function toPromise<A>(future: Future<A>): Promise<A>;
/**
 * Create a future from a pushing behavior. The future occurs when the
 * behavior pushes its next value. Constructing a BehaviorFuture is
 * impure and should not be done directly.
 * @private
 */
export declare class BehaviorFuture<A> extends SinkFuture<A> implements BListener {
    private b;
    node: Node<this>;
    constructor(b: Behavior<A>);
    changeStateDown(_state: State): void;
    pushB(t: number): void;
}
export declare class NextOccurrenceFuture<A> extends Future<A> implements SListener<A> {
    readonly s: Stream<A>;
    readonly time: Time;
    constructor(s: Stream<A>, time: Time);
    pushS(t: Time, val: A): void;
}
export declare function nextOccurrenceFrom<A>(stream: Stream<A>): Behavior<Future<A>>;
export declare function nextOccurrence<A>(stream: Stream<A>): Now<Future<A>>;
/**
 * Invokes the callback when the future occurs.
 *
 * This function is intended to be a low-level function used as the
 * basis for other operators.
 */
export declare function mapCbFuture<A, B>(cb: (value: A, done: (result: B) => void) => void, future: Future<A>): Future<B>;
