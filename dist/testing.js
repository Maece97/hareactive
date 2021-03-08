"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testNow = exports.assertBehaviorEqual = exports.testAt = exports.testBehavior = exports.assertStreamEqual = exports.testStreamFromObject = exports.testStreamFromArray = exports.assertFutureEqual = exports.testFuture = exports.doesOccur = exports.neverOccurringFuture = void 0;
var tslib_1 = require("tslib");
var assert = require("assert");
var stream_1 = require("./stream");
var behavior_1 = require("./behavior");
var future_1 = require("./future");
var now_1 = require("./now");
var time_1 = require("./time");
exports.neverOccurringFuture = {
    time: "infinity",
    value: undefined
};
function doesOccur(future) {
    return future.time !== "infinity";
}
exports.doesOccur = doesOccur;
future_1.CombineFuture.prototype.model = function () {
    var a = this.parentA.model();
    var b = this.parentB.model();
    return doesOccur(a) && (!doesOccur(b) || a.time <= b.time) ? a : b;
};
future_1.MapFuture.prototype.model = function () {
    var p = this.parent.model();
    return doesOccur(p)
        ? { time: p.time, value: this.f(p.value) }
        : exports.neverOccurringFuture;
};
future_1.MapToFuture.prototype.model = function () {
    var p = this.parent.model();
    return doesOccur(p)
        ? { time: p.time, value: this.value }
        : exports.neverOccurringFuture;
};
future_1.OfFuture.prototype.model = function () {
    return { time: -Infinity, value: this.value };
};
future_1.NeverFuture.prototype.model = function () {
    return exports.neverOccurringFuture;
};
future_1.LiftFuture.prototype.model = function () {
    var sems = this.futures.map(function (f) { return f.model(); });
    var time = Math.max.apply(Math, tslib_1.__spread(sems.map(function (s) { return (doesOccur(s) ? s.time : Infinity); })));
    return time !== Infinity
        ? { time: time, value: this.f.apply(this, tslib_1.__spread(sems.map(function (s) { return s.value; }))) }
        : exports.neverOccurringFuture;
};
future_1.FlatMapFuture.prototype.model = function () {
    var a = this.parent.model();
    if (doesOccur(a)) {
        var b = this.f(a.value).model();
        if (doesOccur(b)) {
            return { time: Math.max(a.time, b.time), value: b.value };
        }
    }
    return exports.neverOccurringFuture;
};
future_1.NextOccurrenceFuture.prototype.model = function () {
    var _this = this;
    var occ = this.s.model().find(function (o) { return o.time > _this.time; });
    return occ !== undefined ? occ : exports.neverOccurringFuture;
};
var TestFuture = /** @class */ (function (_super) {
    tslib_1.__extends(TestFuture, _super);
    function TestFuture(semanticFuture) {
        var _this = _super.call(this) || this;
        _this.semanticFuture = semanticFuture;
        return _this;
    }
    /* istanbul ignore next */
    TestFuture.prototype.pushS = function (_t, _val) {
        throw new Error("You cannot push to a TestFuture");
    };
    TestFuture.prototype.model = function () {
        return this.semanticFuture;
    };
    /* istanbul ignore next */
    TestFuture.prototype.push = function (_a) {
        throw new Error("You cannot push to a TestFuture");
    };
    return TestFuture;
}(future_1.Future));
function testFuture(time, value) {
    return new TestFuture({ time: time, value: value });
}
exports.testFuture = testFuture;
function assertFutureEqual(future1, future2) {
    var a = future1.model();
    var b = future2.model();
    assert.deepEqual(a, b);
}
exports.assertFutureEqual = assertFutureEqual;
stream_1.MapStream.prototype.model = function () {
    var _this = this;
    var s = this.parent.model();
    return s.map(function (_b) {
        var time = _b.time, value = _b.value;
        return ({ time: time, value: _this.f(value) });
    });
};
stream_1.MapToStream.prototype.model = function () {
    var _this = this;
    var s = this.parents.value.model();
    return s.map(function (_b) {
        var time = _b.time;
        return ({ time: time, value: _this.b });
    });
};
stream_1.FilterStream.prototype.model = function () {
    var _this = this;
    var s = this.parent.model();
    return s.filter(function (_b) {
        var value = _b.value;
        return _this.fn(value);
    });
};
stream_1.empty.model = function () { return []; };
stream_1.ScanStream.prototype.model = function () {
    var _this = this;
    var s = this.parent.model();
    var acc = this.last;
    return s
        .filter(function (o) { return _this.t < o.time; })
        .map(function (_b) {
        var time = _b.time, value = _b.value;
        acc = _this.f(value, acc);
        return { time: time, value: acc };
    });
};
stream_1.CombineStream.prototype.model = function () {
    var result = [];
    var a = this.s1.model();
    var b = this.s2.model();
    for (var i = 0, j = 0; i < a.length || j < b.length;) {
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
stream_1.SnapshotStream.prototype.model = function () {
    var _this = this;
    return this.trigger
        .model()
        .map(function (_b) {
        var time = _b.time;
        return ({ time: time, value: testAt(time, _this.target) });
    });
};
time_1.DelayStream.prototype.model = function () {
    var _this = this;
    var s = this.parents.value.model();
    return s.map(function (_b) {
        var time = _b.time, value = _b.value;
        return ({ time: time + _this.ms, value: value });
    });
};
var flatFuture = function (o) {
    var _b = o.value.model(), time = _b.time, value = _b.value;
    return time === "infinity" ? [] : [{ time: Math.max(o.time, time), value: value }];
};
stream_1.FlatFutures.prototype.model = function () {
    return this.parents.value
        .model()
        .flatMap(flatFuture)
        .sort(function (o, p) { return o.time - p.time; }); // FIXME: Should use stable sort here
};
stream_1.FlatFuturesOrdered.prototype.model = function () {
    return this.parents.value
        .model()
        .flatMap(flatFuture)
        .reduce(function (acc, o) {
        var last = acc.length === 0 ? -Infinity : acc[acc.length - 1].time;
        return acc.concat([{ time: Math.max(last, o.time), value: o.value }]);
    }, []);
};
stream_1.FlatFuturesLatest.prototype.model = function () {
    return this.parents.value
        .model()
        .flatMap(flatFuture)
        .reduceRight(function (acc, o) {
        var last = acc.length === 0 ? Infinity : acc[0].time;
        return last < o.time
            ? acc
            : [{ time: o.time, value: o.value }].concat(acc);
    }, []);
};
var TestStream = /** @class */ (function (_super) {
    tslib_1.__extends(TestStream, _super);
    function TestStream(streamModel) {
        var _this = _super.call(this) || this;
        _this.streamModel = streamModel;
        return _this;
    }
    TestStream.prototype.model = function () {
        return this.streamModel;
    };
    /* istanbul ignore next */
    TestStream.prototype.activate = function () {
        // throw new Error("You cannot activate a TestStream");
    };
    /* istanbul ignore next */
    TestStream.prototype.deactivate = function () {
        throw new Error("You cannot deactivate a TestStream");
    };
    /* istanbul ignore next */
    TestStream.prototype.pushS = function (_t, _a) {
        throw new Error("You cannot push to a TestStream");
    };
    return TestStream;
}(stream_1.Stream));
function testStreamFromArray(array) {
    var semanticStream = array.map(function (_b) {
        var _c = tslib_1.__read(_b, 2), t = _c[0], value = _c[1];
        return ({ value: value, time: t });
    });
    return new TestStream(semanticStream);
}
exports.testStreamFromArray = testStreamFromArray;
function testStreamFromObject(object) {
    var semanticStream = Object.keys(object).map(function (key) { return ({
        time: parseFloat(key),
        value: object[key]
    }); });
    return new TestStream(semanticStream);
}
exports.testStreamFromObject = testStreamFromObject;
function assertStreamEqual(s1, s2) {
    var s2_ = stream_1.isStream(s2)
        ? s2
        : Array.isArray(s2)
            ? testStreamFromArray(s2)
            : testStreamFromObject(s2);
    assert.deepEqual(s1.model(), s2_.model());
}
exports.assertStreamEqual = assertStreamEqual;
behavior_1.MapBehavior.prototype.model = function () {
    var _this = this;
    var g = this.parent.model();
    return function (t) { return _this.f(g(t)); };
};
behavior_1.ConstantBehavior.prototype.model = function () {
    var _this = this;
    return function (_) { return _this.last; };
};
behavior_1.FunctionBehavior.prototype.model = function () {
    var _this = this;
    return function (t) { return _this.f(t); };
};
time_1.time.model = function () { return function (t) { return t; }; };
behavior_1.AccumBehavior.prototype.model = function () {
    var _this = this;
    var stream = this.source.model();
    return function (t1) {
        return testBehavior(function (t2) {
            return stream
                .filter(function (_b) {
                var time = _b.time;
                return t1 <= time && time < t2;
            })
                .map(function (o) { return o.value; })
                .reduce(function (acc, cur) { return _this.f(cur, acc); }, _this.initial);
        });
    };
};
var TestBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(TestBehavior, _super);
    function TestBehavior(semanticBehavior) {
        var _this = _super.call(this) || this;
        _this.semanticBehavior = semanticBehavior;
        return _this;
    }
    /* istanbul ignore next */
    TestBehavior.prototype.update = function (_t) {
        throw new Error("Test behavior never updates");
    };
    TestBehavior.prototype.model = function () {
        return this.semanticBehavior;
    };
    return TestBehavior;
}(behavior_1.Behavior));
function testBehavior(b) {
    return new TestBehavior(b);
}
exports.testBehavior = testBehavior;
/**
 * Takes a behavior created from test data, a point in timer and returns the
 * behaviors value at that point in time.
 */
function testAt(t, b) {
    return b.model()(t);
}
exports.testAt = testAt;
function assertBehaviorEqual(b1, b2) {
    var e_1, _b;
    var b = b1.model();
    try {
        for (var _c = tslib_1.__values(Object.entries(b2)), _d = _c.next(); !_d.done; _d = _c.next()) {
            var _e = tslib_1.__read(_d.value, 2), t = _e[0], v = _e[1];
            assert.deepEqual(b(parseFloat(t)), v);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
exports.assertBehaviorEqual = assertBehaviorEqual;
now_1.OfNow.prototype.model = function (mocks, _t) {
    return { value: this.value, mocks: mocks };
};
now_1.MapNow.prototype.model = function (mocks, t) {
    var _b = this.parent.model(mocks, t), value = _b.value, m = _b.mocks;
    return { value: this.f(value), mocks: m };
};
now_1.FlatMapNow.prototype.model = function (mocks, t) {
    var _b = this.first.model(mocks, t), value = _b.value, m = _b.mocks;
    return this.f(value).model(m, t);
};
now_1.InstantNow.prototype.model = function (mocks, t) {
    var m = mocks;
    var value = this.fn(function (now) {
        var r = now.model(m, t);
        m = r.mocks;
        return r.value;
    });
    return {
        value: value,
        mocks: m
    };
};
now_1.SampleNow.prototype.model = function (mocks, t) {
    return { value: testAt(t, this.b), mocks: mocks };
};
now_1.PerformNow.prototype.model = function (_b, _t) {
    var _c = tslib_1.__read(_b), value = _c[0], mocks = _c.slice(1);
    return { value: value, mocks: mocks };
};
now_1.PerformMapNow.prototype.model = function (_b, _t) {
    var _c = tslib_1.__read(_b), value = _c[0], mocks = _c.slice(1);
    return { value: value, mocks: mocks };
};
/**
 * Test run a now computation without executing its side-effects.
 * @param now The now computation to test.
 * @param mocks
 * @param time The point in time at which the now computation should
 * be run. Defaults to 0.
 */
function testNow(now, mocks, time) {
    if (mocks === void 0) { mocks = []; }
    if (time === void 0) { time = 0; }
    return now.model(mocks, time).value;
}
exports.testNow = testNow;
