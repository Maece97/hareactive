export * from "./common";
export * from "./now";
export * from "./behavior";
export * from "./stream";
export * from "./future";
export * from "./time";
export * from "./placeholder";
export * from "./animation";
export * from "./clock";
export function map(fn, b) {
    return b.map(fn);
}
export function lift(f, ...args) {
    return args[0].lift(f, ...args);
}
export function flat(o) {
    return o.flat();
}
export function push(a, sink) {
    sink.push(a);
}
export function combine(...values) {
    // FIXME: More performant implementation with benchmark
    return values.reduce((a, b) => a.combine(b));
}
