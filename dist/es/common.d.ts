import { Cons, DoubleLinkedList, Node } from "./datastructures";
import { Behavior } from "./behavior";
export declare type Time = number;
export declare type PullHandler = (pull: (t?: number) => void) => () => void;
/**
 * The various states that a reactive can be in. The order matters here: Done <
 * Push < Pull < Inactive. The idea is that a reactive can calculate its current
 * state by taking the maximum of its parents states.
 */
export declare const enum State {
    Done = 0,
    Push = 1,
    Pull = 2,
    Inactive = 3
}
export interface Parent<C> {
    addListener(node: Node<C>, t: number): State;
    removeListener(node: Node<C>): void;
    state: State;
}
export interface Child {
    changeStateDown(state: State): void;
}
export interface BListener extends Child {
    pushB(t: number): void;
}
export interface SListener<A> extends Child {
    pushS(t: number, value: A): void;
}
export interface ParentBehavior<A> extends Parent<Child> {
    readonly at?: () => A;
    readonly last?: A;
}
export declare class PushOnlyObserver<A> implements BListener, SListener<A> {
    private callback;
    private source;
    node: Node<this>;
    constructor(callback: (a: A) => void, source: ParentBehavior<A>);
    pushB(_t: number): void;
    pushS(_t: number, value: A): void;
    deactivate(): void;
    changeStateDown(_state: State): void;
}
export declare type NodeParentPair = {
    parent: Parent<unknown>;
    node: Node<unknown>;
};
export declare abstract class Reactive<A, C extends Child> implements Child {
    state: State;
    parents: Cons<Parent<unknown>>;
    listenerNodes: Cons<NodeParentPair> | undefined;
    children: DoubleLinkedList<C>;
    constructor();
    addListener(node: Node<C>, t: number): State;
    removeListener(node: Node<C>): void;
    changeStateDown(state: State): void;
    subscribe(callback: (a: A) => void): PushOnlyObserver<A>;
    observe(push: (a: A) => void, handlePulling: PullHandler, t?: Time): CbObserver<A>;
    activate(t: number): void;
    deactivate(done?: boolean): void;
}
export declare class CbObserver<A> implements BListener, SListener<A> {
    private callback;
    readonly handlePulling: PullHandler;
    private time;
    readonly source: ParentBehavior<A>;
    private endPulling;
    node: Node<CbObserver<A>>;
    constructor(callback: (a: A) => void, handlePulling: PullHandler, time: Time, source: ParentBehavior<A>);
    pull(time?: number): void;
    pushB(_t: number): void;
    pushS(_t: number, value: A): void;
    changeStateDown(state: State): void;
}
/**
 * Observe a behavior for the purpose of running side-effects based on the value
 * of the behavior.
 * @param push Called with all values that the behavior pushes through.
 * @param handlePulling Called when the consumer should begin pulling values
 * from the behavior. The function should return a callback that will be invoked
 * once pulling should stop.
 * @param behavior The behavior to observe.
 */
export declare function observe<A>(push: (a: A) => void, handlePulling: PullHandler, behavior: Behavior<A>, time?: Time): CbObserver<A>;
