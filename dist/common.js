"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observe = exports.CbObserver = exports.Reactive = exports.PushOnlyObserver = void 0;
var tslib_1 = require("tslib");
var datastructures_1 = require("./datastructures");
var clock_1 = require("./clock");
function isBehavior(b) {
    return typeof b === "object" && "at" in b;
}
var PushOnlyObserver = /** @class */ (function () {
    function PushOnlyObserver(callback, source) {
        this.callback = callback;
        this.source = source;
        this.node = new datastructures_1.Node(this);
        source.addListener(this.node, clock_1.tick());
        if (isBehavior(source) && source.state === 1 /* Push */) {
            callback(source.at());
        }
    }
    PushOnlyObserver.prototype.pushB = function (_t) {
        this.callback(this.source.last);
    };
    PushOnlyObserver.prototype.pushS = function (_t, value) {
        this.callback(value);
    };
    PushOnlyObserver.prototype.deactivate = function () {
        this.source.removeListener(this.node);
    };
    PushOnlyObserver.prototype.changeStateDown = function (_state) { };
    return PushOnlyObserver;
}());
exports.PushOnlyObserver = PushOnlyObserver;
var Reactive = /** @class */ (function () {
    function Reactive() {
        this.children = new datastructures_1.DoubleLinkedList();
        this.state = 3 /* Inactive */;
    }
    Reactive.prototype.addListener = function (node, t) {
        var firstChild = this.children.head === undefined;
        this.children.prepend(node);
        if (firstChild) {
            this.activate(t);
        }
        return this.state;
    };
    Reactive.prototype.removeListener = function (node) {
        this.children.remove(node);
        if (this.children.head === undefined && this.state !== 0 /* Done */) {
            this.deactivate();
        }
    };
    Reactive.prototype.changeStateDown = function (state) {
        var e_1, _a;
        if (this.state !== state) {
            this.state = state;
            try {
                for (var _b = tslib_1.__values(this.children), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    child.changeStateDown(state);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    };
    Reactive.prototype.subscribe = function (callback) {
        return new PushOnlyObserver(callback, this);
    };
    Reactive.prototype.observe = function (push, handlePulling, t) {
        if (t === void 0) { t = clock_1.tick(); }
        return new CbObserver(push, handlePulling, t, this);
    };
    Reactive.prototype.activate = function (t) {
        var e_2, _a;
        var newState = 0 /* Done */;
        try {
            for (var _b = tslib_1.__values(this.parents), _c = _b.next(); !_c.done; _c = _b.next()) {
                var parent_1 = _c.value;
                var node = new datastructures_1.Node(this);
                this.listenerNodes = datastructures_1.cons({ node: node, parent: parent_1 }, this.listenerNodes);
                parent_1.addListener(node, t);
                newState = Math.max(newState, parent_1.state);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (this.state === 3 /* Inactive */) {
            this.state = newState;
        }
    };
    Reactive.prototype.deactivate = function (done) {
        var e_3, _a;
        if (done === void 0) { done = false; }
        if (this.listenerNodes !== undefined) {
            try {
                for (var _b = tslib_1.__values(this.listenerNodes), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = _c.value, node = _d.node, parent_2 = _d.parent;
                    parent_2.removeListener(node);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        this.state = done === true ? 0 /* Done */ : 3 /* Inactive */;
    };
    return Reactive;
}());
exports.Reactive = Reactive;
var CbObserver = /** @class */ (function () {
    function CbObserver(callback, handlePulling, time, source) {
        this.callback = callback;
        this.handlePulling = handlePulling;
        this.time = time;
        this.source = source;
        this.node = new datastructures_1.Node(this);
        source.addListener(this.node, clock_1.tick());
        if (source.state === 2 /* Pull */) {
            this.endPulling = handlePulling(this.pull.bind(this));
        }
        else if (isBehavior(source) && source.state === 1 /* Push */) {
            callback(source.last);
        }
        this.time = undefined;
    }
    CbObserver.prototype.pull = function (time) {
        var t = time !== undefined ? time : this.time !== undefined ? this.time : clock_1.tick();
        if (isBehavior(this.source) && this.source.state === 2 /* Pull */) {
            this.source.pull(t);
            this.callback(this.source.last);
        }
    };
    CbObserver.prototype.pushB = function (_t) {
        this.callback(this.source.last);
    };
    CbObserver.prototype.pushS = function (_t, value) {
        this.callback(value);
    };
    CbObserver.prototype.changeStateDown = function (state) {
        if (state === 2 /* Pull */) {
            this.endPulling = this.handlePulling(this.pull.bind(this));
        }
        else if (this.endPulling !== undefined) {
            // We where pulling before but are no longer pulling
            this.endPulling();
            this.endPulling = undefined;
        }
    };
    return CbObserver;
}());
exports.CbObserver = CbObserver;
/**
 * Observe a behavior for the purpose of running side-effects based on the value
 * of the behavior.
 * @param push Called with all values that the behavior pushes through.
 * @param handlePulling Called when the consumer should begin pulling values
 * from the behavior. The function should return a callback that will be invoked
 * once pulling should stop.
 * @param behavior The behavior to observe.
 */
function observe(push, handlePulling, behavior, time) {
    return behavior.observe(push, handlePulling, time);
}
exports.observe = observe;
