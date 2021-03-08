"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeholder = exports.isPlaceholder = exports.Placeholder = void 0;
var tslib_1 = require("tslib");
var behavior_1 = require("./behavior");
var datastructures_1 = require("./datastructures");
var stream_1 = require("./stream");
var clock_1 = require("./clock");
var future_1 = require("./future");
var SamplePlaceholderError = /** @class */ (function () {
    function SamplePlaceholderError(placeholder) {
        this.placeholder = placeholder;
        this.message = "Attempt to sample non-replaced placeholder";
    }
    SamplePlaceholderError.prototype.toString = function () {
        return this.message;
    };
    return SamplePlaceholderError;
}());
var Placeholder = /** @class */ (function (_super) {
    tslib_1.__extends(Placeholder, _super);
    function Placeholder() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.node = new datastructures_1.Node(_this);
        return _this;
    }
    Placeholder.prototype.replaceWith = function (parent, t) {
        this.source = parent;
        this.parents = datastructures_1.cons(parent);
        if (this.children.head !== undefined) {
            t = t !== undefined ? t : clock_1.tick();
            this.activate(t);
            if (behavior_1.isBehavior(parent) && this.state === 1 /* Push */) {
                behavior_1.pushToChildren(t, this);
            }
        }
    };
    Placeholder.prototype.pushS = function (t, a) {
        var e_1, _a;
        try {
            for (var _b = tslib_1.__values(this.children), _c = _b.next(); !_c.done; _c = _b.next()) {
                var child = _c.value;
                child.pushS(t, a);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    Placeholder.prototype.pull = function (t) {
        if (this.source === undefined) {
            throw new SamplePlaceholderError(this);
        }
        else if (behavior_1.isBehavior(this.source)) {
            this.source.pull(t);
            this.pulledAt = t;
            this.changedAt = t;
            this.last = this.source.last;
        }
        else {
            throw new Error("Unsupported pulling on placeholder");
        }
    };
    Placeholder.prototype.update = function (_t) {
        return this.source.last;
    };
    Placeholder.prototype.activate = function (t) {
        if (this.source !== undefined) {
            this.source.addListener(this.node, t);
            if (behavior_1.isBehavior(this.source)) {
                this.last = this.source.last;
                this.changedAt = this.source.changedAt;
                this.pulledAt = this.source.pulledAt;
            }
            this.changeStateDown(this.source.state);
        }
    };
    Placeholder.prototype.deactivate = function (_done) {
        if (_done === void 0) { _done = false; }
        this.state = 3 /* Inactive */;
        if (this.source !== undefined) {
            this.source.removeListener(this.node);
        }
    };
    Placeholder.prototype.map = function (fn) {
        return new MapPlaceholder(this, fn);
    };
    Placeholder.prototype.mapTo = function (b) {
        return new MapToPlaceholder(this, b);
    };
    return Placeholder;
}(behavior_1.Behavior));
exports.Placeholder = Placeholder;
function isPlaceholder(p) {
    return typeof p === "object" && "replaceWith" in p;
}
exports.isPlaceholder = isPlaceholder;
var MapPlaceholder = /** @class */ (function (_super) {
    tslib_1.__extends(MapPlaceholder, _super);
    function MapPlaceholder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MapPlaceholder.prototype.pushS = function (t, a) {
        // @ts-ignore
        this.pushSToChildren(t, this.f(a));
    };
    return MapPlaceholder;
}(behavior_1.MapBehavior));
var MapToPlaceholder = /** @class */ (function (_super) {
    tslib_1.__extends(MapToPlaceholder, _super);
    function MapToPlaceholder(parent, last) {
        var _this = _super.call(this, parent, last) || this;
        _this.last = last;
        return _this;
    }
    MapToPlaceholder.prototype.update = function () {
        return this.b;
    };
    MapToPlaceholder.prototype.pull = function (t) {
        if (this.changedAt === undefined) {
            this.changedAt = t;
        }
    };
    return MapToPlaceholder;
}(stream_1.MapToStream));
function install(target, source) {
    var e_2, _a;
    try {
        for (var _b = tslib_1.__values(Object.getOwnPropertyNames(source.prototype)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var key = _c.value;
            if (target.prototype[key] === undefined) {
                target.prototype[key] = source.prototype[key];
            }
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
function installMethods() {
    install(Placeholder, stream_1.Stream);
    install(Placeholder, future_1.Future);
    MapPlaceholder.prototype.map = Placeholder.prototype.map;
    MapPlaceholder.prototype.mapTo = Placeholder.prototype.mapTo;
    MapToPlaceholder.prototype.map = Placeholder.prototype.map;
    MapToPlaceholder.prototype.mapTo = Placeholder.prototype.mapTo;
    install(MapPlaceholder, stream_1.Stream);
    install(MapPlaceholder, future_1.Future);
    install(MapToPlaceholder, behavior_1.Behavior);
    install(MapPlaceholder, future_1.Future);
}
function placeholder() {
    if (Placeholder.prototype.scanFrom === undefined) {
        // The methods are installed lazily when the placeholder is first
        // used. This avoids a top-level impure expression that would
        // prevent tree-shaking.
        installMethods();
    }
    return new Placeholder();
}
exports.placeholder = placeholder;
