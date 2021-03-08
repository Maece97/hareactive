"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCbFuture = exports.nextOccurrence = exports.nextOccurrenceFrom = exports.NextOccurrenceFuture = exports.BehaviorFuture = exports.toPromise = exports.fromPromise = exports.sinkFuture = exports.SinkFuture = exports.FlatMapFuture = exports.LiftFuture = exports.ActiveFuture = exports.never = exports.NeverFuture = exports.OfFuture = exports.MapToFuture = exports.MapFuture = exports.CombineFuture = exports.isFuture = exports.Future = void 0;
var tslib_1 = require("tslib");
var common_1 = require("./common");
var datastructures_1 = require("./datastructures");
var behavior_1 = require("./behavior");
var clock_1 = require("./clock");
var now_1 = require("./now");
/**
 * A future is a thing that occurs at some point in time with a value.
 * It can be understood as a pair consisting of the time the future
 * occurs and its associated value. It is quite like a JavaScript
 * promise.
 */
var Future = /** @class */ (function (_super) {
    tslib_1.__extends(Future, _super);
    function Future() {
        var _this = _super.call(this) || this;
        _this.multi = false;
        return _this;
    }
    Future.prototype.pull = function () {
        throw new Error("Pull not implemented on future");
    };
    Future.prototype.resolve = function (val, t) {
        if (t === void 0) { t = clock_1.tick(); }
        this.deactivate(true);
        this.value = val;
        this.pushSToChildren(t, val);
    };
    Future.prototype.pushSToChildren = function (t, val) {
        var e_1, _a;
        try {
            for (var _b = tslib_1.__values(this.children), _c = _b.next(); !_c.done; _c = _b.next()) {
                var child = _c.value;
                child.pushS(t, val);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    Future.prototype.addListener = function (node, t) {
        if (this.state === 0 /* Done */) {
            node.value.pushS(t, this.value);
            return 0 /* Done */;
        }
        else {
            return _super.prototype.addListener.call(this, node, t);
        }
    };
    Future.prototype.combine = function (future) {
        return new CombineFuture(this, future);
    };
    // A future is a functor, when the future occurs we can feed its
    // result through the mapping function
    Future.prototype.map = function (f) {
        return new MapFuture(f, this);
    };
    Future.prototype.mapTo = function (b) {
        return new MapToFuture(b, this);
    };
    // A future is an applicative. `of` gives a future that has always
    // occurred at all points in time.
    Future.of = function (b) {
        return new OfFuture(b);
    };
    Future.prototype.of = function (b) {
        return new OfFuture(b);
    };
    Future.prototype.lift = function (f) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return args.length === 1
            ? new MapFuture(f, args[0])
            : new LiftFuture(f, args);
    };
    // A future is a monad. Once the first future occurs `flatMap` passes its
    // value through the function and the future it returns is the one returned by
    // `flatMap`.
    Future.prototype.flatMap = function (f) {
        return new FlatMapFuture(f, this);
    };
    Future.prototype.chain = function (f) {
        return new FlatMapFuture(f, this);
    };
    Future.prototype.flat = function () {
        return new FlatMapFuture(function (f) { return f; }, this);
    };
    return Future;
}(common_1.Reactive));
exports.Future = Future;
function isFuture(a) {
    return typeof a === "object" && "resolve" in a;
}
exports.isFuture = isFuture;
var CombineFuture = /** @class */ (function (_super) {
    tslib_1.__extends(CombineFuture, _super);
    function CombineFuture(parentA, parentB) {
        var _this = _super.call(this) || this;
        _this.parentA = parentA;
        _this.parentB = parentB;
        _this.parents = datastructures_1.cons(parentA, datastructures_1.cons(parentB));
        return _this;
    }
    CombineFuture.prototype.pushS = function (t, val) {
        this.resolve(val, t);
    };
    return CombineFuture;
}(Future));
exports.CombineFuture = CombineFuture;
var MapFuture = /** @class */ (function (_super) {
    tslib_1.__extends(MapFuture, _super);
    function MapFuture(f, parent) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.parent = parent;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    MapFuture.prototype.pushS = function (t, val) {
        this.resolve(this.f(val), t);
    };
    return MapFuture;
}(Future));
exports.MapFuture = MapFuture;
var MapToFuture = /** @class */ (function (_super) {
    tslib_1.__extends(MapToFuture, _super);
    function MapToFuture(value, parent) {
        var _this = _super.call(this) || this;
        _this.value = value;
        _this.parent = parent;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    MapToFuture.prototype.pushS = function (t) {
        this.resolve(this.value, t);
    };
    return MapToFuture;
}(Future));
exports.MapToFuture = MapToFuture;
var OfFuture = /** @class */ (function (_super) {
    tslib_1.__extends(OfFuture, _super);
    function OfFuture(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        _this.state = 0 /* Done */;
        return _this;
    }
    /* istanbul ignore next */
    OfFuture.prototype.pushS = function () {
        throw new Error("A PureFuture should never be pushed to.");
    };
    return OfFuture;
}(Future));
exports.OfFuture = OfFuture;
var NeverFuture = /** @class */ (function (_super) {
    tslib_1.__extends(NeverFuture, _super);
    function NeverFuture() {
        var _this = _super.call(this) || this;
        _this.state = 0 /* Done */;
        return _this;
    }
    NeverFuture.prototype.addListener = function () {
        return 0 /* Done */;
    };
    /* istanbul ignore next */
    NeverFuture.prototype.pushS = function () {
        throw new Error("A NeverFuture should never be pushed to.");
    };
    return NeverFuture;
}(Future));
exports.NeverFuture = NeverFuture;
exports.never = new NeverFuture();
/** For stateful futures that are always active */
var ActiveFuture = /** @class */ (function (_super) {
    tslib_1.__extends(ActiveFuture, _super);
    function ActiveFuture() {
        var _this = _super.call(this) || this;
        _this.state = 1 /* Push */;
        return _this;
    }
    ActiveFuture.prototype.activate = function () { };
    return ActiveFuture;
}(Future));
exports.ActiveFuture = ActiveFuture;
var LiftFuture = /** @class */ (function (_super) {
    tslib_1.__extends(LiftFuture, _super);
    function LiftFuture(f, futures) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.futures = futures;
        _this.missing = futures.length;
        _this.parents = datastructures_1.fromArray(futures);
        return _this;
    }
    LiftFuture.prototype.pushS = function (t) {
        if (--this.missing === 0) {
            // All the dependencies have occurred.
            for (var i = 0; i < this.futures.length; ++i) {
                this.futures[i] = this.futures[i].value;
            }
            this.resolve(this.f.apply(undefined, this.futures), t);
        }
    };
    return LiftFuture;
}(Future));
exports.LiftFuture = LiftFuture;
var FlatMapFuture = /** @class */ (function (_super) {
    tslib_1.__extends(FlatMapFuture, _super);
    function FlatMapFuture(f, parent) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.parent = parent;
        _this.parentOccurred = false;
        _this.node = new datastructures_1.Node(_this);
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    //FIXME: remove any by splitting listeners to accept A and forward it to B through f
    FlatMapFuture.prototype.pushS = function (t, val) {
        if (this.parentOccurred === false) {
            // The first future occurred. We can now call `f` with its value
            // and listen to the future it returns.
            this.parentOccurred = true;
            var newFuture = this.f(val);
            newFuture.addListener(this.node, t);
        }
        else {
            this.resolve(val, t);
        }
    };
    return FlatMapFuture;
}(Future));
exports.FlatMapFuture = FlatMapFuture;
/**
 * A Sink is a producer that one can imperatively resolve.
 * @private
 */
var SinkFuture = /** @class */ (function (_super) {
    tslib_1.__extends(SinkFuture, _super);
    function SinkFuture() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* istanbul ignore next */
    SinkFuture.prototype.pushS = function () {
        throw new Error("A sink should not be pushed to.");
    };
    return SinkFuture;
}(ActiveFuture));
exports.SinkFuture = SinkFuture;
function sinkFuture() {
    return new SinkFuture();
}
exports.sinkFuture = sinkFuture;
function fromPromise(promise) {
    var future = sinkFuture();
    promise.then(future.resolve.bind(future));
    return future;
}
exports.fromPromise = fromPromise;
function toPromise(future) {
    return new Promise(function (resolve, _reject) {
        future.subscribe(resolve);
    });
}
exports.toPromise = toPromise;
/**
 * Create a future from a pushing behavior. The future occurs when the
 * behavior pushes its next value. Constructing a BehaviorFuture is
 * impure and should not be done directly.
 * @private
 */
var BehaviorFuture = /** @class */ (function (_super) {
    tslib_1.__extends(BehaviorFuture, _super);
    function BehaviorFuture(b) {
        var _this = _super.call(this) || this;
        _this.b = b;
        _this.node = new datastructures_1.Node(_this);
        b.addListener(_this.node, clock_1.tick());
        return _this;
    }
    /* istanbul ignore next */
    BehaviorFuture.prototype.changeStateDown = function (_state) {
        throw new Error("Behavior future does not support pulling behavior");
    };
    BehaviorFuture.prototype.pushB = function (t) {
        this.b.removeListener(this.node);
        this.resolve(this.b.last, t);
    };
    return BehaviorFuture;
}(SinkFuture));
exports.BehaviorFuture = BehaviorFuture;
var NextOccurrenceFuture = /** @class */ (function (_super) {
    tslib_1.__extends(NextOccurrenceFuture, _super);
    function NextOccurrenceFuture(s, time) {
        var _this = _super.call(this) || this;
        _this.s = s;
        _this.time = time;
        _this.parents = datastructures_1.cons(s);
        return _this;
    }
    NextOccurrenceFuture.prototype.pushS = function (t, val) {
        this.resolve(val, t);
    };
    return NextOccurrenceFuture;
}(Future));
exports.NextOccurrenceFuture = NextOccurrenceFuture;
function nextOccurrenceFrom(stream) {
    return new behavior_1.FunctionBehavior(function (t) { return new NextOccurrenceFuture(stream, t); });
}
exports.nextOccurrenceFrom = nextOccurrenceFrom;
function nextOccurrence(stream) {
    return now_1.sample(nextOccurrenceFrom(stream));
}
exports.nextOccurrence = nextOccurrence;
var MapCbFuture = /** @class */ (function (_super) {
    tslib_1.__extends(MapCbFuture, _super);
    function MapCbFuture(cb, parent) {
        var _this = _super.call(this) || this;
        _this.cb = cb;
        _this.node = new datastructures_1.Node(_this);
        _this.doneCb = function (result) { return _this.resolve(result); };
        _this.parents = datastructures_1.cons(parent);
        parent.addListener(_this.node, clock_1.tick());
        return _this;
    }
    MapCbFuture.prototype.pushS = function (_, value) {
        this.cb(value, this.doneCb);
    };
    return MapCbFuture;
}(ActiveFuture));
/**
 * Invokes the callback when the future occurs.
 *
 * This function is intended to be a low-level function used as the
 * basis for other operators.
 */
function mapCbFuture(cb, future) {
    return new MapCbFuture(cb, future);
}
exports.mapCbFuture = mapCbFuture;
