export declare class Cons<A> {
    readonly value: A;
    readonly tail: Cons<A>;
    readonly isNil: boolean;
    constructor(value: A, tail: Cons<A>, isNil: boolean);
    [Symbol.iterator](): IterableIterator<A>;
}
export declare const nil: Cons<undefined>;
export declare function cons<A>(value: A, tail?: Cons<A>): Cons<A>;
export declare function fromArray<A>(values: A[]): Cons<A>;
/**
 * A double linked list. Updates are done by mutating. Prepend, append
 * and remove all run in O(1) time.
 */
export declare class DoubleLinkedList<A> {
    head: Node<A> | undefined;
    tail: Node<A> | undefined;
    prepend(node: Node<A>): DoubleLinkedList<A>;
    remove(node: Node<A>): DoubleLinkedList<A>;
    [Symbol.iterator](): IterableIterator<A>;
}
export declare class Node<A> {
    readonly value: A;
    prev: Node<A> | undefined;
    next: Node<A> | undefined;
    constructor(value: A);
}
