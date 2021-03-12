import { DoubleLinkedList } from "./datastructures";
import { State, Reactive, Time, BListener, Parent, SListener } from "./common";
import { Future } from "./future";
import { Stream } from "./stream";
import { Now } from "./now";
export declare type MapBehaviorTuple<A> = {
    [K in keyof A]: Behavior<A[K]>;
};
/**
 * A behavior is a value that changes over time. Conceptually it can
 * be thought of as a function from time to a value. I.e. `type
 * Behavior<A> = (t: Time) => A`.
 */
export declare abstract class Behavior<A> extends Reactive<A, BListener> implements Parent<BListener> {
    last: A;
    children: DoubleLinkedList<BListener>;
    pulledAt: number | undefined;
    changedAt: number | undefined;
    constructor();
    static is(a: unknown): a is Behavior<unknown>;
    map<B>(fn: (a: A) => B): Behavior<B>;
    mapTo<B>(v: B): Behavior<B>;
    static of<A>(v: A): Behavior<A>;
    of<B>(v: B): Behavior<B>;
    ap<B>(f: Behavior<(a: A) => B>): Behavior<B>;
    lift<A extends unknown[], R>(f: (...args: A) => R, ...args: MapBehaviorTuple<A>): Behavior<R>;
    static multi: boolean;
    multi: boolean;
    flatMap<B>(fn: (a: A) => Behavior<B>): Behavior<B>;
    chain<B>(fn: (a: A) => Behavior<B>): Behavior<B>;
    flat<B>(this: Behavior<Behavior<B>>): Behavior<B>;
    at(t?: number): A;
    abstract update(t: number): A;
    pushB(t: number): void;
    pull(t: number): void;
    activate(t: number): void;
    log(prefix?: string, ms?: number): Behavior<A>;
}
export declare function pushToChildren(t: number, b: Behavior<unknown>): void;
export declare function isBehavior<A>(b: unknown): b is Behavior<A>;
export declare abstract class ProducerBehavior<A> extends Behavior<A> {
    newValue(a: A): void;
    pull(t: number): void;
    activate(t: Time): void;
    deactivate(): void;
    abstract activateProducer(): void;
    abstract deactivateProducer(): void;
}
export declare type ProducerBehaviorFunction<A> = (push: (a: A) => void) => () => void;
export declare function producerBehavior<A>(activate: ProducerBehaviorFunction<A>, getValue: (t: number) => A): Behavior<A>;
export declare class SinkBehavior<A> extends ProducerBehavior<A> {
    last: A;
    constructor(last: A);
    push(a: A): void;
    update(): A;
    activateProducer(): void;
    deactivateProducer(): void;
}
/**
 * Creates a behavior for imperative pushing.
 */
export declare function sinkBehavior<A>(initial: A): SinkBehavior<A>;
/**
 * Impure function that gets the current value of a behavior. For a
 * pure variant see `sample`.
 */
export declare function at<B>(b: Behavior<B>, t?: number): B;
export declare class MapBehavior<A, B> extends Behavior<B> {
    private parent;
    private f;
    constructor(parent: Behavior<A>, f: (a: A) => B);
    update(_t: number): B;
}
/**
 * Apply a function valued behavior to a value behavior.
 *
 * @param fnB behavior of functions from `A` to `B`
 * @param valB A behavior of `A`
 * @returns Behavior of the function in `fnB` applied to the value in `valB`
 */
export declare function ap<A, B>(fnB: Behavior<(a: A) => B>, valB: Behavior<A>): Behavior<B>;
export declare class LiftBehavior<A extends unknown[], R> extends Behavior<R> {
    private f;
    private bs;
    constructor(f: (...as: A) => R, bs: MapBehaviorTuple<A>);
    update(_t: number): R;
    changeStateDown(_: State): void;
}
export declare class FlatMapBehavior<A, B> extends Behavior<B> {
    private outer;
    private fn;
    private innerB;
    private innerNode;
    constructor(outer: Behavior<A>, fn: (a: A) => Behavior<B>);
    update(t: number): B;
}
export declare function whenFrom(b: Behavior<boolean>): Behavior<Future<{}>>;
export declare function when(b: Behavior<boolean>): Now<Future<{}>>;
export declare function snapshotAt<A>(b: Behavior<A>, f: Future<unknown>): Behavior<Future<A>>;
/** Behaviors that are always active */
export declare abstract class ActiveBehavior<A> extends Behavior<A> {
    activate(): void;
    deactivate(): void;
}
export declare class ConstantBehavior<A> extends ActiveBehavior<A> {
    last: A;
    constructor(last: A);
    update(_t: number): A;
}
/** @private */
export declare class FunctionBehavior<A> extends ActiveBehavior<A> {
    private f;
    constructor(f: (t: Time) => A);
    pull(t: Time): void;
    update(t: Time): A;
}
export declare function fromFunction<B>(f: (t: Time) => B): Behavior<B>;
/** @private */
export declare class SwitcherBehavior<A> extends ActiveBehavior<A> implements BListener, SListener<Behavior<A>> {
    private readonly init;
    private readonly next;
    private readonly t;
    private b;
    private readonly bNode;
    private readonly nNode;
    constructor(init: Behavior<A>, next: Future<Behavior<A>> | Stream<Behavior<A>>, t: Time);
    update(_t: Time): A;
    pushS(t: number, value: Behavior<A>): void;
    private doSwitch;
    changeStateDown(_: State): void;
}
/**
 * From an initial value and a future value, `stepTo` creates a new behavior
 * that has the initial value until `next` occurs, after which it has the value
 * of the future.
 */
export declare function stepTo<A>(init: A, next: Future<A>): Behavior<A>;
/**
 * From an initial behavior and a future of a behavior, `switcher`
 * creates a new behavior that acts exactly like `initial` until
 * `next` occurs, after which it acts like the behavior it contains.
 */
export declare function switchTo<A>(init: Behavior<A>, next: Future<Behavior<A>>): Behavior<A>;
export declare function switcherFrom<A>(init: Behavior<A>, stream: Stream<Behavior<A>>): Behavior<Behavior<A>>;
export declare function switcher<A>(init: Behavior<A>, stream: Stream<Behavior<A>>): Now<Behavior<A>>;
export declare function freezeTo<A>(init: Behavior<A>, freezeValue: Future<A>): Behavior<A>;
export declare function freezeAtFrom<A>(behavior: Behavior<A>, shouldFreeze: Future<unknown>): Behavior<Behavior<A>>;
export declare function freezeAt<A>(behavior: Behavior<A>, shouldFreeze: Future<unknown>): Now<Behavior<A>>;
export declare class AccumBehavior<A, B> extends ActiveBehavior<Behavior<B>> {
    f: (a: A, b: B) => B;
    initial: B;
    source: Stream<A>;
    constructor(f: (a: A, b: B) => B, initial: B, source: Stream<A>);
    update(t: number): Behavior<B>;
    pull(t: Time): void;
}
export declare function accumFrom<A, B>(f: (a: A, b: B) => B, initial: B, source: Stream<A>): Behavior<Behavior<B>>;
export declare function accum<A, B>(f: (a: A, b: B) => B, initial: B, source: Stream<A>): Now<Behavior<B>>;
export declare type AccumPair<A> = [Stream<unknown>, (a: unknown, b: A) => A];
export declare function accumCombineFrom<B>(pairs: AccumPair<B>[], initial: B): Behavior<Behavior<B>>;
export declare function accumCombine<B>(pairs: AccumPair<B>[], initial: B): Now<Behavior<B>>;
/**
 * Creates a Behavior whose value is the last occurrence in the stream.
 * @param initial - the initial value that the behavior has
 * @param steps - the stream that will change the value of the behavior
 */
export declare function stepperFrom<B>(initial: B, steps: Stream<B>): Behavior<Behavior<B>>;
/**
 * Creates a Behavior whose value is the last occurrence in the stream.
 * @param initial - the initial value that the behavior has
 * @param steps - the stream that will change the value of the behavior
 */
export declare function stepper<B>(initial: B, steps: Stream<B>): Now<Behavior<B>>;
/**
 * Creates a Behavior whose value is `true` after `turnOn` occurring and `false` after `turnOff` occurring.
 * @param initial the initial value
 * @param turnOn the streams that turn the behavior on
 * @param turnOff the streams that turn the behavior off
 */
export declare function toggleFrom(initial: boolean, turnOn: Stream<unknown>, turnOff: Stream<unknown>): Behavior<Behavior<boolean>>;
/**
 * Creates a Behavior whose value is `true` after `turnOn` occurring and `false` after `turnOff` occurring.
 * @param initial the initial value
 * @param turnOn the streams that turn the behavior on
 * @param turnOff the streams that turn the behavior off
 */
export declare function toggle(initial: boolean, turnOn: Stream<unknown>, turnOff: Stream<unknown>): Now<Behavior<boolean>>;
export declare type SampleAt = <B>(b: Behavior<B>) => B;
export declare function moment<A>(f: (sample: SampleAt) => A): Behavior<A>;
export declare function format(strings: TemplateStringsArray, ...behaviors: Array<string | number | Behavior<string | number>>): Behavior<string>;
export declare const flatFuturesFrom: <A>(stream: Stream<Future<A>>) => Behavior<Stream<A>>;
export declare function flatFutures<A>(stream: Stream<Future<A>>): Now<Stream<A>>;
export declare const flatFuturesOrderedFrom: <A>(stream: Stream<Future<A>>) => Behavior<Stream<A>>;
export declare function flatFuturesOrdered<A>(stream: Stream<Future<A>>): Now<Stream<A>>;
export declare const flatFuturesLatestFrom: <A>(stream: Stream<Future<A>>) => Behavior<Stream<A>>;
export declare function flatFuturesLatest<A>(stream: Stream<Future<A>>): Now<Stream<A>>;
