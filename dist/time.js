"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrateFrom = exports.integrate = exports.measureTime = exports.measureTimeFrom = exports.time = exports.debounce = exports.throttle = exports.delay = exports.DelayStream = void 0;
var tslib_1 = require("tslib");
var datastructures_1 = require("./datastructures");
var stream_1 = require("./stream");
var behavior_1 = require("./behavior");
var now_1 = require("./now");
/*
 * Time related behaviors and functions
 */
var DelayStream = /** @class */ (function (_super) {
    tslib_1.__extends(DelayStream, _super);
    function DelayStream(parent, ms) {
        var _this = _super.call(this) || this;
        _this.ms = ms;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    DelayStream.prototype.pushS = function (t, a) {
        var _this = this;
        setTimeout(function () {
            _this.pushSToChildren(t, a);
        }, this.ms);
    };
    return DelayStream;
}(stream_1.Stream));
exports.DelayStream = DelayStream;
function delay(ms, stream) {
    return now_1.perform(function () { return new DelayStream(stream, ms); });
}
exports.delay = delay;
var ThrottleStream = /** @class */ (function (_super) {
    tslib_1.__extends(ThrottleStream, _super);
    function ThrottleStream(parent, ms) {
        var _this = _super.call(this) || this;
        _this.ms = ms;
        _this.isSilenced = false;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    ThrottleStream.prototype.pushS = function (t, a) {
        var _this = this;
        if (!this.isSilenced) {
            this.pushSToChildren(t, a);
            this.isSilenced = true;
            setTimeout(function () {
                _this.isSilenced = false;
            }, this.ms);
        }
    };
    return ThrottleStream;
}(stream_1.Stream));
function throttle(ms, stream) {
    return now_1.perform(function () { return new ThrottleStream(stream, ms); });
}
exports.throttle = throttle;
var DebounceStream = /** @class */ (function (_super) {
    tslib_1.__extends(DebounceStream, _super);
    function DebounceStream(parent, ms) {
        var _this = _super.call(this) || this;
        _this.ms = ms;
        _this.timer = undefined;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    DebounceStream.prototype.pushS = function (t, a) {
        var _this = this;
        clearTimeout(this.timer);
        this.timer = setTimeout(function () {
            _this.pushSToChildren(t, a);
        }, this.ms);
    };
    return DebounceStream;
}(stream_1.Stream));
function debounce(ms, stream) {
    return now_1.perform(function () { return new DebounceStream(stream, ms); });
}
exports.debounce = debounce;
/**
 * A behavior whose value is the number of milliseconds elapsed in
 * UNIX epoch. I.e. its current value is equal to the value got by
 * calling `Date.now`.
 */
exports.time = behavior_1.fromFunction(function (_) { return Date.now(); });
/**
 * A behavior giving access to continuous time. When sampled the outer
 * behavior gives a behavior with values that contain the difference
 * between the current sample time and the time at which the outer
 * behavior was sampled.
 */
exports.measureTimeFrom = exports.time.map(function (from) { return exports.time.map(function (t) { return t - from; }); });
exports.measureTime = now_1.sample(exports.measureTimeFrom);
var IntegrateBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(IntegrateBehavior, _super);
    function IntegrateBehavior(parent, t) {
        var _this = _super.call(this) || this;
        _this.parent = parent;
        _this.lastPullTime = exports.time.at(t);
        _this.state = 2 /* Pull */;
        _this.last = 0;
        _this.pulledAt = t;
        _this.changedAt = t;
        _this.parents = datastructures_1.cons(parent, datastructures_1.cons(exports.time));
        return _this;
    }
    IntegrateBehavior.prototype.update = function (_t) {
        var currentPullTime = exports.time.last;
        var deltaMs = currentPullTime - this.lastPullTime;
        var value = this.last + deltaMs * this.parent.last;
        this.lastPullTime = currentPullTime;
        return value;
    };
    IntegrateBehavior.prototype.changeStateDown = function (_) {
        // No-op as an `IntegrateBehavior` is always in `Pull` state
    };
    return IntegrateBehavior;
}(behavior_1.Behavior));
/**
 * Returns a `Now` computation of a behavior of the integral of the given behavior.
 */
function integrate(behavior) {
    return now_1.sample(integrateFrom(behavior));
}
exports.integrate = integrate;
/**
 * Integrate a behavior with respect to time.
 *
 * The value of the behavior is treated as a rate of change per millisecond.
 */
function integrateFrom(behavior) {
    return behavior_1.fromFunction(function (t) { return new IntegrateBehavior(behavior, t); });
}
exports.integrateFrom = integrateFrom;
