import { cons, DoubleLinkedList, Node } from "./datastructures";
import { tick } from "./clock";
function isBehavior(b) {
    return typeof b === "object" && "at" in b;
}
export class PushOnlyObserver {
    constructor(callback, source) {
        this.callback = callback;
        this.source = source;
        this.node = new Node(this);
        source.addListener(this.node, tick());
        if (isBehavior(source) && source.state === 1 /* Push */) {
            callback(source.at());
        }
    }
    pushB(_t) {
        this.callback(this.source.last);
    }
    pushS(_t, value) {
        this.callback(value);
    }
    deactivate() {
        this.source.removeListener(this.node);
    }
    changeStateDown(_state) { }
}
export class Reactive {
    constructor() {
        this.children = new DoubleLinkedList();
        this.state = 3 /* Inactive */;
    }
    addListener(node, t) {
        const firstChild = this.children.head === undefined;
        this.children.prepend(node);
        if (firstChild) {
            this.activate(t);
        }
        return this.state;
    }
    removeListener(node) {
        this.children.remove(node);
        if (this.children.head === undefined && this.state !== 0 /* Done */) {
            this.deactivate();
        }
    }
    changeStateDown(state) {
        if (this.state !== state) {
            this.state = state;
            for (const child of this.children) {
                child.changeStateDown(state);
            }
        }
    }
    subscribe(callback) {
        return new PushOnlyObserver(callback, this);
    }
    observe(push, handlePulling, t = tick()) {
        return new CbObserver(push, handlePulling, t, this);
    }
    activate(t) {
        let newState = 0 /* Done */;
        for (const parent of this.parents) {
            const node = new Node(this);
            this.listenerNodes = cons({ node, parent }, this.listenerNodes);
            parent.addListener(node, t);
            newState = Math.max(newState, parent.state);
        }
        if (this.state === 3 /* Inactive */) {
            this.state = newState;
        }
    }
    deactivate(done = false) {
        if (this.listenerNodes !== undefined) {
            for (const { node, parent } of this.listenerNodes) {
                parent.removeListener(node);
            }
        }
        this.state = done === true ? 0 /* Done */ : 3 /* Inactive */;
    }
}
export class CbObserver {
    constructor(callback, handlePulling, time, source) {
        this.callback = callback;
        this.handlePulling = handlePulling;
        this.time = time;
        this.source = source;
        this.node = new Node(this);
        source.addListener(this.node, tick());
        if (source.state === 2 /* Pull */) {
            this.endPulling = handlePulling(this.pull.bind(this));
        }
        else if (isBehavior(source) && source.state === 1 /* Push */) {
            callback(source.last);
        }
        this.time = undefined;
    }
    pull(time) {
        const t = time !== undefined ? time : this.time !== undefined ? this.time : tick();
        if (isBehavior(this.source) && this.source.state === 2 /* Pull */) {
            this.source.pull(t);
            this.callback(this.source.last);
        }
    }
    pushB(_t) {
        this.callback(this.source.last);
    }
    pushS(_t, value) {
        this.callback(value);
    }
    changeStateDown(state) {
        if (state === 2 /* Pull */) {
            this.endPulling = this.handlePulling(this.pull.bind(this));
        }
        else if (this.endPulling !== undefined) {
            // We where pulling before but are no longer pulling
            this.endPulling();
            this.endPulling = undefined;
        }
    }
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
export function observe(push, handlePulling, behavior, time) {
    return behavior.observe(push, handlePulling, time);
}
