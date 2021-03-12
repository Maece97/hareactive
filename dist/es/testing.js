import * as assert from "assert";
import { Stream, MapStream, MapToStream, FilterStream, empty, ScanStream, CombineStream, SnapshotStream, isStream, FlatFutures, FlatFuturesOrdered, FlatFuturesLatest } from "./stream";
import { Behavior, FlatMapBehavior, MapBehavior, AccumBehavior, FunctionBehavior, ConstantBehavior, SwitcherBehavior } from "./behavior";
import { Future, CombineFuture, NeverFuture, MapFuture, MapToFuture, OfFuture, LiftFuture, FlatMapFuture, NextOccurrenceFuture } from "./future";
import { SampleNow, OfNow, FlatMapNow, PerformNow, PerformMapNow, MapNow, InstantNow } from "./now";
import { time, DelayStream } from "./time";
import { nil } from "./datastructures";
// Future
Future.prototype.toString = function () {
    const model = this.model();
    return `{${model.time}: ${JSON.stringify(model.value)}}`;
};
export const neverOccurringFuture = {
    time: "infinity",
    value: undefined
};
export function doesOccur(future) {
    return future.time !== "infinity";
}
CombineFuture.prototype.model = function () {
    const a = this.parentA.model();
    const b = this.parentB.model();
    return doesOccur(a) && (!doesOccur(b) || a.time <= b.time) ? a : b;
};
MapFuture.prototype.model = function () {
    const p = this.parent.model();
    return doesOccur(p)
        ? { time: p.time, value: this.f(p.value) }
        : neverOccurringFuture;
};
MapToFuture.prototype.model = function () {
    const p = this.parent.model();
    return doesOccur(p)
        ? { time: p.time, value: this.value }
        : neverOccurringFuture;
};
OfFuture.prototype.model = function () {
    return { time: -Infinity, value: this.value };
};
NeverFuture.prototype.model = function () {
    return neverOccurringFuture;
};
LiftFuture.prototype.model = function () {
    const sems = this.futures.map((f) => f.model());
    const time = Math.max(...sems.map((s) => (doesOccur(s) ? s.time : Infinity)));
    return time !== Infinity
        ? { time, value: this.f(...sems.map((s) => s.value)) }
        : neverOccurringFuture;
};
FlatMapFuture.prototype.model = function () {
    const a = this.parent.model();
    if (doesOccur(a)) {
        const b = this.f(a.value).model();
        if (doesOccur(b)) {
            return { time: Math.max(a.time, b.time), value: b.value };
        }
    }
    return neverOccurringFuture;
};
NextOccurrenceFuture.prototype.model = function () {
    const occ = this.s.model().find((o) => o.time > this.time);
    return occ !== undefined ? occ : neverOccurringFuture;
};
class TestFuture extends Future {
    constructor(semanticFuture) {
        super();
        this.semanticFuture = semanticFuture;
        this.parents = nil;
    }
    /* istanbul ignore next */
    pushS(_t, _val) {
        throw new Error("You cannot push to a TestFuture");
    }
    model() {
        return this.semanticFuture;
    }
    /* istanbul ignore next */
    push(_a) {
        throw new Error("You cannot push to a TestFuture");
    }
}
export function testFuture(time, value) {
    return new TestFuture({ time, value });
}
export function assertFutureEqual(future1, future2) {
    const a = future1.model();
    const b = future2.model();
    assert.deepEqual(a, b);
}
// Stream
Stream.prototype.toString = function () {
    return `{${this.model().map((e) => `${e.time}: ${JSON.stringify(e.value)}`).join(", ")}}`;
    return JSON.stringify(this.model());
};
MapStream.prototype.model = function () {
    const s = this.parent.model();
    return s.map(({ time, value }) => ({ time, value: this.f(value) }));
};
MapToStream.prototype.model = function () {
    const s = this.parents.value.model();
    return s.map(({ time }) => ({ time, value: this.b }));
};
FilterStream.prototype.model = function () {
    const s = this.parent.model();
    return s.filter(({ value }) => this.fn(value));
};
empty.model = () => [];
ScanStream.prototype.model = function () {
    const s = this.parent.model();
    let acc = this.last;
    return s
        .filter((o) => this.t < o.time)
        .map(({ time, value }) => {
        acc = this.f(value, acc);
        return { time, value: acc };
    });
};
CombineStream.prototype.model = function () {
    const result = [];
    const a = this.s1.model();
    const b = this.s2.model();
    for (let i = 0, j = 0; i < a.length || j < b.length;) {
        if (j === b.length || (i < a.length && a[i].time <= b[j].time)) {
            result.push(a[i]);
            i++;
        }
        else {
            result.push(b[j]);
            j++;
        }
    }
    return result;
};
SnapshotStream.prototype.model = function () {
    return this.trigger
        .model()
        .map(({ time }) => ({ time, value: testAt(time, this.target) }));
};
DelayStream.prototype.model = function () {
    const s = this.parents.value.model();
    return s.map(({ time, value }) => ({ time: time + this.ms, value }));
};
const flatFuture = (o) => {
    const { time, value } = o.value.model();
    return time === "infinity" ? [] : [{ time: Math.max(o.time, time), value }];
};
FlatFutures.prototype.model = function () {
    return this.parents.value
        .model()
        .flatMap(flatFuture)
        .sort((o, p) => o.time - p.time); // FIXME: Should use stable sort here
};
FlatFuturesOrdered.prototype.model = function () {
    return this.parents.value
        .model()
        .flatMap(flatFuture)
        .reduce((acc, o) => {
        const last = acc.length === 0 ? -Infinity : acc[acc.length - 1].time;
        return acc.concat([{ time: Math.max(last, o.time), value: o.value }]);
    }, []);
};
FlatFuturesLatest.prototype.model = function () {
    return this.parents.value
        .model()
        .flatMap(flatFuture)
        .reduceRight((acc, o) => {
        const last = acc.length === 0 ? Infinity : acc[0].time;
        return last < o.time
            ? acc
            : [{ time: o.time, value: o.value }].concat(acc);
    }, []);
};
class TestStream extends Stream {
    constructor(streamModel) {
        super();
        this.streamModel = streamModel;
    }
    model() {
        return this.streamModel;
    }
    /* istanbul ignore next */
    activate() {
        // throw new Error("You cannot activate a TestStream");
    }
    /* istanbul ignore next */
    deactivate() {
        throw new Error("You cannot deactivate a TestStream");
    }
    /* istanbul ignore next */
    pushS(_t, _a) {
        throw new Error("You cannot push to a TestStream");
    }
}
export function testStreamFromArray(array) {
    const semanticStream = array.map(([t, value]) => ({ value, time: t }));
    return new TestStream(semanticStream);
}
export function testStreamFromObject(object) {
    const semanticStream = Object.keys(object).map((key) => ({
        time: parseFloat(key),
        value: object[key]
    }));
    return new TestStream(semanticStream);
}
export function assertStreamEqual(s1, s2) {
    const s2_ = isStream(s2)
        ? s2
        : Array.isArray(s2)
            ? testStreamFromArray(s2)
            : testStreamFromObject(s2);
    assert.deepEqual(s1.model(), s2_.model());
}
MapBehavior.prototype.model = function () {
    const g = this.parent.model();
    return (t) => this.f(g(t));
};
FlatMapBehavior.prototype.model = function () {
    return (t) => this.fn(this.outer.model()(t)).model()(t);
};
ConstantBehavior.prototype.model = function () {
    return (_) => this.last;
};
FunctionBehavior.prototype.model = function () {
    return (t) => this.f(t);
};
SwitcherBehavior.prototype.model = function () {
    return (t) => {
        if (isStream(this.next)) {
            const behaviorModelAtT = this.next.model()
                .reduce((o, p) => p.time >= o.time && p.time <= t && p.time >= this.t ? p : o, { time: this.t, value: this.init })
                .value;
            return testAt(t, behaviorModelAtT);
        }
        else {
            const futureModel = this.next.model();
            return testAt(t, doesOccur(futureModel) && futureModel.time <= t ? futureModel.value : this.init);
        }
    };
};
time.model = () => (t) => t;
AccumBehavior.prototype.model = function () {
    const stream = this.source.model();
    return (t1) => testBehavior((t2) => stream
        .filter(({ time }) => t1 <= time && time < t2)
        .map((o) => o.value)
        .reduce((acc, cur) => this.f(cur, acc), this.initial));
};
class TestBehavior extends Behavior {
    constructor(semanticBehavior) {
        super();
        this.semanticBehavior = semanticBehavior;
        this.parents = nil;
    }
    /* istanbul ignore next */
    update(_t) {
        throw new Error("Test behavior never updates");
    }
    model() {
        return this.semanticBehavior;
    }
}
export function testBehavior(b) {
    return new TestBehavior(b);
}
/**
 * Takes a behavior created from test data, a point in timer and returns the
 * behaviors value at that point in time.
 */
export function testAt(t, b) {
    return b.model()(t);
}
export function assertBehaviorEqual(b1, b2) {
    const b = b1.model();
    for (const [t, v] of Object.entries(b2)) {
        assert.deepEqual(b(parseFloat(t)), v);
    }
}
OfNow.prototype.model = function (mocks, _t) {
    return { value: this.value, mocks };
};
MapNow.prototype.model = function (mocks, t) {
    const { value, mocks: m } = this.parent.model(mocks, t);
    return { value: this.f(value), mocks: m };
};
FlatMapNow.prototype.model = function (mocks, t) {
    const { value, mocks: m } = this.first.model(mocks, t);
    return this.f(value).model(m, t);
};
InstantNow.prototype.model = function (mocks, t) {
    let m = mocks;
    const value = this.fn((now) => {
        const r = now.model(m, t);
        m = r.mocks;
        return r.value;
    });
    return {
        value,
        mocks: m
    };
};
SampleNow.prototype.model = function (mocks, t) {
    return { value: testAt(t, this.b), mocks };
};
PerformNow.prototype.model = function ([value, ...mocks], _t) {
    return { value, mocks };
};
PerformMapNow.prototype.model = function ([value, ...mocks], _t) {
    return { value, mocks };
};
/**
 * Test run a now computation without executing its side-effects.
 * @param now The now computation to test.
 * @param mocks
 * @param time The point in time at which the now computation should
 * be run. Defaults to 0.
 */
export function testNow(now, mocks = [], time = 0) {
    return now.model(mocks, time).value;
}
