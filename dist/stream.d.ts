import { Reactive, State, Time, SListener, Parent } from "./common";
import { DoubleLinkedList } from "./datastructures";
import { Behavior } from "./behavior";
import { Now } from "./now";
import { Future } from ".";
/**
 * A stream is a list of occurrences over time. Each occurrence
 * happens at a point in time and has an associated value.
 */
export declare abstract class Stream<A> extends Reactive<A, SListener<A>> implements Parent<SListener<unknown>> {
    constructor();
    children: DoubleLinkedList<SListener<A>>;
    state: State;
    combine<B>(stream: Stream<B>): Stream<A | B>;
    map<B>(f: (a: A) => B): Stream<B>;
    mapTo<B>(b: B): Stream<B>;
    filter(fn: (a: A) => boolean): Stream<A>;
    scan<B>(fn: (a: A, b: B) => B, startingValue: B): Now<Stream<B>>;
    scanFrom<B>(fn: (a: A, b: B) => B, startingValue: B): Behavior<Stream<B>>;
    accum<B>(fn: (a: A, b: B) => B, init: B): Now<Behavior<B>>;
    accumFrom<B>(fn: (a: A, b: B) => B, init: B): Behavior<Behavior<B>>;
    log(prefix?: string): Stream<A>;
    abstract pushS(t: number, value: unknown): void;
    pushSToChildren(t: number, value: A): void;
}
export declare class MapStream<A, B> extends Stream<B> {
    readonly parent: Stream<A>;
    readonly f: (a: A) => B;
    constructor(parent: Stream<A>, f: (a: A) => B);
    pushS(t: number, v: A): void;
}
export declare class MapToStream<A, B> extends Stream<B> {
    readonly parent: Stream<A>;
    readonly b: B;
    constructor(parent: Stream<A>, b: B);
    pushS(t: number, _v: A): void;
}
export declare class FilterStream<A> extends Stream<A> {
    readonly parent: Stream<A>;
    readonly fn: (a: A) => boolean;
    constructor(parent: Stream<A>, fn: (a: A) => boolean);
    pushS(t: number, v: A): void;
}
export declare function apply<A, B>(behavior: Behavior<(a: A) => B>, stream: Stream<A>): Stream<B>;
/**
 * @param predicate A predicate function that returns a boolean for `A`.
 * @param s The stream to filter.
 * @returns Stream that only contains the occurrences from `stream`
 * for which `fn` returns true.
 */
export declare function filter<A>(predicate: (a: A) => boolean, s: Stream<A>): Stream<A>;
export declare function split<A>(predicate: (a: A) => boolean, stream: Stream<A>): [Stream<A>, Stream<A>];
export declare function filterApply<A>(predicate: Behavior<(a: A) => boolean>, stream: Stream<A>): Stream<A>;
export declare function keepWhen<A>(stream: Stream<A>, behavior: Behavior<boolean>): Stream<A>;
/** For stateful streams that are always active */
export declare abstract class ActiveStream<A> extends Stream<A> {
    activate(): void;
    deactivate(): void;
}
export declare const empty: Stream<any>;
export declare class ScanStream<A, B> extends ActiveStream<B> {
    readonly f: (a: A, b: B) => B;
    last: B;
    readonly parent: Stream<A>;
    readonly t: Time;
    private node;
    constructor(f: (a: A, b: B) => B, last: B, parent: Stream<A>, t: Time);
    pushS(t: number, a: A): void;
}
/**
 * For each occurrence on `stream` the function `f` is applied to its value. As
 * its second argument `f` initially receives `initial` and afterwards its own
 * previous return value. The returned stream has an occurrence with the result
 * of each call to `f`.
 */
export declare function scanFrom<A, B>(f: (a: A, b: B) => B, initial: B, stream: Stream<A>): Behavior<Stream<B>>;
export declare function scan<A, B>(f: (a: A, b: B) => B, initial: B, source: Stream<A>): Now<Stream<B>>;
/**
 * Takes a behavior of a stream and returns a stream that emits from the last
 * stream.
 */
export declare function shiftCurrent<A>(b: Behavior<Stream<A>>): Stream<A>;
/**
 * Takes a stream of a stream and returns a stream that emits from the last
 * stream.
 */
export declare function shift<A>(s: Stream<Stream<A>>): Now<Stream<A>>;
/**
 * Takes a stream of a stream and returns a stream that emits from the last
 * stream.
 */
export declare function shiftFrom<A>(s: Stream<Stream<A>>): Behavior<Stream<A>>;
export declare function changes<A>(b: Behavior<A>, comparator?: (v: A, u: A) => boolean): Stream<A>;
export declare class CombineStream<A, B> extends Stream<A | B> {
    readonly s1: Stream<A>;
    readonly s2: Stream<B>;
    constructor(s1: Stream<A>, s2: Stream<B>);
    pushS(t: number, a: A | B): void;
}
export declare abstract class ProducerStream<A> extends Stream<A> {
    constructor();
    pushS(t: number, a: A): void;
}
export declare type ProducerStreamFunction<A> = (push: (a: A, t?: number) => void) => () => void;
export declare function producerStream<A>(activate: ProducerStreamFunction<A>): Stream<A>;
export declare class SinkStream<A> extends ProducerStream<A> {
    private pushing;
    constructor();
    pushS(t: number, a: A): void;
    push(a: A): void;
    activate(): void;
    deactivate(): void;
}
export declare function sinkStream<A>(): SinkStream<A>;
export declare function subscribe<A>(fn: (a: A) => void, stream: Stream<A>): void;
export declare class SnapshotStream<B> extends Stream<B> {
    readonly target: Behavior<B>;
    readonly trigger: Stream<unknown>;
    private node;
    constructor(target: Behavior<B>, trigger: Stream<unknown>);
    pushS(t: Time): void;
    activate(t: number): void;
    deactivate(): void;
}
export declare function snapshot<B>(target: Behavior<B>, trigger: Stream<unknown>): Stream<B>;
export declare function snapshotWith<A, B, C>(f: (a: A, b: B) => C, target: Behavior<B>, trigger: Stream<A>): Stream<C>;
export declare class SelfieStream<A> extends Stream<A> {
    constructor(parent: Stream<Behavior<A>>);
    pushS(t: number, target: Behavior<A>): void;
}
/**
 * On each occurrence the behavior is sampled at the time of the occurrence.
 */
export declare function selfie<A>(stream: Stream<Behavior<A>>): Stream<A>;
export declare function isStream(s: unknown): s is Stream<unknown>;
/**
 * Invokes the callback for each occurrence on the given stream.
 *
 * This function is intended to be a low-level function used as the
 * basis for other operators.
 */
export declare function mapCbStream<A, B>(cb: (value: A, done: (result: B) => void) => void, stream: Stream<A>): Stream<B>;
export declare class FlatFutures<A> extends Stream<A> {
    constructor(stream: Stream<Future<A>>);
    pushS(_t: number, fut: Future<A>): void;
}
export declare class FlatFuturesOrdered<A> extends Stream<A> {
    constructor(stream: Stream<Future<A>>);
    nextId: number;
    next: number;
    buffer: {
        value: A;
    }[];
    pushS(_t: number, fut: Future<A>): void;
    pushFromBuffer(): void;
}
export declare class FlatFuturesLatest<A> extends Stream<A> implements SListener<Future<A>> {
    constructor(stream: Stream<Future<A>>);
    next: number;
    newest: number;
    running: number;
    pushS(_t: number, fut: Future<A>): void;
}
