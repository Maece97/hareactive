"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlatFuturesLatest = exports.FlatFuturesOrdered = exports.FlatFutures = exports.mapCbStream = exports.isStream = exports.selfie = exports.SelfieStream = exports.snapshotWith = exports.snapshot = exports.SnapshotStream = exports.subscribe = exports.sinkStream = exports.SinkStream = exports.producerStream = exports.ProducerStream = exports.CombineStream = exports.changes = exports.shiftFrom = exports.shift = exports.shiftCurrent = exports.scan = exports.scanFrom = exports.ScanStream = exports.empty = exports.ActiveStream = exports.keepWhen = exports.filterApply = exports.split = exports.filter = exports.apply = exports.FilterStream = exports.MapToStream = exports.MapStream = exports.Stream = void 0;
var tslib_1 = require("tslib");
var common_1 = require("./common");
var datastructures_1 = require("./datastructures");
var behavior_1 = require("./behavior");
var clock_1 = require("./clock");
var now_1 = require("./now");
/**
 * A stream is a list of occurrences over time. Each occurrence
 * happens at a point in time and has an associated value.
 */
var Stream = /** @class */ (function (_super) {
    tslib_1.__extends(Stream, _super);
    function Stream() {
        var _this = _super.call(this) || this;
        _this.children = new datastructures_1.DoubleLinkedList();
        return _this;
    }
    Stream.prototype.combine = function (stream) {
        return new CombineStream(stream, this);
    };
    Stream.prototype.map = function (f) {
        return new MapStream(this, f);
    };
    Stream.prototype.mapTo = function (b) {
        return new MapToStream(this, b);
    };
    Stream.prototype.filter = function (fn) {
        return new FilterStream(this, fn);
    };
    Stream.prototype.scan = function (fn, startingValue) {
        return scan(fn, startingValue, this);
    };
    Stream.prototype.scanFrom = function (fn, startingValue) {
        var _this = this;
        return behavior_1.fromFunction(function (t) { return new ScanStream(fn, startingValue, _this, t); });
    };
    Stream.prototype.accum = function (fn, init) {
        return behavior_1.accum(fn, init, this);
    };
    Stream.prototype.accumFrom = function (fn, init) {
        return behavior_1.accumFrom(fn, init, this);
    };
    Stream.prototype.log = function (prefix) {
        this.subscribe(function (a) {
            return prefix !== undefined ? console.log(prefix, a) : console.log(a);
        });
        return this;
    };
    Stream.prototype.pushSToChildren = function (t, value) {
        var e_1, _b;
        try {
            for (var _c = tslib_1.__values(this.children), _d = _c.next(); !_d.done; _d = _c.next()) {
                var child = _d.value;
                child.pushS(t, value);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    return Stream;
}(common_1.Reactive));
exports.Stream = Stream;
var MapStream = /** @class */ (function (_super) {
    tslib_1.__extends(MapStream, _super);
    function MapStream(parent, f) {
        var _this = _super.call(this) || this;
        _this.parent = parent;
        _this.f = f;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    MapStream.prototype.pushS = function (t, v) {
        this.pushSToChildren(t, this.f(v));
    };
    return MapStream;
}(Stream));
exports.MapStream = MapStream;
var MapToStream = /** @class */ (function (_super) {
    tslib_1.__extends(MapToStream, _super);
    function MapToStream(parent, b) {
        var _this = _super.call(this) || this;
        _this.parent = parent;
        _this.b = b;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    MapToStream.prototype.pushS = function (t, _v) {
        this.pushSToChildren(t, this.b);
    };
    return MapToStream;
}(Stream));
exports.MapToStream = MapToStream;
var FilterStream = /** @class */ (function (_super) {
    tslib_1.__extends(FilterStream, _super);
    function FilterStream(parent, fn) {
        var _this = _super.call(this) || this;
        _this.parent = parent;
        _this.fn = fn;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    FilterStream.prototype.pushS = function (t, v) {
        if (this.fn(v) === true) {
            this.pushSToChildren(t, v);
        }
    };
    return FilterStream;
}(Stream));
exports.FilterStream = FilterStream;
function apply(behavior, stream) {
    // FIXME: The implementation here should propagate clock
    return stream.map(function (a) { return behavior.at()(a); });
}
exports.apply = apply;
/**
 * @param predicate A predicate function that returns a boolean for `A`.
 * @param s The stream to filter.
 * @returns Stream that only contains the occurrences from `stream`
 * for which `fn` returns true.
 */
function filter(predicate, s) {
    return s.filter(predicate);
}
exports.filter = filter;
function split(predicate, stream) {
    // It should be possible to implement this in a faster way where
    // `predicate` is only called once for each occurrence
    return [stream.filter(predicate), stream.filter(function (a) { return !predicate(a); })];
}
exports.split = split;
function filterApply(predicate, stream) {
    // FIXME: The implementation here should propagate clock
    return stream.filter(function (a) { return predicate.at()(a); });
}
exports.filterApply = filterApply;
function keepWhen(stream, behavior) {
    // FIXME: The implementation here should propagate clock
    return stream.filter(function (_) { return behavior.at(); });
}
exports.keepWhen = keepWhen;
/** For stateful streams that are always active */
var ActiveStream = /** @class */ (function (_super) {
    tslib_1.__extends(ActiveStream, _super);
    function ActiveStream() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ActiveStream.prototype.activate = function () { };
    ActiveStream.prototype.deactivate = function () { };
    return ActiveStream;
}(Stream));
exports.ActiveStream = ActiveStream;
var EmptyStream = /** @class */ (function (_super) {
    tslib_1.__extends(EmptyStream, _super);
    function EmptyStream() {
        return _super.call(this) || this;
    }
    /* istanbul ignore next */
    EmptyStream.prototype.pushS = function () {
        throw new Error("You cannot push to an empty stream");
    };
    return EmptyStream;
}(ActiveStream));
exports.empty = new EmptyStream();
var ScanStream = /** @class */ (function (_super) {
    tslib_1.__extends(ScanStream, _super);
    function ScanStream(f, last, parent, t) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.last = last;
        _this.parent = parent;
        _this.t = t;
        _this.node = new datastructures_1.Node(_this);
        _this.parents = datastructures_1.cons(parent);
        parent.addListener(_this.node, t);
        return _this;
    }
    ScanStream.prototype.pushS = function (t, a) {
        this.last = this.f(a, this.last);
        this.pushSToChildren(t, this.last);
    };
    return ScanStream;
}(ActiveStream));
exports.ScanStream = ScanStream;
/**
 * For each occurrence on `stream` the function `f` is applied to its value. As
 * its second argument `f` initially receives `initial` and afterwards its own
 * previous return value. The returned stream has an occurrence with the result
 * of each call to `f`.
 */
function scanFrom(f, initial, stream) {
    return stream.scanFrom(f, initial);
}
exports.scanFrom = scanFrom;
function scan(f, initial, source) {
    return now_1.sample(scanFrom(f, initial, source));
}
exports.scan = scan;
var ShiftBehaviorStream = /** @class */ (function (_super) {
    tslib_1.__extends(ShiftBehaviorStream, _super);
    function ShiftBehaviorStream(b) {
        var _this = _super.call(this) || this;
        _this.b = b;
        _this.bNode = new datastructures_1.Node(_this);
        _this.sNode = new datastructures_1.Node(_this);
        return _this;
    }
    ShiftBehaviorStream.prototype.activate = function (t) {
        this.b.addListener(this.bNode, t);
        if (this.b.state !== 3 /* Inactive */) {
            this.currentSource = this.b.last;
            this.currentSource.addListener(this.sNode, t);
        }
    };
    ShiftBehaviorStream.prototype.deactivate = function () {
        this.b.removeListener(this.bNode);
        this.currentSource.removeListener(this.sNode);
    };
    ShiftBehaviorStream.prototype.pushB = function (t) {
        var newStream = this.b.last;
        if (this.currentSource !== undefined) {
            this.currentSource.removeListener(this.sNode);
        }
        newStream.addListener(this.sNode, t);
        this.currentSource = newStream;
    };
    ShiftBehaviorStream.prototype.pushS = function (t, a) {
        this.pushSToChildren(t, a);
    };
    return ShiftBehaviorStream;
}(Stream));
/**
 * Takes a behavior of a stream and returns a stream that emits from the last
 * stream.
 */
function shiftCurrent(b) {
    return new ShiftBehaviorStream(b);
}
exports.shiftCurrent = shiftCurrent;
/**
 * Takes a stream of a stream and returns a stream that emits from the last
 * stream.
 */
function shift(s) {
    return behavior_1.stepper(exports.empty, s).map(shiftCurrent);
}
exports.shift = shift;
/**
 * Takes a stream of a stream and returns a stream that emits from the last
 * stream.
 */
function shiftFrom(s) {
    return behavior_1.stepperFrom(exports.empty, s).map(shiftCurrent);
}
exports.shiftFrom = shiftFrom;
var ChangesStream = /** @class */ (function (_super) {
    tslib_1.__extends(ChangesStream, _super);
    function ChangesStream(parent, comparator) {
        var _this = _super.call(this) || this;
        _this.parent = parent;
        _this.comparator = comparator;
        _this.parents = datastructures_1.cons(parent);
        _this.initialized = false;
        return _this;
    }
    ChangesStream.prototype.activate = function (t) {
        _super.prototype.activate.call(this, t);
        // The parent may be an unreplaced placeholder and in that case
        // we can't read its current value.
        if (this.parent.state === 1 /* Push */) {
            this.last = this.parent.last;
            this.initialized = true;
        }
    };
    ChangesStream.prototype.pushB = function (t) {
        if (!this.initialized) {
            this.initialized = true;
            this.last = this.parent.last;
        }
        else if (!this.comparator(this.last, this.parent.last)) {
            this.pushSToChildren(t, this.parent.last);
            this.last = this.parent.last;
        }
    };
    ChangesStream.prototype.pushS = function (_t, _a) { };
    return ChangesStream;
}(Stream));
function changes(b, comparator) {
    if (comparator === void 0) { comparator = function (v, u) { return v === u; }; }
    if (b.state === 2 /* Pull */) {
        throw new Error("You invoked changes on a pull behavior which is not supported.");
    }
    return new ChangesStream(b, comparator);
}
exports.changes = changes;
var CombineStream = /** @class */ (function (_super) {
    tslib_1.__extends(CombineStream, _super);
    function CombineStream(s1, s2) {
        var _this = _super.call(this) || this;
        _this.s1 = s1;
        _this.s2 = s2;
        _this.parents = datastructures_1.cons(s1, datastructures_1.cons(s2));
        return _this;
    }
    CombineStream.prototype.pushS = function (t, a) {
        this.pushSToChildren(t, a);
    };
    return CombineStream;
}(Stream));
exports.CombineStream = CombineStream;
var ProducerStream = /** @class */ (function (_super) {
    tslib_1.__extends(ProducerStream, _super);
    function ProducerStream() {
        var _this = _super.call(this) || this;
        _this.state = 1 /* Push */;
        return _this;
    }
    ProducerStream.prototype.pushS = function (t, a) {
        if (t === void 0) { t = clock_1.tick(); }
        this.pushSToChildren(t, a);
    };
    return ProducerStream;
}(Stream));
exports.ProducerStream = ProducerStream;
var ProducerStreamFromFunction = /** @class */ (function (_super) {
    tslib_1.__extends(ProducerStreamFromFunction, _super);
    function ProducerStreamFromFunction(activateFn) {
        var _this = _super.call(this) || this;
        _this.activateFn = activateFn;
        return _this;
    }
    ProducerStreamFromFunction.prototype.publish = function (a, t) {
        if (t === void 0) { t = clock_1.tick(); }
        this.pushS(t, a);
    };
    ProducerStreamFromFunction.prototype.activate = function () {
        this.state = 1 /* Push */;
        this.deactivateFn = this.activateFn(this.publish.bind(this));
    };
    ProducerStreamFromFunction.prototype.deactivate = function () {
        this.state = 3 /* Inactive */;
        this.deactivateFn();
    };
    return ProducerStreamFromFunction;
}(ProducerStream));
function producerStream(activate) {
    return new ProducerStreamFromFunction(activate);
}
exports.producerStream = producerStream;
var SinkStream = /** @class */ (function (_super) {
    tslib_1.__extends(SinkStream, _super);
    function SinkStream() {
        var _this = _super.call(this) || this;
        _this.pushing = false;
        return _this;
    }
    SinkStream.prototype.pushS = function (t, a) {
        if (this.pushing === true) {
            this.pushSToChildren(t, a);
        }
    };
    SinkStream.prototype.push = function (a) {
        var t = clock_1.tick();
        this.pushSToChildren(t, a);
    };
    SinkStream.prototype.activate = function () {
        this.pushing = true;
    };
    SinkStream.prototype.deactivate = function () {
        this.pushing = false;
    };
    return SinkStream;
}(ProducerStream));
exports.SinkStream = SinkStream;
function sinkStream() {
    return new SinkStream();
}
exports.sinkStream = sinkStream;
function subscribe(fn, stream) {
    stream.subscribe(fn);
}
exports.subscribe = subscribe;
var SnapshotStream = /** @class */ (function (_super) {
    tslib_1.__extends(SnapshotStream, _super);
    function SnapshotStream(target, trigger) {
        var _this = _super.call(this) || this;
        _this.target = target;
        _this.trigger = trigger;
        _this.node = new datastructures_1.Node(_this);
        _this.parents = datastructures_1.cons(trigger);
        return _this;
    }
    SnapshotStream.prototype.pushS = function (t) {
        var b = this.target.at(t);
        this.pushSToChildren(t, b);
    };
    SnapshotStream.prototype.activate = function (t) {
        this.trigger.addListener(this.node, t);
    };
    SnapshotStream.prototype.deactivate = function () {
        this.trigger.removeListener(this.node);
    };
    return SnapshotStream;
}(Stream));
exports.SnapshotStream = SnapshotStream;
function snapshot(target, trigger) {
    return new SnapshotStream(target, trigger);
}
exports.snapshot = snapshot;
var SnapshotWithStream = /** @class */ (function (_super) {
    tslib_1.__extends(SnapshotWithStream, _super);
    function SnapshotWithStream(fn, target, trigger) {
        var _this = _super.call(this) || this;
        _this.fn = fn;
        _this.target = target;
        _this.trigger = trigger;
        _this.node = new datastructures_1.Node(_this);
        return _this;
    }
    SnapshotWithStream.prototype.pushS = function (t, a) {
        var c = this.fn(a, this.target.at(t));
        this.pushSToChildren(t, c);
    };
    SnapshotWithStream.prototype.activate = function (t) {
        this.trigger.addListener(this.node, t);
    };
    SnapshotWithStream.prototype.deactivate = function () {
        this.trigger.removeListener(this.node);
    };
    return SnapshotWithStream;
}(Stream));
function snapshotWith(f, target, trigger) {
    return new SnapshotWithStream(f, target, trigger);
}
exports.snapshotWith = snapshotWith;
var SelfieStream = /** @class */ (function (_super) {
    tslib_1.__extends(SelfieStream, _super);
    function SelfieStream(parent) {
        var _this = _super.call(this) || this;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    SelfieStream.prototype.pushS = function (t, target) {
        this.pushSToChildren(t, behavior_1.at(target, t));
    };
    return SelfieStream;
}(Stream));
exports.SelfieStream = SelfieStream;
/**
 * On each occurrence the behavior is sampled at the time of the occurrence.
 */
function selfie(stream) {
    return new SelfieStream(stream);
}
exports.selfie = selfie;
function isStream(s) {
    return typeof s === "object" && "scanFrom" in s;
}
exports.isStream = isStream;
var PerformCbStream = /** @class */ (function (_super) {
    tslib_1.__extends(PerformCbStream, _super);
    function PerformCbStream(cb, stream) {
        var _this = _super.call(this) || this;
        _this.cb = cb;
        _this.node = new datastructures_1.Node(_this);
        _this.doneCb = function (result) { return _this.pushSToChildren(clock_1.tick(), result); };
        stream.addListener(_this.node, clock_1.tick());
        return _this;
    }
    PerformCbStream.prototype.pushS = function (_, value) {
        this.cb(value, this.doneCb);
    };
    return PerformCbStream;
}(ActiveStream));
/**
 * Invokes the callback for each occurrence on the given stream.
 *
 * This function is intended to be a low-level function used as the
 * basis for other operators.
 */
function mapCbStream(cb, stream) {
    return new PerformCbStream(cb, stream);
}
exports.mapCbStream = mapCbStream;
var FlatFutures = /** @class */ (function (_super) {
    tslib_1.__extends(FlatFutures, _super);
    function FlatFutures(stream) {
        var _this = _super.call(this) || this;
        _this.parents = datastructures_1.cons(stream);
        return _this;
    }
    FlatFutures.prototype.pushS = function (_t, fut) {
        var _this = this;
        fut.subscribe(function (a) { return _this.pushSToChildren(clock_1.tick(), a); });
    };
    return FlatFutures;
}(Stream));
exports.FlatFutures = FlatFutures;
var FlatFuturesOrdered = /** @class */ (function (_super) {
    tslib_1.__extends(FlatFuturesOrdered, _super);
    function FlatFuturesOrdered(stream) {
        var _this = _super.call(this) || this;
        _this.nextId = 0;
        _this.next = 0;
        _this.buffer = []; // Object-wrapper to support a result as undefined
        _this.parents = datastructures_1.cons(stream);
        return _this;
    }
    FlatFuturesOrdered.prototype.pushS = function (_t, fut) {
        var _this = this;
        var id = this.nextId++;
        fut.subscribe(function (a) {
            if (id === _this.next) {
                _this.buffer[0] = { value: a };
                _this.pushFromBuffer();
            }
            else {
                _this.buffer[id - _this.next] = { value: a };
            }
        });
    };
    FlatFuturesOrdered.prototype.pushFromBuffer = function () {
        while (this.buffer[0] !== undefined) {
            var t = clock_1.tick();
            var value = this.buffer.shift().value;
            this.pushSToChildren(t, value);
            this.next++;
        }
    };
    return FlatFuturesOrdered;
}(Stream));
exports.FlatFuturesOrdered = FlatFuturesOrdered;
var FlatFuturesLatest = /** @class */ (function (_super) {
    tslib_1.__extends(FlatFuturesLatest, _super);
    function FlatFuturesLatest(stream) {
        var _this = _super.call(this) || this;
        _this.next = 0;
        _this.newest = 0;
        _this.running = 0;
        _this.parents = datastructures_1.cons(stream);
        return _this;
    }
    FlatFuturesLatest.prototype.pushS = function (_t, fut) {
        var _this = this;
        var time = ++this.next;
        this.running++;
        fut.subscribe(function (a) {
            _this.running--;
            if (time > _this.newest) {
                var t = clock_1.tick();
                if (_this.running === 0) {
                    _this.next = 0;
                    _this.newest = 0;
                }
                else {
                    _this.newest = time;
                }
                _this.pushSToChildren(t, a);
            }
        });
    };
    return FlatFuturesLatest;
}(Stream));
exports.FlatFuturesLatest = FlatFuturesLatest;
