import { Behavior, Stream } from ".";
export declare type TimingFunction = (t: number) => number;
export declare type TransitionConfig = {
    duration: number;
    timingFunction: TimingFunction;
    delay: number;
};
export declare function transitionBehavior(config: TransitionConfig, initial: number, triggerStream: Stream<number>, timeB?: Behavior<number>): Behavior<Behavior<number>>;
export declare function interpolate(fromA: number, toA: number, fromB: number, toB: number, a: number): number;
export declare function capToRange(lower: number, upper: number, a: number): number;
export declare const linear: (t: number) => number;
export declare const easeIn: (p: number) => (t: number) => number;
export declare const easeOut: (p: number) => (t: number) => number;
export declare const easeInOut: (p: number) => (t: number) => number;
