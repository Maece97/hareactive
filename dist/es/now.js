import { runIO } from "@funkia/io";
import { placeholder } from "./placeholder";
import { fromPromise, mapCbFuture } from "./future";
import { mapCbStream, isStream } from "./stream";
import { tick } from "./clock";
const isRecord = (a) => typeof a === "object";
export class Now {
    constructor() {
        this.multi = false;
        this.isNow = true;
    }
    static is(a) {
        return isRecord(a) && a.isNow === true;
    }
    of(b) {
        return new OfNow(b);
    }
    static of(b) {
        return new OfNow(b);
    }
    map(f) {
        return new MapNow(f, this);
    }
    mapTo(b) {
        return new MapNow((_) => b, this);
    }
    flatMap(f) {
        return new FlatMapNow(this, f);
    }
    chain(f) {
        return new FlatMapNow(this, f);
    }
    flat() {
        return new FlatMapNow(this, (n) => n);
    }
    ap(a) {
        return this.lift((f, a) => f(a), a, this);
    }
    lift(f, ...args) {
        return args.length === 1
            ? new MapNow(f, args[0])
            : new LiftNow(f, args);
    }
}
Now.multi = false;
export class OfNow extends Now {
    constructor(value) {
        super();
        this.value = value;
    }
    run(_) {
        return this.value;
    }
}
export class MapNow extends Now {
    constructor(f, parent) {
        super();
        this.f = f;
        this.parent = parent;
    }
    run(t) {
        return this.f(this.parent.run(t));
    }
}
export class LiftNow extends Now {
    constructor(f, parents) {
        super();
        this.f = f;
        this.parents = parents;
    }
    run(t) {
        return this.f(...this.parents.map((n) => n.run(t)));
    }
}
export class FlatMapNow extends Now {
    constructor(first, f) {
        super();
        this.first = first;
        this.f = f;
    }
    run(t) {
        return this.f(this.first.run(t)).run(t);
    }
}
export class SampleNow extends Now {
    constructor(b) {
        super();
        this.b = b;
    }
    run(t) {
        return this.b.at(t);
    }
}
export function sample(b) {
    return new SampleNow(b);
}
export class PerformNow extends Now {
    constructor(_run) {
        super();
        this._run = _run;
    }
    run() {
        return this._run();
    }
}
/**
 * Create a now-computation that executes the effectful computation `cb` when it
 * is run.
 */
export function perform(cb) {
    return new PerformNow(cb);
}
export function performIO(comp) {
    return perform(() => fromPromise(runIO(comp)));
}
export function performStream(s) {
    return perform(() => mapCbStream((io, cb) => cb(fromPromise(runIO(io))), s));
}
export class PerformMapNow extends Now {
    constructor(cb, s) {
        super();
        this.cb = cb;
        this.s = s;
    }
    run() {
        return isStream(this.s)
            ? mapCbStream((value, done) => done(this.cb(value)), this.s)
            : mapCbFuture((value, done) => done(this.cb(value)), this.s);
    }
}
export function performMap(cb, s) {
    return perform(() => isStream(s)
        ? mapCbStream((value, done) => done(cb(value)), s)
        : mapCbFuture((value, done) => done(cb(value)), s));
}
export function plan(future) {
    return performMap(runNow, future);
}
export function runNow(now, time = tick()) {
    return now.run(time);
}
const placeholderProxyHandler = {
    get: function (target, name) {
        if (!(name in target)) {
            target[name] = placeholder();
        }
        return target[name];
    }
};
class LoopNow extends Now {
    constructor(fn, placeholderNames) {
        super();
        this.fn = fn;
        this.placeholderNames = placeholderNames;
    }
    run(t) {
        let placeholderObject;
        if (this.placeholderNames === undefined) {
            placeholderObject = new Proxy({}, placeholderProxyHandler);
        }
        else {
            placeholderObject = {};
            for (const name of this.placeholderNames) {
                placeholderObject[name] = placeholder();
            }
        }
        const result = this.fn(placeholderObject).run(t);
        const returned = Object.keys(result);
        for (const name of returned) {
            placeholderObject[name].replaceWith(result[name]);
        }
        return result;
    }
}
export function loopNow(fn, names) {
    return new LoopNow(fn, names);
}
export class InstantNow extends Now {
    constructor(fn) {
        super();
        this.fn = fn;
    }
    run(t) {
        return this.fn((now) => now.run(t));
    }
}
export function instant(fn) {
    return new InstantNow(fn);
}
