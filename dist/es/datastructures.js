export class Cons {
    constructor(value, tail, isNil) {
        this.value = value;
        this.tail = tail;
        this.isNil = isNil;
    }
    *[Symbol.iterator]() {
        let head = this;
        while (head.isNil === false) {
            const v = head.value;
            head = head.tail;
            yield v;
        }
    }
}
export const nil = new Cons(undefined, undefined, true);
export function cons(value, tail = nil) {
    return new Cons(value, tail, false);
}
export function fromArray(values) {
    let list = cons(values[0]);
    for (let i = 1; i < values.length; ++i) {
        list = cons(values[i], list);
    }
    return list;
}
/**
 * A double linked list. Updates are done by mutating. Prepend, append
 * and remove all run in O(1) time.
 */
export class DoubleLinkedList {
    prepend(node) {
        if (this.tail === undefined) {
            this.tail = node;
        }
        node.next = this.head;
        if (this.head !== undefined) {
            this.head.prev = node;
        }
        node.prev = undefined;
        this.head = node;
        return this;
    }
    remove(node) {
        if (node.next !== undefined) {
            node.next.prev = node.prev;
        }
        if (node.prev !== undefined) {
            node.prev.next = node.next;
        }
        if (this.head === node) {
            this.head = node.next;
        }
        if (this.tail === node) {
            this.tail = node.prev;
        }
        node.prev = undefined;
        node.next = undefined;
        return this;
    }
    *[Symbol.iterator]() {
        let { head } = this;
        while (head !== undefined) {
            const v = head.value;
            head = head.next;
            yield v;
        }
    }
}
export class Node {
    constructor(value) {
        this.value = value;
    }
}
