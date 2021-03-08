import { Stream } from "./stream";
import { Behavior } from "./behavior";
import { Future } from "./future";
import { Time } from "./common";
import { Now } from "./now";
export declare type Occurrence<A> = {
    time: Time;
    value: A;
};
declare module "./future" {
    interface Future<A> {
        model(): SemanticFuture<A>;
    }
}
export declare const neverOccurringFuture: {
    time: "infinity";
    value: undefined;
};
export declare type SemanticFuture<A> = Occurrence<A> | typeof neverOccurringFuture;
export declare function doesOccur<A>(future: SemanticFuture<A>): future is Occurrence<A>;
export declare function testFuture<A>(time: number, value: A): Future<A>;
export declare function assertFutureEqual<A>(future1: Future<A>, future2: Future<A>): void;
export declare type StreamModel<A> = Occurrence<A>[];
declare module "./stream" {
    interface Stream<A> {
        model(): StreamModel<A>;
    }
}
export declare function testStreamFromArray<A>(array: ([Time, A])[]): Stream<A>;
export declare function testStreamFromObject<A>(object: Record<string, A>): Stream<A>;
export declare function assertStreamEqual<A>(s1: Stream<A>, s2: Stream<A>): void;
export declare function assertStreamEqual<A>(s1: Stream<A>, s2: {
    [time: number]: A;
}): void;
export declare function assertStreamEqual<A>(s1: Stream<A>, s2: ([Time, A])[]): void;
export declare type BehaviorModel<A> = (time: Time) => A;
declare module "./behavior" {
    interface Behavior<A> {
        model(): BehaviorModel<A>;
    }
}
export declare function testBehavior<A>(b: (time: number) => A): Behavior<A>;
/**
 * Takes a behavior created from test data, a point in timer and returns the
 * behaviors value at that point in time.
 */
export declare function testAt<A>(t: number, b: Behavior<A>): A;
export declare function assertBehaviorEqual<A>(b1: Behavior<A>, b2: {
    [time: number]: A;
}): void;
declare type NowModel<A> = {
    value: A;
    mocks: unknown[];
};
declare module "./now" {
    interface Now<A> {
        model(mocks: unknown[], t: Time): NowModel<A>;
    }
}
/**
 * Test run a now computation without executing its side-effects.
 * @param now The now computation to test.
 * @param mocks
 * @param time The point in time at which the now computation should
 * be run. Defaults to 0.
 */
export declare function testNow<A>(now: Now<A>, mocks?: unknown[], time?: Time): A;
export {};
