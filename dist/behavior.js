"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flatFuturesLatest = exports.flatFuturesLatestFrom = exports.flatFuturesOrdered = exports.flatFuturesOrderedFrom = exports.flatFutures = exports.flatFuturesFrom = exports.format = exports.moment = exports.toggle = exports.toggleFrom = exports.stepper = exports.stepperFrom = exports.accumCombine = exports.accumCombineFrom = exports.accum = exports.accumFrom = exports.AccumBehavior = exports.freezeAt = exports.freezeAtFrom = exports.freezeTo = exports.switcher = exports.switcherFrom = exports.switchTo = exports.stepTo = exports.fromFunction = exports.FunctionBehavior = exports.ConstantBehavior = exports.ActiveBehavior = exports.snapshotAt = exports.when = exports.whenFrom = exports.LiftBehavior = exports.ap = exports.MapBehavior = exports.at = exports.sinkBehavior = exports.SinkBehavior = exports.producerBehavior = exports.ProducerBehavior = exports.isBehavior = exports.pushToChildren = exports.Behavior = void 0;
var tslib_1 = require("tslib");
var datastructures_1 = require("./datastructures");
var index_1 = require("./index");
var common_1 = require("./common");
var future_1 = require("./future");
var F = require("./future");
var stream_1 = require("./stream");
var clock_1 = require("./clock");
var now_1 = require("./now");
/**
 * A behavior is a value that changes over time. Conceptually it can
 * be thought of as a function from time to a value. I.e. `type
 * Behavior<A> = (t: Time) => A`.
 */
var Behavior = /** @class */ (function (_super) {
    tslib_1.__extends(Behavior, _super);
    function Behavior() {
        var _this = _super.call(this) || this;
        _this.children = new datastructures_1.DoubleLinkedList();
        _this.multi = true;
        return _this;
    }
    Behavior.is = function (a) {
        return isBehavior(a);
    };
    Behavior.prototype.map = function (fn) {
        return new MapBehavior(this, fn);
    };
    Behavior.prototype.mapTo = function (v) {
        return new ConstantBehavior(v);
    };
    Behavior.of = function (v) {
        return new ConstantBehavior(v);
    };
    Behavior.prototype.of = function (v) {
        return new ConstantBehavior(v);
    };
    Behavior.prototype.ap = function (f) {
        return new ApBehavior(f, this);
    };
    Behavior.prototype.lift = function (f) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return new LiftBehavior(f, args);
    };
    Behavior.prototype.flatMap = function (fn) {
        return new FlatMapBehavior(this, fn);
    };
    Behavior.prototype.chain = function (fn) {
        return new FlatMapBehavior(this, fn);
    };
    Behavior.prototype.flat = function () {
        return new FlatMapBehavior(this, function (a) { return a; });
    };
    Behavior.prototype.at = function (t) {
        if (this.state !== 1 /* Push */) {
            var time = t === undefined ? clock_1.tick() : t;
            this.pull(time);
        }
        return this.last;
    };
    Behavior.prototype.pushB = function (t) {
        if (this.state !== 3 /* Inactive */ && this.pulledAt !== t) {
            this.pull(t);
            if (this.changedAt === t && this.state === 1 /* Push */) {
                pushToChildren(t, this);
            }
        }
    };
    Behavior.prototype.pull = function (t) {
        var e_1, _a;
        if (this.pulledAt === undefined || this.pulledAt < t) {
            this.pulledAt = t;
            var shouldRefresh = this.changedAt === undefined;
            try {
                for (var _b = tslib_1.__values(this.parents), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var parent_1 = _c.value;
                    if (isBehavior(parent_1)) {
                        parent_1.pull(t);
                        shouldRefresh = shouldRefresh || this.changedAt < parent_1.changedAt;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (shouldRefresh) {
                refresh(this, t);
            }
        }
    };
    Behavior.prototype.activate = function (t) {
        _super.prototype.activate.call(this, t);
        if (this.state === 1 /* Push */) {
            refresh(this, t);
        }
    };
    Behavior.prototype.log = function (prefix, ms) {
        if (ms === void 0) { ms = 100; }
        this.observe(function (a) { return (prefix !== undefined ? console.log(prefix, a) : console.log(a)); }, function (pull) {
            var stop = false;
            (function repeat() {
                if (!stop) {
                    pull();
                    setTimeout(repeat, ms);
                }
            })();
            return function () {
                stop = true;
            };
        });
        return this;
    };
    Behavior.multi = true;
    return Behavior;
}(common_1.Reactive));
exports.Behavior = Behavior;
function pushToChildren(t, b) {
    var e_2, _a;
    try {
        for (var _b = tslib_1.__values(b.children), _c = _b.next(); !_c.done; _c = _b.next()) {
            var child = _c.value;
            child.pushB(t);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_2) throw e_2.error; }
    }
}
exports.pushToChildren = pushToChildren;
function refresh(b, t) {
    var newValue = b.update(t);
    if (newValue === b.last) {
        return;
    }
    b.changedAt = t;
    b.last = newValue;
}
function isBehavior(b) {
    return ((typeof b === "object" && "at" in b && !index_1.isPlaceholder(b)) ||
        (index_1.isPlaceholder(b) && (b.source === undefined || isBehavior(b.source))));
}
exports.isBehavior = isBehavior;
var ProducerBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(ProducerBehavior, _super);
    function ProducerBehavior() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ProducerBehavior.prototype.newValue = function (a) {
        if (a === this.last) {
            return;
        }
        var t = clock_1.tick();
        this.last = a;
        this.changedAt = t;
        if (this.state === 1 /* Push */) {
            this.pulledAt = t;
            pushToChildren(t, this);
        }
    };
    ProducerBehavior.prototype.pull = function (t) {
        refresh(this, t);
    };
    ProducerBehavior.prototype.activate = function (t) {
        if (this.state === 3 /* Inactive */) {
            this.activateProducer();
        }
        this.state = 1 /* Push */;
        this.changedAt = t;
    };
    ProducerBehavior.prototype.deactivate = function () {
        this.state = 3 /* Inactive */;
        this.deactivateProducer();
    };
    return ProducerBehavior;
}(Behavior));
exports.ProducerBehavior = ProducerBehavior;
var ProducerBehaviorFromFunction = /** @class */ (function (_super) {
    tslib_1.__extends(ProducerBehaviorFromFunction, _super);
    function ProducerBehaviorFromFunction(activateFn, update) {
        var _this = _super.call(this) || this;
        _this.activateFn = activateFn;
        _this.update = update;
        return _this;
    }
    ProducerBehaviorFromFunction.prototype.activateProducer = function () {
        this.state = 1 /* Push */;
        this.deactivateFn = this.activateFn(this.newValue.bind(this));
    };
    ProducerBehaviorFromFunction.prototype.deactivateProducer = function () {
        this.state = 3 /* Inactive */;
        this.deactivateFn();
    };
    return ProducerBehaviorFromFunction;
}(ProducerBehavior));
function producerBehavior(activate, getValue) {
    return new ProducerBehaviorFromFunction(activate, getValue);
}
exports.producerBehavior = producerBehavior;
var SinkBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(SinkBehavior, _super);
    function SinkBehavior(last) {
        var _this = _super.call(this) || this;
        _this.last = last;
        return _this;
    }
    SinkBehavior.prototype.push = function (a) {
        if (this.last !== a) {
            var t = clock_1.tick();
            this.last = a;
            this.changedAt = t;
            this.pulledAt = t;
            pushToChildren(t, this);
        }
    };
    SinkBehavior.prototype.update = function () {
        return this.last;
    };
    SinkBehavior.prototype.activateProducer = function () { };
    SinkBehavior.prototype.deactivateProducer = function () { };
    return SinkBehavior;
}(ProducerBehavior));
exports.SinkBehavior = SinkBehavior;
/**
 * Creates a behavior for imperative pushing.
 */
function sinkBehavior(initial) {
    return new SinkBehavior(initial);
}
exports.sinkBehavior = sinkBehavior;
/**
 * Impure function that gets the current value of a behavior. For a
 * pure variant see `sample`.
 */
function at(b, t) {
    return b.at(t);
}
exports.at = at;
var MapBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(MapBehavior, _super);
    function MapBehavior(parent, f) {
        var _this = _super.call(this) || this;
        _this.parent = parent;
        _this.f = f;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    MapBehavior.prototype.update = function (_t) {
        return this.f(this.parent.last);
    };
    return MapBehavior;
}(Behavior));
exports.MapBehavior = MapBehavior;
var ApBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(ApBehavior, _super);
    function ApBehavior(fn, val) {
        var _this = _super.call(this) || this;
        _this.fn = fn;
        _this.val = val;
        _this.parents = datastructures_1.cons(fn, datastructures_1.cons(val));
        return _this;
    }
    ApBehavior.prototype.update = function (_t) {
        return this.fn.last(this.val.last);
    };
    return ApBehavior;
}(Behavior));
/**
 * Apply a function valued behavior to a value behavior.
 *
 * @param fnB behavior of functions from `A` to `B`
 * @param valB A behavior of `A`
 * @returns Behavior of the function in `fnB` applied to the value in `valB`
 */
function ap(fnB, valB) {
    return valB.ap(fnB);
}
exports.ap = ap;
var LiftBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(LiftBehavior, _super);
    function LiftBehavior(f, bs) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.bs = bs;
        _this.parents = datastructures_1.fromArray(bs);
        return _this;
    }
    LiftBehavior.prototype.update = function (_t) {
        return this.f.apply(this, tslib_1.__spread(this.bs.map(function (b) { return b.last; })));
    };
    LiftBehavior.prototype.changeStateDown = function (_) {
        var e_3, _a, e_4, _b;
        var state = 0 /* Done */;
        try {
            for (var _c = tslib_1.__values(this.parents), _d = _c.next(); !_d.done; _d = _c.next()) {
                var p = _d.value;
                state = Math.max(state, p.state);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_3) throw e_3.error; }
        }
        if (this.state !== state) {
            this.state = state;
            try {
                for (var _e = tslib_1.__values(this.children), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var child = _f.value;
                    child.changeStateDown(state);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
    };
    return LiftBehavior;
}(Behavior));
exports.LiftBehavior = LiftBehavior;
var FlatMapBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(FlatMapBehavior, _super);
    function FlatMapBehavior(outer, fn) {
        var _this = _super.call(this) || this;
        _this.outer = outer;
        _this.fn = fn;
        _this.innerNode = new datastructures_1.Node(_this);
        _this.parents = datastructures_1.cons(_this.outer);
        return _this;
    }
    FlatMapBehavior.prototype.update = function (t) {
        var outerChanged = this.outer.changedAt > this.changedAt;
        if (outerChanged || this.changedAt === undefined) {
            if (this.innerB !== undefined) {
                this.innerB.removeListener(this.innerNode);
            }
            this.innerB = this.fn(this.outer.last);
            this.innerB.addListener(this.innerNode, t);
            if (this.state !== this.innerB.state) {
                this.changeStateDown(this.innerB.state);
            }
            this.parents = datastructures_1.cons(this.outer, datastructures_1.cons(this.innerB));
            if (this.innerB.state !== 1 /* Push */) {
                this.innerB.pull(t);
            }
        }
        return this.innerB.last;
    };
    return FlatMapBehavior;
}(Behavior));
/** @private */
var WhenBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(WhenBehavior, _super);
    function WhenBehavior(parent) {
        var _this = _super.call(this) || this;
        _this.parent = parent;
        _this.parents = datastructures_1.cons(parent);
        return _this;
    }
    WhenBehavior.prototype.update = function (_t) {
        return this.parent.last === true
            ? future_1.Future.of({})
            : new future_1.BehaviorFuture(this.parent);
    };
    return WhenBehavior;
}(Behavior));
function whenFrom(b) {
    return new WhenBehavior(b);
}
exports.whenFrom = whenFrom;
function when(b) {
    return now_1.sample(whenFrom(b));
}
exports.when = when;
var SnapshotBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(SnapshotBehavior, _super);
    function SnapshotBehavior(parent, future) {
        var _this = _super.call(this) || this;
        _this.parent = parent;
        _this.future = future;
        _this.node = new datastructures_1.Node(_this);
        if (future.state === 0 /* Done */) {
            // Future has occurred at some point in the past
            _this.state = parent.state;
            _this.parents = datastructures_1.cons(parent);
            _this.last = future_1.Future.of(at(parent));
        }
        else {
            _this.state = 1 /* Push */;
            _this.parents = datastructures_1.nil;
            _this.last = F.sinkFuture();
            future.addListener(_this.node, clock_1.tick());
        }
        return _this;
    }
    SnapshotBehavior.prototype.pushS = function (t, _val) {
        this.last.resolve(this.parent.at(t), t);
        this.parents = datastructures_1.cons(this.parent);
        this.changeStateDown(this.state);
        this.parent.addListener(this.node, t);
    };
    SnapshotBehavior.prototype.update = function (t) {
        if (this.future.state === 0 /* Done */) {
            return future_1.Future.of(this.parent.at(t));
        }
        else {
            return this.last;
        }
    };
    return SnapshotBehavior;
}(Behavior));
function snapshotAt(b, f) {
    return new SnapshotBehavior(b, f);
}
exports.snapshotAt = snapshotAt;
/** Behaviors that are always active */
var ActiveBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(ActiveBehavior, _super);
    function ActiveBehavior() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // noop methods, behavior is always active
    ActiveBehavior.prototype.activate = function () { };
    ActiveBehavior.prototype.deactivate = function () { };
    return ActiveBehavior;
}(Behavior));
exports.ActiveBehavior = ActiveBehavior;
var ConstantBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(ConstantBehavior, _super);
    function ConstantBehavior(last) {
        var _this = _super.call(this) || this;
        _this.last = last;
        _this.state = 1 /* Push */;
        _this.changedAt = clock_1.getTime();
        _this.parents = datastructures_1.nil;
        return _this;
    }
    ConstantBehavior.prototype.update = function (_t) {
        return this.last;
    };
    return ConstantBehavior;
}(ActiveBehavior));
exports.ConstantBehavior = ConstantBehavior;
/** @private */
var FunctionBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(FunctionBehavior, _super);
    function FunctionBehavior(f) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.state = 2 /* Pull */;
        _this.parents = datastructures_1.nil;
        return _this;
    }
    FunctionBehavior.prototype.pull = function (t) {
        if (this.pulledAt === t) {
            return;
        }
        this.pulledAt = t;
        refresh(this, t);
    };
    FunctionBehavior.prototype.update = function (t) {
        return this.f(t);
    };
    return FunctionBehavior;
}(ActiveBehavior));
exports.FunctionBehavior = FunctionBehavior;
function fromFunction(f) {
    return new FunctionBehavior(f);
}
exports.fromFunction = fromFunction;
/** @private */
var SwitcherBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(SwitcherBehavior, _super);
    function SwitcherBehavior(b, next, t) {
        var _this = _super.call(this) || this;
        _this.b = b;
        _this.bNode = new datastructures_1.Node(_this);
        _this.nNode = new datastructures_1.Node(_this);
        _this.parents = datastructures_1.cons(b);
        b.addListener(_this.bNode, t);
        _this.state = b.state;
        _this.last = b.last;
        next.addListener(_this.nNode, t);
        return _this;
    }
    SwitcherBehavior.prototype.update = function (_t) {
        return this.b.last;
    };
    SwitcherBehavior.prototype.pushS = function (t, value) {
        this.doSwitch(t, value);
    };
    SwitcherBehavior.prototype.doSwitch = function (t, newB) {
        this.b.removeListener(this.bNode);
        this.b = newB;
        this.parents = datastructures_1.cons(newB);
        newB.addListener(this.bNode, t);
        this.changeStateDown(newB.state);
        refresh(this, t);
        if (this.changedAt === t && this.state === 1 /* Push */) {
            pushToChildren(t, this);
        }
    };
    SwitcherBehavior.prototype.changeStateDown = function (_) {
        _super.prototype.changeStateDown.call(this, this.b.state);
    };
    return SwitcherBehavior;
}(ActiveBehavior));
/**
 * From an initial value and a future value, `stepTo` creates a new behavior
 * that has the initial value until `next` occurs, after which it has the value
 * of the future.
 */
function stepTo(init, next) {
    return new SwitcherBehavior(Behavior.of(init), next.map(Behavior.of), clock_1.tick());
}
exports.stepTo = stepTo;
/**
 * From an initial behavior and a future of a behavior, `switcher`
 * creates a new behavior that acts exactly like `initial` until
 * `next` occurs, after which it acts like the behavior it contains.
 */
function switchTo(init, next) {
    return new SwitcherBehavior(init, next, clock_1.tick());
}
exports.switchTo = switchTo;
function switcherFrom(init, stream) {
    return fromFunction(function (t) { return new SwitcherBehavior(init, stream, t); });
}
exports.switcherFrom = switcherFrom;
function switcher(init, stream) {
    return now_1.sample(switcherFrom(init, stream));
}
exports.switcher = switcher;
function freezeTo(init, freezeValue) {
    return switchTo(init, freezeValue.map(Behavior.of));
}
exports.freezeTo = freezeTo;
function freezeAtFrom(behavior, shouldFreeze) {
    return snapshotAt(behavior, shouldFreeze).map(function (f) { return freezeTo(behavior, f); });
}
exports.freezeAtFrom = freezeAtFrom;
function freezeAt(behavior, shouldFreeze) {
    return now_1.sample(freezeAtFrom(behavior, shouldFreeze));
}
exports.freezeAt = freezeAt;
/** @private */
var ActiveAccumBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(ActiveAccumBehavior, _super);
    function ActiveAccumBehavior(f, last, parent, t) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.last = last;
        _this.node = new datastructures_1.Node(_this);
        _this.state = 1 /* Push */;
        parent.addListener(_this.node, t);
        return _this;
    }
    ActiveAccumBehavior.prototype.pushS = function (t, value) {
        var newValue = this.f(value, this.last);
        if (newValue !== this.last) {
            this.changedAt = t;
            this.last = newValue;
            pushToChildren(t, this);
        }
    };
    ActiveAccumBehavior.prototype.pull = function (_t) { };
    ActiveAccumBehavior.prototype.update = function (_t) {
        throw new Error("Update should never be called.");
    };
    ActiveAccumBehavior.prototype.changeStateDown = function (_) {
        // No-op as an `ActiveAccumBehavior` is always in `Push` state
    };
    return ActiveAccumBehavior;
}(ActiveBehavior));
var AccumBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(AccumBehavior, _super);
    function AccumBehavior(f, initial, source) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.initial = initial;
        _this.source = source;
        _this.state = 2 /* Pull */;
        return _this;
    }
    AccumBehavior.prototype.update = function (t) {
        return new ActiveAccumBehavior(this.f, this.initial, this.source, t);
    };
    AccumBehavior.prototype.pull = function (t) {
        this.last = this.update(t);
        this.changedAt = t;
        this.pulledAt = t;
    };
    return AccumBehavior;
}(ActiveBehavior));
exports.AccumBehavior = AccumBehavior;
function accumFrom(f, initial, source) {
    return new AccumBehavior(f, initial, source);
}
exports.accumFrom = accumFrom;
function accum(f, initial, source) {
    return now_1.sample(accumFrom(f, initial, source));
}
exports.accum = accum;
function accumPairToApp(_a) {
    var _b = tslib_1.__read(_a, 2), stream = _b[0], fn = _b[1];
    return stream.map(function (a) { return function (b) { return fn(a, b); }; });
}
function accumCombineFrom(pairs, initial) {
    return accumFrom(function (a, b) { return a(b); }, initial, index_1.combine.apply(void 0, tslib_1.__spread(pairs.map(accumPairToApp))));
}
exports.accumCombineFrom = accumCombineFrom;
function accumCombine(pairs, initial) {
    return now_1.sample(accumCombineFrom(pairs, initial));
}
exports.accumCombine = accumCombine;
var firstArg = function (a, _) { return a; };
/**
 * Creates a Behavior whose value is the last occurrence in the stream.
 * @param initial - the initial value that the behavior has
 * @param steps - the stream that will change the value of the behavior
 */
function stepperFrom(initial, steps) {
    return accumFrom(firstArg, initial, steps);
}
exports.stepperFrom = stepperFrom;
/**
 * Creates a Behavior whose value is the last occurrence in the stream.
 * @param initial - the initial value that the behavior has
 * @param steps - the stream that will change the value of the behavior
 */
function stepper(initial, steps) {
    return now_1.sample(stepperFrom(initial, steps));
}
exports.stepper = stepper;
/**
 * Creates a Behavior whose value is `true` after `turnOn` occurring and `false` after `turnOff` occurring.
 * @param initial the initial value
 * @param turnOn the streams that turn the behavior on
 * @param turnOff the streams that turn the behavior off
 */
function toggleFrom(initial, turnOn, turnOff) {
    return stepperFrom(initial, turnOn.mapTo(true).combine(turnOff.mapTo(false)));
}
exports.toggleFrom = toggleFrom;
/**
 * Creates a Behavior whose value is `true` after `turnOn` occurring and `false` after `turnOff` occurring.
 * @param initial the initial value
 * @param turnOn the streams that turn the behavior on
 * @param turnOff the streams that turn the behavior off
 */
function toggle(initial, turnOn, turnOff) {
    return now_1.sample(toggleFrom(initial, turnOn, turnOff));
}
exports.toggle = toggle;
var MomentBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(MomentBehavior, _super);
    function MomentBehavior(f) {
        var _this = _super.call(this) || this;
        _this.f = f;
        _this.sampleBound = function (b) { return _this.sample(b); };
        return _this;
    }
    MomentBehavior.prototype.activate = function (t) {
        var e_5, _a;
        this.currentSampleTime = t;
        try {
            this.last = this.f(this.sampleBound);
            this.state = 1 /* Push */;
        }
        catch (error) {
            if ("placeholder" in error) {
                var placeholder = error.placeholder;
                if (this.listenerNodes !== undefined) {
                    try {
                        for (var _b = tslib_1.__values(this.listenerNodes), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var _d = _c.value, node_1 = _d.node, parent_2 = _d.parent;
                            parent_2.removeListener(node_1);
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                }
                var node = new datastructures_1.Node(this);
                this.listenerNodes = datastructures_1.cons({ node: node, parent: placeholder }, this.listenerNodes);
                placeholder.addListener(node);
                this.parents = datastructures_1.cons(placeholder);
            }
            else {
                throw error;
            }
        }
    };
    MomentBehavior.prototype.pull = function (t) {
        this.pulledAt = t;
        refresh(this, t);
    };
    MomentBehavior.prototype.update = function (t) {
        var e_6, _a;
        this.currentSampleTime = t;
        if (this.listenerNodes !== undefined) {
            try {
                for (var _b = tslib_1.__values(this.listenerNodes), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = _c.value, node = _d.node, parent_3 = _d.parent;
                    parent_3.removeListener(node);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
            }
        }
        this.parents = undefined;
        var value = this.f(this.sampleBound);
        return value;
    };
    MomentBehavior.prototype.sample = function (b) {
        var node = new datastructures_1.Node(this);
        this.listenerNodes = datastructures_1.cons({ node: node, parent: b }, this.listenerNodes);
        b.addListener(node, this.currentSampleTime);
        b.at(this.currentSampleTime);
        this.parents = datastructures_1.cons(b, this.parents);
        return b.last;
    };
    return MomentBehavior;
}(Behavior));
function moment(f) {
    return new MomentBehavior(f);
}
exports.moment = moment;
var FormatBehavior = /** @class */ (function (_super) {
    tslib_1.__extends(FormatBehavior, _super);
    function FormatBehavior(strings, behaviors) {
        var e_7, _a;
        var _this = _super.call(this) || this;
        _this.strings = strings;
        _this.behaviors = behaviors;
        var parents = undefined;
        try {
            for (var behaviors_1 = tslib_1.__values(behaviors), behaviors_1_1 = behaviors_1.next(); !behaviors_1_1.done; behaviors_1_1 = behaviors_1.next()) {
                var b = behaviors_1_1.value;
                if (isBehavior(b)) {
                    parents = datastructures_1.cons(b, parents);
                }
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (behaviors_1_1 && !behaviors_1_1.done && (_a = behaviors_1.return)) _a.call(behaviors_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
        _this.parents = parents;
        return _this;
    }
    FormatBehavior.prototype.update = function (_t) {
        var resultString = this.strings[0];
        for (var i = 0; i < this.behaviors.length; ++i) {
            var b = this.behaviors[i];
            var value = isBehavior(b) ? b.last : b;
            resultString += value.toString() + this.strings[i + 1];
        }
        return resultString;
    };
    return FormatBehavior;
}(Behavior));
function format(strings) {
    var behaviors = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        behaviors[_i - 1] = arguments[_i];
    }
    return new FormatBehavior(strings, behaviors);
}
exports.format = format;
exports.flatFuturesFrom = function (stream) { return fromFunction(function () { return new stream_1.FlatFutures(stream); }); };
function flatFutures(stream) {
    return now_1.sample(exports.flatFuturesFrom(stream));
}
exports.flatFutures = flatFutures;
exports.flatFuturesOrderedFrom = function (stream) { return fromFunction(function () { return new stream_1.FlatFuturesOrdered(stream); }); };
function flatFuturesOrdered(stream) {
    return now_1.sample(exports.flatFuturesOrderedFrom(stream));
}
exports.flatFuturesOrdered = flatFuturesOrdered;
exports.flatFuturesLatestFrom = function (stream) { return fromFunction(function () { return new stream_1.FlatFuturesLatest(stream); }); };
function flatFuturesLatest(stream) {
    return now_1.sample(exports.flatFuturesLatestFrom(stream));
}
exports.flatFuturesLatest = flatFuturesLatest;
