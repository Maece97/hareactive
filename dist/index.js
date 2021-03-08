"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combine = exports.push = exports.flat = exports.lift = exports.map = void 0;
var tslib_1 = require("tslib");
tslib_1.__exportStar(require("./common"), exports);
tslib_1.__exportStar(require("./now"), exports);
tslib_1.__exportStar(require("./behavior"), exports);
tslib_1.__exportStar(require("./stream"), exports);
tslib_1.__exportStar(require("./future"), exports);
tslib_1.__exportStar(require("./time"), exports);
tslib_1.__exportStar(require("./placeholder"), exports);
tslib_1.__exportStar(require("./animation"), exports);
tslib_1.__exportStar(require("./clock"), exports);
function map(fn, b) {
    return b.map(fn);
}
exports.map = map;
function lift(f) {
    var _a;
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return (_a = args[0]).lift.apply(_a, tslib_1.__spread([f], args));
}
exports.lift = lift;
function flat(o) {
    return o.flat();
}
exports.flat = flat;
function push(a, sink) {
    sink.push(a);
}
exports.push = push;
function combine() {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    // FIXME: More performant implementation with benchmark
    return values.reduce(function (a, b) { return a.combine(b); });
}
exports.combine = combine;
