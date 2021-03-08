import { stepperFrom, time, accumFrom, snapshot, lift, moment } from ".";
export function transitionBehavior(config, initial, triggerStream, timeB = time) {
    return moment((at) => {
        const rangeValueB = at(accumFrom((newV, prev) => ({ from: prev.to, to: newV }), { from: initial, to: initial }, triggerStream));
        const initialStartTime = at(timeB);
        const startTimeB = at(stepperFrom(initialStartTime, snapshot(timeB, triggerStream)));
        const transition = lift((range, startTime, now) => {
            const endTime = startTime + config.duration;
            const scaled = interpolate(startTime, endTime, 0, 1, capToRange(startTime, endTime, now - config.delay));
            return interpolate(0, 1, range.from, range.to, config.timingFunction(scaled));
        }, rangeValueB, startTimeB, timeB);
        return transition;
    });
}
export function interpolate(fromA, toA, fromB, toB, a) {
    if (a < fromA || a > toA) {
        throw `The number ${a} is not between the bounds [${fromA}, ${toA}]`;
    }
    const spanA = toA - fromA;
    const spanB = toB - fromB;
    const relationA = (a - fromA) / spanA;
    return relationA * spanB + fromB;
}
export function capToRange(lower, upper, a) {
    return Math.min(Math.max(lower, a), upper);
}
export const linear = (t) => t;
export const easeIn = (p) => (t) => Math.pow(t, p);
export const easeOut = (p) => (t) => 1 - Math.pow((1 - t), p);
export const easeInOut = (p) => (t) => t < 0.5 ? easeIn(p)(t * 2) / 2 : easeOut(p)(t * 2 - 1) / 2 + 0.5;
