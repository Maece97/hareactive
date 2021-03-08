import { Behavior, isBehavior, MapBehavior, pushToChildren } from "./behavior";
import { Node, cons } from "./datastructures";
import { Stream, MapToStream } from "./stream";
import { tick } from "./clock";
import { Future } from "./future";
class SamplePlaceholderError {
    constructor(placeholder) {
        this.placeholder = placeholder;
        this.message = "Attempt to sample non-replaced placeholder";
    }
    toString() {
        return this.message;
    }
}
export class Placeholder extends Behavior {
    constructor() {
        super(...arguments);
        this.node = new Node(this);
    }
    replaceWith(parent, t) {
        this.source = parent;
        this.parents = cons(parent);
        if (this.children.head !== undefined) {
            t = t !== undefined ? t : tick();
            this.activate(t);
            if (isBehavior(parent) && this.state === 1 /* Push */) {
                pushToChildren(t, this);
            }
        }
    }
    pushS(t, a) {
        for (const child of this.children) {
            child.pushS(t, a);
        }
    }
    pull(t) {
        if (this.source === undefined) {
            throw new SamplePlaceholderError(this);
        }
        else if (isBehavior(this.source)) {
            this.source.pull(t);
            this.pulledAt = t;
            this.changedAt = t;
            this.last = this.source.last;
        }
        else {
            throw new Error("Unsupported pulling on placeholder");
        }
    }
    update(_t) {
        return this.source.last;
    }
    activate(t) {
        if (this.source !== undefined) {
            this.source.addListener(this.node, t);
            if (isBehavior(this.source)) {
                this.last = this.source.last;
                this.changedAt = this.source.changedAt;
                this.pulledAt = this.source.pulledAt;
            }
            this.changeStateDown(this.source.state);
        }
    }
    deactivate(_done = false) {
        this.state = 3 /* Inactive */;
        if (this.source !== undefined) {
            this.source.removeListener(this.node);
        }
    }
    map(fn) {
        return new MapPlaceholder(this, fn);
    }
    mapTo(b) {
        return new MapToPlaceholder(this, b);
    }
}
export function isPlaceholder(p) {
    return typeof p === "object" && "replaceWith" in p;
}
class MapPlaceholder extends MapBehavior {
    pushS(t, a) {
        // @ts-ignore
        this.pushSToChildren(t, this.f(a));
    }
}
class MapToPlaceholder extends MapToStream {
    constructor(parent, last) {
        super(parent, last);
        this.last = last;
    }
    update() {
        return this.b;
    }
    pull(t) {
        if (this.changedAt === undefined) {
            this.changedAt = t;
        }
    }
}
function install(target, source) {
    for (const key of Object.getOwnPropertyNames(source.prototype)) {
        if (target.prototype[key] === undefined) {
            target.prototype[key] = source.prototype[key];
        }
    }
}
function installMethods() {
    install(Placeholder, Stream);
    install(Placeholder, Future);
    MapPlaceholder.prototype.map = Placeholder.prototype.map;
    MapPlaceholder.prototype.mapTo = Placeholder.prototype.mapTo;
    MapToPlaceholder.prototype.map = Placeholder.prototype.map;
    MapToPlaceholder.prototype.mapTo = Placeholder.prototype.mapTo;
    install(MapPlaceholder, Stream);
    install(MapPlaceholder, Future);
    install(MapToPlaceholder, Behavior);
    install(MapPlaceholder, Future);
}
export function placeholder() {
    if (Placeholder.prototype.scanFrom === undefined) {
        // The methods are installed lazily when the placeholder is first
        // used. This avoids a top-level impure expression that would
        // prevent tree-shaking.
        installMethods();
    }
    return new Placeholder();
}
