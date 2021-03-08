"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.easeInOut = exports.easeOut = exports.easeIn = exports.linear = exports.capToRange = exports.interpolate = exports.transitionBehavior = void 0;
var _1 = require(".");
function transitionBehavior(config, initial, triggerStream, timeB) {
    if (timeB === void 0) { timeB = _1.time; }
    return _1.moment(function (at) {
        var rangeValueB = at(_1.accumFrom(function (newV, prev) { return ({ from: prev.to, to: newV }); }, { from: initial, to: initial }, triggerStream));
        var initialStartTime = at(timeB);
        var startTimeB = at(_1.stepperFrom(initialStartTime, _1.snapshot(timeB, triggerStream)));
        var transition = _1.lift(function (range, startTime, now) {
            var endTime = startTime + config.duration;
            var scaled = interpolate(startTime, endTime, 0, 1, capToRange(startTime, endTime, now - config.delay));
            return interpolate(0, 1, range.from, range.to, config.timingFunction(scaled));
        }, rangeValueB, startTimeB, timeB);
        return transition;
    });
}
exports.transitionBehavior = transitionBehavior;
function interpolate(fromA, toA, fromB, toB, a) {
    if (a < fromA || a > toA) {
        throw "The number " + a + " is not between the bounds [" + fromA + ", " + toA + "]";
    }
    var spanA = toA - fromA;
    var spanB = toB - fromB;
    var relationA = (a - fromA) / spanA;
    return relationA * spanB + fromB;
}
exports.interpolate = interpolate;
function capToRange(lower, upper, a) {
    return Math.min(Math.max(lower, a), upper);
}
exports.capToRange = capToRange;
exports.linear = function (t) { return t; };
exports.easeIn = function (p) { return function (t) { return Math.pow(t, p); }; };
exports.easeOut = function (p) { return function (t) { return 1 - Math.pow((1 - t), p); }; };
exports.easeInOut = function (p) { return function (t) {
    return t < 0.5 ? exports.easeIn(p)(t * 2) / 2 : exports.easeOut(p)(t * 2 - 1) / 2 + 0.5;
}; };
