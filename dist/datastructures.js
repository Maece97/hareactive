"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = exports.DoubleLinkedList = exports.fromArray = exports.cons = exports.nil = exports.Cons = void 0;
var tslib_1 = require("tslib");
var Cons = /** @class */ (function () {
    function Cons(value, tail, isNil) {
        this.value = value;
        this.tail = tail;
        this.isNil = isNil;
    }
    Cons.prototype[Symbol.iterator] = function () {
        var head, v;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    head = this;
                    _a.label = 1;
                case 1:
                    if (!(head.isNil === false)) return [3 /*break*/, 3];
                    v = head.value;
                    head = head.tail;
                    return [4 /*yield*/, v];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    };
    return Cons;
}());
exports.Cons = Cons;
exports.nil = new Cons(undefined, undefined, true);
function cons(value, tail) {
    if (tail === void 0) { tail = exports.nil; }
    return new Cons(value, tail, false);
}
exports.cons = cons;
function fromArray(values) {
    var list = cons(values[0]);
    for (var i = 1; i < values.length; ++i) {
        list = cons(values[i], list);
    }
    return list;
}
exports.fromArray = fromArray;
/**
 * A double linked list. Updates are done by mutating. Prepend, append
 * and remove all run in O(1) time.
 */
var DoubleLinkedList = /** @class */ (function () {
    function DoubleLinkedList() {
    }
    DoubleLinkedList.prototype.prepend = function (node) {
        if (this.tail === undefined) {
            this.tail = node;
        }
        node.next = this.head;
        if (this.head !== undefined) {
            this.head.prev = node;
        }
        node.prev = undefined;
        this.head = node;
        return this;
    };
    DoubleLinkedList.prototype.remove = function (node) {
        if (node.next !== undefined) {
            node.next.prev = node.prev;
        }
        if (node.prev !== undefined) {
            node.prev.next = node.next;
        }
        if (this.head === node) {
            this.head = node.next;
        }
        if (this.tail === node) {
            this.tail = node.prev;
        }
        node.prev = undefined;
        node.next = undefined;
        return this;
    };
    DoubleLinkedList.prototype[Symbol.iterator] = function () {
        var head, v;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    head = this.head;
                    _a.label = 1;
                case 1:
                    if (!(head !== undefined)) return [3 /*break*/, 3];
                    v = head.value;
                    head = head.next;
                    return [4 /*yield*/, v];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    };
    return DoubleLinkedList;
}());
exports.DoubleLinkedList = DoubleLinkedList;
var Node = /** @class */ (function () {
    function Node(value) {
        this.value = value;
    }
    return Node;
}());
exports.Node = Node;
