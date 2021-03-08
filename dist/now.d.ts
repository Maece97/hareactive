import { IO } from "@funkia/io";
import { Time } from "./common";
import { Future } from "./future";
import { Behavior } from "./behavior";
import { Stream } from "./stream";
export declare type MapNowTuple<A> = {
    [K in keyof A]: Now<A[K]>;
};
export declare abstract class Now<A> {
    isNow: true;
    constructor();
    static is(a: unknown): a is Now<unknown>;
    abstract run(time: Time): A;
    of<B>(b: B): Now<B>;
    static of<B>(b: B): Now<B>;
    static multi: boolean;
    multi: boolean;
    map<B>(f: (a: A) => B): Now<B>;
    mapTo<B>(b: B): Now<B>;
    flatMap<B>(f: (a: A) => Now<B>): Now<B>;
    chain<B>(f: (a: A) => Now<B>): Now<B>;
    flat<B>(this: Now<Now<B>>): Now<B>;
    ap<B>(a: Now<(a: A) => B>): Now<B>;
    lift<A extends unknown[], R>(f: (...args: A) => R, ...args: MapNowTuple<A>): Now<R>;
}
export declare class OfNow<A> extends Now<A> {
    private value;
    constructor(value: A);
    run(_: Time): A;
}
export declare class MapNow<A, B> extends Now<B> {
    private f;
    private parent;
    constructor(f: (a: A) => B, parent: Now<A>);
    run(t: Time): B;
}
export declare class LiftNow<A extends Now<unknown>[], R> extends Now<R> {
    readonly f: Function;
    readonly parents: A;
    constructor(f: Function, parents: A);
    run(t: Time): R;
}
export declare class FlatMapNow<A, B> extends Now<B> {
    private first;
    private f;
    constructor(first: Now<A>, f: (a: A) => Now<B>);
    run(t: Time): B;
}
export declare class SampleNow<A> extends Now<A> {
    private b;
    constructor(b: Behavior<A>);
    run(t: Time): A;
}
export declare function sample<A>(b: Behavior<A>): Now<A>;
export declare class PerformNow<A> extends Now<A> {
    private _run;
    constructor(_run: () => A);
    run(): A;
}
/**
 * Create a now-computation that executes the effectful computation `cb` when it
 * is run.
 */
export declare function perform<A>(cb: () => A): Now<A>;
export declare function performIO<A>(comp: IO<A>): Now<Future<A>>;
export declare function performStream<A>(s: Stream<IO<A>>): Now<Stream<Future<A>>>;
export declare class PerformMapNow<A, B> extends Now<Stream<B> | Future<B>> {
    private cb;
    private s;
    constructor(cb: (a: A) => B, s: Stream<A> | Future<A>);
    run(): Stream<B> | Future<B>;
}
/**
 * Maps a function with side-effects over a future or stream.
 */
export declare function performMap<A, B>(cb: (a: A) => B, f: Future<A>): Now<Future<B>>;
export declare function performMap<A, B>(cb: (a: A) => B, s: Stream<A>): Now<Stream<B>>;
export declare function plan<A>(future: Future<Now<A>>): Now<Future<A>>;
export declare function runNow<A>(now: Now<A>, time?: Time): A;
export interface ReactivesObject {
    [a: string]: Behavior<unknown> | Stream<unknown>;
}
export declare function loopNow<A extends ReactivesObject>(fn: (a: A) => Now<A>, names?: string[]): Now<A>;
export declare type InstantRun = <A>(now: Now<A>) => A;
export declare class InstantNow<A> extends Now<A> {
    private fn;
    constructor(fn: (run: InstantRun) => A);
    run(t: Time): A;
}
export declare function instant<A>(fn: (run: InstantRun) => A): Now<A>;
