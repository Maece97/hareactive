import { observe } from "./common";
import { ProducerStream } from "./stream";
import { ProducerBehavior, toggle } from "./behavior";
class DomEventStream extends ProducerStream {
    constructor(target, eventName, extractor) {
        super();
        this.target = target;
        this.eventName = eventName;
        this.extractor = extractor;
    }
    handleEvent(event) {
        this.pushS(undefined, this.extractor(event, this.target));
    }
    activate() {
        this.target.addEventListener(this.eventName, this);
    }
    deactivate() {
        this.target.removeEventListener(this.eventName, this);
    }
}
function id(a) {
    return a;
}
export function streamFromEvent(target, eventName, extractor = id) {
    return new DomEventStream(target, eventName, extractor);
}
class DomEventBehavior extends ProducerBehavior {
    constructor(target, eventName, getter, extractor) {
        super();
        this.target = target;
        this.eventName = eventName;
        this.getter = getter;
        this.extractor = extractor;
        this.last = getter(target);
    }
    handleEvent(event) {
        this.newValue(this.extractor(event, this.target));
    }
    update() {
        return this.getter(this.target);
    }
    activateProducer() {
        this.target.addEventListener(this.eventName, this);
    }
    deactivateProducer() {
        this.target.removeEventListener(this.eventName, this);
    }
}
export function behaviorFromEvent(target, eventName, getter, extractor) {
    return new DomEventBehavior(target, eventName, getter, extractor);
}
function pullOnFrame(pull) {
    let isPulling = true;
    function frame() {
        if (isPulling) {
            pull();
            window.requestAnimationFrame(frame);
        }
    }
    frame();
    return () => {
        isPulling = false;
    };
}
/**
 * Returns a stream that has an occurrence whenever a key is pressed down. The
 * value is the
 * [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
 * associated with the key press.
 */
export const keyDown = streamFromEvent(window, "keydown");
/**
 * Returns a stream that has an occurrence whenever a key is pressed down. The
 * value is the
 * [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
 * associated with the key press.
 */
export const keyUp = streamFromEvent(window, "keyup");
/**
 * Returns a behavior that is true when the key is pressed and false then the
 * key is not pressed.
 *
 * The code is a [KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code).
 */
export function keyPressed(code) {
    const isKey = (e) => e.code === code;
    return toggle(false, keyDown.filter(isKey), keyUp.filter(isKey));
}
/**
 * Used to render the value of a behaviors into the DOM, a canvas, etc. The
 * `renderer` function is called on each frame using `requestAnimationFrame` if
 * the behavior has changed.
 */
export function render(renderer, behavior, time) {
    observe(renderer, pullOnFrame, behavior, time);
}
