"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = exports.keyPressed = exports.keyUp = exports.keyDown = exports.behaviorFromEvent = exports.streamFromEvent = void 0;
var tslib_1 = require("tslib");
var common_1 = require("./common");
var stream_1 = require("./stream");
var behavior_1 = require("./behavior");
var DomEventStream = /** @class */ (function (_super) {
    tslib_1.__extends(DomEventStream, _super);
    function DomEventStream(target, eventName, extractor) {
        var _this = _super.call(this) || this;
        _this.target = target;
        _this.eventName = eventName;
        _this.extractor = extractor;
        return _this;
    }
    DomEventStream.prototype.handleEvent = function (event) {
        this.pushS(undefined, this.extractor(event, this.target));
    };
    DomEventStream.prototype.activate = function () {
        this.target.addEventListener(this.eventName, this);
    };
    DomEventStream.prototype.deactivate = function () {
        this.target.removeEventListener(this.eventName, this);
    };
    return DomEventStream;
}(stream_1.ProducerStream));
function id(a) {
    return a;
}
function streamFromEvent(target, eventName, extractor) {
    if (extractor === void 0) { extractor = id; }
    return new DomEventStream(target, eventName, extractor);
}
exports.streamFromEvent = streamFromEvent;
var DomEventBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(DomEventBehavior, _super);
    function DomEventBehavior(target, eventName, getter, extractor) {
        var _this = _super.call(this) || this;
        _this.target = target;
        _this.eventName = eventName;
        _this.getter = getter;
        _this.extractor = extractor;
        _this.last = getter(target);
        return _this;
    }
    DomEventBehavior.prototype.handleEvent = function (event) {
        this.newValue(this.extractor(event, this.target));
    };
    DomEventBehavior.prototype.update = function () {
        return this.getter(this.target);
    };
    DomEventBehavior.prototype.activateProducer = function () {
        this.target.addEventListener(this.eventName, this);
    };
    DomEventBehavior.prototype.deactivateProducer = function () {
        this.target.removeEventListener(this.eventName, this);
    };
    return DomEventBehavior;
}(behavior_1.ProducerBehavior));
function behaviorFromEvent(target, eventName, getter, extractor) {
    return new DomEventBehavior(target, eventName, getter, extractor);
}
exports.behaviorFromEvent = behaviorFromEvent;
function pullOnFrame(pull) {
    var isPulling = true;
    function frame() {
        if (isPulling) {
            pull();
            window.requestAnimationFrame(frame);
        }
    }
    frame();
    return function () {
        isPulling = false;
    };
}
/**
 * Returns a stream that has an occurrence whenever a key is pressed down. The
 * value is the
 * [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
 * associated with the key press.
 */
exports.keyDown = streamFromEvent(window, "keydown");
/**
 * Returns a stream that has an occurrence whenever a key is pressed down. The
 * value is the
 * [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
 * associated with the key press.
 */
exports.keyUp = streamFromEvent(window, "keyup");
/**
 * Returns a behavior that is true when the key is pressed and false then the
 * key is not pressed.
 *
 * The code is a [KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code).
 */
function keyPressed(code) {
    var isKey = function (e) { return e.code === code; };
    return behavior_1.toggle(false, exports.keyDown.filter(isKey), exports.keyUp.filter(isKey));
}
exports.keyPressed = keyPressed;
/**
 * Used to render the value of a behaviors into the DOM, a canvas, etc. The
 * `renderer` function is called on each frame using `requestAnimationFrame` if
 * the behavior has changed.
 */
function render(renderer, behavior, time) {
    common_1.observe(renderer, pullOnFrame, behavior, time);
}
exports.render = render;
