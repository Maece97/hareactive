import { Time } from "./common";
import { Stream } from "./stream";
import { Behavior } from "./behavior";
import { Now } from "./now";
export declare type HTMLEventName = keyof HTMLElementEventMap;
export declare type WindowEventName = keyof WindowEventMap;
export declare type EventName = HTMLEventName | WindowEventName;
export declare type Extractor<E, T, A> = (event: E, target: T) => A;
/**
 * Creates a stream from a DOM element and an event name.
 */
export declare function streamFromEvent<A, E extends WindowEventName, T extends Window>(target: T, eventName: E): Stream<WindowEventMap[E]>;
export declare function streamFromEvent<A, E extends WindowEventName, T extends Window>(target: T, eventName: E, extractor: Extractor<WindowEventMap[E], T, A>): Stream<A>;
export declare function streamFromEvent<A, E extends HTMLEventName, T extends HTMLElement>(target: T, eventName: E): Stream<HTMLElementEventMap[E]>;
export declare function streamFromEvent<A, E extends HTMLEventName, T extends HTMLElement>(target: T, eventName: E, extractor: Extractor<HTMLElementEventMap[E], T, A>): Stream<A>;
export declare function streamFromEvent<A>(target: EventTarget, eventName: string, extractor: Extractor<unknown, EventTarget, A>): Stream<A>;
/**
 * Creates a behavior from a DOM element.
 */
export declare function behaviorFromEvent<A, E extends WindowEventName, T extends Window>(target: T, eventName: E, getter: (t: T) => A, extractor: Extractor<WindowEventMap[E], T, A>): Behavior<A>;
export declare function behaviorFromEvent<A, E extends HTMLEventName, T extends HTMLElement>(target: T, eventName: E, getter: (t: T) => A, extractor: Extractor<HTMLElementEventMap[E], T, A>): Behavior<A>;
export declare function behaviorFromEvent<A>(target: EventTarget, eventName: string, getter: (t: EventTarget) => A, extractor: Extractor<unknown, EventTarget, A>): Behavior<A>;
/**
 * Returns a stream that has an occurrence whenever a key is pressed down. The
 * value is the
 * [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
 * associated with the key press.
 */
export declare const keyDown: Stream<KeyboardEvent>;
/**
 * Returns a stream that has an occurrence whenever a key is pressed down. The
 * value is the
 * [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
 * associated with the key press.
 */
export declare const keyUp: Stream<KeyboardEvent>;
/**
 * Returns a behavior that is true when the key is pressed and false then the
 * key is not pressed.
 *
 * The code is a [KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code).
 */
export declare function keyPressed(code: string): Now<Behavior<boolean>>;
/**
 * Used to render the value of a behaviors into the DOM, a canvas, etc. The
 * `renderer` function is called on each frame using `requestAnimationFrame` if
 * the behavior has changed.
 */
export declare function render<A>(renderer: (a: A) => void, behavior: Behavior<A>, time?: Time): void;
