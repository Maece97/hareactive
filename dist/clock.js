"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTime = exports.tick = void 0;
var time = -1;
function tick() {
    return ++time;
}
exports.tick = tick;
function getTime() {
    return time;
}
exports.getTime = getTime;
