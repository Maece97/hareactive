"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instant = exports.InstantNow = exports.loopNow = exports.runNow = exports.plan = exports.performMap = exports.PerformMapNow = exports.performStream = exports.performIO = exports.perform = exports.PerformNow = exports.sample = exports.SampleNow = exports.FlatMapNow = exports.LiftNow = exports.MapNow = exports.OfNow = exports.Now = void 0;
var tslib_1 = require("tslib");
var io_1 = require("@funkia/io");
var placeholder_1 = require("./placeholder");
var future_1 = require("./future");
var stream_1 = require("./stream");
var clock_1 = require("./clock");
var isRecord = function (a) {
    return typeof a === "object";
};
var Now = /** @class */ (function () {
    function Now() {
        this.multi = false;
        this.isNow = true;
    }
    Now.is = function (a) {
        return isRecord(a) && a.isNow === true;
    };
    Now.prototype.of = function (b) {
        return new OfNow(b);
    };
    Now.of = function (b) {
        return new OfNow(b);
    };
    Now.prototype.map = function (f) {
        return new MapNow(f, this);
    };
    Now.prototype.mapTo = function (b) {
        return new MapNow(function (_) { return b; }, this);
    };
    Now.prototype.flatMap = function (f) {
        return new FlatMapNow(this, f);
    };
    Now.prototype.chain = function (f) {
        return new FlatMapNow(this, f);
    };
    Now.prototype.flat = function () {
        return new FlatMapNow(this, function (n) { return n; });
    };
    Now.prototype.ap = function (a) {
        return this.lift(function (f, a) { return f(a); }, a, this);
    };
    Now.prototype.lift = function (f) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return args.length === 1
            ? new MapNow(f, args[0])
            : new LiftNow(f, args);
    };
    Now.multi = false;
    return Now;
}());
exports.Now = Now;
var OfNow = /** @class */ (function (_super) {
    tslib_1.__extends(OfNow, _super);
    function OfNow(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        return _this;
    }
    OfNow.prototype.run = function (_) {
        return this.value;
    };
    return OfNow;
}(Now));
exports.OfNow = OfNow;
var MapNow = /** @class */ (function (_super) {
    tslib_1.__extends(MapNow, _super);
    function MapNow(f, parent) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.parent = parent;
        return _this;
    }
    MapNow.prototype.run = function (t) {
        return this.f(this.parent.run(t));
    };
    return MapNow;
}(Now));
exports.MapNow = MapNow;
var LiftNow = /** @class */ (function (_super) {
    tslib_1.__extends(LiftNow, _super);
    function LiftNow(f, parents) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.parents = parents;
        return _this;
    }
    LiftNow.prototype.run = function (t) {
        return this.f.apply(this, tslib_1.__spread(this.parents.map(function (n) { return n.run(t); })));
    };
    return LiftNow;
}(Now));
exports.LiftNow = LiftNow;
var FlatMapNow = /** @class */ (function (_super) {
    tslib_1.__extends(FlatMapNow, _super);
    function FlatMapNow(first, f) {
        var _this = _super.call(this) || this;
        _this.first = first;
        _this.f = f;
        return _this;
    }
    FlatMapNow.prototype.run = function (t) {
        return this.f(this.first.run(t)).run(t);
    };
    return FlatMapNow;
}(Now));
exports.FlatMapNow = FlatMapNow;
var SampleNow = /** @class */ (function (_super) {
    tslib_1.__extends(SampleNow, _super);
    function SampleNow(b) {
        var _this = _super.call(this) || this;
        _this.b = b;
        return _this;
    }
    SampleNow.prototype.run = function (t) {
        return this.b.at(t);
    };
    return SampleNow;
}(Now));
exports.SampleNow = SampleNow;
function sample(b) {
    return new SampleNow(b);
}
exports.sample = sample;
var PerformNow = /** @class */ (function (_super) {
    tslib_1.__extends(PerformNow, _super);
    function PerformNow(_run) {
        var _this = _super.call(this) || this;
        _this._run = _run;
        return _this;
    }
    PerformNow.prototype.run = function () {
        return this._run();
    };
    return PerformNow;
}(Now));
exports.PerformNow = PerformNow;
/**
 * Create a now-computation that executes the effectful computation `cb` when it
 * is run.
 */
function perform(cb) {
    return new PerformNow(cb);
}
exports.perform = perform;
function performIO(comp) {
    return perform(function () { return future_1.fromPromise(io_1.runIO(comp)); });
}
exports.performIO = performIO;
function performStream(s) {
    return perform(function () {
        return stream_1.mapCbStream(function (io, cb) { return cb(future_1.fromPromise(io_1.runIO(io))); }, s);
    });
}
exports.performStream = performStream;
var PerformMapNow = /** @class */ (function (_super) {
    tslib_1.__extends(PerformMapNow, _super);
    function PerformMapNow(cb, s) {
        var _this = _super.call(this) || this;
        _this.cb = cb;
        _this.s = s;
        return _this;
    }
    PerformMapNow.prototype.run = function () {
        var _this = this;
        return stream_1.isStream(this.s)
            ? stream_1.mapCbStream(function (value, done) { return done(_this.cb(value)); }, this.s)
            : future_1.mapCbFuture(function (value, done) { return done(_this.cb(value)); }, this.s);
    };
    return PerformMapNow;
}(Now));
exports.PerformMapNow = PerformMapNow;
function performMap(cb, s) {
    return perform(function () {
        return stream_1.isStream(s)
            ? stream_1.mapCbStream(function (value, done) { return done(cb(value)); }, s)
            : future_1.mapCbFuture(function (value, done) { return done(cb(value)); }, s);
    });
}
exports.performMap = performMap;
function plan(future) {
    return performMap(runNow, future);
}
exports.plan = plan;
function runNow(now, time) {
    if (time === void 0) { time = clock_1.tick(); }
    return now.run(time);
}
exports.runNow = runNow;
var placeholderProxyHandler = {
    get: function (target, name) {
        if (!(name in target)) {
            target[name] = placeholder_1.placeholder();
        }
        return target[name];
    }
};
var LoopNow = /** @class */ (function (_super) {
    tslib_1.__extends(LoopNow, _super);
    function LoopNow(fn, placeholderNames) {
        var _this = _super.call(this) || this;
        _this.fn = fn;
        _this.placeholderNames = placeholderNames;
        return _this;
    }
    LoopNow.prototype.run = function (t) {
        var e_1, _a, e_2, _b;
        var placeholderObject;
        if (this.placeholderNames === undefined) {
            placeholderObject = new Proxy({}, placeholderProxyHandler);
        }
        else {
            placeholderObject = {};
            try {
                for (var _c = tslib_1.__values(this.placeholderNames), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var name_1 = _d.value;
                    placeholderObject[name_1] = placeholder_1.placeholder();
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        var result = this.fn(placeholderObject).run(t);
        var returned = Object.keys(result);
        try {
            for (var returned_1 = tslib_1.__values(returned), returned_1_1 = returned_1.next(); !returned_1_1.done; returned_1_1 = returned_1.next()) {
                var name_2 = returned_1_1.value;
                placeholderObject[name_2].replaceWith(result[name_2]);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (returned_1_1 && !returned_1_1.done && (_b = returned_1.return)) _b.call(returned_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return result;
    };
    return LoopNow;
}(Now));
function loopNow(fn, names) {
    return new LoopNow(fn, names);
}
exports.loopNow = loopNow;
var InstantNow = /** @class */ (function (_super) {
    tslib_1.__extends(InstantNow, _super);
    function InstantNow(fn) {
        var _this = _super.call(this) || this;
        _this.fn = fn;
        return _this;
    }
    InstantNow.prototype.run = function (t) {
        return this.fn(function (now) { return now.run(t); });
    };
    return InstantNow;
}(Now));
exports.InstantNow = InstantNow;
function instant(fn) {
    return new InstantNow(fn);
}
exports.instant = instant;
