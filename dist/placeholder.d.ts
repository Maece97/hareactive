import { Reactive, SListener, BListener, Time } from "./common";
import { Behavior } from "./behavior";
import { Stream } from "./stream";
import { Future } from "./future";
export declare class Placeholder<A> extends Behavior<A> {
    source: Reactive<A, SListener<A> | BListener>;
    private node;
    replaceWith(parent: Reactive<A, SListener<A> | BListener>, t?: Time): void;
    pushS(t: number, a: A): void;
    pull(t: number): void;
    update(_t: number): A;
    activate(t: number): void;
    deactivate(_done?: boolean): void;
    map<B>(fn: (a: A) => B): Behavior<B>;
    mapTo<B>(b: B): Behavior<B>;
}
export declare function isPlaceholder<A>(p: unknown): p is Placeholder<A>;
export declare type PlaceholderObject<A> = Placeholder<A> & Stream<A> & Future<A>;
export declare function placeholder<A>(): PlaceholderObject<A>;
