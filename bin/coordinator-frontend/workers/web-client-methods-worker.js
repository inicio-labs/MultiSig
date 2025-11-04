var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var dexie = {exports: {}};

/*
 * Dexie.js - a minimalistic wrapper for IndexedDB
 * ===============================================
 *
 * By David Fahlander, david.fahlander@gmail.com
 *
 * Version 4.0.8, Wed Jul 10 2024
 *
 * https://dexie.org
 *
 * Apache License Version 2.0, January 2004, http://www.apache.org/licenses/
 */

(function (module, exports) {
	(function (global, factory) {
	    module.exports = factory() ;
	})(commonjsGlobal, (function () {
	    /*! *****************************************************************************
	    Copyright (c) Microsoft Corporation.
	    Permission to use, copy, modify, and/or distribute this software for any
	    purpose with or without fee is hereby granted.
	    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
	    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
	    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
	    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
	    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
	    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
	    PERFORMANCE OF THIS SOFTWARE.
	    ***************************************************************************** */
	    var extendStatics = function(d, b) {
	        extendStatics = Object.setPrototypeOf ||
	            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
	            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
	        return extendStatics(d, b);
	    };
	    function __extends(d, b) {
	        if (typeof b !== "function" && b !== null)
	            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
	        extendStatics(d, b);
	        function __() { this.constructor = d; }
	        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	    }
	    var __assign = function() {
	        __assign = Object.assign || function __assign(t) {
	            for (var s, i = 1, n = arguments.length; i < n; i++) {
	                s = arguments[i];
	                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
	            }
	            return t;
	        };
	        return __assign.apply(this, arguments);
	    };
	    function __spreadArray(to, from, pack) {
	        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
	            if (ar || !(i in from)) {
	                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
	                ar[i] = from[i];
	            }
	        }
	        return to.concat(ar || Array.prototype.slice.call(from));
	    }

	    var _global = typeof globalThis !== 'undefined' ? globalThis :
	        typeof self !== 'undefined' ? self :
	            typeof window !== 'undefined' ? window :
	                commonjsGlobal;

	    var keys = Object.keys;
	    var isArray = Array.isArray;
	    if (typeof Promise !== 'undefined' && !_global.Promise) {
	        _global.Promise = Promise;
	    }
	    function extend(obj, extension) {
	        if (typeof extension !== 'object')
	            return obj;
	        keys(extension).forEach(function (key) {
	            obj[key] = extension[key];
	        });
	        return obj;
	    }
	    var getProto = Object.getPrototypeOf;
	    var _hasOwn = {}.hasOwnProperty;
	    function hasOwn(obj, prop) {
	        return _hasOwn.call(obj, prop);
	    }
	    function props(proto, extension) {
	        if (typeof extension === 'function')
	            extension = extension(getProto(proto));
	        (typeof Reflect === "undefined" ? keys : Reflect.ownKeys)(extension).forEach(function (key) {
	            setProp(proto, key, extension[key]);
	        });
	    }
	    var defineProperty = Object.defineProperty;
	    function setProp(obj, prop, functionOrGetSet, options) {
	        defineProperty(obj, prop, extend(functionOrGetSet && hasOwn(functionOrGetSet, "get") && typeof functionOrGetSet.get === 'function' ?
	            { get: functionOrGetSet.get, set: functionOrGetSet.set, configurable: true } :
	            { value: functionOrGetSet, configurable: true, writable: true }, options));
	    }
	    function derive(Child) {
	        return {
	            from: function (Parent) {
	                Child.prototype = Object.create(Parent.prototype);
	                setProp(Child.prototype, "constructor", Child);
	                return {
	                    extend: props.bind(null, Child.prototype)
	                };
	            }
	        };
	    }
	    var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
	    function getPropertyDescriptor(obj, prop) {
	        var pd = getOwnPropertyDescriptor(obj, prop);
	        var proto;
	        return pd || (proto = getProto(obj)) && getPropertyDescriptor(proto, prop);
	    }
	    var _slice = [].slice;
	    function slice(args, start, end) {
	        return _slice.call(args, start, end);
	    }
	    function override(origFunc, overridedFactory) {
	        return overridedFactory(origFunc);
	    }
	    function assert(b) {
	        if (!b)
	            throw new Error("Assertion Failed");
	    }
	    function asap$1(fn) {
	        if (_global.setImmediate)
	            setImmediate(fn);
	        else
	            setTimeout(fn, 0);
	    }
	    function arrayToObject(array, extractor) {
	        return array.reduce(function (result, item, i) {
	            var nameAndValue = extractor(item, i);
	            if (nameAndValue)
	                result[nameAndValue[0]] = nameAndValue[1];
	            return result;
	        }, {});
	    }
	    function getByKeyPath(obj, keyPath) {
	        if (typeof keyPath === 'string' && hasOwn(obj, keyPath))
	            return obj[keyPath];
	        if (!keyPath)
	            return obj;
	        if (typeof keyPath !== 'string') {
	            var rv = [];
	            for (var i = 0, l = keyPath.length; i < l; ++i) {
	                var val = getByKeyPath(obj, keyPath[i]);
	                rv.push(val);
	            }
	            return rv;
	        }
	        var period = keyPath.indexOf('.');
	        if (period !== -1) {
	            var innerObj = obj[keyPath.substr(0, period)];
	            return innerObj == null ? undefined : getByKeyPath(innerObj, keyPath.substr(period + 1));
	        }
	        return undefined;
	    }
	    function setByKeyPath(obj, keyPath, value) {
	        if (!obj || keyPath === undefined)
	            return;
	        if ('isFrozen' in Object && Object.isFrozen(obj))
	            return;
	        if (typeof keyPath !== 'string' && 'length' in keyPath) {
	            assert(typeof value !== 'string' && 'length' in value);
	            for (var i = 0, l = keyPath.length; i < l; ++i) {
	                setByKeyPath(obj, keyPath[i], value[i]);
	            }
	        }
	        else {
	            var period = keyPath.indexOf('.');
	            if (period !== -1) {
	                var currentKeyPath = keyPath.substr(0, period);
	                var remainingKeyPath = keyPath.substr(period + 1);
	                if (remainingKeyPath === "")
	                    if (value === undefined) {
	                        if (isArray(obj) && !isNaN(parseInt(currentKeyPath)))
	                            obj.splice(currentKeyPath, 1);
	                        else
	                            delete obj[currentKeyPath];
	                    }
	                    else
	                        obj[currentKeyPath] = value;
	                else {
	                    var innerObj = obj[currentKeyPath];
	                    if (!innerObj || !hasOwn(obj, currentKeyPath))
	                        innerObj = (obj[currentKeyPath] = {});
	                    setByKeyPath(innerObj, remainingKeyPath, value);
	                }
	            }
	            else {
	                if (value === undefined) {
	                    if (isArray(obj) && !isNaN(parseInt(keyPath)))
	                        obj.splice(keyPath, 1);
	                    else
	                        delete obj[keyPath];
	                }
	                else
	                    obj[keyPath] = value;
	            }
	        }
	    }
	    function delByKeyPath(obj, keyPath) {
	        if (typeof keyPath === 'string')
	            setByKeyPath(obj, keyPath, undefined);
	        else if ('length' in keyPath)
	            [].map.call(keyPath, function (kp) {
	                setByKeyPath(obj, kp, undefined);
	            });
	    }
	    function shallowClone(obj) {
	        var rv = {};
	        for (var m in obj) {
	            if (hasOwn(obj, m))
	                rv[m] = obj[m];
	        }
	        return rv;
	    }
	    var concat = [].concat;
	    function flatten(a) {
	        return concat.apply([], a);
	    }
	    var intrinsicTypeNames = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey"
	        .split(',').concat(flatten([8, 16, 32, 64].map(function (num) { return ["Int", "Uint", "Float"].map(function (t) { return t + num + "Array"; }); }))).filter(function (t) { return _global[t]; });
	    var intrinsicTypes = new Set(intrinsicTypeNames.map(function (t) { return _global[t]; }));
	    function cloneSimpleObjectTree(o) {
	        var rv = {};
	        for (var k in o)
	            if (hasOwn(o, k)) {
	                var v = o[k];
	                rv[k] = !v || typeof v !== 'object' || intrinsicTypes.has(v.constructor) ? v : cloneSimpleObjectTree(v);
	            }
	        return rv;
	    }
	    function objectIsEmpty(o) {
	        for (var k in o)
	            if (hasOwn(o, k))
	                return false;
	        return true;
	    }
	    var circularRefs = null;
	    function deepClone(any) {
	        circularRefs = new WeakMap();
	        var rv = innerDeepClone(any);
	        circularRefs = null;
	        return rv;
	    }
	    function innerDeepClone(x) {
	        if (!x || typeof x !== 'object')
	            return x;
	        var rv = circularRefs.get(x);
	        if (rv)
	            return rv;
	        if (isArray(x)) {
	            rv = [];
	            circularRefs.set(x, rv);
	            for (var i = 0, l = x.length; i < l; ++i) {
	                rv.push(innerDeepClone(x[i]));
	            }
	        }
	        else if (intrinsicTypes.has(x.constructor)) {
	            rv = x;
	        }
	        else {
	            var proto = getProto(x);
	            rv = proto === Object.prototype ? {} : Object.create(proto);
	            circularRefs.set(x, rv);
	            for (var prop in x) {
	                if (hasOwn(x, prop)) {
	                    rv[prop] = innerDeepClone(x[prop]);
	                }
	            }
	        }
	        return rv;
	    }
	    var toString = {}.toString;
	    function toStringTag(o) {
	        return toString.call(o).slice(8, -1);
	    }
	    var iteratorSymbol = typeof Symbol !== 'undefined' ?
	        Symbol.iterator :
	        '@@iterator';
	    var getIteratorOf = typeof iteratorSymbol === "symbol" ? function (x) {
	        var i;
	        return x != null && (i = x[iteratorSymbol]) && i.apply(x);
	    } : function () { return null; };
	    function delArrayItem(a, x) {
	        var i = a.indexOf(x);
	        if (i >= 0)
	            a.splice(i, 1);
	        return i >= 0;
	    }
	    var NO_CHAR_ARRAY = {};
	    function getArrayOf(arrayLike) {
	        var i, a, x, it;
	        if (arguments.length === 1) {
	            if (isArray(arrayLike))
	                return arrayLike.slice();
	            if (this === NO_CHAR_ARRAY && typeof arrayLike === 'string')
	                return [arrayLike];
	            if ((it = getIteratorOf(arrayLike))) {
	                a = [];
	                while ((x = it.next()), !x.done)
	                    a.push(x.value);
	                return a;
	            }
	            if (arrayLike == null)
	                return [arrayLike];
	            i = arrayLike.length;
	            if (typeof i === 'number') {
	                a = new Array(i);
	                while (i--)
	                    a[i] = arrayLike[i];
	                return a;
	            }
	            return [arrayLike];
	        }
	        i = arguments.length;
	        a = new Array(i);
	        while (i--)
	            a[i] = arguments[i];
	        return a;
	    }
	    var isAsyncFunction = typeof Symbol !== 'undefined'
	        ? function (fn) { return fn[Symbol.toStringTag] === 'AsyncFunction'; }
	        : function () { return false; };

	    var dexieErrorNames = [
	        'Modify',
	        'Bulk',
	        'OpenFailed',
	        'VersionChange',
	        'Schema',
	        'Upgrade',
	        'InvalidTable',
	        'MissingAPI',
	        'NoSuchDatabase',
	        'InvalidArgument',
	        'SubTransaction',
	        'Unsupported',
	        'Internal',
	        'DatabaseClosed',
	        'PrematureCommit',
	        'ForeignAwait'
	    ];
	    var idbDomErrorNames = [
	        'Unknown',
	        'Constraint',
	        'Data',
	        'TransactionInactive',
	        'ReadOnly',
	        'Version',
	        'NotFound',
	        'InvalidState',
	        'InvalidAccess',
	        'Abort',
	        'Timeout',
	        'QuotaExceeded',
	        'Syntax',
	        'DataClone'
	    ];
	    var errorList = dexieErrorNames.concat(idbDomErrorNames);
	    var defaultTexts = {
	        VersionChanged: "Database version changed by other database connection",
	        DatabaseClosed: "Database has been closed",
	        Abort: "Transaction aborted",
	        TransactionInactive: "Transaction has already completed or failed",
	        MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb"
	    };
	    function DexieError(name, msg) {
	        this.name = name;
	        this.message = msg;
	    }
	    derive(DexieError).from(Error).extend({
	        toString: function () { return this.name + ": " + this.message; }
	    });
	    function getMultiErrorMessage(msg, failures) {
	        return msg + ". Errors: " + Object.keys(failures)
	            .map(function (key) { return failures[key].toString(); })
	            .filter(function (v, i, s) { return s.indexOf(v) === i; })
	            .join('\n');
	    }
	    function ModifyError(msg, failures, successCount, failedKeys) {
	        this.failures = failures;
	        this.failedKeys = failedKeys;
	        this.successCount = successCount;
	        this.message = getMultiErrorMessage(msg, failures);
	    }
	    derive(ModifyError).from(DexieError);
	    function BulkError(msg, failures) {
	        this.name = "BulkError";
	        this.failures = Object.keys(failures).map(function (pos) { return failures[pos]; });
	        this.failuresByPos = failures;
	        this.message = getMultiErrorMessage(msg, this.failures);
	    }
	    derive(BulkError).from(DexieError);
	    var errnames = errorList.reduce(function (obj, name) { return (obj[name] = name + "Error", obj); }, {});
	    var BaseException = DexieError;
	    var exceptions = errorList.reduce(function (obj, name) {
	        var fullName = name + "Error";
	        function DexieError(msgOrInner, inner) {
	            this.name = fullName;
	            if (!msgOrInner) {
	                this.message = defaultTexts[name] || fullName;
	                this.inner = null;
	            }
	            else if (typeof msgOrInner === 'string') {
	                this.message = "".concat(msgOrInner).concat(!inner ? '' : '\n ' + inner);
	                this.inner = inner || null;
	            }
	            else if (typeof msgOrInner === 'object') {
	                this.message = "".concat(msgOrInner.name, " ").concat(msgOrInner.message);
	                this.inner = msgOrInner;
	            }
	        }
	        derive(DexieError).from(BaseException);
	        obj[name] = DexieError;
	        return obj;
	    }, {});
	    exceptions.Syntax = SyntaxError;
	    exceptions.Type = TypeError;
	    exceptions.Range = RangeError;
	    var exceptionMap = idbDomErrorNames.reduce(function (obj, name) {
	        obj[name + "Error"] = exceptions[name];
	        return obj;
	    }, {});
	    function mapError(domError, message) {
	        if (!domError || domError instanceof DexieError || domError instanceof TypeError || domError instanceof SyntaxError || !domError.name || !exceptionMap[domError.name])
	            return domError;
	        var rv = new exceptionMap[domError.name](message || domError.message, domError);
	        if ("stack" in domError) {
	            setProp(rv, "stack", { get: function () {
	                    return this.inner.stack;
	                } });
	        }
	        return rv;
	    }
	    var fullNameExceptions = errorList.reduce(function (obj, name) {
	        if (["Syntax", "Type", "Range"].indexOf(name) === -1)
	            obj[name + "Error"] = exceptions[name];
	        return obj;
	    }, {});
	    fullNameExceptions.ModifyError = ModifyError;
	    fullNameExceptions.DexieError = DexieError;
	    fullNameExceptions.BulkError = BulkError;

	    function nop() { }
	    function mirror(val) { return val; }
	    function pureFunctionChain(f1, f2) {
	        if (f1 == null || f1 === mirror)
	            return f2;
	        return function (val) {
	            return f2(f1(val));
	        };
	    }
	    function callBoth(on1, on2) {
	        return function () {
	            on1.apply(this, arguments);
	            on2.apply(this, arguments);
	        };
	    }
	    function hookCreatingChain(f1, f2) {
	        if (f1 === nop)
	            return f2;
	        return function () {
	            var res = f1.apply(this, arguments);
	            if (res !== undefined)
	                arguments[0] = res;
	            var onsuccess = this.onsuccess,
	            onerror = this.onerror;
	            this.onsuccess = null;
	            this.onerror = null;
	            var res2 = f2.apply(this, arguments);
	            if (onsuccess)
	                this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
	            if (onerror)
	                this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
	            return res2 !== undefined ? res2 : res;
	        };
	    }
	    function hookDeletingChain(f1, f2) {
	        if (f1 === nop)
	            return f2;
	        return function () {
	            f1.apply(this, arguments);
	            var onsuccess = this.onsuccess,
	            onerror = this.onerror;
	            this.onsuccess = this.onerror = null;
	            f2.apply(this, arguments);
	            if (onsuccess)
	                this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
	            if (onerror)
	                this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
	        };
	    }
	    function hookUpdatingChain(f1, f2) {
	        if (f1 === nop)
	            return f2;
	        return function (modifications) {
	            var res = f1.apply(this, arguments);
	            extend(modifications, res);
	            var onsuccess = this.onsuccess,
	            onerror = this.onerror;
	            this.onsuccess = null;
	            this.onerror = null;
	            var res2 = f2.apply(this, arguments);
	            if (onsuccess)
	                this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
	            if (onerror)
	                this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
	            return res === undefined ?
	                (res2 === undefined ? undefined : res2) :
	                (extend(res, res2));
	        };
	    }
	    function reverseStoppableEventChain(f1, f2) {
	        if (f1 === nop)
	            return f2;
	        return function () {
	            if (f2.apply(this, arguments) === false)
	                return false;
	            return f1.apply(this, arguments);
	        };
	    }
	    function promisableChain(f1, f2) {
	        if (f1 === nop)
	            return f2;
	        return function () {
	            var res = f1.apply(this, arguments);
	            if (res && typeof res.then === 'function') {
	                var thiz = this, i = arguments.length, args = new Array(i);
	                while (i--)
	                    args[i] = arguments[i];
	                return res.then(function () {
	                    return f2.apply(thiz, args);
	                });
	            }
	            return f2.apply(this, arguments);
	        };
	    }

	    var debug = typeof location !== 'undefined' &&
	        /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
	    function setDebug(value, filter) {
	        debug = value;
	    }

	    var INTERNAL = {};
	    var ZONE_ECHO_LIMIT = 100, _a$1 = typeof Promise === 'undefined' ?
	        [] :
	        (function () {
	            var globalP = Promise.resolve();
	            if (typeof crypto === 'undefined' || !crypto.subtle)
	                return [globalP, getProto(globalP), globalP];
	            var nativeP = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
	            return [
	                nativeP,
	                getProto(nativeP),
	                globalP
	            ];
	        })(), resolvedNativePromise = _a$1[0], nativePromiseProto = _a$1[1], resolvedGlobalPromise = _a$1[2], nativePromiseThen = nativePromiseProto && nativePromiseProto.then;
	    var NativePromise = resolvedNativePromise && resolvedNativePromise.constructor;
	    var patchGlobalPromise = !!resolvedGlobalPromise;
	    function schedulePhysicalTick() {
	        queueMicrotask(physicalTick);
	    }
	    var asap = function (callback, args) {
	        microtickQueue.push([callback, args]);
	        if (needsNewPhysicalTick) {
	            schedulePhysicalTick();
	            needsNewPhysicalTick = false;
	        }
	    };
	    var isOutsideMicroTick = true,
	    needsNewPhysicalTick = true,
	    unhandledErrors = [],
	    rejectingErrors = [],
	    rejectionMapper = mirror;
	    var globalPSD = {
	        id: 'global',
	        global: true,
	        ref: 0,
	        unhandleds: [],
	        onunhandled: nop,
	        pgp: false,
	        env: {},
	        finalize: nop
	    };
	    var PSD = globalPSD;
	    var microtickQueue = [];
	    var numScheduledCalls = 0;
	    var tickFinalizers = [];
	    function DexiePromise(fn) {
	        if (typeof this !== 'object')
	            throw new TypeError('Promises must be constructed via new');
	        this._listeners = [];
	        this._lib = false;
	        var psd = (this._PSD = PSD);
	        if (typeof fn !== 'function') {
	            if (fn !== INTERNAL)
	                throw new TypeError('Not a function');
	            this._state = arguments[1];
	            this._value = arguments[2];
	            if (this._state === false)
	                handleRejection(this, this._value);
	            return;
	        }
	        this._state = null;
	        this._value = null;
	        ++psd.ref;
	        executePromiseTask(this, fn);
	    }
	    var thenProp = {
	        get: function () {
	            var psd = PSD, microTaskId = totalEchoes;
	            function then(onFulfilled, onRejected) {
	                var _this = this;
	                var possibleAwait = !psd.global && (psd !== PSD || microTaskId !== totalEchoes);
	                var cleanup = possibleAwait && !decrementExpectedAwaits();
	                var rv = new DexiePromise(function (resolve, reject) {
	                    propagateToListener(_this, new Listener(nativeAwaitCompatibleWrap(onFulfilled, psd, possibleAwait, cleanup), nativeAwaitCompatibleWrap(onRejected, psd, possibleAwait, cleanup), resolve, reject, psd));
	                });
	                if (this._consoleTask)
	                    rv._consoleTask = this._consoleTask;
	                return rv;
	            }
	            then.prototype = INTERNAL;
	            return then;
	        },
	        set: function (value) {
	            setProp(this, 'then', value && value.prototype === INTERNAL ?
	                thenProp :
	                {
	                    get: function () {
	                        return value;
	                    },
	                    set: thenProp.set
	                });
	        }
	    };
	    props(DexiePromise.prototype, {
	        then: thenProp,
	        _then: function (onFulfilled, onRejected) {
	            propagateToListener(this, new Listener(null, null, onFulfilled, onRejected, PSD));
	        },
	        catch: function (onRejected) {
	            if (arguments.length === 1)
	                return this.then(null, onRejected);
	            var type = arguments[0], handler = arguments[1];
	            return typeof type === 'function' ? this.then(null, function (err) {
	                return err instanceof type ? handler(err) : PromiseReject(err);
	            })
	                : this.then(null, function (err) {
	                    return err && err.name === type ? handler(err) : PromiseReject(err);
	                });
	        },
	        finally: function (onFinally) {
	            return this.then(function (value) {
	                return DexiePromise.resolve(onFinally()).then(function () { return value; });
	            }, function (err) {
	                return DexiePromise.resolve(onFinally()).then(function () { return PromiseReject(err); });
	            });
	        },
	        timeout: function (ms, msg) {
	            var _this = this;
	            return ms < Infinity ?
	                new DexiePromise(function (resolve, reject) {
	                    var handle = setTimeout(function () { return reject(new exceptions.Timeout(msg)); }, ms);
	                    _this.then(resolve, reject).finally(clearTimeout.bind(null, handle));
	                }) : this;
	        }
	    });
	    if (typeof Symbol !== 'undefined' && Symbol.toStringTag)
	        setProp(DexiePromise.prototype, Symbol.toStringTag, 'Dexie.Promise');
	    globalPSD.env = snapShot();
	    function Listener(onFulfilled, onRejected, resolve, reject, zone) {
	        this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
	        this.onRejected = typeof onRejected === 'function' ? onRejected : null;
	        this.resolve = resolve;
	        this.reject = reject;
	        this.psd = zone;
	    }
	    props(DexiePromise, {
	        all: function () {
	            var values = getArrayOf.apply(null, arguments)
	                .map(onPossibleParallellAsync);
	            return new DexiePromise(function (resolve, reject) {
	                if (values.length === 0)
	                    resolve([]);
	                var remaining = values.length;
	                values.forEach(function (a, i) { return DexiePromise.resolve(a).then(function (x) {
	                    values[i] = x;
	                    if (!--remaining)
	                        resolve(values);
	                }, reject); });
	            });
	        },
	        resolve: function (value) {
	            if (value instanceof DexiePromise)
	                return value;
	            if (value && typeof value.then === 'function')
	                return new DexiePromise(function (resolve, reject) {
	                    value.then(resolve, reject);
	                });
	            var rv = new DexiePromise(INTERNAL, true, value);
	            return rv;
	        },
	        reject: PromiseReject,
	        race: function () {
	            var values = getArrayOf.apply(null, arguments).map(onPossibleParallellAsync);
	            return new DexiePromise(function (resolve, reject) {
	                values.map(function (value) { return DexiePromise.resolve(value).then(resolve, reject); });
	            });
	        },
	        PSD: {
	            get: function () { return PSD; },
	            set: function (value) { return PSD = value; }
	        },
	        totalEchoes: { get: function () { return totalEchoes; } },
	        newPSD: newScope,
	        usePSD: usePSD,
	        scheduler: {
	            get: function () { return asap; },
	            set: function (value) { asap = value; }
	        },
	        rejectionMapper: {
	            get: function () { return rejectionMapper; },
	            set: function (value) { rejectionMapper = value; }
	        },
	        follow: function (fn, zoneProps) {
	            return new DexiePromise(function (resolve, reject) {
	                return newScope(function (resolve, reject) {
	                    var psd = PSD;
	                    psd.unhandleds = [];
	                    psd.onunhandled = reject;
	                    psd.finalize = callBoth(function () {
	                        var _this = this;
	                        run_at_end_of_this_or_next_physical_tick(function () {
	                            _this.unhandleds.length === 0 ? resolve() : reject(_this.unhandleds[0]);
	                        });
	                    }, psd.finalize);
	                    fn();
	                }, zoneProps, resolve, reject);
	            });
	        }
	    });
	    if (NativePromise) {
	        if (NativePromise.allSettled)
	            setProp(DexiePromise, "allSettled", function () {
	                var possiblePromises = getArrayOf.apply(null, arguments).map(onPossibleParallellAsync);
	                return new DexiePromise(function (resolve) {
	                    if (possiblePromises.length === 0)
	                        resolve([]);
	                    var remaining = possiblePromises.length;
	                    var results = new Array(remaining);
	                    possiblePromises.forEach(function (p, i) { return DexiePromise.resolve(p).then(function (value) { return results[i] = { status: "fulfilled", value: value }; }, function (reason) { return results[i] = { status: "rejected", reason: reason }; })
	                        .then(function () { return --remaining || resolve(results); }); });
	                });
	            });
	        if (NativePromise.any && typeof AggregateError !== 'undefined')
	            setProp(DexiePromise, "any", function () {
	                var possiblePromises = getArrayOf.apply(null, arguments).map(onPossibleParallellAsync);
	                return new DexiePromise(function (resolve, reject) {
	                    if (possiblePromises.length === 0)
	                        reject(new AggregateError([]));
	                    var remaining = possiblePromises.length;
	                    var failures = new Array(remaining);
	                    possiblePromises.forEach(function (p, i) { return DexiePromise.resolve(p).then(function (value) { return resolve(value); }, function (failure) {
	                        failures[i] = failure;
	                        if (!--remaining)
	                            reject(new AggregateError(failures));
	                    }); });
	                });
	            });
	    }
	    function executePromiseTask(promise, fn) {
	        try {
	            fn(function (value) {
	                if (promise._state !== null)
	                    return;
	                if (value === promise)
	                    throw new TypeError('A promise cannot be resolved with itself.');
	                var shouldExecuteTick = promise._lib && beginMicroTickScope();
	                if (value && typeof value.then === 'function') {
	                    executePromiseTask(promise, function (resolve, reject) {
	                        value instanceof DexiePromise ?
	                            value._then(resolve, reject) :
	                            value.then(resolve, reject);
	                    });
	                }
	                else {
	                    promise._state = true;
	                    promise._value = value;
	                    propagateAllListeners(promise);
	                }
	                if (shouldExecuteTick)
	                    endMicroTickScope();
	            }, handleRejection.bind(null, promise));
	        }
	        catch (ex) {
	            handleRejection(promise, ex);
	        }
	    }
	    function handleRejection(promise, reason) {
	        rejectingErrors.push(reason);
	        if (promise._state !== null)
	            return;
	        var shouldExecuteTick = promise._lib && beginMicroTickScope();
	        reason = rejectionMapper(reason);
	        promise._state = false;
	        promise._value = reason;
	        addPossiblyUnhandledError(promise);
	        propagateAllListeners(promise);
	        if (shouldExecuteTick)
	            endMicroTickScope();
	    }
	    function propagateAllListeners(promise) {
	        var listeners = promise._listeners;
	        promise._listeners = [];
	        for (var i = 0, len = listeners.length; i < len; ++i) {
	            propagateToListener(promise, listeners[i]);
	        }
	        var psd = promise._PSD;
	        --psd.ref || psd.finalize();
	        if (numScheduledCalls === 0) {
	            ++numScheduledCalls;
	            asap(function () {
	                if (--numScheduledCalls === 0)
	                    finalizePhysicalTick();
	            }, []);
	        }
	    }
	    function propagateToListener(promise, listener) {
	        if (promise._state === null) {
	            promise._listeners.push(listener);
	            return;
	        }
	        var cb = promise._state ? listener.onFulfilled : listener.onRejected;
	        if (cb === null) {
	            return (promise._state ? listener.resolve : listener.reject)(promise._value);
	        }
	        ++listener.psd.ref;
	        ++numScheduledCalls;
	        asap(callListener, [cb, promise, listener]);
	    }
	    function callListener(cb, promise, listener) {
	        try {
	            var ret, value = promise._value;
	            if (!promise._state && rejectingErrors.length)
	                rejectingErrors = [];
	            ret = debug && promise._consoleTask ? promise._consoleTask.run(function () { return cb(value); }) : cb(value);
	            if (!promise._state && rejectingErrors.indexOf(value) === -1) {
	                markErrorAsHandled(promise);
	            }
	            listener.resolve(ret);
	        }
	        catch (e) {
	            listener.reject(e);
	        }
	        finally {
	            if (--numScheduledCalls === 0)
	                finalizePhysicalTick();
	            --listener.psd.ref || listener.psd.finalize();
	        }
	    }
	    function physicalTick() {
	        usePSD(globalPSD, function () {
	            beginMicroTickScope() && endMicroTickScope();
	        });
	    }
	    function beginMicroTickScope() {
	        var wasRootExec = isOutsideMicroTick;
	        isOutsideMicroTick = false;
	        needsNewPhysicalTick = false;
	        return wasRootExec;
	    }
	    function endMicroTickScope() {
	        var callbacks, i, l;
	        do {
	            while (microtickQueue.length > 0) {
	                callbacks = microtickQueue;
	                microtickQueue = [];
	                l = callbacks.length;
	                for (i = 0; i < l; ++i) {
	                    var item = callbacks[i];
	                    item[0].apply(null, item[1]);
	                }
	            }
	        } while (microtickQueue.length > 0);
	        isOutsideMicroTick = true;
	        needsNewPhysicalTick = true;
	    }
	    function finalizePhysicalTick() {
	        var unhandledErrs = unhandledErrors;
	        unhandledErrors = [];
	        unhandledErrs.forEach(function (p) {
	            p._PSD.onunhandled.call(null, p._value, p);
	        });
	        var finalizers = tickFinalizers.slice(0);
	        var i = finalizers.length;
	        while (i)
	            finalizers[--i]();
	    }
	    function run_at_end_of_this_or_next_physical_tick(fn) {
	        function finalizer() {
	            fn();
	            tickFinalizers.splice(tickFinalizers.indexOf(finalizer), 1);
	        }
	        tickFinalizers.push(finalizer);
	        ++numScheduledCalls;
	        asap(function () {
	            if (--numScheduledCalls === 0)
	                finalizePhysicalTick();
	        }, []);
	    }
	    function addPossiblyUnhandledError(promise) {
	        if (!unhandledErrors.some(function (p) { return p._value === promise._value; }))
	            unhandledErrors.push(promise);
	    }
	    function markErrorAsHandled(promise) {
	        var i = unhandledErrors.length;
	        while (i)
	            if (unhandledErrors[--i]._value === promise._value) {
	                unhandledErrors.splice(i, 1);
	                return;
	            }
	    }
	    function PromiseReject(reason) {
	        return new DexiePromise(INTERNAL, false, reason);
	    }
	    function wrap(fn, errorCatcher) {
	        var psd = PSD;
	        return function () {
	            var wasRootExec = beginMicroTickScope(), outerScope = PSD;
	            try {
	                switchToZone(psd, true);
	                return fn.apply(this, arguments);
	            }
	            catch (e) {
	                errorCatcher && errorCatcher(e);
	            }
	            finally {
	                switchToZone(outerScope, false);
	                if (wasRootExec)
	                    endMicroTickScope();
	            }
	        };
	    }
	    var task = { awaits: 0, echoes: 0, id: 0 };
	    var taskCounter = 0;
	    var zoneStack = [];
	    var zoneEchoes = 0;
	    var totalEchoes = 0;
	    var zone_id_counter = 0;
	    function newScope(fn, props, a1, a2) {
	        var parent = PSD, psd = Object.create(parent);
	        psd.parent = parent;
	        psd.ref = 0;
	        psd.global = false;
	        psd.id = ++zone_id_counter;
	        globalPSD.env;
	        psd.env = patchGlobalPromise ? {
	            Promise: DexiePromise,
	            PromiseProp: { value: DexiePromise, configurable: true, writable: true },
	            all: DexiePromise.all,
	            race: DexiePromise.race,
	            allSettled: DexiePromise.allSettled,
	            any: DexiePromise.any,
	            resolve: DexiePromise.resolve,
	            reject: DexiePromise.reject,
	        } : {};
	        if (props)
	            extend(psd, props);
	        ++parent.ref;
	        psd.finalize = function () {
	            --this.parent.ref || this.parent.finalize();
	        };
	        var rv = usePSD(psd, fn, a1, a2);
	        if (psd.ref === 0)
	            psd.finalize();
	        return rv;
	    }
	    function incrementExpectedAwaits() {
	        if (!task.id)
	            task.id = ++taskCounter;
	        ++task.awaits;
	        task.echoes += ZONE_ECHO_LIMIT;
	        return task.id;
	    }
	    function decrementExpectedAwaits() {
	        if (!task.awaits)
	            return false;
	        if (--task.awaits === 0)
	            task.id = 0;
	        task.echoes = task.awaits * ZONE_ECHO_LIMIT;
	        return true;
	    }
	    if (('' + nativePromiseThen).indexOf('[native code]') === -1) {
	        incrementExpectedAwaits = decrementExpectedAwaits = nop;
	    }
	    function onPossibleParallellAsync(possiblePromise) {
	        if (task.echoes && possiblePromise && possiblePromise.constructor === NativePromise) {
	            incrementExpectedAwaits();
	            return possiblePromise.then(function (x) {
	                decrementExpectedAwaits();
	                return x;
	            }, function (e) {
	                decrementExpectedAwaits();
	                return rejection(e);
	            });
	        }
	        return possiblePromise;
	    }
	    function zoneEnterEcho(targetZone) {
	        ++totalEchoes;
	        if (!task.echoes || --task.echoes === 0) {
	            task.echoes = task.awaits = task.id = 0;
	        }
	        zoneStack.push(PSD);
	        switchToZone(targetZone, true);
	    }
	    function zoneLeaveEcho() {
	        var zone = zoneStack[zoneStack.length - 1];
	        zoneStack.pop();
	        switchToZone(zone, false);
	    }
	    function switchToZone(targetZone, bEnteringZone) {
	        var currentZone = PSD;
	        if (bEnteringZone ? task.echoes && (!zoneEchoes++ || targetZone !== PSD) : zoneEchoes && (!--zoneEchoes || targetZone !== PSD)) {
	            queueMicrotask(bEnteringZone ? zoneEnterEcho.bind(null, targetZone) : zoneLeaveEcho);
	        }
	        if (targetZone === PSD)
	            return;
	        PSD = targetZone;
	        if (currentZone === globalPSD)
	            globalPSD.env = snapShot();
	        if (patchGlobalPromise) {
	            var GlobalPromise = globalPSD.env.Promise;
	            var targetEnv = targetZone.env;
	            if (currentZone.global || targetZone.global) {
	                Object.defineProperty(_global, 'Promise', targetEnv.PromiseProp);
	                GlobalPromise.all = targetEnv.all;
	                GlobalPromise.race = targetEnv.race;
	                GlobalPromise.resolve = targetEnv.resolve;
	                GlobalPromise.reject = targetEnv.reject;
	                if (targetEnv.allSettled)
	                    GlobalPromise.allSettled = targetEnv.allSettled;
	                if (targetEnv.any)
	                    GlobalPromise.any = targetEnv.any;
	            }
	        }
	    }
	    function snapShot() {
	        var GlobalPromise = _global.Promise;
	        return patchGlobalPromise ? {
	            Promise: GlobalPromise,
	            PromiseProp: Object.getOwnPropertyDescriptor(_global, "Promise"),
	            all: GlobalPromise.all,
	            race: GlobalPromise.race,
	            allSettled: GlobalPromise.allSettled,
	            any: GlobalPromise.any,
	            resolve: GlobalPromise.resolve,
	            reject: GlobalPromise.reject,
	        } : {};
	    }
	    function usePSD(psd, fn, a1, a2, a3) {
	        var outerScope = PSD;
	        try {
	            switchToZone(psd, true);
	            return fn(a1, a2, a3);
	        }
	        finally {
	            switchToZone(outerScope, false);
	        }
	    }
	    function nativeAwaitCompatibleWrap(fn, zone, possibleAwait, cleanup) {
	        return typeof fn !== 'function' ? fn : function () {
	            var outerZone = PSD;
	            if (possibleAwait)
	                incrementExpectedAwaits();
	            switchToZone(zone, true);
	            try {
	                return fn.apply(this, arguments);
	            }
	            finally {
	                switchToZone(outerZone, false);
	                if (cleanup)
	                    queueMicrotask(decrementExpectedAwaits);
	            }
	        };
	    }
	    function execInGlobalContext(cb) {
	        if (Promise === NativePromise && task.echoes === 0) {
	            if (zoneEchoes === 0) {
	                cb();
	            }
	            else {
	                enqueueNativeMicroTask(cb);
	            }
	        }
	        else {
	            setTimeout(cb, 0);
	        }
	    }
	    var rejection = DexiePromise.reject;

	    function tempTransaction(db, mode, storeNames, fn) {
	        if (!db.idbdb || (!db._state.openComplete && (!PSD.letThrough && !db._vip))) {
	            if (db._state.openComplete) {
	                return rejection(new exceptions.DatabaseClosed(db._state.dbOpenError));
	            }
	            if (!db._state.isBeingOpened) {
	                if (!db._state.autoOpen)
	                    return rejection(new exceptions.DatabaseClosed());
	                db.open().catch(nop);
	            }
	            return db._state.dbReadyPromise.then(function () { return tempTransaction(db, mode, storeNames, fn); });
	        }
	        else {
	            var trans = db._createTransaction(mode, storeNames, db._dbSchema);
	            try {
	                trans.create();
	                db._state.PR1398_maxLoop = 3;
	            }
	            catch (ex) {
	                if (ex.name === errnames.InvalidState && db.isOpen() && --db._state.PR1398_maxLoop > 0) {
	                    console.warn('Dexie: Need to reopen db');
	                    db.close({ disableAutoOpen: false });
	                    return db.open().then(function () { return tempTransaction(db, mode, storeNames, fn); });
	                }
	                return rejection(ex);
	            }
	            return trans._promise(mode, function (resolve, reject) {
	                return newScope(function () {
	                    PSD.trans = trans;
	                    return fn(resolve, reject, trans);
	                });
	            }).then(function (result) {
	                if (mode === 'readwrite')
	                    try {
	                        trans.idbtrans.commit();
	                    }
	                    catch (_a) { }
	                return mode === 'readonly' ? result : trans._completion.then(function () { return result; });
	            });
	        }
	    }

	    var DEXIE_VERSION = '4.0.8';
	    var maxString = String.fromCharCode(65535);
	    var minKey = -Infinity;
	    var INVALID_KEY_ARGUMENT = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.";
	    var STRING_EXPECTED = "String expected.";
	    var connections = [];
	    var DBNAMES_DB = '__dbnames';
	    var READONLY = 'readonly';
	    var READWRITE = 'readwrite';

	    function combine(filter1, filter2) {
	        return filter1 ?
	            filter2 ?
	                function () { return filter1.apply(this, arguments) && filter2.apply(this, arguments); } :
	                filter1 :
	            filter2;
	    }

	    var AnyRange = {
	        type: 3 ,
	        lower: -Infinity,
	        lowerOpen: false,
	        upper: [[]],
	        upperOpen: false
	    };

	    function workaroundForUndefinedPrimKey(keyPath) {
	        return typeof keyPath === "string" && !/\./.test(keyPath)
	            ? function (obj) {
	                if (obj[keyPath] === undefined && (keyPath in obj)) {
	                    obj = deepClone(obj);
	                    delete obj[keyPath];
	                }
	                return obj;
	            }
	            : function (obj) { return obj; };
	    }

	    function Entity() {
	        throw exceptions.Type();
	    }

	    function cmp(a, b) {
	        try {
	            var ta = type(a);
	            var tb = type(b);
	            if (ta !== tb) {
	                if (ta === 'Array')
	                    return 1;
	                if (tb === 'Array')
	                    return -1;
	                if (ta === 'binary')
	                    return 1;
	                if (tb === 'binary')
	                    return -1;
	                if (ta === 'string')
	                    return 1;
	                if (tb === 'string')
	                    return -1;
	                if (ta === 'Date')
	                    return 1;
	                if (tb !== 'Date')
	                    return NaN;
	                return -1;
	            }
	            switch (ta) {
	                case 'number':
	                case 'Date':
	                case 'string':
	                    return a > b ? 1 : a < b ? -1 : 0;
	                case 'binary': {
	                    return compareUint8Arrays(getUint8Array(a), getUint8Array(b));
	                }
	                case 'Array':
	                    return compareArrays(a, b);
	            }
	        }
	        catch (_a) { }
	        return NaN;
	    }
	    function compareArrays(a, b) {
	        var al = a.length;
	        var bl = b.length;
	        var l = al < bl ? al : bl;
	        for (var i = 0; i < l; ++i) {
	            var res = cmp(a[i], b[i]);
	            if (res !== 0)
	                return res;
	        }
	        return al === bl ? 0 : al < bl ? -1 : 1;
	    }
	    function compareUint8Arrays(a, b) {
	        var al = a.length;
	        var bl = b.length;
	        var l = al < bl ? al : bl;
	        for (var i = 0; i < l; ++i) {
	            if (a[i] !== b[i])
	                return a[i] < b[i] ? -1 : 1;
	        }
	        return al === bl ? 0 : al < bl ? -1 : 1;
	    }
	    function type(x) {
	        var t = typeof x;
	        if (t !== 'object')
	            return t;
	        if (ArrayBuffer.isView(x))
	            return 'binary';
	        var tsTag = toStringTag(x);
	        return tsTag === 'ArrayBuffer' ? 'binary' : tsTag;
	    }
	    function getUint8Array(a) {
	        if (a instanceof Uint8Array)
	            return a;
	        if (ArrayBuffer.isView(a))
	            return new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
	        return new Uint8Array(a);
	    }

	    var Table =  (function () {
	        function Table() {
	        }
	        Table.prototype._trans = function (mode, fn, writeLocked) {
	            var trans = this._tx || PSD.trans;
	            var tableName = this.name;
	            var task = debug && typeof console !== 'undefined' && console.createTask && console.createTask("Dexie: ".concat(mode === 'readonly' ? 'read' : 'write', " ").concat(this.name));
	            function checkTableInTransaction(resolve, reject, trans) {
	                if (!trans.schema[tableName])
	                    throw new exceptions.NotFound("Table " + tableName + " not part of transaction");
	                return fn(trans.idbtrans, trans);
	            }
	            var wasRootExec = beginMicroTickScope();
	            try {
	                var p = trans && trans.db._novip === this.db._novip ?
	                    trans === PSD.trans ?
	                        trans._promise(mode, checkTableInTransaction, writeLocked) :
	                        newScope(function () { return trans._promise(mode, checkTableInTransaction, writeLocked); }, { trans: trans, transless: PSD.transless || PSD }) :
	                    tempTransaction(this.db, mode, [this.name], checkTableInTransaction);
	                if (task) {
	                    p._consoleTask = task;
	                    p = p.catch(function (err) {
	                        console.trace(err);
	                        return rejection(err);
	                    });
	                }
	                return p;
	            }
	            finally {
	                if (wasRootExec)
	                    endMicroTickScope();
	            }
	        };
	        Table.prototype.get = function (keyOrCrit, cb) {
	            var _this = this;
	            if (keyOrCrit && keyOrCrit.constructor === Object)
	                return this.where(keyOrCrit).first(cb);
	            if (keyOrCrit == null)
	                return rejection(new exceptions.Type("Invalid argument to Table.get()"));
	            return this._trans('readonly', function (trans) {
	                return _this.core.get({ trans: trans, key: keyOrCrit })
	                    .then(function (res) { return _this.hook.reading.fire(res); });
	            }).then(cb);
	        };
	        Table.prototype.where = function (indexOrCrit) {
	            if (typeof indexOrCrit === 'string')
	                return new this.db.WhereClause(this, indexOrCrit);
	            if (isArray(indexOrCrit))
	                return new this.db.WhereClause(this, "[".concat(indexOrCrit.join('+'), "]"));
	            var keyPaths = keys(indexOrCrit);
	            if (keyPaths.length === 1)
	                return this
	                    .where(keyPaths[0])
	                    .equals(indexOrCrit[keyPaths[0]]);
	            var compoundIndex = this.schema.indexes.concat(this.schema.primKey).filter(function (ix) {
	                if (ix.compound &&
	                    keyPaths.every(function (keyPath) { return ix.keyPath.indexOf(keyPath) >= 0; })) {
	                    for (var i = 0; i < keyPaths.length; ++i) {
	                        if (keyPaths.indexOf(ix.keyPath[i]) === -1)
	                            return false;
	                    }
	                    return true;
	                }
	                return false;
	            }).sort(function (a, b) { return a.keyPath.length - b.keyPath.length; })[0];
	            if (compoundIndex && this.db._maxKey !== maxString) {
	                var keyPathsInValidOrder = compoundIndex.keyPath.slice(0, keyPaths.length);
	                return this
	                    .where(keyPathsInValidOrder)
	                    .equals(keyPathsInValidOrder.map(function (kp) { return indexOrCrit[kp]; }));
	            }
	            if (!compoundIndex && debug)
	                console.warn("The query ".concat(JSON.stringify(indexOrCrit), " on ").concat(this.name, " would benefit from a ") +
	                    "compound index [".concat(keyPaths.join('+'), "]"));
	            var idxByName = this.schema.idxByName;
	            var idb = this.db._deps.indexedDB;
	            function equals(a, b) {
	                return idb.cmp(a, b) === 0;
	            }
	            var _a = keyPaths.reduce(function (_a, keyPath) {
	                var prevIndex = _a[0], prevFilterFn = _a[1];
	                var index = idxByName[keyPath];
	                var value = indexOrCrit[keyPath];
	                return [
	                    prevIndex || index,
	                    prevIndex || !index ?
	                        combine(prevFilterFn, index && index.multi ?
	                            function (x) {
	                                var prop = getByKeyPath(x, keyPath);
	                                return isArray(prop) && prop.some(function (item) { return equals(value, item); });
	                            } : function (x) { return equals(value, getByKeyPath(x, keyPath)); })
	                        : prevFilterFn
	                ];
	            }, [null, null]), idx = _a[0], filterFunction = _a[1];
	            return idx ?
	                this.where(idx.name).equals(indexOrCrit[idx.keyPath])
	                    .filter(filterFunction) :
	                compoundIndex ?
	                    this.filter(filterFunction) :
	                    this.where(keyPaths).equals('');
	        };
	        Table.prototype.filter = function (filterFunction) {
	            return this.toCollection().and(filterFunction);
	        };
	        Table.prototype.count = function (thenShortcut) {
	            return this.toCollection().count(thenShortcut);
	        };
	        Table.prototype.offset = function (offset) {
	            return this.toCollection().offset(offset);
	        };
	        Table.prototype.limit = function (numRows) {
	            return this.toCollection().limit(numRows);
	        };
	        Table.prototype.each = function (callback) {
	            return this.toCollection().each(callback);
	        };
	        Table.prototype.toArray = function (thenShortcut) {
	            return this.toCollection().toArray(thenShortcut);
	        };
	        Table.prototype.toCollection = function () {
	            return new this.db.Collection(new this.db.WhereClause(this));
	        };
	        Table.prototype.orderBy = function (index) {
	            return new this.db.Collection(new this.db.WhereClause(this, isArray(index) ?
	                "[".concat(index.join('+'), "]") :
	                index));
	        };
	        Table.prototype.reverse = function () {
	            return this.toCollection().reverse();
	        };
	        Table.prototype.mapToClass = function (constructor) {
	            var _a = this, db = _a.db, tableName = _a.name;
	            this.schema.mappedClass = constructor;
	            if (constructor.prototype instanceof Entity) {
	                constructor =  (function (_super) {
	                    __extends(class_1, _super);
	                    function class_1() {
	                        return _super !== null && _super.apply(this, arguments) || this;
	                    }
	                    Object.defineProperty(class_1.prototype, "db", {
	                        get: function () { return db; },
	                        enumerable: false,
	                        configurable: true
	                    });
	                    class_1.prototype.table = function () { return tableName; };
	                    return class_1;
	                }(constructor));
	            }
	            var inheritedProps = new Set();
	            for (var proto = constructor.prototype; proto; proto = getProto(proto)) {
	                Object.getOwnPropertyNames(proto).forEach(function (propName) { return inheritedProps.add(propName); });
	            }
	            var readHook = function (obj) {
	                if (!obj)
	                    return obj;
	                var res = Object.create(constructor.prototype);
	                for (var m in obj)
	                    if (!inheritedProps.has(m))
	                        try {
	                            res[m] = obj[m];
	                        }
	                        catch (_) { }
	                return res;
	            };
	            if (this.schema.readHook) {
	                this.hook.reading.unsubscribe(this.schema.readHook);
	            }
	            this.schema.readHook = readHook;
	            this.hook("reading", readHook);
	            return constructor;
	        };
	        Table.prototype.defineClass = function () {
	            function Class(content) {
	                extend(this, content);
	            }
	            return this.mapToClass(Class);
	        };
	        Table.prototype.add = function (obj, key) {
	            var _this = this;
	            var _a = this.schema.primKey, auto = _a.auto, keyPath = _a.keyPath;
	            var objToAdd = obj;
	            if (keyPath && auto) {
	                objToAdd = workaroundForUndefinedPrimKey(keyPath)(obj);
	            }
	            return this._trans('readwrite', function (trans) {
	                return _this.core.mutate({ trans: trans, type: 'add', keys: key != null ? [key] : null, values: [objToAdd] });
	            }).then(function (res) { return res.numFailures ? DexiePromise.reject(res.failures[0]) : res.lastResult; })
	                .then(function (lastResult) {
	                if (keyPath) {
	                    try {
	                        setByKeyPath(obj, keyPath, lastResult);
	                    }
	                    catch (_) { }
	                }
	                return lastResult;
	            });
	        };
	        Table.prototype.update = function (keyOrObject, modifications) {
	            if (typeof keyOrObject === 'object' && !isArray(keyOrObject)) {
	                var key = getByKeyPath(keyOrObject, this.schema.primKey.keyPath);
	                if (key === undefined)
	                    return rejection(new exceptions.InvalidArgument("Given object does not contain its primary key"));
	                return this.where(":id").equals(key).modify(modifications);
	            }
	            else {
	                return this.where(":id").equals(keyOrObject).modify(modifications);
	            }
	        };
	        Table.prototype.put = function (obj, key) {
	            var _this = this;
	            var _a = this.schema.primKey, auto = _a.auto, keyPath = _a.keyPath;
	            var objToAdd = obj;
	            if (keyPath && auto) {
	                objToAdd = workaroundForUndefinedPrimKey(keyPath)(obj);
	            }
	            return this._trans('readwrite', function (trans) { return _this.core.mutate({ trans: trans, type: 'put', values: [objToAdd], keys: key != null ? [key] : null }); })
	                .then(function (res) { return res.numFailures ? DexiePromise.reject(res.failures[0]) : res.lastResult; })
	                .then(function (lastResult) {
	                if (keyPath) {
	                    try {
	                        setByKeyPath(obj, keyPath, lastResult);
	                    }
	                    catch (_) { }
	                }
	                return lastResult;
	            });
	        };
	        Table.prototype.delete = function (key) {
	            var _this = this;
	            return this._trans('readwrite', function (trans) { return _this.core.mutate({ trans: trans, type: 'delete', keys: [key] }); })
	                .then(function (res) { return res.numFailures ? DexiePromise.reject(res.failures[0]) : undefined; });
	        };
	        Table.prototype.clear = function () {
	            var _this = this;
	            return this._trans('readwrite', function (trans) { return _this.core.mutate({ trans: trans, type: 'deleteRange', range: AnyRange }); })
	                .then(function (res) { return res.numFailures ? DexiePromise.reject(res.failures[0]) : undefined; });
	        };
	        Table.prototype.bulkGet = function (keys) {
	            var _this = this;
	            return this._trans('readonly', function (trans) {
	                return _this.core.getMany({
	                    keys: keys,
	                    trans: trans
	                }).then(function (result) { return result.map(function (res) { return _this.hook.reading.fire(res); }); });
	            });
	        };
	        Table.prototype.bulkAdd = function (objects, keysOrOptions, options) {
	            var _this = this;
	            var keys = Array.isArray(keysOrOptions) ? keysOrOptions : undefined;
	            options = options || (keys ? undefined : keysOrOptions);
	            var wantResults = options ? options.allKeys : undefined;
	            return this._trans('readwrite', function (trans) {
	                var _a = _this.schema.primKey, auto = _a.auto, keyPath = _a.keyPath;
	                if (keyPath && keys)
	                    throw new exceptions.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
	                if (keys && keys.length !== objects.length)
	                    throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");
	                var numObjects = objects.length;
	                var objectsToAdd = keyPath && auto ?
	                    objects.map(workaroundForUndefinedPrimKey(keyPath)) :
	                    objects;
	                return _this.core.mutate({ trans: trans, type: 'add', keys: keys, values: objectsToAdd, wantResults: wantResults })
	                    .then(function (_a) {
	                    var numFailures = _a.numFailures, results = _a.results, lastResult = _a.lastResult, failures = _a.failures;
	                    var result = wantResults ? results : lastResult;
	                    if (numFailures === 0)
	                        return result;
	                    throw new BulkError("".concat(_this.name, ".bulkAdd(): ").concat(numFailures, " of ").concat(numObjects, " operations failed"), failures);
	                });
	            });
	        };
	        Table.prototype.bulkPut = function (objects, keysOrOptions, options) {
	            var _this = this;
	            var keys = Array.isArray(keysOrOptions) ? keysOrOptions : undefined;
	            options = options || (keys ? undefined : keysOrOptions);
	            var wantResults = options ? options.allKeys : undefined;
	            return this._trans('readwrite', function (trans) {
	                var _a = _this.schema.primKey, auto = _a.auto, keyPath = _a.keyPath;
	                if (keyPath && keys)
	                    throw new exceptions.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
	                if (keys && keys.length !== objects.length)
	                    throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");
	                var numObjects = objects.length;
	                var objectsToPut = keyPath && auto ?
	                    objects.map(workaroundForUndefinedPrimKey(keyPath)) :
	                    objects;
	                return _this.core.mutate({ trans: trans, type: 'put', keys: keys, values: objectsToPut, wantResults: wantResults })
	                    .then(function (_a) {
	                    var numFailures = _a.numFailures, results = _a.results, lastResult = _a.lastResult, failures = _a.failures;
	                    var result = wantResults ? results : lastResult;
	                    if (numFailures === 0)
	                        return result;
	                    throw new BulkError("".concat(_this.name, ".bulkPut(): ").concat(numFailures, " of ").concat(numObjects, " operations failed"), failures);
	                });
	            });
	        };
	        Table.prototype.bulkUpdate = function (keysAndChanges) {
	            var _this = this;
	            var coreTable = this.core;
	            var keys = keysAndChanges.map(function (entry) { return entry.key; });
	            var changeSpecs = keysAndChanges.map(function (entry) { return entry.changes; });
	            var offsetMap = [];
	            return this._trans('readwrite', function (trans) {
	                return coreTable.getMany({ trans: trans, keys: keys, cache: 'clone' }).then(function (objs) {
	                    var resultKeys = [];
	                    var resultObjs = [];
	                    keysAndChanges.forEach(function (_a, idx) {
	                        var key = _a.key, changes = _a.changes;
	                        var obj = objs[idx];
	                        if (obj) {
	                            for (var _i = 0, _b = Object.keys(changes); _i < _b.length; _i++) {
	                                var keyPath = _b[_i];
	                                var value = changes[keyPath];
	                                if (keyPath === _this.schema.primKey.keyPath) {
	                                    if (cmp(value, key) !== 0) {
	                                        throw new exceptions.Constraint("Cannot update primary key in bulkUpdate()");
	                                    }
	                                }
	                                else {
	                                    setByKeyPath(obj, keyPath, value);
	                                }
	                            }
	                            offsetMap.push(idx);
	                            resultKeys.push(key);
	                            resultObjs.push(obj);
	                        }
	                    });
	                    var numEntries = resultKeys.length;
	                    return coreTable
	                        .mutate({
	                        trans: trans,
	                        type: 'put',
	                        keys: resultKeys,
	                        values: resultObjs,
	                        updates: {
	                            keys: keys,
	                            changeSpecs: changeSpecs
	                        }
	                    })
	                        .then(function (_a) {
	                        var numFailures = _a.numFailures, failures = _a.failures;
	                        if (numFailures === 0)
	                            return numEntries;
	                        for (var _i = 0, _b = Object.keys(failures); _i < _b.length; _i++) {
	                            var offset = _b[_i];
	                            var mappedOffset = offsetMap[Number(offset)];
	                            if (mappedOffset != null) {
	                                var failure = failures[offset];
	                                delete failures[offset];
	                                failures[mappedOffset] = failure;
	                            }
	                        }
	                        throw new BulkError("".concat(_this.name, ".bulkUpdate(): ").concat(numFailures, " of ").concat(numEntries, " operations failed"), failures);
	                    });
	                });
	            });
	        };
	        Table.prototype.bulkDelete = function (keys) {
	            var _this = this;
	            var numKeys = keys.length;
	            return this._trans('readwrite', function (trans) {
	                return _this.core.mutate({ trans: trans, type: 'delete', keys: keys });
	            }).then(function (_a) {
	                var numFailures = _a.numFailures, lastResult = _a.lastResult, failures = _a.failures;
	                if (numFailures === 0)
	                    return lastResult;
	                throw new BulkError("".concat(_this.name, ".bulkDelete(): ").concat(numFailures, " of ").concat(numKeys, " operations failed"), failures);
	            });
	        };
	        return Table;
	    }());

	    function Events(ctx) {
	        var evs = {};
	        var rv = function (eventName, subscriber) {
	            if (subscriber) {
	                var i = arguments.length, args = new Array(i - 1);
	                while (--i)
	                    args[i - 1] = arguments[i];
	                evs[eventName].subscribe.apply(null, args);
	                return ctx;
	            }
	            else if (typeof (eventName) === 'string') {
	                return evs[eventName];
	            }
	        };
	        rv.addEventType = add;
	        for (var i = 1, l = arguments.length; i < l; ++i) {
	            add(arguments[i]);
	        }
	        return rv;
	        function add(eventName, chainFunction, defaultFunction) {
	            if (typeof eventName === 'object')
	                return addConfiguredEvents(eventName);
	            if (!chainFunction)
	                chainFunction = reverseStoppableEventChain;
	            if (!defaultFunction)
	                defaultFunction = nop;
	            var context = {
	                subscribers: [],
	                fire: defaultFunction,
	                subscribe: function (cb) {
	                    if (context.subscribers.indexOf(cb) === -1) {
	                        context.subscribers.push(cb);
	                        context.fire = chainFunction(context.fire, cb);
	                    }
	                },
	                unsubscribe: function (cb) {
	                    context.subscribers = context.subscribers.filter(function (fn) { return fn !== cb; });
	                    context.fire = context.subscribers.reduce(chainFunction, defaultFunction);
	                }
	            };
	            evs[eventName] = rv[eventName] = context;
	            return context;
	        }
	        function addConfiguredEvents(cfg) {
	            keys(cfg).forEach(function (eventName) {
	                var args = cfg[eventName];
	                if (isArray(args)) {
	                    add(eventName, cfg[eventName][0], cfg[eventName][1]);
	                }
	                else if (args === 'asap') {
	                    var context = add(eventName, mirror, function fire() {
	                        var i = arguments.length, args = new Array(i);
	                        while (i--)
	                            args[i] = arguments[i];
	                        context.subscribers.forEach(function (fn) {
	                            asap$1(function fireEvent() {
	                                fn.apply(null, args);
	                            });
	                        });
	                    });
	                }
	                else
	                    throw new exceptions.InvalidArgument("Invalid event config");
	            });
	        }
	    }

	    function makeClassConstructor(prototype, constructor) {
	        derive(constructor).from({ prototype: prototype });
	        return constructor;
	    }

	    function createTableConstructor(db) {
	        return makeClassConstructor(Table.prototype, function Table(name, tableSchema, trans) {
	            this.db = db;
	            this._tx = trans;
	            this.name = name;
	            this.schema = tableSchema;
	            this.hook = db._allTables[name] ? db._allTables[name].hook : Events(null, {
	                "creating": [hookCreatingChain, nop],
	                "reading": [pureFunctionChain, mirror],
	                "updating": [hookUpdatingChain, nop],
	                "deleting": [hookDeletingChain, nop]
	            });
	        });
	    }

	    function isPlainKeyRange(ctx, ignoreLimitFilter) {
	        return !(ctx.filter || ctx.algorithm || ctx.or) &&
	            (ignoreLimitFilter ? ctx.justLimit : !ctx.replayFilter);
	    }
	    function addFilter(ctx, fn) {
	        ctx.filter = combine(ctx.filter, fn);
	    }
	    function addReplayFilter(ctx, factory, isLimitFilter) {
	        var curr = ctx.replayFilter;
	        ctx.replayFilter = curr ? function () { return combine(curr(), factory()); } : factory;
	        ctx.justLimit = isLimitFilter && !curr;
	    }
	    function addMatchFilter(ctx, fn) {
	        ctx.isMatch = combine(ctx.isMatch, fn);
	    }
	    function getIndexOrStore(ctx, coreSchema) {
	        if (ctx.isPrimKey)
	            return coreSchema.primaryKey;
	        var index = coreSchema.getIndexByKeyPath(ctx.index);
	        if (!index)
	            throw new exceptions.Schema("KeyPath " + ctx.index + " on object store " + coreSchema.name + " is not indexed");
	        return index;
	    }
	    function openCursor(ctx, coreTable, trans) {
	        var index = getIndexOrStore(ctx, coreTable.schema);
	        return coreTable.openCursor({
	            trans: trans,
	            values: !ctx.keysOnly,
	            reverse: ctx.dir === 'prev',
	            unique: !!ctx.unique,
	            query: {
	                index: index,
	                range: ctx.range
	            }
	        });
	    }
	    function iter(ctx, fn, coreTrans, coreTable) {
	        var filter = ctx.replayFilter ? combine(ctx.filter, ctx.replayFilter()) : ctx.filter;
	        if (!ctx.or) {
	            return iterate(openCursor(ctx, coreTable, coreTrans), combine(ctx.algorithm, filter), fn, !ctx.keysOnly && ctx.valueMapper);
	        }
	        else {
	            var set_1 = {};
	            var union = function (item, cursor, advance) {
	                if (!filter || filter(cursor, advance, function (result) { return cursor.stop(result); }, function (err) { return cursor.fail(err); })) {
	                    var primaryKey = cursor.primaryKey;
	                    var key = '' + primaryKey;
	                    if (key === '[object ArrayBuffer]')
	                        key = '' + new Uint8Array(primaryKey);
	                    if (!hasOwn(set_1, key)) {
	                        set_1[key] = true;
	                        fn(item, cursor, advance);
	                    }
	                }
	            };
	            return Promise.all([
	                ctx.or._iterate(union, coreTrans),
	                iterate(openCursor(ctx, coreTable, coreTrans), ctx.algorithm, union, !ctx.keysOnly && ctx.valueMapper)
	            ]);
	        }
	    }
	    function iterate(cursorPromise, filter, fn, valueMapper) {
	        var mappedFn = valueMapper ? function (x, c, a) { return fn(valueMapper(x), c, a); } : fn;
	        var wrappedFn = wrap(mappedFn);
	        return cursorPromise.then(function (cursor) {
	            if (cursor) {
	                return cursor.start(function () {
	                    var c = function () { return cursor.continue(); };
	                    if (!filter || filter(cursor, function (advancer) { return c = advancer; }, function (val) { cursor.stop(val); c = nop; }, function (e) { cursor.fail(e); c = nop; }))
	                        wrappedFn(cursor.value, cursor, function (advancer) { return c = advancer; });
	                    c();
	                });
	            }
	        });
	    }

	    var PropModSymbol = Symbol();
	    var PropModification =  (function () {
	        function PropModification(spec) {
	            Object.assign(this, spec);
	        }
	        PropModification.prototype.execute = function (value) {
	            var _a;
	            if (this.add !== undefined) {
	                var term = this.add;
	                if (isArray(term)) {
	                    return __spreadArray(__spreadArray([], (isArray(value) ? value : []), true), term, true).sort();
	                }
	                if (typeof term === 'number')
	                    return (Number(value) || 0) + term;
	                if (typeof term === 'bigint') {
	                    try {
	                        return BigInt(value) + term;
	                    }
	                    catch (_b) {
	                        return BigInt(0) + term;
	                    }
	                }
	                throw new TypeError("Invalid term ".concat(term));
	            }
	            if (this.remove !== undefined) {
	                var subtrahend_1 = this.remove;
	                if (isArray(subtrahend_1)) {
	                    return isArray(value) ? value.filter(function (item) { return !subtrahend_1.includes(item); }).sort() : [];
	                }
	                if (typeof subtrahend_1 === 'number')
	                    return Number(value) - subtrahend_1;
	                if (typeof subtrahend_1 === 'bigint') {
	                    try {
	                        return BigInt(value) - subtrahend_1;
	                    }
	                    catch (_c) {
	                        return BigInt(0) - subtrahend_1;
	                    }
	                }
	                throw new TypeError("Invalid subtrahend ".concat(subtrahend_1));
	            }
	            var prefixToReplace = (_a = this.replacePrefix) === null || _a === void 0 ? void 0 : _a[0];
	            if (prefixToReplace && typeof value === 'string' && value.startsWith(prefixToReplace)) {
	                return this.replacePrefix[1] + value.substring(prefixToReplace.length);
	            }
	            return value;
	        };
	        return PropModification;
	    }());

	    var Collection =  (function () {
	        function Collection() {
	        }
	        Collection.prototype._read = function (fn, cb) {
	            var ctx = this._ctx;
	            return ctx.error ?
	                ctx.table._trans(null, rejection.bind(null, ctx.error)) :
	                ctx.table._trans('readonly', fn).then(cb);
	        };
	        Collection.prototype._write = function (fn) {
	            var ctx = this._ctx;
	            return ctx.error ?
	                ctx.table._trans(null, rejection.bind(null, ctx.error)) :
	                ctx.table._trans('readwrite', fn, "locked");
	        };
	        Collection.prototype._addAlgorithm = function (fn) {
	            var ctx = this._ctx;
	            ctx.algorithm = combine(ctx.algorithm, fn);
	        };
	        Collection.prototype._iterate = function (fn, coreTrans) {
	            return iter(this._ctx, fn, coreTrans, this._ctx.table.core);
	        };
	        Collection.prototype.clone = function (props) {
	            var rv = Object.create(this.constructor.prototype), ctx = Object.create(this._ctx);
	            if (props)
	                extend(ctx, props);
	            rv._ctx = ctx;
	            return rv;
	        };
	        Collection.prototype.raw = function () {
	            this._ctx.valueMapper = null;
	            return this;
	        };
	        Collection.prototype.each = function (fn) {
	            var ctx = this._ctx;
	            return this._read(function (trans) { return iter(ctx, fn, trans, ctx.table.core); });
	        };
	        Collection.prototype.count = function (cb) {
	            var _this = this;
	            return this._read(function (trans) {
	                var ctx = _this._ctx;
	                var coreTable = ctx.table.core;
	                if (isPlainKeyRange(ctx, true)) {
	                    return coreTable.count({
	                        trans: trans,
	                        query: {
	                            index: getIndexOrStore(ctx, coreTable.schema),
	                            range: ctx.range
	                        }
	                    }).then(function (count) { return Math.min(count, ctx.limit); });
	                }
	                else {
	                    var count = 0;
	                    return iter(ctx, function () { ++count; return false; }, trans, coreTable)
	                        .then(function () { return count; });
	                }
	            }).then(cb);
	        };
	        Collection.prototype.sortBy = function (keyPath, cb) {
	            var parts = keyPath.split('.').reverse(), lastPart = parts[0], lastIndex = parts.length - 1;
	            function getval(obj, i) {
	                if (i)
	                    return getval(obj[parts[i]], i - 1);
	                return obj[lastPart];
	            }
	            var order = this._ctx.dir === "next" ? 1 : -1;
	            function sorter(a, b) {
	                var aVal = getval(a, lastIndex), bVal = getval(b, lastIndex);
	                return aVal < bVal ? -order : aVal > bVal ? order : 0;
	            }
	            return this.toArray(function (a) {
	                return a.sort(sorter);
	            }).then(cb);
	        };
	        Collection.prototype.toArray = function (cb) {
	            var _this = this;
	            return this._read(function (trans) {
	                var ctx = _this._ctx;
	                if (ctx.dir === 'next' && isPlainKeyRange(ctx, true) && ctx.limit > 0) {
	                    var valueMapper_1 = ctx.valueMapper;
	                    var index = getIndexOrStore(ctx, ctx.table.core.schema);
	                    return ctx.table.core.query({
	                        trans: trans,
	                        limit: ctx.limit,
	                        values: true,
	                        query: {
	                            index: index,
	                            range: ctx.range
	                        }
	                    }).then(function (_a) {
	                        var result = _a.result;
	                        return valueMapper_1 ? result.map(valueMapper_1) : result;
	                    });
	                }
	                else {
	                    var a_1 = [];
	                    return iter(ctx, function (item) { return a_1.push(item); }, trans, ctx.table.core).then(function () { return a_1; });
	                }
	            }, cb);
	        };
	        Collection.prototype.offset = function (offset) {
	            var ctx = this._ctx;
	            if (offset <= 0)
	                return this;
	            ctx.offset += offset;
	            if (isPlainKeyRange(ctx)) {
	                addReplayFilter(ctx, function () {
	                    var offsetLeft = offset;
	                    return function (cursor, advance) {
	                        if (offsetLeft === 0)
	                            return true;
	                        if (offsetLeft === 1) {
	                            --offsetLeft;
	                            return false;
	                        }
	                        advance(function () {
	                            cursor.advance(offsetLeft);
	                            offsetLeft = 0;
	                        });
	                        return false;
	                    };
	                });
	            }
	            else {
	                addReplayFilter(ctx, function () {
	                    var offsetLeft = offset;
	                    return function () { return (--offsetLeft < 0); };
	                });
	            }
	            return this;
	        };
	        Collection.prototype.limit = function (numRows) {
	            this._ctx.limit = Math.min(this._ctx.limit, numRows);
	            addReplayFilter(this._ctx, function () {
	                var rowsLeft = numRows;
	                return function (cursor, advance, resolve) {
	                    if (--rowsLeft <= 0)
	                        advance(resolve);
	                    return rowsLeft >= 0;
	                };
	            }, true);
	            return this;
	        };
	        Collection.prototype.until = function (filterFunction, bIncludeStopEntry) {
	            addFilter(this._ctx, function (cursor, advance, resolve) {
	                if (filterFunction(cursor.value)) {
	                    advance(resolve);
	                    return bIncludeStopEntry;
	                }
	                else {
	                    return true;
	                }
	            });
	            return this;
	        };
	        Collection.prototype.first = function (cb) {
	            return this.limit(1).toArray(function (a) { return a[0]; }).then(cb);
	        };
	        Collection.prototype.last = function (cb) {
	            return this.reverse().first(cb);
	        };
	        Collection.prototype.filter = function (filterFunction) {
	            addFilter(this._ctx, function (cursor) {
	                return filterFunction(cursor.value);
	            });
	            addMatchFilter(this._ctx, filterFunction);
	            return this;
	        };
	        Collection.prototype.and = function (filter) {
	            return this.filter(filter);
	        };
	        Collection.prototype.or = function (indexName) {
	            return new this.db.WhereClause(this._ctx.table, indexName, this);
	        };
	        Collection.prototype.reverse = function () {
	            this._ctx.dir = (this._ctx.dir === "prev" ? "next" : "prev");
	            if (this._ondirectionchange)
	                this._ondirectionchange(this._ctx.dir);
	            return this;
	        };
	        Collection.prototype.desc = function () {
	            return this.reverse();
	        };
	        Collection.prototype.eachKey = function (cb) {
	            var ctx = this._ctx;
	            ctx.keysOnly = !ctx.isMatch;
	            return this.each(function (val, cursor) { cb(cursor.key, cursor); });
	        };
	        Collection.prototype.eachUniqueKey = function (cb) {
	            this._ctx.unique = "unique";
	            return this.eachKey(cb);
	        };
	        Collection.prototype.eachPrimaryKey = function (cb) {
	            var ctx = this._ctx;
	            ctx.keysOnly = !ctx.isMatch;
	            return this.each(function (val, cursor) { cb(cursor.primaryKey, cursor); });
	        };
	        Collection.prototype.keys = function (cb) {
	            var ctx = this._ctx;
	            ctx.keysOnly = !ctx.isMatch;
	            var a = [];
	            return this.each(function (item, cursor) {
	                a.push(cursor.key);
	            }).then(function () {
	                return a;
	            }).then(cb);
	        };
	        Collection.prototype.primaryKeys = function (cb) {
	            var ctx = this._ctx;
	            if (ctx.dir === 'next' && isPlainKeyRange(ctx, true) && ctx.limit > 0) {
	                return this._read(function (trans) {
	                    var index = getIndexOrStore(ctx, ctx.table.core.schema);
	                    return ctx.table.core.query({
	                        trans: trans,
	                        values: false,
	                        limit: ctx.limit,
	                        query: {
	                            index: index,
	                            range: ctx.range
	                        }
	                    });
	                }).then(function (_a) {
	                    var result = _a.result;
	                    return result;
	                }).then(cb);
	            }
	            ctx.keysOnly = !ctx.isMatch;
	            var a = [];
	            return this.each(function (item, cursor) {
	                a.push(cursor.primaryKey);
	            }).then(function () {
	                return a;
	            }).then(cb);
	        };
	        Collection.prototype.uniqueKeys = function (cb) {
	            this._ctx.unique = "unique";
	            return this.keys(cb);
	        };
	        Collection.prototype.firstKey = function (cb) {
	            return this.limit(1).keys(function (a) { return a[0]; }).then(cb);
	        };
	        Collection.prototype.lastKey = function (cb) {
	            return this.reverse().firstKey(cb);
	        };
	        Collection.prototype.distinct = function () {
	            var ctx = this._ctx, idx = ctx.index && ctx.table.schema.idxByName[ctx.index];
	            if (!idx || !idx.multi)
	                return this;
	            var set = {};
	            addFilter(this._ctx, function (cursor) {
	                var strKey = cursor.primaryKey.toString();
	                var found = hasOwn(set, strKey);
	                set[strKey] = true;
	                return !found;
	            });
	            return this;
	        };
	        Collection.prototype.modify = function (changes) {
	            var _this = this;
	            var ctx = this._ctx;
	            return this._write(function (trans) {
	                var modifyer;
	                if (typeof changes === 'function') {
	                    modifyer = changes;
	                }
	                else {
	                    var keyPaths = keys(changes);
	                    var numKeys = keyPaths.length;
	                    modifyer = function (item) {
	                        var anythingModified = false;
	                        for (var i = 0; i < numKeys; ++i) {
	                            var keyPath = keyPaths[i];
	                            var val = changes[keyPath];
	                            var origVal = getByKeyPath(item, keyPath);
	                            if (val instanceof PropModification) {
	                                setByKeyPath(item, keyPath, val.execute(origVal));
	                                anythingModified = true;
	                            }
	                            else if (origVal !== val) {
	                                setByKeyPath(item, keyPath, val);
	                                anythingModified = true;
	                            }
	                        }
	                        return anythingModified;
	                    };
	                }
	                var coreTable = ctx.table.core;
	                var _a = coreTable.schema.primaryKey, outbound = _a.outbound, extractKey = _a.extractKey;
	                var limit = _this.db._options.modifyChunkSize || 200;
	                var totalFailures = [];
	                var successCount = 0;
	                var failedKeys = [];
	                var applyMutateResult = function (expectedCount, res) {
	                    var failures = res.failures, numFailures = res.numFailures;
	                    successCount += expectedCount - numFailures;
	                    for (var _i = 0, _a = keys(failures); _i < _a.length; _i++) {
	                        var pos = _a[_i];
	                        totalFailures.push(failures[pos]);
	                    }
	                };
	                return _this.clone().primaryKeys().then(function (keys) {
	                    var criteria = isPlainKeyRange(ctx) &&
	                        ctx.limit === Infinity &&
	                        (typeof changes !== 'function' || changes === deleteCallback) && {
	                        index: ctx.index,
	                        range: ctx.range
	                    };
	                    var nextChunk = function (offset) {
	                        var count = Math.min(limit, keys.length - offset);
	                        return coreTable.getMany({
	                            trans: trans,
	                            keys: keys.slice(offset, offset + count),
	                            cache: "immutable"
	                        }).then(function (values) {
	                            var addValues = [];
	                            var putValues = [];
	                            var putKeys = outbound ? [] : null;
	                            var deleteKeys = [];
	                            for (var i = 0; i < count; ++i) {
	                                var origValue = values[i];
	                                var ctx_1 = {
	                                    value: deepClone(origValue),
	                                    primKey: keys[offset + i]
	                                };
	                                if (modifyer.call(ctx_1, ctx_1.value, ctx_1) !== false) {
	                                    if (ctx_1.value == null) {
	                                        deleteKeys.push(keys[offset + i]);
	                                    }
	                                    else if (!outbound && cmp(extractKey(origValue), extractKey(ctx_1.value)) !== 0) {
	                                        deleteKeys.push(keys[offset + i]);
	                                        addValues.push(ctx_1.value);
	                                    }
	                                    else {
	                                        putValues.push(ctx_1.value);
	                                        if (outbound)
	                                            putKeys.push(keys[offset + i]);
	                                    }
	                                }
	                            }
	                            return Promise.resolve(addValues.length > 0 &&
	                                coreTable.mutate({ trans: trans, type: 'add', values: addValues })
	                                    .then(function (res) {
	                                    for (var pos in res.failures) {
	                                        deleteKeys.splice(parseInt(pos), 1);
	                                    }
	                                    applyMutateResult(addValues.length, res);
	                                })).then(function () { return (putValues.length > 0 || (criteria && typeof changes === 'object')) &&
	                                coreTable.mutate({
	                                    trans: trans,
	                                    type: 'put',
	                                    keys: putKeys,
	                                    values: putValues,
	                                    criteria: criteria,
	                                    changeSpec: typeof changes !== 'function'
	                                        && changes,
	                                    isAdditionalChunk: offset > 0
	                                }).then(function (res) { return applyMutateResult(putValues.length, res); }); }).then(function () { return (deleteKeys.length > 0 || (criteria && changes === deleteCallback)) &&
	                                coreTable.mutate({
	                                    trans: trans,
	                                    type: 'delete',
	                                    keys: deleteKeys,
	                                    criteria: criteria,
	                                    isAdditionalChunk: offset > 0
	                                }).then(function (res) { return applyMutateResult(deleteKeys.length, res); }); }).then(function () {
	                                return keys.length > offset + count && nextChunk(offset + limit);
	                            });
	                        });
	                    };
	                    return nextChunk(0).then(function () {
	                        if (totalFailures.length > 0)
	                            throw new ModifyError("Error modifying one or more objects", totalFailures, successCount, failedKeys);
	                        return keys.length;
	                    });
	                });
	            });
	        };
	        Collection.prototype.delete = function () {
	            var ctx = this._ctx, range = ctx.range;
	            if (isPlainKeyRange(ctx) &&
	                (ctx.isPrimKey || range.type === 3 ))
	             {
	                return this._write(function (trans) {
	                    var primaryKey = ctx.table.core.schema.primaryKey;
	                    var coreRange = range;
	                    return ctx.table.core.count({ trans: trans, query: { index: primaryKey, range: coreRange } }).then(function (count) {
	                        return ctx.table.core.mutate({ trans: trans, type: 'deleteRange', range: coreRange })
	                            .then(function (_a) {
	                            var failures = _a.failures; _a.lastResult; _a.results; var numFailures = _a.numFailures;
	                            if (numFailures)
	                                throw new ModifyError("Could not delete some values", Object.keys(failures).map(function (pos) { return failures[pos]; }), count - numFailures);
	                            return count - numFailures;
	                        });
	                    });
	                });
	            }
	            return this.modify(deleteCallback);
	        };
	        return Collection;
	    }());
	    var deleteCallback = function (value, ctx) { return ctx.value = null; };

	    function createCollectionConstructor(db) {
	        return makeClassConstructor(Collection.prototype, function Collection(whereClause, keyRangeGenerator) {
	            this.db = db;
	            var keyRange = AnyRange, error = null;
	            if (keyRangeGenerator)
	                try {
	                    keyRange = keyRangeGenerator();
	                }
	                catch (ex) {
	                    error = ex;
	                }
	            var whereCtx = whereClause._ctx;
	            var table = whereCtx.table;
	            var readingHook = table.hook.reading.fire;
	            this._ctx = {
	                table: table,
	                index: whereCtx.index,
	                isPrimKey: (!whereCtx.index || (table.schema.primKey.keyPath && whereCtx.index === table.schema.primKey.name)),
	                range: keyRange,
	                keysOnly: false,
	                dir: "next",
	                unique: "",
	                algorithm: null,
	                filter: null,
	                replayFilter: null,
	                justLimit: true,
	                isMatch: null,
	                offset: 0,
	                limit: Infinity,
	                error: error,
	                or: whereCtx.or,
	                valueMapper: readingHook !== mirror ? readingHook : null
	            };
	        });
	    }

	    function simpleCompare(a, b) {
	        return a < b ? -1 : a === b ? 0 : 1;
	    }
	    function simpleCompareReverse(a, b) {
	        return a > b ? -1 : a === b ? 0 : 1;
	    }

	    function fail(collectionOrWhereClause, err, T) {
	        var collection = collectionOrWhereClause instanceof WhereClause ?
	            new collectionOrWhereClause.Collection(collectionOrWhereClause) :
	            collectionOrWhereClause;
	        collection._ctx.error = T ? new T(err) : new TypeError(err);
	        return collection;
	    }
	    function emptyCollection(whereClause) {
	        return new whereClause.Collection(whereClause, function () { return rangeEqual(""); }).limit(0);
	    }
	    function upperFactory(dir) {
	        return dir === "next" ?
	            function (s) { return s.toUpperCase(); } :
	            function (s) { return s.toLowerCase(); };
	    }
	    function lowerFactory(dir) {
	        return dir === "next" ?
	            function (s) { return s.toLowerCase(); } :
	            function (s) { return s.toUpperCase(); };
	    }
	    function nextCasing(key, lowerKey, upperNeedle, lowerNeedle, cmp, dir) {
	        var length = Math.min(key.length, lowerNeedle.length);
	        var llp = -1;
	        for (var i = 0; i < length; ++i) {
	            var lwrKeyChar = lowerKey[i];
	            if (lwrKeyChar !== lowerNeedle[i]) {
	                if (cmp(key[i], upperNeedle[i]) < 0)
	                    return key.substr(0, i) + upperNeedle[i] + upperNeedle.substr(i + 1);
	                if (cmp(key[i], lowerNeedle[i]) < 0)
	                    return key.substr(0, i) + lowerNeedle[i] + upperNeedle.substr(i + 1);
	                if (llp >= 0)
	                    return key.substr(0, llp) + lowerKey[llp] + upperNeedle.substr(llp + 1);
	                return null;
	            }
	            if (cmp(key[i], lwrKeyChar) < 0)
	                llp = i;
	        }
	        if (length < lowerNeedle.length && dir === "next")
	            return key + upperNeedle.substr(key.length);
	        if (length < key.length && dir === "prev")
	            return key.substr(0, upperNeedle.length);
	        return (llp < 0 ? null : key.substr(0, llp) + lowerNeedle[llp] + upperNeedle.substr(llp + 1));
	    }
	    function addIgnoreCaseAlgorithm(whereClause, match, needles, suffix) {
	        var upper, lower, compare, upperNeedles, lowerNeedles, direction, nextKeySuffix, needlesLen = needles.length;
	        if (!needles.every(function (s) { return typeof s === 'string'; })) {
	            return fail(whereClause, STRING_EXPECTED);
	        }
	        function initDirection(dir) {
	            upper = upperFactory(dir);
	            lower = lowerFactory(dir);
	            compare = (dir === "next" ? simpleCompare : simpleCompareReverse);
	            var needleBounds = needles.map(function (needle) {
	                return { lower: lower(needle), upper: upper(needle) };
	            }).sort(function (a, b) {
	                return compare(a.lower, b.lower);
	            });
	            upperNeedles = needleBounds.map(function (nb) { return nb.upper; });
	            lowerNeedles = needleBounds.map(function (nb) { return nb.lower; });
	            direction = dir;
	            nextKeySuffix = (dir === "next" ? "" : suffix);
	        }
	        initDirection("next");
	        var c = new whereClause.Collection(whereClause, function () { return createRange(upperNeedles[0], lowerNeedles[needlesLen - 1] + suffix); });
	        c._ondirectionchange = function (direction) {
	            initDirection(direction);
	        };
	        var firstPossibleNeedle = 0;
	        c._addAlgorithm(function (cursor, advance, resolve) {
	            var key = cursor.key;
	            if (typeof key !== 'string')
	                return false;
	            var lowerKey = lower(key);
	            if (match(lowerKey, lowerNeedles, firstPossibleNeedle)) {
	                return true;
	            }
	            else {
	                var lowestPossibleCasing = null;
	                for (var i = firstPossibleNeedle; i < needlesLen; ++i) {
	                    var casing = nextCasing(key, lowerKey, upperNeedles[i], lowerNeedles[i], compare, direction);
	                    if (casing === null && lowestPossibleCasing === null)
	                        firstPossibleNeedle = i + 1;
	                    else if (lowestPossibleCasing === null || compare(lowestPossibleCasing, casing) > 0) {
	                        lowestPossibleCasing = casing;
	                    }
	                }
	                if (lowestPossibleCasing !== null) {
	                    advance(function () { cursor.continue(lowestPossibleCasing + nextKeySuffix); });
	                }
	                else {
	                    advance(resolve);
	                }
	                return false;
	            }
	        });
	        return c;
	    }
	    function createRange(lower, upper, lowerOpen, upperOpen) {
	        return {
	            type: 2 ,
	            lower: lower,
	            upper: upper,
	            lowerOpen: lowerOpen,
	            upperOpen: upperOpen
	        };
	    }
	    function rangeEqual(value) {
	        return {
	            type: 1 ,
	            lower: value,
	            upper: value
	        };
	    }

	    var WhereClause =  (function () {
	        function WhereClause() {
	        }
	        Object.defineProperty(WhereClause.prototype, "Collection", {
	            get: function () {
	                return this._ctx.table.db.Collection;
	            },
	            enumerable: false,
	            configurable: true
	        });
	        WhereClause.prototype.between = function (lower, upper, includeLower, includeUpper) {
	            includeLower = includeLower !== false;
	            includeUpper = includeUpper === true;
	            try {
	                if ((this._cmp(lower, upper) > 0) ||
	                    (this._cmp(lower, upper) === 0 && (includeLower || includeUpper) && !(includeLower && includeUpper)))
	                    return emptyCollection(this);
	                return new this.Collection(this, function () { return createRange(lower, upper, !includeLower, !includeUpper); });
	            }
	            catch (e) {
	                return fail(this, INVALID_KEY_ARGUMENT);
	            }
	        };
	        WhereClause.prototype.equals = function (value) {
	            if (value == null)
	                return fail(this, INVALID_KEY_ARGUMENT);
	            return new this.Collection(this, function () { return rangeEqual(value); });
	        };
	        WhereClause.prototype.above = function (value) {
	            if (value == null)
	                return fail(this, INVALID_KEY_ARGUMENT);
	            return new this.Collection(this, function () { return createRange(value, undefined, true); });
	        };
	        WhereClause.prototype.aboveOrEqual = function (value) {
	            if (value == null)
	                return fail(this, INVALID_KEY_ARGUMENT);
	            return new this.Collection(this, function () { return createRange(value, undefined, false); });
	        };
	        WhereClause.prototype.below = function (value) {
	            if (value == null)
	                return fail(this, INVALID_KEY_ARGUMENT);
	            return new this.Collection(this, function () { return createRange(undefined, value, false, true); });
	        };
	        WhereClause.prototype.belowOrEqual = function (value) {
	            if (value == null)
	                return fail(this, INVALID_KEY_ARGUMENT);
	            return new this.Collection(this, function () { return createRange(undefined, value); });
	        };
	        WhereClause.prototype.startsWith = function (str) {
	            if (typeof str !== 'string')
	                return fail(this, STRING_EXPECTED);
	            return this.between(str, str + maxString, true, true);
	        };
	        WhereClause.prototype.startsWithIgnoreCase = function (str) {
	            if (str === "")
	                return this.startsWith(str);
	            return addIgnoreCaseAlgorithm(this, function (x, a) { return x.indexOf(a[0]) === 0; }, [str], maxString);
	        };
	        WhereClause.prototype.equalsIgnoreCase = function (str) {
	            return addIgnoreCaseAlgorithm(this, function (x, a) { return x === a[0]; }, [str], "");
	        };
	        WhereClause.prototype.anyOfIgnoreCase = function () {
	            var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
	            if (set.length === 0)
	                return emptyCollection(this);
	            return addIgnoreCaseAlgorithm(this, function (x, a) { return a.indexOf(x) !== -1; }, set, "");
	        };
	        WhereClause.prototype.startsWithAnyOfIgnoreCase = function () {
	            var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
	            if (set.length === 0)
	                return emptyCollection(this);
	            return addIgnoreCaseAlgorithm(this, function (x, a) { return a.some(function (n) { return x.indexOf(n) === 0; }); }, set, maxString);
	        };
	        WhereClause.prototype.anyOf = function () {
	            var _this = this;
	            var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
	            var compare = this._cmp;
	            try {
	                set.sort(compare);
	            }
	            catch (e) {
	                return fail(this, INVALID_KEY_ARGUMENT);
	            }
	            if (set.length === 0)
	                return emptyCollection(this);
	            var c = new this.Collection(this, function () { return createRange(set[0], set[set.length - 1]); });
	            c._ondirectionchange = function (direction) {
	                compare = (direction === "next" ?
	                    _this._ascending :
	                    _this._descending);
	                set.sort(compare);
	            };
	            var i = 0;
	            c._addAlgorithm(function (cursor, advance, resolve) {
	                var key = cursor.key;
	                while (compare(key, set[i]) > 0) {
	                    ++i;
	                    if (i === set.length) {
	                        advance(resolve);
	                        return false;
	                    }
	                }
	                if (compare(key, set[i]) === 0) {
	                    return true;
	                }
	                else {
	                    advance(function () { cursor.continue(set[i]); });
	                    return false;
	                }
	            });
	            return c;
	        };
	        WhereClause.prototype.notEqual = function (value) {
	            return this.inAnyRange([[minKey, value], [value, this.db._maxKey]], { includeLowers: false, includeUppers: false });
	        };
	        WhereClause.prototype.noneOf = function () {
	            var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
	            if (set.length === 0)
	                return new this.Collection(this);
	            try {
	                set.sort(this._ascending);
	            }
	            catch (e) {
	                return fail(this, INVALID_KEY_ARGUMENT);
	            }
	            var ranges = set.reduce(function (res, val) { return res ?
	                res.concat([[res[res.length - 1][1], val]]) :
	                [[minKey, val]]; }, null);
	            ranges.push([set[set.length - 1], this.db._maxKey]);
	            return this.inAnyRange(ranges, { includeLowers: false, includeUppers: false });
	        };
	        WhereClause.prototype.inAnyRange = function (ranges, options) {
	            var _this = this;
	            var cmp = this._cmp, ascending = this._ascending, descending = this._descending, min = this._min, max = this._max;
	            if (ranges.length === 0)
	                return emptyCollection(this);
	            if (!ranges.every(function (range) {
	                return range[0] !== undefined &&
	                    range[1] !== undefined &&
	                    ascending(range[0], range[1]) <= 0;
	            })) {
	                return fail(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", exceptions.InvalidArgument);
	            }
	            var includeLowers = !options || options.includeLowers !== false;
	            var includeUppers = options && options.includeUppers === true;
	            function addRange(ranges, newRange) {
	                var i = 0, l = ranges.length;
	                for (; i < l; ++i) {
	                    var range = ranges[i];
	                    if (cmp(newRange[0], range[1]) < 0 && cmp(newRange[1], range[0]) > 0) {
	                        range[0] = min(range[0], newRange[0]);
	                        range[1] = max(range[1], newRange[1]);
	                        break;
	                    }
	                }
	                if (i === l)
	                    ranges.push(newRange);
	                return ranges;
	            }
	            var sortDirection = ascending;
	            function rangeSorter(a, b) { return sortDirection(a[0], b[0]); }
	            var set;
	            try {
	                set = ranges.reduce(addRange, []);
	                set.sort(rangeSorter);
	            }
	            catch (ex) {
	                return fail(this, INVALID_KEY_ARGUMENT);
	            }
	            var rangePos = 0;
	            var keyIsBeyondCurrentEntry = includeUppers ?
	                function (key) { return ascending(key, set[rangePos][1]) > 0; } :
	                function (key) { return ascending(key, set[rangePos][1]) >= 0; };
	            var keyIsBeforeCurrentEntry = includeLowers ?
	                function (key) { return descending(key, set[rangePos][0]) > 0; } :
	                function (key) { return descending(key, set[rangePos][0]) >= 0; };
	            function keyWithinCurrentRange(key) {
	                return !keyIsBeyondCurrentEntry(key) && !keyIsBeforeCurrentEntry(key);
	            }
	            var checkKey = keyIsBeyondCurrentEntry;
	            var c = new this.Collection(this, function () { return createRange(set[0][0], set[set.length - 1][1], !includeLowers, !includeUppers); });
	            c._ondirectionchange = function (direction) {
	                if (direction === "next") {
	                    checkKey = keyIsBeyondCurrentEntry;
	                    sortDirection = ascending;
	                }
	                else {
	                    checkKey = keyIsBeforeCurrentEntry;
	                    sortDirection = descending;
	                }
	                set.sort(rangeSorter);
	            };
	            c._addAlgorithm(function (cursor, advance, resolve) {
	                var key = cursor.key;
	                while (checkKey(key)) {
	                    ++rangePos;
	                    if (rangePos === set.length) {
	                        advance(resolve);
	                        return false;
	                    }
	                }
	                if (keyWithinCurrentRange(key)) {
	                    return true;
	                }
	                else if (_this._cmp(key, set[rangePos][1]) === 0 || _this._cmp(key, set[rangePos][0]) === 0) {
	                    return false;
	                }
	                else {
	                    advance(function () {
	                        if (sortDirection === ascending)
	                            cursor.continue(set[rangePos][0]);
	                        else
	                            cursor.continue(set[rangePos][1]);
	                    });
	                    return false;
	                }
	            });
	            return c;
	        };
	        WhereClause.prototype.startsWithAnyOf = function () {
	            var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
	            if (!set.every(function (s) { return typeof s === 'string'; })) {
	                return fail(this, "startsWithAnyOf() only works with strings");
	            }
	            if (set.length === 0)
	                return emptyCollection(this);
	            return this.inAnyRange(set.map(function (str) { return [str, str + maxString]; }));
	        };
	        return WhereClause;
	    }());

	    function createWhereClauseConstructor(db) {
	        return makeClassConstructor(WhereClause.prototype, function WhereClause(table, index, orCollection) {
	            this.db = db;
	            this._ctx = {
	                table: table,
	                index: index === ":id" ? null : index,
	                or: orCollection
	            };
	            this._cmp = this._ascending = cmp;
	            this._descending = function (a, b) { return cmp(b, a); };
	            this._max = function (a, b) { return cmp(a, b) > 0 ? a : b; };
	            this._min = function (a, b) { return cmp(a, b) < 0 ? a : b; };
	            this._IDBKeyRange = db._deps.IDBKeyRange;
	            if (!this._IDBKeyRange)
	                throw new exceptions.MissingAPI();
	        });
	    }

	    function eventRejectHandler(reject) {
	        return wrap(function (event) {
	            preventDefault(event);
	            reject(event.target.error);
	            return false;
	        });
	    }
	    function preventDefault(event) {
	        if (event.stopPropagation)
	            event.stopPropagation();
	        if (event.preventDefault)
	            event.preventDefault();
	    }

	    var DEXIE_STORAGE_MUTATED_EVENT_NAME = 'storagemutated';
	    var STORAGE_MUTATED_DOM_EVENT_NAME = 'x-storagemutated-1';
	    var globalEvents = Events(null, DEXIE_STORAGE_MUTATED_EVENT_NAME);

	    var Transaction =  (function () {
	        function Transaction() {
	        }
	        Transaction.prototype._lock = function () {
	            assert(!PSD.global);
	            ++this._reculock;
	            if (this._reculock === 1 && !PSD.global)
	                PSD.lockOwnerFor = this;
	            return this;
	        };
	        Transaction.prototype._unlock = function () {
	            assert(!PSD.global);
	            if (--this._reculock === 0) {
	                if (!PSD.global)
	                    PSD.lockOwnerFor = null;
	                while (this._blockedFuncs.length > 0 && !this._locked()) {
	                    var fnAndPSD = this._blockedFuncs.shift();
	                    try {
	                        usePSD(fnAndPSD[1], fnAndPSD[0]);
	                    }
	                    catch (e) { }
	                }
	            }
	            return this;
	        };
	        Transaction.prototype._locked = function () {
	            return this._reculock && PSD.lockOwnerFor !== this;
	        };
	        Transaction.prototype.create = function (idbtrans) {
	            var _this = this;
	            if (!this.mode)
	                return this;
	            var idbdb = this.db.idbdb;
	            var dbOpenError = this.db._state.dbOpenError;
	            assert(!this.idbtrans);
	            if (!idbtrans && !idbdb) {
	                switch (dbOpenError && dbOpenError.name) {
	                    case "DatabaseClosedError":
	                        throw new exceptions.DatabaseClosed(dbOpenError);
	                    case "MissingAPIError":
	                        throw new exceptions.MissingAPI(dbOpenError.message, dbOpenError);
	                    default:
	                        throw new exceptions.OpenFailed(dbOpenError);
	                }
	            }
	            if (!this.active)
	                throw new exceptions.TransactionInactive();
	            assert(this._completion._state === null);
	            idbtrans = this.idbtrans = idbtrans ||
	                (this.db.core
	                    ? this.db.core.transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })
	                    : idbdb.transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability }));
	            idbtrans.onerror = wrap(function (ev) {
	                preventDefault(ev);
	                _this._reject(idbtrans.error);
	            });
	            idbtrans.onabort = wrap(function (ev) {
	                preventDefault(ev);
	                _this.active && _this._reject(new exceptions.Abort(idbtrans.error));
	                _this.active = false;
	                _this.on("abort").fire(ev);
	            });
	            idbtrans.oncomplete = wrap(function () {
	                _this.active = false;
	                _this._resolve();
	                if ('mutatedParts' in idbtrans) {
	                    globalEvents.storagemutated.fire(idbtrans["mutatedParts"]);
	                }
	            });
	            return this;
	        };
	        Transaction.prototype._promise = function (mode, fn, bWriteLock) {
	            var _this = this;
	            if (mode === 'readwrite' && this.mode !== 'readwrite')
	                return rejection(new exceptions.ReadOnly("Transaction is readonly"));
	            if (!this.active)
	                return rejection(new exceptions.TransactionInactive());
	            if (this._locked()) {
	                return new DexiePromise(function (resolve, reject) {
	                    _this._blockedFuncs.push([function () {
	                            _this._promise(mode, fn, bWriteLock).then(resolve, reject);
	                        }, PSD]);
	                });
	            }
	            else if (bWriteLock) {
	                return newScope(function () {
	                    var p = new DexiePromise(function (resolve, reject) {
	                        _this._lock();
	                        var rv = fn(resolve, reject, _this);
	                        if (rv && rv.then)
	                            rv.then(resolve, reject);
	                    });
	                    p.finally(function () { return _this._unlock(); });
	                    p._lib = true;
	                    return p;
	                });
	            }
	            else {
	                var p = new DexiePromise(function (resolve, reject) {
	                    var rv = fn(resolve, reject, _this);
	                    if (rv && rv.then)
	                        rv.then(resolve, reject);
	                });
	                p._lib = true;
	                return p;
	            }
	        };
	        Transaction.prototype._root = function () {
	            return this.parent ? this.parent._root() : this;
	        };
	        Transaction.prototype.waitFor = function (promiseLike) {
	            var root = this._root();
	            var promise = DexiePromise.resolve(promiseLike);
	            if (root._waitingFor) {
	                root._waitingFor = root._waitingFor.then(function () { return promise; });
	            }
	            else {
	                root._waitingFor = promise;
	                root._waitingQueue = [];
	                var store = root.idbtrans.objectStore(root.storeNames[0]);
	                (function spin() {
	                    ++root._spinCount;
	                    while (root._waitingQueue.length)
	                        (root._waitingQueue.shift())();
	                    if (root._waitingFor)
	                        store.get(-Infinity).onsuccess = spin;
	                }());
	            }
	            var currentWaitPromise = root._waitingFor;
	            return new DexiePromise(function (resolve, reject) {
	                promise.then(function (res) { return root._waitingQueue.push(wrap(resolve.bind(null, res))); }, function (err) { return root._waitingQueue.push(wrap(reject.bind(null, err))); }).finally(function () {
	                    if (root._waitingFor === currentWaitPromise) {
	                        root._waitingFor = null;
	                    }
	                });
	            });
	        };
	        Transaction.prototype.abort = function () {
	            if (this.active) {
	                this.active = false;
	                if (this.idbtrans)
	                    this.idbtrans.abort();
	                this._reject(new exceptions.Abort());
	            }
	        };
	        Transaction.prototype.table = function (tableName) {
	            var memoizedTables = (this._memoizedTables || (this._memoizedTables = {}));
	            if (hasOwn(memoizedTables, tableName))
	                return memoizedTables[tableName];
	            var tableSchema = this.schema[tableName];
	            if (!tableSchema) {
	                throw new exceptions.NotFound("Table " + tableName + " not part of transaction");
	            }
	            var transactionBoundTable = new this.db.Table(tableName, tableSchema, this);
	            transactionBoundTable.core = this.db.core.table(tableName);
	            memoizedTables[tableName] = transactionBoundTable;
	            return transactionBoundTable;
	        };
	        return Transaction;
	    }());

	    function createTransactionConstructor(db) {
	        return makeClassConstructor(Transaction.prototype, function Transaction(mode, storeNames, dbschema, chromeTransactionDurability, parent) {
	            var _this = this;
	            this.db = db;
	            this.mode = mode;
	            this.storeNames = storeNames;
	            this.schema = dbschema;
	            this.chromeTransactionDurability = chromeTransactionDurability;
	            this.idbtrans = null;
	            this.on = Events(this, "complete", "error", "abort");
	            this.parent = parent || null;
	            this.active = true;
	            this._reculock = 0;
	            this._blockedFuncs = [];
	            this._resolve = null;
	            this._reject = null;
	            this._waitingFor = null;
	            this._waitingQueue = null;
	            this._spinCount = 0;
	            this._completion = new DexiePromise(function (resolve, reject) {
	                _this._resolve = resolve;
	                _this._reject = reject;
	            });
	            this._completion.then(function () {
	                _this.active = false;
	                _this.on.complete.fire();
	            }, function (e) {
	                var wasActive = _this.active;
	                _this.active = false;
	                _this.on.error.fire(e);
	                _this.parent ?
	                    _this.parent._reject(e) :
	                    wasActive && _this.idbtrans && _this.idbtrans.abort();
	                return rejection(e);
	            });
	        });
	    }

	    function createIndexSpec(name, keyPath, unique, multi, auto, compound, isPrimKey) {
	        return {
	            name: name,
	            keyPath: keyPath,
	            unique: unique,
	            multi: multi,
	            auto: auto,
	            compound: compound,
	            src: (unique && !isPrimKey ? '&' : '') + (multi ? '*' : '') + (auto ? "++" : "") + nameFromKeyPath(keyPath)
	        };
	    }
	    function nameFromKeyPath(keyPath) {
	        return typeof keyPath === 'string' ?
	            keyPath :
	            keyPath ? ('[' + [].join.call(keyPath, '+') + ']') : "";
	    }

	    function createTableSchema(name, primKey, indexes) {
	        return {
	            name: name,
	            primKey: primKey,
	            indexes: indexes,
	            mappedClass: null,
	            idxByName: arrayToObject(indexes, function (index) { return [index.name, index]; })
	        };
	    }

	    function safariMultiStoreFix(storeNames) {
	        return storeNames.length === 1 ? storeNames[0] : storeNames;
	    }
	    var getMaxKey = function (IdbKeyRange) {
	        try {
	            IdbKeyRange.only([[]]);
	            getMaxKey = function () { return [[]]; };
	            return [[]];
	        }
	        catch (e) {
	            getMaxKey = function () { return maxString; };
	            return maxString;
	        }
	    };

	    function getKeyExtractor(keyPath) {
	        if (keyPath == null) {
	            return function () { return undefined; };
	        }
	        else if (typeof keyPath === 'string') {
	            return getSinglePathKeyExtractor(keyPath);
	        }
	        else {
	            return function (obj) { return getByKeyPath(obj, keyPath); };
	        }
	    }
	    function getSinglePathKeyExtractor(keyPath) {
	        var split = keyPath.split('.');
	        if (split.length === 1) {
	            return function (obj) { return obj[keyPath]; };
	        }
	        else {
	            return function (obj) { return getByKeyPath(obj, keyPath); };
	        }
	    }

	    function arrayify(arrayLike) {
	        return [].slice.call(arrayLike);
	    }
	    var _id_counter = 0;
	    function getKeyPathAlias(keyPath) {
	        return keyPath == null ?
	            ":id" :
	            typeof keyPath === 'string' ?
	                keyPath :
	                "[".concat(keyPath.join('+'), "]");
	    }
	    function createDBCore(db, IdbKeyRange, tmpTrans) {
	        function extractSchema(db, trans) {
	            var tables = arrayify(db.objectStoreNames);
	            return {
	                schema: {
	                    name: db.name,
	                    tables: tables.map(function (table) { return trans.objectStore(table); }).map(function (store) {
	                        var keyPath = store.keyPath, autoIncrement = store.autoIncrement;
	                        var compound = isArray(keyPath);
	                        var outbound = keyPath == null;
	                        var indexByKeyPath = {};
	                        var result = {
	                            name: store.name,
	                            primaryKey: {
	                                name: null,
	                                isPrimaryKey: true,
	                                outbound: outbound,
	                                compound: compound,
	                                keyPath: keyPath,
	                                autoIncrement: autoIncrement,
	                                unique: true,
	                                extractKey: getKeyExtractor(keyPath)
	                            },
	                            indexes: arrayify(store.indexNames).map(function (indexName) { return store.index(indexName); })
	                                .map(function (index) {
	                                var name = index.name, unique = index.unique, multiEntry = index.multiEntry, keyPath = index.keyPath;
	                                var compound = isArray(keyPath);
	                                var result = {
	                                    name: name,
	                                    compound: compound,
	                                    keyPath: keyPath,
	                                    unique: unique,
	                                    multiEntry: multiEntry,
	                                    extractKey: getKeyExtractor(keyPath)
	                                };
	                                indexByKeyPath[getKeyPathAlias(keyPath)] = result;
	                                return result;
	                            }),
	                            getIndexByKeyPath: function (keyPath) { return indexByKeyPath[getKeyPathAlias(keyPath)]; }
	                        };
	                        indexByKeyPath[":id"] = result.primaryKey;
	                        if (keyPath != null) {
	                            indexByKeyPath[getKeyPathAlias(keyPath)] = result.primaryKey;
	                        }
	                        return result;
	                    })
	                },
	                hasGetAll: tables.length > 0 && ('getAll' in trans.objectStore(tables[0])) &&
	                    !(typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) &&
	                        !/(Chrome\/|Edge\/)/.test(navigator.userAgent) &&
	                        [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604)
	            };
	        }
	        function makeIDBKeyRange(range) {
	            if (range.type === 3 )
	                return null;
	            if (range.type === 4 )
	                throw new Error("Cannot convert never type to IDBKeyRange");
	            var lower = range.lower, upper = range.upper, lowerOpen = range.lowerOpen, upperOpen = range.upperOpen;
	            var idbRange = lower === undefined ?
	                upper === undefined ?
	                    null :
	                    IdbKeyRange.upperBound(upper, !!upperOpen) :
	                upper === undefined ?
	                    IdbKeyRange.lowerBound(lower, !!lowerOpen) :
	                    IdbKeyRange.bound(lower, upper, !!lowerOpen, !!upperOpen);
	            return idbRange;
	        }
	        function createDbCoreTable(tableSchema) {
	            var tableName = tableSchema.name;
	            function mutate(_a) {
	                var trans = _a.trans, type = _a.type, keys = _a.keys, values = _a.values, range = _a.range;
	                return new Promise(function (resolve, reject) {
	                    resolve = wrap(resolve);
	                    var store = trans.objectStore(tableName);
	                    var outbound = store.keyPath == null;
	                    var isAddOrPut = type === "put" || type === "add";
	                    if (!isAddOrPut && type !== 'delete' && type !== 'deleteRange')
	                        throw new Error("Invalid operation type: " + type);
	                    var length = (keys || values || { length: 1 }).length;
	                    if (keys && values && keys.length !== values.length) {
	                        throw new Error("Given keys array must have same length as given values array.");
	                    }
	                    if (length === 0)
	                        return resolve({ numFailures: 0, failures: {}, results: [], lastResult: undefined });
	                    var req;
	                    var reqs = [];
	                    var failures = [];
	                    var numFailures = 0;
	                    var errorHandler = function (event) {
	                        ++numFailures;
	                        preventDefault(event);
	                    };
	                    if (type === 'deleteRange') {
	                        if (range.type === 4 )
	                            return resolve({ numFailures: numFailures, failures: failures, results: [], lastResult: undefined });
	                        if (range.type === 3 )
	                            reqs.push(req = store.clear());
	                        else
	                            reqs.push(req = store.delete(makeIDBKeyRange(range)));
	                    }
	                    else {
	                        var _a = isAddOrPut ?
	                            outbound ?
	                                [values, keys] :
	                                [values, null] :
	                            [keys, null], args1 = _a[0], args2 = _a[1];
	                        if (isAddOrPut) {
	                            for (var i = 0; i < length; ++i) {
	                                reqs.push(req = (args2 && args2[i] !== undefined ?
	                                    store[type](args1[i], args2[i]) :
	                                    store[type](args1[i])));
	                                req.onerror = errorHandler;
	                            }
	                        }
	                        else {
	                            for (var i = 0; i < length; ++i) {
	                                reqs.push(req = store[type](args1[i]));
	                                req.onerror = errorHandler;
	                            }
	                        }
	                    }
	                    var done = function (event) {
	                        var lastResult = event.target.result;
	                        reqs.forEach(function (req, i) { return req.error != null && (failures[i] = req.error); });
	                        resolve({
	                            numFailures: numFailures,
	                            failures: failures,
	                            results: type === "delete" ? keys : reqs.map(function (req) { return req.result; }),
	                            lastResult: lastResult
	                        });
	                    };
	                    req.onerror = function (event) {
	                        errorHandler(event);
	                        done(event);
	                    };
	                    req.onsuccess = done;
	                });
	            }
	            function openCursor(_a) {
	                var trans = _a.trans, values = _a.values, query = _a.query, reverse = _a.reverse, unique = _a.unique;
	                return new Promise(function (resolve, reject) {
	                    resolve = wrap(resolve);
	                    var index = query.index, range = query.range;
	                    var store = trans.objectStore(tableName);
	                    var source = index.isPrimaryKey ?
	                        store :
	                        store.index(index.name);
	                    var direction = reverse ?
	                        unique ?
	                            "prevunique" :
	                            "prev" :
	                        unique ?
	                            "nextunique" :
	                            "next";
	                    var req = values || !('openKeyCursor' in source) ?
	                        source.openCursor(makeIDBKeyRange(range), direction) :
	                        source.openKeyCursor(makeIDBKeyRange(range), direction);
	                    req.onerror = eventRejectHandler(reject);
	                    req.onsuccess = wrap(function (ev) {
	                        var cursor = req.result;
	                        if (!cursor) {
	                            resolve(null);
	                            return;
	                        }
	                        cursor.___id = ++_id_counter;
	                        cursor.done = false;
	                        var _cursorContinue = cursor.continue.bind(cursor);
	                        var _cursorContinuePrimaryKey = cursor.continuePrimaryKey;
	                        if (_cursorContinuePrimaryKey)
	                            _cursorContinuePrimaryKey = _cursorContinuePrimaryKey.bind(cursor);
	                        var _cursorAdvance = cursor.advance.bind(cursor);
	                        var doThrowCursorIsNotStarted = function () { throw new Error("Cursor not started"); };
	                        var doThrowCursorIsStopped = function () { throw new Error("Cursor not stopped"); };
	                        cursor.trans = trans;
	                        cursor.stop = cursor.continue = cursor.continuePrimaryKey = cursor.advance = doThrowCursorIsNotStarted;
	                        cursor.fail = wrap(reject);
	                        cursor.next = function () {
	                            var _this = this;
	                            var gotOne = 1;
	                            return this.start(function () { return gotOne-- ? _this.continue() : _this.stop(); }).then(function () { return _this; });
	                        };
	                        cursor.start = function (callback) {
	                            var iterationPromise = new Promise(function (resolveIteration, rejectIteration) {
	                                resolveIteration = wrap(resolveIteration);
	                                req.onerror = eventRejectHandler(rejectIteration);
	                                cursor.fail = rejectIteration;
	                                cursor.stop = function (value) {
	                                    cursor.stop = cursor.continue = cursor.continuePrimaryKey = cursor.advance = doThrowCursorIsStopped;
	                                    resolveIteration(value);
	                                };
	                            });
	                            var guardedCallback = function () {
	                                if (req.result) {
	                                    try {
	                                        callback();
	                                    }
	                                    catch (err) {
	                                        cursor.fail(err);
	                                    }
	                                }
	                                else {
	                                    cursor.done = true;
	                                    cursor.start = function () { throw new Error("Cursor behind last entry"); };
	                                    cursor.stop();
	                                }
	                            };
	                            req.onsuccess = wrap(function (ev) {
	                                req.onsuccess = guardedCallback;
	                                guardedCallback();
	                            });
	                            cursor.continue = _cursorContinue;
	                            cursor.continuePrimaryKey = _cursorContinuePrimaryKey;
	                            cursor.advance = _cursorAdvance;
	                            guardedCallback();
	                            return iterationPromise;
	                        };
	                        resolve(cursor);
	                    }, reject);
	                });
	            }
	            function query(hasGetAll) {
	                return function (request) {
	                    return new Promise(function (resolve, reject) {
	                        resolve = wrap(resolve);
	                        var trans = request.trans, values = request.values, limit = request.limit, query = request.query;
	                        var nonInfinitLimit = limit === Infinity ? undefined : limit;
	                        var index = query.index, range = query.range;
	                        var store = trans.objectStore(tableName);
	                        var source = index.isPrimaryKey ? store : store.index(index.name);
	                        var idbKeyRange = makeIDBKeyRange(range);
	                        if (limit === 0)
	                            return resolve({ result: [] });
	                        if (hasGetAll) {
	                            var req = values ?
	                                source.getAll(idbKeyRange, nonInfinitLimit) :
	                                source.getAllKeys(idbKeyRange, nonInfinitLimit);
	                            req.onsuccess = function (event) { return resolve({ result: event.target.result }); };
	                            req.onerror = eventRejectHandler(reject);
	                        }
	                        else {
	                            var count_1 = 0;
	                            var req_1 = values || !('openKeyCursor' in source) ?
	                                source.openCursor(idbKeyRange) :
	                                source.openKeyCursor(idbKeyRange);
	                            var result_1 = [];
	                            req_1.onsuccess = function (event) {
	                                var cursor = req_1.result;
	                                if (!cursor)
	                                    return resolve({ result: result_1 });
	                                result_1.push(values ? cursor.value : cursor.primaryKey);
	                                if (++count_1 === limit)
	                                    return resolve({ result: result_1 });
	                                cursor.continue();
	                            };
	                            req_1.onerror = eventRejectHandler(reject);
	                        }
	                    });
	                };
	            }
	            return {
	                name: tableName,
	                schema: tableSchema,
	                mutate: mutate,
	                getMany: function (_a) {
	                    var trans = _a.trans, keys = _a.keys;
	                    return new Promise(function (resolve, reject) {
	                        resolve = wrap(resolve);
	                        var store = trans.objectStore(tableName);
	                        var length = keys.length;
	                        var result = new Array(length);
	                        var keyCount = 0;
	                        var callbackCount = 0;
	                        var req;
	                        var successHandler = function (event) {
	                            var req = event.target;
	                            if ((result[req._pos] = req.result) != null)
	                                ;
	                            if (++callbackCount === keyCount)
	                                resolve(result);
	                        };
	                        var errorHandler = eventRejectHandler(reject);
	                        for (var i = 0; i < length; ++i) {
	                            var key = keys[i];
	                            if (key != null) {
	                                req = store.get(keys[i]);
	                                req._pos = i;
	                                req.onsuccess = successHandler;
	                                req.onerror = errorHandler;
	                                ++keyCount;
	                            }
	                        }
	                        if (keyCount === 0)
	                            resolve(result);
	                    });
	                },
	                get: function (_a) {
	                    var trans = _a.trans, key = _a.key;
	                    return new Promise(function (resolve, reject) {
	                        resolve = wrap(resolve);
	                        var store = trans.objectStore(tableName);
	                        var req = store.get(key);
	                        req.onsuccess = function (event) { return resolve(event.target.result); };
	                        req.onerror = eventRejectHandler(reject);
	                    });
	                },
	                query: query(hasGetAll),
	                openCursor: openCursor,
	                count: function (_a) {
	                    var query = _a.query, trans = _a.trans;
	                    var index = query.index, range = query.range;
	                    return new Promise(function (resolve, reject) {
	                        var store = trans.objectStore(tableName);
	                        var source = index.isPrimaryKey ? store : store.index(index.name);
	                        var idbKeyRange = makeIDBKeyRange(range);
	                        var req = idbKeyRange ? source.count(idbKeyRange) : source.count();
	                        req.onsuccess = wrap(function (ev) { return resolve(ev.target.result); });
	                        req.onerror = eventRejectHandler(reject);
	                    });
	                }
	            };
	        }
	        var _a = extractSchema(db, tmpTrans), schema = _a.schema, hasGetAll = _a.hasGetAll;
	        var tables = schema.tables.map(function (tableSchema) { return createDbCoreTable(tableSchema); });
	        var tableMap = {};
	        tables.forEach(function (table) { return tableMap[table.name] = table; });
	        return {
	            stack: "dbcore",
	            transaction: db.transaction.bind(db),
	            table: function (name) {
	                var result = tableMap[name];
	                if (!result)
	                    throw new Error("Table '".concat(name, "' not found"));
	                return tableMap[name];
	            },
	            MIN_KEY: -Infinity,
	            MAX_KEY: getMaxKey(IdbKeyRange),
	            schema: schema
	        };
	    }

	    function createMiddlewareStack(stackImpl, middlewares) {
	        return middlewares.reduce(function (down, _a) {
	            var create = _a.create;
	            return (__assign(__assign({}, down), create(down)));
	        }, stackImpl);
	    }
	    function createMiddlewareStacks(middlewares, idbdb, _a, tmpTrans) {
	        var IDBKeyRange = _a.IDBKeyRange; _a.indexedDB;
	        var dbcore = createMiddlewareStack(createDBCore(idbdb, IDBKeyRange, tmpTrans), middlewares.dbcore);
	        return {
	            dbcore: dbcore
	        };
	    }
	    function generateMiddlewareStacks(db, tmpTrans) {
	        var idbdb = tmpTrans.db;
	        var stacks = createMiddlewareStacks(db._middlewares, idbdb, db._deps, tmpTrans);
	        db.core = stacks.dbcore;
	        db.tables.forEach(function (table) {
	            var tableName = table.name;
	            if (db.core.schema.tables.some(function (tbl) { return tbl.name === tableName; })) {
	                table.core = db.core.table(tableName);
	                if (db[tableName] instanceof db.Table) {
	                    db[tableName].core = table.core;
	                }
	            }
	        });
	    }

	    function setApiOnPlace(db, objs, tableNames, dbschema) {
	        tableNames.forEach(function (tableName) {
	            var schema = dbschema[tableName];
	            objs.forEach(function (obj) {
	                var propDesc = getPropertyDescriptor(obj, tableName);
	                if (!propDesc || ("value" in propDesc && propDesc.value === undefined)) {
	                    if (obj === db.Transaction.prototype || obj instanceof db.Transaction) {
	                        setProp(obj, tableName, {
	                            get: function () { return this.table(tableName); },
	                            set: function (value) {
	                                defineProperty(this, tableName, { value: value, writable: true, configurable: true, enumerable: true });
	                            }
	                        });
	                    }
	                    else {
	                        obj[tableName] = new db.Table(tableName, schema);
	                    }
	                }
	            });
	        });
	    }
	    function removeTablesApi(db, objs) {
	        objs.forEach(function (obj) {
	            for (var key in obj) {
	                if (obj[key] instanceof db.Table)
	                    delete obj[key];
	            }
	        });
	    }
	    function lowerVersionFirst(a, b) {
	        return a._cfg.version - b._cfg.version;
	    }
	    function runUpgraders(db, oldVersion, idbUpgradeTrans, reject) {
	        var globalSchema = db._dbSchema;
	        if (idbUpgradeTrans.objectStoreNames.contains('$meta') && !globalSchema.$meta) {
	            globalSchema.$meta = createTableSchema("$meta", parseIndexSyntax("")[0], []);
	            db._storeNames.push('$meta');
	        }
	        var trans = db._createTransaction('readwrite', db._storeNames, globalSchema);
	        trans.create(idbUpgradeTrans);
	        trans._completion.catch(reject);
	        var rejectTransaction = trans._reject.bind(trans);
	        var transless = PSD.transless || PSD;
	        newScope(function () {
	            PSD.trans = trans;
	            PSD.transless = transless;
	            if (oldVersion === 0) {
	                keys(globalSchema).forEach(function (tableName) {
	                    createTable(idbUpgradeTrans, tableName, globalSchema[tableName].primKey, globalSchema[tableName].indexes);
	                });
	                generateMiddlewareStacks(db, idbUpgradeTrans);
	                DexiePromise.follow(function () { return db.on.populate.fire(trans); }).catch(rejectTransaction);
	            }
	            else {
	                generateMiddlewareStacks(db, idbUpgradeTrans);
	                return getExistingVersion(db, trans, oldVersion)
	                    .then(function (oldVersion) { return updateTablesAndIndexes(db, oldVersion, trans, idbUpgradeTrans); })
	                    .catch(rejectTransaction);
	            }
	        });
	    }
	    function patchCurrentVersion(db, idbUpgradeTrans) {
	        createMissingTables(db._dbSchema, idbUpgradeTrans);
	        if (idbUpgradeTrans.db.version % 10 === 0 && !idbUpgradeTrans.objectStoreNames.contains('$meta')) {
	            idbUpgradeTrans.db.createObjectStore('$meta').add(Math.ceil((idbUpgradeTrans.db.version / 10) - 1), 'version');
	        }
	        var globalSchema = buildGlobalSchema(db, db.idbdb, idbUpgradeTrans);
	        adjustToExistingIndexNames(db, db._dbSchema, idbUpgradeTrans);
	        var diff = getSchemaDiff(globalSchema, db._dbSchema);
	        var _loop_1 = function (tableChange) {
	            if (tableChange.change.length || tableChange.recreate) {
	                console.warn("Unable to patch indexes of table ".concat(tableChange.name, " because it has changes on the type of index or primary key."));
	                return { value: void 0 };
	            }
	            var store = idbUpgradeTrans.objectStore(tableChange.name);
	            tableChange.add.forEach(function (idx) {
	                if (debug)
	                    console.debug("Dexie upgrade patch: Creating missing index ".concat(tableChange.name, ".").concat(idx.src));
	                addIndex(store, idx);
	            });
	        };
	        for (var _i = 0, _a = diff.change; _i < _a.length; _i++) {
	            var tableChange = _a[_i];
	            var state_1 = _loop_1(tableChange);
	            if (typeof state_1 === "object")
	                return state_1.value;
	        }
	    }
	    function getExistingVersion(db, trans, oldVersion) {
	        if (trans.storeNames.includes('$meta')) {
	            return trans.table('$meta').get('version').then(function (metaVersion) {
	                return metaVersion != null ? metaVersion : oldVersion;
	            });
	        }
	        else {
	            return DexiePromise.resolve(oldVersion);
	        }
	    }
	    function updateTablesAndIndexes(db, oldVersion, trans, idbUpgradeTrans) {
	        var queue = [];
	        var versions = db._versions;
	        var globalSchema = db._dbSchema = buildGlobalSchema(db, db.idbdb, idbUpgradeTrans);
	        var versToRun = versions.filter(function (v) { return v._cfg.version >= oldVersion; });
	        if (versToRun.length === 0) {
	            return DexiePromise.resolve();
	        }
	        versToRun.forEach(function (version) {
	            queue.push(function () {
	                var oldSchema = globalSchema;
	                var newSchema = version._cfg.dbschema;
	                adjustToExistingIndexNames(db, oldSchema, idbUpgradeTrans);
	                adjustToExistingIndexNames(db, newSchema, idbUpgradeTrans);
	                globalSchema = db._dbSchema = newSchema;
	                var diff = getSchemaDiff(oldSchema, newSchema);
	                diff.add.forEach(function (tuple) {
	                    createTable(idbUpgradeTrans, tuple[0], tuple[1].primKey, tuple[1].indexes);
	                });
	                diff.change.forEach(function (change) {
	                    if (change.recreate) {
	                        throw new exceptions.Upgrade("Not yet support for changing primary key");
	                    }
	                    else {
	                        var store_1 = idbUpgradeTrans.objectStore(change.name);
	                        change.add.forEach(function (idx) { return addIndex(store_1, idx); });
	                        change.change.forEach(function (idx) {
	                            store_1.deleteIndex(idx.name);
	                            addIndex(store_1, idx);
	                        });
	                        change.del.forEach(function (idxName) { return store_1.deleteIndex(idxName); });
	                    }
	                });
	                var contentUpgrade = version._cfg.contentUpgrade;
	                if (contentUpgrade && version._cfg.version > oldVersion) {
	                    generateMiddlewareStacks(db, idbUpgradeTrans);
	                    trans._memoizedTables = {};
	                    var upgradeSchema_1 = shallowClone(newSchema);
	                    diff.del.forEach(function (table) {
	                        upgradeSchema_1[table] = oldSchema[table];
	                    });
	                    removeTablesApi(db, [db.Transaction.prototype]);
	                    setApiOnPlace(db, [db.Transaction.prototype], keys(upgradeSchema_1), upgradeSchema_1);
	                    trans.schema = upgradeSchema_1;
	                    var contentUpgradeIsAsync_1 = isAsyncFunction(contentUpgrade);
	                    if (contentUpgradeIsAsync_1) {
	                        incrementExpectedAwaits();
	                    }
	                    var returnValue_1;
	                    var promiseFollowed = DexiePromise.follow(function () {
	                        returnValue_1 = contentUpgrade(trans);
	                        if (returnValue_1) {
	                            if (contentUpgradeIsAsync_1) {
	                                var decrementor = decrementExpectedAwaits.bind(null, null);
	                                returnValue_1.then(decrementor, decrementor);
	                            }
	                        }
	                    });
	                    return (returnValue_1 && typeof returnValue_1.then === 'function' ?
	                        DexiePromise.resolve(returnValue_1) : promiseFollowed.then(function () { return returnValue_1; }));
	                }
	            });
	            queue.push(function (idbtrans) {
	                var newSchema = version._cfg.dbschema;
	                deleteRemovedTables(newSchema, idbtrans);
	                removeTablesApi(db, [db.Transaction.prototype]);
	                setApiOnPlace(db, [db.Transaction.prototype], db._storeNames, db._dbSchema);
	                trans.schema = db._dbSchema;
	            });
	            queue.push(function (idbtrans) {
	                if (db.idbdb.objectStoreNames.contains('$meta')) {
	                    if (Math.ceil(db.idbdb.version / 10) === version._cfg.version) {
	                        db.idbdb.deleteObjectStore('$meta');
	                        delete db._dbSchema.$meta;
	                        db._storeNames = db._storeNames.filter(function (name) { return name !== '$meta'; });
	                    }
	                    else {
	                        idbtrans.objectStore('$meta').put(version._cfg.version, 'version');
	                    }
	                }
	            });
	        });
	        function runQueue() {
	            return queue.length ? DexiePromise.resolve(queue.shift()(trans.idbtrans)).then(runQueue) :
	                DexiePromise.resolve();
	        }
	        return runQueue().then(function () {
	            createMissingTables(globalSchema, idbUpgradeTrans);
	        });
	    }
	    function getSchemaDiff(oldSchema, newSchema) {
	        var diff = {
	            del: [],
	            add: [],
	            change: []
	        };
	        var table;
	        for (table in oldSchema) {
	            if (!newSchema[table])
	                diff.del.push(table);
	        }
	        for (table in newSchema) {
	            var oldDef = oldSchema[table], newDef = newSchema[table];
	            if (!oldDef) {
	                diff.add.push([table, newDef]);
	            }
	            else {
	                var change = {
	                    name: table,
	                    def: newDef,
	                    recreate: false,
	                    del: [],
	                    add: [],
	                    change: []
	                };
	                if ((
	                '' + (oldDef.primKey.keyPath || '')) !== ('' + (newDef.primKey.keyPath || '')) ||
	                    (oldDef.primKey.auto !== newDef.primKey.auto)) {
	                    change.recreate = true;
	                    diff.change.push(change);
	                }
	                else {
	                    var oldIndexes = oldDef.idxByName;
	                    var newIndexes = newDef.idxByName;
	                    var idxName = void 0;
	                    for (idxName in oldIndexes) {
	                        if (!newIndexes[idxName])
	                            change.del.push(idxName);
	                    }
	                    for (idxName in newIndexes) {
	                        var oldIdx = oldIndexes[idxName], newIdx = newIndexes[idxName];
	                        if (!oldIdx)
	                            change.add.push(newIdx);
	                        else if (oldIdx.src !== newIdx.src)
	                            change.change.push(newIdx);
	                    }
	                    if (change.del.length > 0 || change.add.length > 0 || change.change.length > 0) {
	                        diff.change.push(change);
	                    }
	                }
	            }
	        }
	        return diff;
	    }
	    function createTable(idbtrans, tableName, primKey, indexes) {
	        var store = idbtrans.db.createObjectStore(tableName, primKey.keyPath ?
	            { keyPath: primKey.keyPath, autoIncrement: primKey.auto } :
	            { autoIncrement: primKey.auto });
	        indexes.forEach(function (idx) { return addIndex(store, idx); });
	        return store;
	    }
	    function createMissingTables(newSchema, idbtrans) {
	        keys(newSchema).forEach(function (tableName) {
	            if (!idbtrans.db.objectStoreNames.contains(tableName)) {
	                if (debug)
	                    console.debug('Dexie: Creating missing table', tableName);
	                createTable(idbtrans, tableName, newSchema[tableName].primKey, newSchema[tableName].indexes);
	            }
	        });
	    }
	    function deleteRemovedTables(newSchema, idbtrans) {
	        [].slice.call(idbtrans.db.objectStoreNames).forEach(function (storeName) {
	            return newSchema[storeName] == null && idbtrans.db.deleteObjectStore(storeName);
	        });
	    }
	    function addIndex(store, idx) {
	        store.createIndex(idx.name, idx.keyPath, { unique: idx.unique, multiEntry: idx.multi });
	    }
	    function buildGlobalSchema(db, idbdb, tmpTrans) {
	        var globalSchema = {};
	        var dbStoreNames = slice(idbdb.objectStoreNames, 0);
	        dbStoreNames.forEach(function (storeName) {
	            var store = tmpTrans.objectStore(storeName);
	            var keyPath = store.keyPath;
	            var primKey = createIndexSpec(nameFromKeyPath(keyPath), keyPath || "", true, false, !!store.autoIncrement, keyPath && typeof keyPath !== "string", true);
	            var indexes = [];
	            for (var j = 0; j < store.indexNames.length; ++j) {
	                var idbindex = store.index(store.indexNames[j]);
	                keyPath = idbindex.keyPath;
	                var index = createIndexSpec(idbindex.name, keyPath, !!idbindex.unique, !!idbindex.multiEntry, false, keyPath && typeof keyPath !== "string", false);
	                indexes.push(index);
	            }
	            globalSchema[storeName] = createTableSchema(storeName, primKey, indexes);
	        });
	        return globalSchema;
	    }
	    function readGlobalSchema(db, idbdb, tmpTrans) {
	        db.verno = idbdb.version / 10;
	        var globalSchema = db._dbSchema = buildGlobalSchema(db, idbdb, tmpTrans);
	        db._storeNames = slice(idbdb.objectStoreNames, 0);
	        setApiOnPlace(db, [db._allTables], keys(globalSchema), globalSchema);
	    }
	    function verifyInstalledSchema(db, tmpTrans) {
	        var installedSchema = buildGlobalSchema(db, db.idbdb, tmpTrans);
	        var diff = getSchemaDiff(installedSchema, db._dbSchema);
	        return !(diff.add.length || diff.change.some(function (ch) { return ch.add.length || ch.change.length; }));
	    }
	    function adjustToExistingIndexNames(db, schema, idbtrans) {
	        var storeNames = idbtrans.db.objectStoreNames;
	        for (var i = 0; i < storeNames.length; ++i) {
	            var storeName = storeNames[i];
	            var store = idbtrans.objectStore(storeName);
	            db._hasGetAll = 'getAll' in store;
	            for (var j = 0; j < store.indexNames.length; ++j) {
	                var indexName = store.indexNames[j];
	                var keyPath = store.index(indexName).keyPath;
	                var dexieName = typeof keyPath === 'string' ? keyPath : "[" + slice(keyPath).join('+') + "]";
	                if (schema[storeName]) {
	                    var indexSpec = schema[storeName].idxByName[dexieName];
	                    if (indexSpec) {
	                        indexSpec.name = indexName;
	                        delete schema[storeName].idxByName[dexieName];
	                        schema[storeName].idxByName[indexName] = indexSpec;
	                    }
	                }
	            }
	        }
	        if (typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) &&
	            !/(Chrome\/|Edge\/)/.test(navigator.userAgent) &&
	            _global.WorkerGlobalScope && _global instanceof _global.WorkerGlobalScope &&
	            [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) {
	            db._hasGetAll = false;
	        }
	    }
	    function parseIndexSyntax(primKeyAndIndexes) {
	        return primKeyAndIndexes.split(',').map(function (index, indexNum) {
	            index = index.trim();
	            var name = index.replace(/([&*]|\+\+)/g, "");
	            var keyPath = /^\[/.test(name) ? name.match(/^\[(.*)\]$/)[1].split('+') : name;
	            return createIndexSpec(name, keyPath || null, /\&/.test(index), /\*/.test(index), /\+\+/.test(index), isArray(keyPath), indexNum === 0);
	        });
	    }

	    var Version =  (function () {
	        function Version() {
	        }
	        Version.prototype._parseStoresSpec = function (stores, outSchema) {
	            keys(stores).forEach(function (tableName) {
	                if (stores[tableName] !== null) {
	                    var indexes = parseIndexSyntax(stores[tableName]);
	                    var primKey = indexes.shift();
	                    primKey.unique = true;
	                    if (primKey.multi)
	                        throw new exceptions.Schema("Primary key cannot be multi-valued");
	                    indexes.forEach(function (idx) {
	                        if (idx.auto)
	                            throw new exceptions.Schema("Only primary key can be marked as autoIncrement (++)");
	                        if (!idx.keyPath)
	                            throw new exceptions.Schema("Index must have a name and cannot be an empty string");
	                    });
	                    outSchema[tableName] = createTableSchema(tableName, primKey, indexes);
	                }
	            });
	        };
	        Version.prototype.stores = function (stores) {
	            var db = this.db;
	            this._cfg.storesSource = this._cfg.storesSource ?
	                extend(this._cfg.storesSource, stores) :
	                stores;
	            var versions = db._versions;
	            var storesSpec = {};
	            var dbschema = {};
	            versions.forEach(function (version) {
	                extend(storesSpec, version._cfg.storesSource);
	                dbschema = (version._cfg.dbschema = {});
	                version._parseStoresSpec(storesSpec, dbschema);
	            });
	            db._dbSchema = dbschema;
	            removeTablesApi(db, [db._allTables, db, db.Transaction.prototype]);
	            setApiOnPlace(db, [db._allTables, db, db.Transaction.prototype, this._cfg.tables], keys(dbschema), dbschema);
	            db._storeNames = keys(dbschema);
	            return this;
	        };
	        Version.prototype.upgrade = function (upgradeFunction) {
	            this._cfg.contentUpgrade = promisableChain(this._cfg.contentUpgrade || nop, upgradeFunction);
	            return this;
	        };
	        return Version;
	    }());

	    function createVersionConstructor(db) {
	        return makeClassConstructor(Version.prototype, function Version(versionNumber) {
	            this.db = db;
	            this._cfg = {
	                version: versionNumber,
	                storesSource: null,
	                dbschema: {},
	                tables: {},
	                contentUpgrade: null
	            };
	        });
	    }

	    function getDbNamesTable(indexedDB, IDBKeyRange) {
	        var dbNamesDB = indexedDB["_dbNamesDB"];
	        if (!dbNamesDB) {
	            dbNamesDB = indexedDB["_dbNamesDB"] = new Dexie$1(DBNAMES_DB, {
	                addons: [],
	                indexedDB: indexedDB,
	                IDBKeyRange: IDBKeyRange,
	            });
	            dbNamesDB.version(1).stores({ dbnames: "name" });
	        }
	        return dbNamesDB.table("dbnames");
	    }
	    function hasDatabasesNative(indexedDB) {
	        return indexedDB && typeof indexedDB.databases === "function";
	    }
	    function getDatabaseNames(_a) {
	        var indexedDB = _a.indexedDB, IDBKeyRange = _a.IDBKeyRange;
	        return hasDatabasesNative(indexedDB)
	            ? Promise.resolve(indexedDB.databases()).then(function (infos) {
	                return infos
	                    .map(function (info) { return info.name; })
	                    .filter(function (name) { return name !== DBNAMES_DB; });
	            })
	            : getDbNamesTable(indexedDB, IDBKeyRange).toCollection().primaryKeys();
	    }
	    function _onDatabaseCreated(_a, name) {
	        var indexedDB = _a.indexedDB, IDBKeyRange = _a.IDBKeyRange;
	        !hasDatabasesNative(indexedDB) &&
	            name !== DBNAMES_DB &&
	            getDbNamesTable(indexedDB, IDBKeyRange).put({ name: name }).catch(nop);
	    }
	    function _onDatabaseDeleted(_a, name) {
	        var indexedDB = _a.indexedDB, IDBKeyRange = _a.IDBKeyRange;
	        !hasDatabasesNative(indexedDB) &&
	            name !== DBNAMES_DB &&
	            getDbNamesTable(indexedDB, IDBKeyRange).delete(name).catch(nop);
	    }

	    function vip(fn) {
	        return newScope(function () {
	            PSD.letThrough = true;
	            return fn();
	        });
	    }

	    function idbReady() {
	        var isSafari = !navigator.userAgentData &&
	            /Safari\//.test(navigator.userAgent) &&
	            !/Chrom(e|ium)\//.test(navigator.userAgent);
	        if (!isSafari || !indexedDB.databases)
	            return Promise.resolve();
	        var intervalId;
	        return new Promise(function (resolve) {
	            var tryIdb = function () { return indexedDB.databases().finally(resolve); };
	            intervalId = setInterval(tryIdb, 100);
	            tryIdb();
	        }).finally(function () { return clearInterval(intervalId); });
	    }

	    var _a;
	    function isEmptyRange(node) {
	        return !("from" in node);
	    }
	    var RangeSet = function (fromOrTree, to) {
	        if (this) {
	            extend(this, arguments.length ? { d: 1, from: fromOrTree, to: arguments.length > 1 ? to : fromOrTree } : { d: 0 });
	        }
	        else {
	            var rv = new RangeSet();
	            if (fromOrTree && ("d" in fromOrTree)) {
	                extend(rv, fromOrTree);
	            }
	            return rv;
	        }
	    };
	    props(RangeSet.prototype, (_a = {
	            add: function (rangeSet) {
	                mergeRanges(this, rangeSet);
	                return this;
	            },
	            addKey: function (key) {
	                addRange(this, key, key);
	                return this;
	            },
	            addKeys: function (keys) {
	                var _this = this;
	                keys.forEach(function (key) { return addRange(_this, key, key); });
	                return this;
	            },
	            hasKey: function (key) {
	                var node = getRangeSetIterator(this).next(key).value;
	                return node && cmp(node.from, key) <= 0 && cmp(node.to, key) >= 0;
	            }
	        },
	        _a[iteratorSymbol] = function () {
	            return getRangeSetIterator(this);
	        },
	        _a));
	    function addRange(target, from, to) {
	        var diff = cmp(from, to);
	        if (isNaN(diff))
	            return;
	        if (diff > 0)
	            throw RangeError();
	        if (isEmptyRange(target))
	            return extend(target, { from: from, to: to, d: 1 });
	        var left = target.l;
	        var right = target.r;
	        if (cmp(to, target.from) < 0) {
	            left
	                ? addRange(left, from, to)
	                : (target.l = { from: from, to: to, d: 1, l: null, r: null });
	            return rebalance(target);
	        }
	        if (cmp(from, target.to) > 0) {
	            right
	                ? addRange(right, from, to)
	                : (target.r = { from: from, to: to, d: 1, l: null, r: null });
	            return rebalance(target);
	        }
	        if (cmp(from, target.from) < 0) {
	            target.from = from;
	            target.l = null;
	            target.d = right ? right.d + 1 : 1;
	        }
	        if (cmp(to, target.to) > 0) {
	            target.to = to;
	            target.r = null;
	            target.d = target.l ? target.l.d + 1 : 1;
	        }
	        var rightWasCutOff = !target.r;
	        if (left && !target.l) {
	            mergeRanges(target, left);
	        }
	        if (right && rightWasCutOff) {
	            mergeRanges(target, right);
	        }
	    }
	    function mergeRanges(target, newSet) {
	        function _addRangeSet(target, _a) {
	            var from = _a.from, to = _a.to, l = _a.l, r = _a.r;
	            addRange(target, from, to);
	            if (l)
	                _addRangeSet(target, l);
	            if (r)
	                _addRangeSet(target, r);
	        }
	        if (!isEmptyRange(newSet))
	            _addRangeSet(target, newSet);
	    }
	    function rangesOverlap(rangeSet1, rangeSet2) {
	        var i1 = getRangeSetIterator(rangeSet2);
	        var nextResult1 = i1.next();
	        if (nextResult1.done)
	            return false;
	        var a = nextResult1.value;
	        var i2 = getRangeSetIterator(rangeSet1);
	        var nextResult2 = i2.next(a.from);
	        var b = nextResult2.value;
	        while (!nextResult1.done && !nextResult2.done) {
	            if (cmp(b.from, a.to) <= 0 && cmp(b.to, a.from) >= 0)
	                return true;
	            cmp(a.from, b.from) < 0
	                ? (a = (nextResult1 = i1.next(b.from)).value)
	                : (b = (nextResult2 = i2.next(a.from)).value);
	        }
	        return false;
	    }
	    function getRangeSetIterator(node) {
	        var state = isEmptyRange(node) ? null : { s: 0, n: node };
	        return {
	            next: function (key) {
	                var keyProvided = arguments.length > 0;
	                while (state) {
	                    switch (state.s) {
	                        case 0:
	                            state.s = 1;
	                            if (keyProvided) {
	                                while (state.n.l && cmp(key, state.n.from) < 0)
	                                    state = { up: state, n: state.n.l, s: 1 };
	                            }
	                            else {
	                                while (state.n.l)
	                                    state = { up: state, n: state.n.l, s: 1 };
	                            }
	                        case 1:
	                            state.s = 2;
	                            if (!keyProvided || cmp(key, state.n.to) <= 0)
	                                return { value: state.n, done: false };
	                        case 2:
	                            if (state.n.r) {
	                                state.s = 3;
	                                state = { up: state, n: state.n.r, s: 0 };
	                                continue;
	                            }
	                        case 3:
	                            state = state.up;
	                    }
	                }
	                return { done: true };
	            },
	        };
	    }
	    function rebalance(target) {
	        var _a, _b;
	        var diff = (((_a = target.r) === null || _a === void 0 ? void 0 : _a.d) || 0) - (((_b = target.l) === null || _b === void 0 ? void 0 : _b.d) || 0);
	        var r = diff > 1 ? "r" : diff < -1 ? "l" : "";
	        if (r) {
	            var l = r === "r" ? "l" : "r";
	            var rootClone = __assign({}, target);
	            var oldRootRight = target[r];
	            target.from = oldRootRight.from;
	            target.to = oldRootRight.to;
	            target[r] = oldRootRight[r];
	            rootClone[r] = oldRootRight[l];
	            target[l] = rootClone;
	            rootClone.d = computeDepth(rootClone);
	        }
	        target.d = computeDepth(target);
	    }
	    function computeDepth(_a) {
	        var r = _a.r, l = _a.l;
	        return (r ? (l ? Math.max(r.d, l.d) : r.d) : l ? l.d : 0) + 1;
	    }

	    function extendObservabilitySet(target, newSet) {
	        keys(newSet).forEach(function (part) {
	            if (target[part])
	                mergeRanges(target[part], newSet[part]);
	            else
	                target[part] = cloneSimpleObjectTree(newSet[part]);
	        });
	        return target;
	    }

	    function obsSetsOverlap(os1, os2) {
	        return os1.all || os2.all || Object.keys(os1).some(function (key) { return os2[key] && rangesOverlap(os2[key], os1[key]); });
	    }

	    var cache = {};

	    var unsignaledParts = {};
	    var isTaskEnqueued = false;
	    function signalSubscribersLazily(part, optimistic) {
	        extendObservabilitySet(unsignaledParts, part);
	        if (!isTaskEnqueued) {
	            isTaskEnqueued = true;
	            setTimeout(function () {
	                isTaskEnqueued = false;
	                var parts = unsignaledParts;
	                unsignaledParts = {};
	                signalSubscribersNow(parts, false);
	            }, 0);
	        }
	    }
	    function signalSubscribersNow(updatedParts, deleteAffectedCacheEntries) {
	        if (deleteAffectedCacheEntries === void 0) { deleteAffectedCacheEntries = false; }
	        var queriesToSignal = new Set();
	        if (updatedParts.all) {
	            for (var _i = 0, _a = Object.values(cache); _i < _a.length; _i++) {
	                var tblCache = _a[_i];
	                collectTableSubscribers(tblCache, updatedParts, queriesToSignal, deleteAffectedCacheEntries);
	            }
	        }
	        else {
	            for (var key in updatedParts) {
	                var parts = /^idb\:\/\/(.*)\/(.*)\//.exec(key);
	                if (parts) {
	                    var dbName = parts[1], tableName = parts[2];
	                    var tblCache = cache["idb://".concat(dbName, "/").concat(tableName)];
	                    if (tblCache)
	                        collectTableSubscribers(tblCache, updatedParts, queriesToSignal, deleteAffectedCacheEntries);
	                }
	            }
	        }
	        queriesToSignal.forEach(function (requery) { return requery(); });
	    }
	    function collectTableSubscribers(tblCache, updatedParts, outQueriesToSignal, deleteAffectedCacheEntries) {
	        var updatedEntryLists = [];
	        for (var _i = 0, _a = Object.entries(tblCache.queries.query); _i < _a.length; _i++) {
	            var _b = _a[_i], indexName = _b[0], entries = _b[1];
	            var filteredEntries = [];
	            for (var _c = 0, entries_1 = entries; _c < entries_1.length; _c++) {
	                var entry = entries_1[_c];
	                if (obsSetsOverlap(updatedParts, entry.obsSet)) {
	                    entry.subscribers.forEach(function (requery) { return outQueriesToSignal.add(requery); });
	                }
	                else if (deleteAffectedCacheEntries) {
	                    filteredEntries.push(entry);
	                }
	            }
	            if (deleteAffectedCacheEntries)
	                updatedEntryLists.push([indexName, filteredEntries]);
	        }
	        if (deleteAffectedCacheEntries) {
	            for (var _d = 0, updatedEntryLists_1 = updatedEntryLists; _d < updatedEntryLists_1.length; _d++) {
	                var _e = updatedEntryLists_1[_d], indexName = _e[0], filteredEntries = _e[1];
	                tblCache.queries.query[indexName] = filteredEntries;
	            }
	        }
	    }

	    function dexieOpen(db) {
	        var state = db._state;
	        var indexedDB = db._deps.indexedDB;
	        if (state.isBeingOpened || db.idbdb)
	            return state.dbReadyPromise.then(function () { return state.dbOpenError ?
	                rejection(state.dbOpenError) :
	                db; });
	        state.isBeingOpened = true;
	        state.dbOpenError = null;
	        state.openComplete = false;
	        var openCanceller = state.openCanceller;
	        var nativeVerToOpen = Math.round(db.verno * 10);
	        var schemaPatchMode = false;
	        function throwIfCancelled() {
	            if (state.openCanceller !== openCanceller)
	                throw new exceptions.DatabaseClosed('db.open() was cancelled');
	        }
	        var resolveDbReady = state.dbReadyResolve,
	        upgradeTransaction = null, wasCreated = false;
	        var tryOpenDB = function () { return new DexiePromise(function (resolve, reject) {
	            throwIfCancelled();
	            if (!indexedDB)
	                throw new exceptions.MissingAPI();
	            var dbName = db.name;
	            var req = state.autoSchema || !nativeVerToOpen ?
	                indexedDB.open(dbName) :
	                indexedDB.open(dbName, nativeVerToOpen);
	            if (!req)
	                throw new exceptions.MissingAPI();
	            req.onerror = eventRejectHandler(reject);
	            req.onblocked = wrap(db._fireOnBlocked);
	            req.onupgradeneeded = wrap(function (e) {
	                upgradeTransaction = req.transaction;
	                if (state.autoSchema && !db._options.allowEmptyDB) {
	                    req.onerror = preventDefault;
	                    upgradeTransaction.abort();
	                    req.result.close();
	                    var delreq = indexedDB.deleteDatabase(dbName);
	                    delreq.onsuccess = delreq.onerror = wrap(function () {
	                        reject(new exceptions.NoSuchDatabase("Database ".concat(dbName, " doesnt exist")));
	                    });
	                }
	                else {
	                    upgradeTransaction.onerror = eventRejectHandler(reject);
	                    var oldVer = e.oldVersion > Math.pow(2, 62) ? 0 : e.oldVersion;
	                    wasCreated = oldVer < 1;
	                    db.idbdb = req.result;
	                    if (schemaPatchMode) {
	                        patchCurrentVersion(db, upgradeTransaction);
	                    }
	                    runUpgraders(db, oldVer / 10, upgradeTransaction, reject);
	                }
	            }, reject);
	            req.onsuccess = wrap(function () {
	                upgradeTransaction = null;
	                var idbdb = db.idbdb = req.result;
	                var objectStoreNames = slice(idbdb.objectStoreNames);
	                if (objectStoreNames.length > 0)
	                    try {
	                        var tmpTrans = idbdb.transaction(safariMultiStoreFix(objectStoreNames), 'readonly');
	                        if (state.autoSchema)
	                            readGlobalSchema(db, idbdb, tmpTrans);
	                        else {
	                            adjustToExistingIndexNames(db, db._dbSchema, tmpTrans);
	                            if (!verifyInstalledSchema(db, tmpTrans) && !schemaPatchMode) {
	                                console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this.");
	                                idbdb.close();
	                                nativeVerToOpen = idbdb.version + 1;
	                                schemaPatchMode = true;
	                                return resolve(tryOpenDB());
	                            }
	                        }
	                        generateMiddlewareStacks(db, tmpTrans);
	                    }
	                    catch (e) {
	                    }
	                connections.push(db);
	                idbdb.onversionchange = wrap(function (ev) {
	                    state.vcFired = true;
	                    db.on("versionchange").fire(ev);
	                });
	                idbdb.onclose = wrap(function (ev) {
	                    db.on("close").fire(ev);
	                });
	                if (wasCreated)
	                    _onDatabaseCreated(db._deps, dbName);
	                resolve();
	            }, reject);
	        }).catch(function (err) {
	            switch (err === null || err === void 0 ? void 0 : err.name) {
	                case "UnknownError":
	                    if (state.PR1398_maxLoop > 0) {
	                        state.PR1398_maxLoop--;
	                        console.warn('Dexie: Workaround for Chrome UnknownError on open()');
	                        return tryOpenDB();
	                    }
	                    break;
	                case "VersionError":
	                    if (nativeVerToOpen > 0) {
	                        nativeVerToOpen = 0;
	                        return tryOpenDB();
	                    }
	                    break;
	            }
	            return DexiePromise.reject(err);
	        }); };
	        return DexiePromise.race([
	            openCanceller,
	            (typeof navigator === 'undefined' ? DexiePromise.resolve() : idbReady()).then(tryOpenDB)
	        ]).then(function () {
	            throwIfCancelled();
	            state.onReadyBeingFired = [];
	            return DexiePromise.resolve(vip(function () { return db.on.ready.fire(db.vip); })).then(function fireRemainders() {
	                if (state.onReadyBeingFired.length > 0) {
	                    var remainders_1 = state.onReadyBeingFired.reduce(promisableChain, nop);
	                    state.onReadyBeingFired = [];
	                    return DexiePromise.resolve(vip(function () { return remainders_1(db.vip); })).then(fireRemainders);
	                }
	            });
	        }).finally(function () {
	            if (state.openCanceller === openCanceller) {
	                state.onReadyBeingFired = null;
	                state.isBeingOpened = false;
	            }
	        }).catch(function (err) {
	            state.dbOpenError = err;
	            try {
	                upgradeTransaction && upgradeTransaction.abort();
	            }
	            catch (_a) { }
	            if (openCanceller === state.openCanceller) {
	                db._close();
	            }
	            return rejection(err);
	        }).finally(function () {
	            state.openComplete = true;
	            resolveDbReady();
	        }).then(function () {
	            if (wasCreated) {
	                var everything_1 = {};
	                db.tables.forEach(function (table) {
	                    table.schema.indexes.forEach(function (idx) {
	                        if (idx.name)
	                            everything_1["idb://".concat(db.name, "/").concat(table.name, "/").concat(idx.name)] = new RangeSet(-Infinity, [[[]]]);
	                    });
	                    everything_1["idb://".concat(db.name, "/").concat(table.name, "/")] = everything_1["idb://".concat(db.name, "/").concat(table.name, "/:dels")] = new RangeSet(-Infinity, [[[]]]);
	                });
	                globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME).fire(everything_1);
	                signalSubscribersNow(everything_1, true);
	            }
	            return db;
	        });
	    }

	    function awaitIterator(iterator) {
	        var callNext = function (result) { return iterator.next(result); }, doThrow = function (error) { return iterator.throw(error); }, onSuccess = step(callNext), onError = step(doThrow);
	        function step(getNext) {
	            return function (val) {
	                var next = getNext(val), value = next.value;
	                return next.done ? value :
	                    (!value || typeof value.then !== 'function' ?
	                        isArray(value) ? Promise.all(value).then(onSuccess, onError) : onSuccess(value) :
	                        value.then(onSuccess, onError));
	            };
	        }
	        return step(callNext)();
	    }

	    function extractTransactionArgs(mode, _tableArgs_, scopeFunc) {
	        var i = arguments.length;
	        if (i < 2)
	            throw new exceptions.InvalidArgument("Too few arguments");
	        var args = new Array(i - 1);
	        while (--i)
	            args[i - 1] = arguments[i];
	        scopeFunc = args.pop();
	        var tables = flatten(args);
	        return [mode, tables, scopeFunc];
	    }
	    function enterTransactionScope(db, mode, storeNames, parentTransaction, scopeFunc) {
	        return DexiePromise.resolve().then(function () {
	            var transless = PSD.transless || PSD;
	            var trans = db._createTransaction(mode, storeNames, db._dbSchema, parentTransaction);
	            trans.explicit = true;
	            var zoneProps = {
	                trans: trans,
	                transless: transless
	            };
	            if (parentTransaction) {
	                trans.idbtrans = parentTransaction.idbtrans;
	            }
	            else {
	                try {
	                    trans.create();
	                    trans.idbtrans._explicit = true;
	                    db._state.PR1398_maxLoop = 3;
	                }
	                catch (ex) {
	                    if (ex.name === errnames.InvalidState && db.isOpen() && --db._state.PR1398_maxLoop > 0) {
	                        console.warn('Dexie: Need to reopen db');
	                        db.close({ disableAutoOpen: false });
	                        return db.open().then(function () { return enterTransactionScope(db, mode, storeNames, null, scopeFunc); });
	                    }
	                    return rejection(ex);
	                }
	            }
	            var scopeFuncIsAsync = isAsyncFunction(scopeFunc);
	            if (scopeFuncIsAsync) {
	                incrementExpectedAwaits();
	            }
	            var returnValue;
	            var promiseFollowed = DexiePromise.follow(function () {
	                returnValue = scopeFunc.call(trans, trans);
	                if (returnValue) {
	                    if (scopeFuncIsAsync) {
	                        var decrementor = decrementExpectedAwaits.bind(null, null);
	                        returnValue.then(decrementor, decrementor);
	                    }
	                    else if (typeof returnValue.next === 'function' && typeof returnValue.throw === 'function') {
	                        returnValue = awaitIterator(returnValue);
	                    }
	                }
	            }, zoneProps);
	            return (returnValue && typeof returnValue.then === 'function' ?
	                DexiePromise.resolve(returnValue).then(function (x) { return trans.active ?
	                    x
	                    : rejection(new exceptions.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn")); })
	                : promiseFollowed.then(function () { return returnValue; })).then(function (x) {
	                if (parentTransaction)
	                    trans._resolve();
	                return trans._completion.then(function () { return x; });
	            }).catch(function (e) {
	                trans._reject(e);
	                return rejection(e);
	            });
	        });
	    }

	    function pad(a, value, count) {
	        var result = isArray(a) ? a.slice() : [a];
	        for (var i = 0; i < count; ++i)
	            result.push(value);
	        return result;
	    }
	    function createVirtualIndexMiddleware(down) {
	        return __assign(__assign({}, down), { table: function (tableName) {
	                var table = down.table(tableName);
	                var schema = table.schema;
	                var indexLookup = {};
	                var allVirtualIndexes = [];
	                function addVirtualIndexes(keyPath, keyTail, lowLevelIndex) {
	                    var keyPathAlias = getKeyPathAlias(keyPath);
	                    var indexList = (indexLookup[keyPathAlias] = indexLookup[keyPathAlias] || []);
	                    var keyLength = keyPath == null ? 0 : typeof keyPath === 'string' ? 1 : keyPath.length;
	                    var isVirtual = keyTail > 0;
	                    var virtualIndex = __assign(__assign({}, lowLevelIndex), { name: isVirtual
	                            ? "".concat(keyPathAlias, "(virtual-from:").concat(lowLevelIndex.name, ")")
	                            : lowLevelIndex.name, lowLevelIndex: lowLevelIndex, isVirtual: isVirtual, keyTail: keyTail, keyLength: keyLength, extractKey: getKeyExtractor(keyPath), unique: !isVirtual && lowLevelIndex.unique });
	                    indexList.push(virtualIndex);
	                    if (!virtualIndex.isPrimaryKey) {
	                        allVirtualIndexes.push(virtualIndex);
	                    }
	                    if (keyLength > 1) {
	                        var virtualKeyPath = keyLength === 2 ?
	                            keyPath[0] :
	                            keyPath.slice(0, keyLength - 1);
	                        addVirtualIndexes(virtualKeyPath, keyTail + 1, lowLevelIndex);
	                    }
	                    indexList.sort(function (a, b) { return a.keyTail - b.keyTail; });
	                    return virtualIndex;
	                }
	                var primaryKey = addVirtualIndexes(schema.primaryKey.keyPath, 0, schema.primaryKey);
	                indexLookup[":id"] = [primaryKey];
	                for (var _i = 0, _a = schema.indexes; _i < _a.length; _i++) {
	                    var index = _a[_i];
	                    addVirtualIndexes(index.keyPath, 0, index);
	                }
	                function findBestIndex(keyPath) {
	                    var result = indexLookup[getKeyPathAlias(keyPath)];
	                    return result && result[0];
	                }
	                function translateRange(range, keyTail) {
	                    return {
	                        type: range.type === 1  ?
	                            2  :
	                            range.type,
	                        lower: pad(range.lower, range.lowerOpen ? down.MAX_KEY : down.MIN_KEY, keyTail),
	                        lowerOpen: true,
	                        upper: pad(range.upper, range.upperOpen ? down.MIN_KEY : down.MAX_KEY, keyTail),
	                        upperOpen: true
	                    };
	                }
	                function translateRequest(req) {
	                    var index = req.query.index;
	                    return index.isVirtual ? __assign(__assign({}, req), { query: {
	                            index: index.lowLevelIndex,
	                            range: translateRange(req.query.range, index.keyTail)
	                        } }) : req;
	                }
	                var result = __assign(__assign({}, table), { schema: __assign(__assign({}, schema), { primaryKey: primaryKey, indexes: allVirtualIndexes, getIndexByKeyPath: findBestIndex }), count: function (req) {
	                        return table.count(translateRequest(req));
	                    }, query: function (req) {
	                        return table.query(translateRequest(req));
	                    }, openCursor: function (req) {
	                        var _a = req.query.index, keyTail = _a.keyTail, isVirtual = _a.isVirtual, keyLength = _a.keyLength;
	                        if (!isVirtual)
	                            return table.openCursor(req);
	                        function createVirtualCursor(cursor) {
	                            function _continue(key) {
	                                key != null ?
	                                    cursor.continue(pad(key, req.reverse ? down.MAX_KEY : down.MIN_KEY, keyTail)) :
	                                    req.unique ?
	                                        cursor.continue(cursor.key.slice(0, keyLength)
	                                            .concat(req.reverse
	                                            ? down.MIN_KEY
	                                            : down.MAX_KEY, keyTail)) :
	                                        cursor.continue();
	                            }
	                            var virtualCursor = Object.create(cursor, {
	                                continue: { value: _continue },
	                                continuePrimaryKey: {
	                                    value: function (key, primaryKey) {
	                                        cursor.continuePrimaryKey(pad(key, down.MAX_KEY, keyTail), primaryKey);
	                                    }
	                                },
	                                primaryKey: {
	                                    get: function () {
	                                        return cursor.primaryKey;
	                                    }
	                                },
	                                key: {
	                                    get: function () {
	                                        var key = cursor.key;
	                                        return keyLength === 1 ?
	                                            key[0] :
	                                            key.slice(0, keyLength);
	                                    }
	                                },
	                                value: {
	                                    get: function () {
	                                        return cursor.value;
	                                    }
	                                }
	                            });
	                            return virtualCursor;
	                        }
	                        return table.openCursor(translateRequest(req))
	                            .then(function (cursor) { return cursor && createVirtualCursor(cursor); });
	                    } });
	                return result;
	            } });
	    }
	    var virtualIndexMiddleware = {
	        stack: "dbcore",
	        name: "VirtualIndexMiddleware",
	        level: 1,
	        create: createVirtualIndexMiddleware
	    };

	    function getObjectDiff(a, b, rv, prfx) {
	        rv = rv || {};
	        prfx = prfx || '';
	        keys(a).forEach(function (prop) {
	            if (!hasOwn(b, prop)) {
	                rv[prfx + prop] = undefined;
	            }
	            else {
	                var ap = a[prop], bp = b[prop];
	                if (typeof ap === 'object' && typeof bp === 'object' && ap && bp) {
	                    var apTypeName = toStringTag(ap);
	                    var bpTypeName = toStringTag(bp);
	                    if (apTypeName !== bpTypeName) {
	                        rv[prfx + prop] = b[prop];
	                    }
	                    else if (apTypeName === 'Object') {
	                        getObjectDiff(ap, bp, rv, prfx + prop + '.');
	                    }
	                    else if (ap !== bp) {
	                        rv[prfx + prop] = b[prop];
	                    }
	                }
	                else if (ap !== bp)
	                    rv[prfx + prop] = b[prop];
	            }
	        });
	        keys(b).forEach(function (prop) {
	            if (!hasOwn(a, prop)) {
	                rv[prfx + prop] = b[prop];
	            }
	        });
	        return rv;
	    }

	    function getEffectiveKeys(primaryKey, req) {
	        if (req.type === 'delete')
	            return req.keys;
	        return req.keys || req.values.map(primaryKey.extractKey);
	    }

	    var hooksMiddleware = {
	        stack: "dbcore",
	        name: "HooksMiddleware",
	        level: 2,
	        create: function (downCore) { return (__assign(__assign({}, downCore), { table: function (tableName) {
	                var downTable = downCore.table(tableName);
	                var primaryKey = downTable.schema.primaryKey;
	                var tableMiddleware = __assign(__assign({}, downTable), { mutate: function (req) {
	                        var dxTrans = PSD.trans;
	                        var _a = dxTrans.table(tableName).hook, deleting = _a.deleting, creating = _a.creating, updating = _a.updating;
	                        switch (req.type) {
	                            case 'add':
	                                if (creating.fire === nop)
	                                    break;
	                                return dxTrans._promise('readwrite', function () { return addPutOrDelete(req); }, true);
	                            case 'put':
	                                if (creating.fire === nop && updating.fire === nop)
	                                    break;
	                                return dxTrans._promise('readwrite', function () { return addPutOrDelete(req); }, true);
	                            case 'delete':
	                                if (deleting.fire === nop)
	                                    break;
	                                return dxTrans._promise('readwrite', function () { return addPutOrDelete(req); }, true);
	                            case 'deleteRange':
	                                if (deleting.fire === nop)
	                                    break;
	                                return dxTrans._promise('readwrite', function () { return deleteRange(req); }, true);
	                        }
	                        return downTable.mutate(req);
	                        function addPutOrDelete(req) {
	                            var dxTrans = PSD.trans;
	                            var keys = req.keys || getEffectiveKeys(primaryKey, req);
	                            if (!keys)
	                                throw new Error("Keys missing");
	                            req = req.type === 'add' || req.type === 'put' ? __assign(__assign({}, req), { keys: keys }) : __assign({}, req);
	                            if (req.type !== 'delete')
	                                req.values = __spreadArray([], req.values, true);
	                            if (req.keys)
	                                req.keys = __spreadArray([], req.keys, true);
	                            return getExistingValues(downTable, req, keys).then(function (existingValues) {
	                                var contexts = keys.map(function (key, i) {
	                                    var existingValue = existingValues[i];
	                                    var ctx = { onerror: null, onsuccess: null };
	                                    if (req.type === 'delete') {
	                                        deleting.fire.call(ctx, key, existingValue, dxTrans);
	                                    }
	                                    else if (req.type === 'add' || existingValue === undefined) {
	                                        var generatedPrimaryKey = creating.fire.call(ctx, key, req.values[i], dxTrans);
	                                        if (key == null && generatedPrimaryKey != null) {
	                                            key = generatedPrimaryKey;
	                                            req.keys[i] = key;
	                                            if (!primaryKey.outbound) {
	                                                setByKeyPath(req.values[i], primaryKey.keyPath, key);
	                                            }
	                                        }
	                                    }
	                                    else {
	                                        var objectDiff = getObjectDiff(existingValue, req.values[i]);
	                                        var additionalChanges_1 = updating.fire.call(ctx, objectDiff, key, existingValue, dxTrans);
	                                        if (additionalChanges_1) {
	                                            var requestedValue_1 = req.values[i];
	                                            Object.keys(additionalChanges_1).forEach(function (keyPath) {
	                                                if (hasOwn(requestedValue_1, keyPath)) {
	                                                    requestedValue_1[keyPath] = additionalChanges_1[keyPath];
	                                                }
	                                                else {
	                                                    setByKeyPath(requestedValue_1, keyPath, additionalChanges_1[keyPath]);
	                                                }
	                                            });
	                                        }
	                                    }
	                                    return ctx;
	                                });
	                                return downTable.mutate(req).then(function (_a) {
	                                    var failures = _a.failures, results = _a.results, numFailures = _a.numFailures, lastResult = _a.lastResult;
	                                    for (var i = 0; i < keys.length; ++i) {
	                                        var primKey = results ? results[i] : keys[i];
	                                        var ctx = contexts[i];
	                                        if (primKey == null) {
	                                            ctx.onerror && ctx.onerror(failures[i]);
	                                        }
	                                        else {
	                                            ctx.onsuccess && ctx.onsuccess(req.type === 'put' && existingValues[i] ?
	                                                req.values[i] :
	                                                primKey
	                                            );
	                                        }
	                                    }
	                                    return { failures: failures, results: results, numFailures: numFailures, lastResult: lastResult };
	                                }).catch(function (error) {
	                                    contexts.forEach(function (ctx) { return ctx.onerror && ctx.onerror(error); });
	                                    return Promise.reject(error);
	                                });
	                            });
	                        }
	                        function deleteRange(req) {
	                            return deleteNextChunk(req.trans, req.range, 10000);
	                        }
	                        function deleteNextChunk(trans, range, limit) {
	                            return downTable.query({ trans: trans, values: false, query: { index: primaryKey, range: range }, limit: limit })
	                                .then(function (_a) {
	                                var result = _a.result;
	                                return addPutOrDelete({ type: 'delete', keys: result, trans: trans }).then(function (res) {
	                                    if (res.numFailures > 0)
	                                        return Promise.reject(res.failures[0]);
	                                    if (result.length < limit) {
	                                        return { failures: [], numFailures: 0, lastResult: undefined };
	                                    }
	                                    else {
	                                        return deleteNextChunk(trans, __assign(__assign({}, range), { lower: result[result.length - 1], lowerOpen: true }), limit);
	                                    }
	                                });
	                            });
	                        }
	                    } });
	                return tableMiddleware;
	            } })); }
	    };
	    function getExistingValues(table, req, effectiveKeys) {
	        return req.type === "add"
	            ? Promise.resolve([])
	            : table.getMany({ trans: req.trans, keys: effectiveKeys, cache: "immutable" });
	    }

	    function getFromTransactionCache(keys, cache, clone) {
	        try {
	            if (!cache)
	                return null;
	            if (cache.keys.length < keys.length)
	                return null;
	            var result = [];
	            for (var i = 0, j = 0; i < cache.keys.length && j < keys.length; ++i) {
	                if (cmp(cache.keys[i], keys[j]) !== 0)
	                    continue;
	                result.push(clone ? deepClone(cache.values[i]) : cache.values[i]);
	                ++j;
	            }
	            return result.length === keys.length ? result : null;
	        }
	        catch (_a) {
	            return null;
	        }
	    }
	    var cacheExistingValuesMiddleware = {
	        stack: "dbcore",
	        level: -1,
	        create: function (core) {
	            return {
	                table: function (tableName) {
	                    var table = core.table(tableName);
	                    return __assign(__assign({}, table), { getMany: function (req) {
	                            if (!req.cache) {
	                                return table.getMany(req);
	                            }
	                            var cachedResult = getFromTransactionCache(req.keys, req.trans["_cache"], req.cache === "clone");
	                            if (cachedResult) {
	                                return DexiePromise.resolve(cachedResult);
	                            }
	                            return table.getMany(req).then(function (res) {
	                                req.trans["_cache"] = {
	                                    keys: req.keys,
	                                    values: req.cache === "clone" ? deepClone(res) : res,
	                                };
	                                return res;
	                            });
	                        }, mutate: function (req) {
	                            if (req.type !== "add")
	                                req.trans["_cache"] = null;
	                            return table.mutate(req);
	                        } });
	                },
	            };
	        },
	    };

	    function isCachableContext(ctx, table) {
	        return (ctx.trans.mode === 'readonly' &&
	            !!ctx.subscr &&
	            !ctx.trans.explicit &&
	            ctx.trans.db._options.cache !== 'disabled' &&
	            !table.schema.primaryKey.outbound);
	    }

	    function isCachableRequest(type, req) {
	        switch (type) {
	            case 'query':
	                return req.values && !req.unique;
	            case 'get':
	                return false;
	            case 'getMany':
	                return false;
	            case 'count':
	                return false;
	            case 'openCursor':
	                return false;
	        }
	    }

	    var observabilityMiddleware = {
	        stack: "dbcore",
	        level: 0,
	        name: "Observability",
	        create: function (core) {
	            var dbName = core.schema.name;
	            var FULL_RANGE = new RangeSet(core.MIN_KEY, core.MAX_KEY);
	            return __assign(__assign({}, core), { transaction: function (stores, mode, options) {
	                    if (PSD.subscr && mode !== 'readonly') {
	                        throw new exceptions.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(PSD.querier));
	                    }
	                    return core.transaction(stores, mode, options);
	                }, table: function (tableName) {
	                    var table = core.table(tableName);
	                    var schema = table.schema;
	                    var primaryKey = schema.primaryKey, indexes = schema.indexes;
	                    var extractKey = primaryKey.extractKey, outbound = primaryKey.outbound;
	                    var indexesWithAutoIncPK = primaryKey.autoIncrement && indexes.filter(function (index) { return index.compound && index.keyPath.includes(primaryKey.keyPath); });
	                    var tableClone = __assign(__assign({}, table), { mutate: function (req) {
	                            var trans = req.trans;
	                            var mutatedParts = req.mutatedParts || (req.mutatedParts = {});
	                            var getRangeSet = function (indexName) {
	                                var part = "idb://".concat(dbName, "/").concat(tableName, "/").concat(indexName);
	                                return (mutatedParts[part] ||
	                                    (mutatedParts[part] = new RangeSet()));
	                            };
	                            var pkRangeSet = getRangeSet("");
	                            var delsRangeSet = getRangeSet(":dels");
	                            var type = req.type;
	                            var _a = req.type === "deleteRange"
	                                ? [req.range]
	                                : req.type === "delete"
	                                    ? [req.keys]
	                                    : req.values.length < 50
	                                        ? [getEffectiveKeys(primaryKey, req).filter(function (id) { return id; }), req.values]
	                                        : [], keys = _a[0], newObjs = _a[1];
	                            var oldCache = req.trans["_cache"];
	                            if (isArray(keys)) {
	                                pkRangeSet.addKeys(keys);
	                                var oldObjs = type === 'delete' || keys.length === newObjs.length ? getFromTransactionCache(keys, oldCache) : null;
	                                if (!oldObjs) {
	                                    delsRangeSet.addKeys(keys);
	                                }
	                                if (oldObjs || newObjs) {
	                                    trackAffectedIndexes(getRangeSet, schema, oldObjs, newObjs);
	                                }
	                            }
	                            else if (keys) {
	                                var range = { from: keys.lower, to: keys.upper };
	                                delsRangeSet.add(range);
	                                pkRangeSet.add(range);
	                            }
	                            else {
	                                pkRangeSet.add(FULL_RANGE);
	                                delsRangeSet.add(FULL_RANGE);
	                                schema.indexes.forEach(function (idx) { return getRangeSet(idx.name).add(FULL_RANGE); });
	                            }
	                            return table.mutate(req).then(function (res) {
	                                if (keys && (req.type === 'add' || req.type === 'put')) {
	                                    pkRangeSet.addKeys(res.results);
	                                    if (indexesWithAutoIncPK) {
	                                        indexesWithAutoIncPK.forEach(function (idx) {
	                                            var idxVals = req.values.map(function (v) { return idx.extractKey(v); });
	                                            var pkPos = idx.keyPath.findIndex(function (prop) { return prop === primaryKey.keyPath; });
	                                            res.results.forEach(function (pk) { return idxVals[pkPos] = pk; });
	                                            getRangeSet(idx.name).addKeys(idxVals);
	                                        });
	                                    }
	                                }
	                                trans.mutatedParts = extendObservabilitySet(trans.mutatedParts || {}, mutatedParts);
	                                return res;
	                            });
	                        } });
	                    var getRange = function (_a) {
	                        var _b, _c;
	                        var _d = _a.query, index = _d.index, range = _d.range;
	                        return [
	                            index,
	                            new RangeSet((_b = range.lower) !== null && _b !== void 0 ? _b : core.MIN_KEY, (_c = range.upper) !== null && _c !== void 0 ? _c : core.MAX_KEY),
	                        ];
	                    };
	                    var readSubscribers = {
	                        get: function (req) { return [primaryKey, new RangeSet(req.key)]; },
	                        getMany: function (req) { return [primaryKey, new RangeSet().addKeys(req.keys)]; },
	                        count: getRange,
	                        query: getRange,
	                        openCursor: getRange,
	                    };
	                    keys(readSubscribers).forEach(function (method) {
	                        tableClone[method] = function (req) {
	                            var subscr = PSD.subscr;
	                            var isLiveQuery = !!subscr;
	                            var cachable = isCachableContext(PSD, table) && isCachableRequest(method, req);
	                            var obsSet = cachable
	                                ? req.obsSet = {}
	                                : subscr;
	                            if (isLiveQuery) {
	                                var getRangeSet = function (indexName) {
	                                    var part = "idb://".concat(dbName, "/").concat(tableName, "/").concat(indexName);
	                                    return (obsSet[part] ||
	                                        (obsSet[part] = new RangeSet()));
	                                };
	                                var pkRangeSet_1 = getRangeSet("");
	                                var delsRangeSet_1 = getRangeSet(":dels");
	                                var _a = readSubscribers[method](req), queriedIndex = _a[0], queriedRanges = _a[1];
	                                if (method === 'query' && queriedIndex.isPrimaryKey && !req.values) {
	                                    delsRangeSet_1.add(queriedRanges);
	                                }
	                                else {
	                                    getRangeSet(queriedIndex.name || "").add(queriedRanges);
	                                }
	                                if (!queriedIndex.isPrimaryKey) {
	                                    if (method === "count") {
	                                        delsRangeSet_1.add(FULL_RANGE);
	                                    }
	                                    else {
	                                        var keysPromise_1 = method === "query" &&
	                                            outbound &&
	                                            req.values &&
	                                            table.query(__assign(__assign({}, req), { values: false }));
	                                        return table[method].apply(this, arguments).then(function (res) {
	                                            if (method === "query") {
	                                                if (outbound && req.values) {
	                                                    return keysPromise_1.then(function (_a) {
	                                                        var resultingKeys = _a.result;
	                                                        pkRangeSet_1.addKeys(resultingKeys);
	                                                        return res;
	                                                    });
	                                                }
	                                                var pKeys = req.values
	                                                    ? res.result.map(extractKey)
	                                                    : res.result;
	                                                if (req.values) {
	                                                    pkRangeSet_1.addKeys(pKeys);
	                                                }
	                                                else {
	                                                    delsRangeSet_1.addKeys(pKeys);
	                                                }
	                                            }
	                                            else if (method === "openCursor") {
	                                                var cursor_1 = res;
	                                                var wantValues_1 = req.values;
	                                                return (cursor_1 &&
	                                                    Object.create(cursor_1, {
	                                                        key: {
	                                                            get: function () {
	                                                                delsRangeSet_1.addKey(cursor_1.primaryKey);
	                                                                return cursor_1.key;
	                                                            },
	                                                        },
	                                                        primaryKey: {
	                                                            get: function () {
	                                                                var pkey = cursor_1.primaryKey;
	                                                                delsRangeSet_1.addKey(pkey);
	                                                                return pkey;
	                                                            },
	                                                        },
	                                                        value: {
	                                                            get: function () {
	                                                                wantValues_1 && pkRangeSet_1.addKey(cursor_1.primaryKey);
	                                                                return cursor_1.value;
	                                                            },
	                                                        },
	                                                    }));
	                                            }
	                                            return res;
	                                        });
	                                    }
	                                }
	                            }
	                            return table[method].apply(this, arguments);
	                        };
	                    });
	                    return tableClone;
	                } });
	        },
	    };
	    function trackAffectedIndexes(getRangeSet, schema, oldObjs, newObjs) {
	        function addAffectedIndex(ix) {
	            var rangeSet = getRangeSet(ix.name || "");
	            function extractKey(obj) {
	                return obj != null ? ix.extractKey(obj) : null;
	            }
	            var addKeyOrKeys = function (key) { return ix.multiEntry && isArray(key)
	                ? key.forEach(function (key) { return rangeSet.addKey(key); })
	                : rangeSet.addKey(key); };
	            (oldObjs || newObjs).forEach(function (_, i) {
	                var oldKey = oldObjs && extractKey(oldObjs[i]);
	                var newKey = newObjs && extractKey(newObjs[i]);
	                if (cmp(oldKey, newKey) !== 0) {
	                    if (oldKey != null)
	                        addKeyOrKeys(oldKey);
	                    if (newKey != null)
	                        addKeyOrKeys(newKey);
	                }
	            });
	        }
	        schema.indexes.forEach(addAffectedIndex);
	    }

	    function adjustOptimisticFromFailures(tblCache, req, res) {
	        if (res.numFailures === 0)
	            return req;
	        if (req.type === 'deleteRange') {
	            return null;
	        }
	        var numBulkOps = req.keys
	            ? req.keys.length
	            : 'values' in req && req.values
	                ? req.values.length
	                : 1;
	        if (res.numFailures === numBulkOps) {
	            return null;
	        }
	        var clone = __assign({}, req);
	        if (isArray(clone.keys)) {
	            clone.keys = clone.keys.filter(function (_, i) { return !(i in res.failures); });
	        }
	        if ('values' in clone && isArray(clone.values)) {
	            clone.values = clone.values.filter(function (_, i) { return !(i in res.failures); });
	        }
	        return clone;
	    }

	    function isAboveLower(key, range) {
	        return range.lower === undefined
	            ? true
	            : range.lowerOpen
	                ? cmp(key, range.lower) > 0
	                : cmp(key, range.lower) >= 0;
	    }
	    function isBelowUpper(key, range) {
	        return range.upper === undefined
	            ? true
	            : range.upperOpen
	                ? cmp(key, range.upper) < 0
	                : cmp(key, range.upper) <= 0;
	    }
	    function isWithinRange(key, range) {
	        return isAboveLower(key, range) && isBelowUpper(key, range);
	    }

	    function applyOptimisticOps(result, req, ops, table, cacheEntry, immutable) {
	        if (!ops || ops.length === 0)
	            return result;
	        var index = req.query.index;
	        var multiEntry = index.multiEntry;
	        var queryRange = req.query.range;
	        var primaryKey = table.schema.primaryKey;
	        var extractPrimKey = primaryKey.extractKey;
	        var extractIndex = index.extractKey;
	        var extractLowLevelIndex = (index.lowLevelIndex || index).extractKey;
	        var finalResult = ops.reduce(function (result, op) {
	            var modifedResult = result;
	            var includedValues = [];
	            if (op.type === 'add' || op.type === 'put') {
	                var includedPKs = new RangeSet();
	                for (var i = op.values.length - 1; i >= 0; --i) {
	                    var value = op.values[i];
	                    var pk = extractPrimKey(value);
	                    if (includedPKs.hasKey(pk))
	                        continue;
	                    var key = extractIndex(value);
	                    if (multiEntry && isArray(key)
	                        ? key.some(function (k) { return isWithinRange(k, queryRange); })
	                        : isWithinRange(key, queryRange)) {
	                        includedPKs.addKey(pk);
	                        includedValues.push(value);
	                    }
	                }
	            }
	            switch (op.type) {
	                case 'add':
	                    modifedResult = result.concat(req.values
	                        ? includedValues
	                        : includedValues.map(function (v) { return extractPrimKey(v); }));
	                    break;
	                case 'put':
	                    var keySet_1 = new RangeSet().addKeys(op.values.map(function (v) { return extractPrimKey(v); }));
	                    modifedResult = result
	                        .filter(
	                    function (item) { return !keySet_1.hasKey(req.values ? extractPrimKey(item) : item); })
	                        .concat(
	                    req.values
	                        ? includedValues
	                        : includedValues.map(function (v) { return extractPrimKey(v); }));
	                    break;
	                case 'delete':
	                    var keysToDelete_1 = new RangeSet().addKeys(op.keys);
	                    modifedResult = result.filter(function (item) { return !keysToDelete_1.hasKey(req.values ? extractPrimKey(item) : item); });
	                    break;
	                case 'deleteRange':
	                    var range_1 = op.range;
	                    modifedResult = result.filter(function (item) { return !isWithinRange(extractPrimKey(item), range_1); });
	                    break;
	            }
	            return modifedResult;
	        }, result);
	        if (finalResult === result)
	            return result;
	        finalResult.sort(function (a, b) {
	            return cmp(extractLowLevelIndex(a), extractLowLevelIndex(b)) ||
	                cmp(extractPrimKey(a), extractPrimKey(b));
	        });
	        if (req.limit && req.limit < Infinity) {
	            if (finalResult.length > req.limit) {
	                finalResult.length = req.limit;
	            }
	            else if (result.length === req.limit && finalResult.length < req.limit) {
	                cacheEntry.dirty = true;
	            }
	        }
	        return immutable ? Object.freeze(finalResult) : finalResult;
	    }

	    function areRangesEqual(r1, r2) {
	        return (cmp(r1.lower, r2.lower) === 0 &&
	            cmp(r1.upper, r2.upper) === 0 &&
	            !!r1.lowerOpen === !!r2.lowerOpen &&
	            !!r1.upperOpen === !!r2.upperOpen);
	    }

	    function compareLowers(lower1, lower2, lowerOpen1, lowerOpen2) {
	        if (lower1 === undefined)
	            return lower2 !== undefined ? -1 : 0;
	        if (lower2 === undefined)
	            return 1;
	        var c = cmp(lower1, lower2);
	        if (c === 0) {
	            if (lowerOpen1 && lowerOpen2)
	                return 0;
	            if (lowerOpen1)
	                return 1;
	            if (lowerOpen2)
	                return -1;
	        }
	        return c;
	    }
	    function compareUppers(upper1, upper2, upperOpen1, upperOpen2) {
	        if (upper1 === undefined)
	            return upper2 !== undefined ? 1 : 0;
	        if (upper2 === undefined)
	            return -1;
	        var c = cmp(upper1, upper2);
	        if (c === 0) {
	            if (upperOpen1 && upperOpen2)
	                return 0;
	            if (upperOpen1)
	                return -1;
	            if (upperOpen2)
	                return 1;
	        }
	        return c;
	    }
	    function isSuperRange(r1, r2) {
	        return (compareLowers(r1.lower, r2.lower, r1.lowerOpen, r2.lowerOpen) <= 0 &&
	            compareUppers(r1.upper, r2.upper, r1.upperOpen, r2.upperOpen) >= 0);
	    }

	    function findCompatibleQuery(dbName, tableName, type, req) {
	        var tblCache = cache["idb://".concat(dbName, "/").concat(tableName)];
	        if (!tblCache)
	            return [];
	        var queries = tblCache.queries[type];
	        if (!queries)
	            return [null, false, tblCache, null];
	        var indexName = req.query ? req.query.index.name : null;
	        var entries = queries[indexName || ''];
	        if (!entries)
	            return [null, false, tblCache, null];
	        switch (type) {
	            case 'query':
	                var equalEntry = entries.find(function (entry) {
	                    return entry.req.limit === req.limit &&
	                        entry.req.values === req.values &&
	                        areRangesEqual(entry.req.query.range, req.query.range);
	                });
	                if (equalEntry)
	                    return [
	                        equalEntry,
	                        true,
	                        tblCache,
	                        entries,
	                    ];
	                var superEntry = entries.find(function (entry) {
	                    var limit = 'limit' in entry.req ? entry.req.limit : Infinity;
	                    return (limit >= req.limit &&
	                        (req.values ? entry.req.values : true) &&
	                        isSuperRange(entry.req.query.range, req.query.range));
	                });
	                return [superEntry, false, tblCache, entries];
	            case 'count':
	                var countQuery = entries.find(function (entry) {
	                    return areRangesEqual(entry.req.query.range, req.query.range);
	                });
	                return [countQuery, !!countQuery, tblCache, entries];
	        }
	    }

	    function subscribeToCacheEntry(cacheEntry, container, requery, signal) {
	        cacheEntry.subscribers.add(requery);
	        signal.addEventListener("abort", function () {
	            cacheEntry.subscribers.delete(requery);
	            if (cacheEntry.subscribers.size === 0) {
	                enqueForDeletion(cacheEntry, container);
	            }
	        });
	    }
	    function enqueForDeletion(cacheEntry, container) {
	        setTimeout(function () {
	            if (cacheEntry.subscribers.size === 0) {
	                delArrayItem(container, cacheEntry);
	            }
	        }, 3000);
	    }

	    var cacheMiddleware = {
	        stack: 'dbcore',
	        level: 0,
	        name: 'Cache',
	        create: function (core) {
	            var dbName = core.schema.name;
	            var coreMW = __assign(__assign({}, core), { transaction: function (stores, mode, options) {
	                    var idbtrans = core.transaction(stores, mode, options);
	                    if (mode === 'readwrite') {
	                        var ac_1 = new AbortController();
	                        var signal = ac_1.signal;
	                        var endTransaction = function (wasCommitted) { return function () {
	                            ac_1.abort();
	                            if (mode === 'readwrite') {
	                                var affectedSubscribers_1 = new Set();
	                                for (var _i = 0, stores_1 = stores; _i < stores_1.length; _i++) {
	                                    var storeName = stores_1[_i];
	                                    var tblCache = cache["idb://".concat(dbName, "/").concat(storeName)];
	                                    if (tblCache) {
	                                        var table = core.table(storeName);
	                                        var ops = tblCache.optimisticOps.filter(function (op) { return op.trans === idbtrans; });
	                                        if (idbtrans._explicit && wasCommitted && idbtrans.mutatedParts) {
	                                            for (var _a = 0, _b = Object.values(tblCache.queries.query); _a < _b.length; _a++) {
	                                                var entries = _b[_a];
	                                                for (var _c = 0, _d = entries.slice(); _c < _d.length; _c++) {
	                                                    var entry = _d[_c];
	                                                    if (obsSetsOverlap(entry.obsSet, idbtrans.mutatedParts)) {
	                                                        delArrayItem(entries, entry);
	                                                        entry.subscribers.forEach(function (requery) { return affectedSubscribers_1.add(requery); });
	                                                    }
	                                                }
	                                            }
	                                        }
	                                        else if (ops.length > 0) {
	                                            tblCache.optimisticOps = tblCache.optimisticOps.filter(function (op) { return op.trans !== idbtrans; });
	                                            for (var _e = 0, _f = Object.values(tblCache.queries.query); _e < _f.length; _e++) {
	                                                var entries = _f[_e];
	                                                for (var _g = 0, _h = entries.slice(); _g < _h.length; _g++) {
	                                                    var entry = _h[_g];
	                                                    if (entry.res != null &&
	                                                        idbtrans.mutatedParts
	    ) {
	                                                        if (wasCommitted && !entry.dirty) {
	                                                            var freezeResults = Object.isFrozen(entry.res);
	                                                            var modRes = applyOptimisticOps(entry.res, entry.req, ops, table, entry, freezeResults);
	                                                            if (entry.dirty) {
	                                                                delArrayItem(entries, entry);
	                                                                entry.subscribers.forEach(function (requery) { return affectedSubscribers_1.add(requery); });
	                                                            }
	                                                            else if (modRes !== entry.res) {
	                                                                entry.res = modRes;
	                                                                entry.promise = DexiePromise.resolve({ result: modRes });
	                                                            }
	                                                        }
	                                                        else {
	                                                            if (entry.dirty) {
	                                                                delArrayItem(entries, entry);
	                                                            }
	                                                            entry.subscribers.forEach(function (requery) { return affectedSubscribers_1.add(requery); });
	                                                        }
	                                                    }
	                                                }
	                                            }
	                                        }
	                                    }
	                                }
	                                affectedSubscribers_1.forEach(function (requery) { return requery(); });
	                            }
	                        }; };
	                        idbtrans.addEventListener('abort', endTransaction(false), {
	                            signal: signal,
	                        });
	                        idbtrans.addEventListener('error', endTransaction(false), {
	                            signal: signal,
	                        });
	                        idbtrans.addEventListener('complete', endTransaction(true), {
	                            signal: signal,
	                        });
	                    }
	                    return idbtrans;
	                }, table: function (tableName) {
	                    var downTable = core.table(tableName);
	                    var primKey = downTable.schema.primaryKey;
	                    var tableMW = __assign(__assign({}, downTable), { mutate: function (req) {
	                            var trans = PSD.trans;
	                            if (primKey.outbound ||
	                                trans.db._options.cache === 'disabled' ||
	                                trans.explicit
	                            ) {
	                                return downTable.mutate(req);
	                            }
	                            var tblCache = cache["idb://".concat(dbName, "/").concat(tableName)];
	                            if (!tblCache)
	                                return downTable.mutate(req);
	                            var promise = downTable.mutate(req);
	                            if ((req.type === 'add' || req.type === 'put') && (req.values.length >= 50 || getEffectiveKeys(primKey, req).some(function (key) { return key == null; }))) {
	                                promise.then(function (res) {
	                                    var reqWithResolvedKeys = __assign(__assign({}, req), { values: req.values.map(function (value, i) {
	                                            var _a;
	                                            var valueWithKey = ((_a = primKey.keyPath) === null || _a === void 0 ? void 0 : _a.includes('.'))
	                                                ? deepClone(value)
	                                                : __assign({}, value);
	                                            setByKeyPath(valueWithKey, primKey.keyPath, res.results[i]);
	                                            return valueWithKey;
	                                        }) });
	                                    var adjustedReq = adjustOptimisticFromFailures(tblCache, reqWithResolvedKeys, res);
	                                    tblCache.optimisticOps.push(adjustedReq);
	                                    queueMicrotask(function () { return req.mutatedParts && signalSubscribersLazily(req.mutatedParts); });
	                                });
	                            }
	                            else {
	                                tblCache.optimisticOps.push(req);
	                                req.mutatedParts && signalSubscribersLazily(req.mutatedParts);
	                                promise.then(function (res) {
	                                    if (res.numFailures > 0) {
	                                        delArrayItem(tblCache.optimisticOps, req);
	                                        var adjustedReq = adjustOptimisticFromFailures(tblCache, req, res);
	                                        if (adjustedReq) {
	                                            tblCache.optimisticOps.push(adjustedReq);
	                                        }
	                                        req.mutatedParts && signalSubscribersLazily(req.mutatedParts);
	                                    }
	                                });
	                                promise.catch(function () {
	                                    delArrayItem(tblCache.optimisticOps, req);
	                                    req.mutatedParts && signalSubscribersLazily(req.mutatedParts);
	                                });
	                            }
	                            return promise;
	                        }, query: function (req) {
	                            var _a;
	                            if (!isCachableContext(PSD, downTable) || !isCachableRequest("query", req))
	                                return downTable.query(req);
	                            var freezeResults = ((_a = PSD.trans) === null || _a === void 0 ? void 0 : _a.db._options.cache) === 'immutable';
	                            var _b = PSD, requery = _b.requery, signal = _b.signal;
	                            var _c = findCompatibleQuery(dbName, tableName, 'query', req), cacheEntry = _c[0], exactMatch = _c[1], tblCache = _c[2], container = _c[3];
	                            if (cacheEntry && exactMatch) {
	                                cacheEntry.obsSet = req.obsSet;
	                            }
	                            else {
	                                var promise = downTable.query(req).then(function (res) {
	                                    var result = res.result;
	                                    if (cacheEntry)
	                                        cacheEntry.res = result;
	                                    if (freezeResults) {
	                                        for (var i = 0, l = result.length; i < l; ++i) {
	                                            Object.freeze(result[i]);
	                                        }
	                                        Object.freeze(result);
	                                    }
	                                    else {
	                                        res.result = deepClone(result);
	                                    }
	                                    return res;
	                                }).catch(function (error) {
	                                    if (container && cacheEntry)
	                                        delArrayItem(container, cacheEntry);
	                                    return Promise.reject(error);
	                                });
	                                cacheEntry = {
	                                    obsSet: req.obsSet,
	                                    promise: promise,
	                                    subscribers: new Set(),
	                                    type: 'query',
	                                    req: req,
	                                    dirty: false,
	                                };
	                                if (container) {
	                                    container.push(cacheEntry);
	                                }
	                                else {
	                                    container = [cacheEntry];
	                                    if (!tblCache) {
	                                        tblCache = cache["idb://".concat(dbName, "/").concat(tableName)] = {
	                                            queries: {
	                                                query: {},
	                                                count: {},
	                                            },
	                                            objs: new Map(),
	                                            optimisticOps: [],
	                                            unsignaledParts: {}
	                                        };
	                                    }
	                                    tblCache.queries.query[req.query.index.name || ''] = container;
	                                }
	                            }
	                            subscribeToCacheEntry(cacheEntry, container, requery, signal);
	                            return cacheEntry.promise.then(function (res) {
	                                return {
	                                    result: applyOptimisticOps(res.result, req, tblCache === null || tblCache === void 0 ? void 0 : tblCache.optimisticOps, downTable, cacheEntry, freezeResults),
	                                };
	                            });
	                        } });
	                    return tableMW;
	                } });
	            return coreMW;
	        },
	    };

	    function vipify(target, vipDb) {
	        return new Proxy(target, {
	            get: function (target, prop, receiver) {
	                if (prop === 'db')
	                    return vipDb;
	                return Reflect.get(target, prop, receiver);
	            }
	        });
	    }

	    var Dexie$1 =  (function () {
	        function Dexie(name, options) {
	            var _this = this;
	            this._middlewares = {};
	            this.verno = 0;
	            var deps = Dexie.dependencies;
	            this._options = options = __assign({
	                addons: Dexie.addons, autoOpen: true,
	                indexedDB: deps.indexedDB, IDBKeyRange: deps.IDBKeyRange, cache: 'cloned' }, options);
	            this._deps = {
	                indexedDB: options.indexedDB,
	                IDBKeyRange: options.IDBKeyRange
	            };
	            var addons = options.addons;
	            this._dbSchema = {};
	            this._versions = [];
	            this._storeNames = [];
	            this._allTables = {};
	            this.idbdb = null;
	            this._novip = this;
	            var state = {
	                dbOpenError: null,
	                isBeingOpened: false,
	                onReadyBeingFired: null,
	                openComplete: false,
	                dbReadyResolve: nop,
	                dbReadyPromise: null,
	                cancelOpen: nop,
	                openCanceller: null,
	                autoSchema: true,
	                PR1398_maxLoop: 3,
	                autoOpen: options.autoOpen,
	            };
	            state.dbReadyPromise = new DexiePromise(function (resolve) {
	                state.dbReadyResolve = resolve;
	            });
	            state.openCanceller = new DexiePromise(function (_, reject) {
	                state.cancelOpen = reject;
	            });
	            this._state = state;
	            this.name = name;
	            this.on = Events(this, "populate", "blocked", "versionchange", "close", { ready: [promisableChain, nop] });
	            this.on.ready.subscribe = override(this.on.ready.subscribe, function (subscribe) {
	                return function (subscriber, bSticky) {
	                    Dexie.vip(function () {
	                        var state = _this._state;
	                        if (state.openComplete) {
	                            if (!state.dbOpenError)
	                                DexiePromise.resolve().then(subscriber);
	                            if (bSticky)
	                                subscribe(subscriber);
	                        }
	                        else if (state.onReadyBeingFired) {
	                            state.onReadyBeingFired.push(subscriber);
	                            if (bSticky)
	                                subscribe(subscriber);
	                        }
	                        else {
	                            subscribe(subscriber);
	                            var db_1 = _this;
	                            if (!bSticky)
	                                subscribe(function unsubscribe() {
	                                    db_1.on.ready.unsubscribe(subscriber);
	                                    db_1.on.ready.unsubscribe(unsubscribe);
	                                });
	                        }
	                    });
	                };
	            });
	            this.Collection = createCollectionConstructor(this);
	            this.Table = createTableConstructor(this);
	            this.Transaction = createTransactionConstructor(this);
	            this.Version = createVersionConstructor(this);
	            this.WhereClause = createWhereClauseConstructor(this);
	            this.on("versionchange", function (ev) {
	                if (ev.newVersion > 0)
	                    console.warn("Another connection wants to upgrade database '".concat(_this.name, "'. Closing db now to resume the upgrade."));
	                else
	                    console.warn("Another connection wants to delete database '".concat(_this.name, "'. Closing db now to resume the delete request."));
	                _this.close({ disableAutoOpen: false });
	            });
	            this.on("blocked", function (ev) {
	                if (!ev.newVersion || ev.newVersion < ev.oldVersion)
	                    console.warn("Dexie.delete('".concat(_this.name, "') was blocked"));
	                else
	                    console.warn("Upgrade '".concat(_this.name, "' blocked by other connection holding version ").concat(ev.oldVersion / 10));
	            });
	            this._maxKey = getMaxKey(options.IDBKeyRange);
	            this._createTransaction = function (mode, storeNames, dbschema, parentTransaction) { return new _this.Transaction(mode, storeNames, dbschema, _this._options.chromeTransactionDurability, parentTransaction); };
	            this._fireOnBlocked = function (ev) {
	                _this.on("blocked").fire(ev);
	                connections
	                    .filter(function (c) { return c.name === _this.name && c !== _this && !c._state.vcFired; })
	                    .map(function (c) { return c.on("versionchange").fire(ev); });
	            };
	            this.use(cacheExistingValuesMiddleware);
	            this.use(cacheMiddleware);
	            this.use(observabilityMiddleware);
	            this.use(virtualIndexMiddleware);
	            this.use(hooksMiddleware);
	            var vipDB = new Proxy(this, {
	                get: function (_, prop, receiver) {
	                    if (prop === '_vip')
	                        return true;
	                    if (prop === 'table')
	                        return function (tableName) { return vipify(_this.table(tableName), vipDB); };
	                    var rv = Reflect.get(_, prop, receiver);
	                    if (rv instanceof Table)
	                        return vipify(rv, vipDB);
	                    if (prop === 'tables')
	                        return rv.map(function (t) { return vipify(t, vipDB); });
	                    if (prop === '_createTransaction')
	                        return function () {
	                            var tx = rv.apply(this, arguments);
	                            return vipify(tx, vipDB);
	                        };
	                    return rv;
	                }
	            });
	            this.vip = vipDB;
	            addons.forEach(function (addon) { return addon(_this); });
	        }
	        Dexie.prototype.version = function (versionNumber) {
	            if (isNaN(versionNumber) || versionNumber < 0.1)
	                throw new exceptions.Type("Given version is not a positive number");
	            versionNumber = Math.round(versionNumber * 10) / 10;
	            if (this.idbdb || this._state.isBeingOpened)
	                throw new exceptions.Schema("Cannot add version when database is open");
	            this.verno = Math.max(this.verno, versionNumber);
	            var versions = this._versions;
	            var versionInstance = versions.filter(function (v) { return v._cfg.version === versionNumber; })[0];
	            if (versionInstance)
	                return versionInstance;
	            versionInstance = new this.Version(versionNumber);
	            versions.push(versionInstance);
	            versions.sort(lowerVersionFirst);
	            versionInstance.stores({});
	            this._state.autoSchema = false;
	            return versionInstance;
	        };
	        Dexie.prototype._whenReady = function (fn) {
	            var _this = this;
	            return (this.idbdb && (this._state.openComplete || PSD.letThrough || this._vip)) ? fn() : new DexiePromise(function (resolve, reject) {
	                if (_this._state.openComplete) {
	                    return reject(new exceptions.DatabaseClosed(_this._state.dbOpenError));
	                }
	                if (!_this._state.isBeingOpened) {
	                    if (!_this._state.autoOpen) {
	                        reject(new exceptions.DatabaseClosed());
	                        return;
	                    }
	                    _this.open().catch(nop);
	                }
	                _this._state.dbReadyPromise.then(resolve, reject);
	            }).then(fn);
	        };
	        Dexie.prototype.use = function (_a) {
	            var stack = _a.stack, create = _a.create, level = _a.level, name = _a.name;
	            if (name)
	                this.unuse({ stack: stack, name: name });
	            var middlewares = this._middlewares[stack] || (this._middlewares[stack] = []);
	            middlewares.push({ stack: stack, create: create, level: level == null ? 10 : level, name: name });
	            middlewares.sort(function (a, b) { return a.level - b.level; });
	            return this;
	        };
	        Dexie.prototype.unuse = function (_a) {
	            var stack = _a.stack, name = _a.name, create = _a.create;
	            if (stack && this._middlewares[stack]) {
	                this._middlewares[stack] = this._middlewares[stack].filter(function (mw) {
	                    return create ? mw.create !== create :
	                        name ? mw.name !== name :
	                            false;
	                });
	            }
	            return this;
	        };
	        Dexie.prototype.open = function () {
	            var _this = this;
	            return usePSD(globalPSD,
	            function () { return dexieOpen(_this); });
	        };
	        Dexie.prototype._close = function () {
	            var state = this._state;
	            var idx = connections.indexOf(this);
	            if (idx >= 0)
	                connections.splice(idx, 1);
	            if (this.idbdb) {
	                try {
	                    this.idbdb.close();
	                }
	                catch (e) { }
	                this.idbdb = null;
	            }
	            if (!state.isBeingOpened) {
	                state.dbReadyPromise = new DexiePromise(function (resolve) {
	                    state.dbReadyResolve = resolve;
	                });
	                state.openCanceller = new DexiePromise(function (_, reject) {
	                    state.cancelOpen = reject;
	                });
	            }
	        };
	        Dexie.prototype.close = function (_a) {
	            var _b = _a === void 0 ? { disableAutoOpen: true } : _a, disableAutoOpen = _b.disableAutoOpen;
	            var state = this._state;
	            if (disableAutoOpen) {
	                if (state.isBeingOpened) {
	                    state.cancelOpen(new exceptions.DatabaseClosed());
	                }
	                this._close();
	                state.autoOpen = false;
	                state.dbOpenError = new exceptions.DatabaseClosed();
	            }
	            else {
	                this._close();
	                state.autoOpen = this._options.autoOpen ||
	                    state.isBeingOpened;
	                state.openComplete = false;
	                state.dbOpenError = null;
	            }
	        };
	        Dexie.prototype.delete = function (closeOptions) {
	            var _this = this;
	            if (closeOptions === void 0) { closeOptions = { disableAutoOpen: true }; }
	            var hasInvalidArguments = arguments.length > 0 && typeof arguments[0] !== 'object';
	            var state = this._state;
	            return new DexiePromise(function (resolve, reject) {
	                var doDelete = function () {
	                    _this.close(closeOptions);
	                    var req = _this._deps.indexedDB.deleteDatabase(_this.name);
	                    req.onsuccess = wrap(function () {
	                        _onDatabaseDeleted(_this._deps, _this.name);
	                        resolve();
	                    });
	                    req.onerror = eventRejectHandler(reject);
	                    req.onblocked = _this._fireOnBlocked;
	                };
	                if (hasInvalidArguments)
	                    throw new exceptions.InvalidArgument("Invalid closeOptions argument to db.delete()");
	                if (state.isBeingOpened) {
	                    state.dbReadyPromise.then(doDelete);
	                }
	                else {
	                    doDelete();
	                }
	            });
	        };
	        Dexie.prototype.backendDB = function () {
	            return this.idbdb;
	        };
	        Dexie.prototype.isOpen = function () {
	            return this.idbdb !== null;
	        };
	        Dexie.prototype.hasBeenClosed = function () {
	            var dbOpenError = this._state.dbOpenError;
	            return dbOpenError && (dbOpenError.name === 'DatabaseClosed');
	        };
	        Dexie.prototype.hasFailed = function () {
	            return this._state.dbOpenError !== null;
	        };
	        Dexie.prototype.dynamicallyOpened = function () {
	            return this._state.autoSchema;
	        };
	        Object.defineProperty(Dexie.prototype, "tables", {
	            get: function () {
	                var _this = this;
	                return keys(this._allTables).map(function (name) { return _this._allTables[name]; });
	            },
	            enumerable: false,
	            configurable: true
	        });
	        Dexie.prototype.transaction = function () {
	            var args = extractTransactionArgs.apply(this, arguments);
	            return this._transaction.apply(this, args);
	        };
	        Dexie.prototype._transaction = function (mode, tables, scopeFunc) {
	            var _this = this;
	            var parentTransaction = PSD.trans;
	            if (!parentTransaction || parentTransaction.db !== this || mode.indexOf('!') !== -1)
	                parentTransaction = null;
	            var onlyIfCompatible = mode.indexOf('?') !== -1;
	            mode = mode.replace('!', '').replace('?', '');
	            var idbMode, storeNames;
	            try {
	                storeNames = tables.map(function (table) {
	                    var storeName = table instanceof _this.Table ? table.name : table;
	                    if (typeof storeName !== 'string')
	                        throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
	                    return storeName;
	                });
	                if (mode == "r" || mode === READONLY)
	                    idbMode = READONLY;
	                else if (mode == "rw" || mode == READWRITE)
	                    idbMode = READWRITE;
	                else
	                    throw new exceptions.InvalidArgument("Invalid transaction mode: " + mode);
	                if (parentTransaction) {
	                    if (parentTransaction.mode === READONLY && idbMode === READWRITE) {
	                        if (onlyIfCompatible) {
	                            parentTransaction = null;
	                        }
	                        else
	                            throw new exceptions.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
	                    }
	                    if (parentTransaction) {
	                        storeNames.forEach(function (storeName) {
	                            if (parentTransaction && parentTransaction.storeNames.indexOf(storeName) === -1) {
	                                if (onlyIfCompatible) {
	                                    parentTransaction = null;
	                                }
	                                else
	                                    throw new exceptions.SubTransaction("Table " + storeName +
	                                        " not included in parent transaction.");
	                            }
	                        });
	                    }
	                    if (onlyIfCompatible && parentTransaction && !parentTransaction.active) {
	                        parentTransaction = null;
	                    }
	                }
	            }
	            catch (e) {
	                return parentTransaction ?
	                    parentTransaction._promise(null, function (_, reject) { reject(e); }) :
	                    rejection(e);
	            }
	            var enterTransaction = enterTransactionScope.bind(null, this, idbMode, storeNames, parentTransaction, scopeFunc);
	            return (parentTransaction ?
	                parentTransaction._promise(idbMode, enterTransaction, "lock") :
	                PSD.trans ?
	                    usePSD(PSD.transless, function () { return _this._whenReady(enterTransaction); }) :
	                    this._whenReady(enterTransaction));
	        };
	        Dexie.prototype.table = function (tableName) {
	            if (!hasOwn(this._allTables, tableName)) {
	                throw new exceptions.InvalidTable("Table ".concat(tableName, " does not exist"));
	            }
	            return this._allTables[tableName];
	        };
	        return Dexie;
	    }());

	    var symbolObservable = typeof Symbol !== "undefined" && "observable" in Symbol
	        ? Symbol.observable
	        : "@@observable";
	    var Observable =  (function () {
	        function Observable(subscribe) {
	            this._subscribe = subscribe;
	        }
	        Observable.prototype.subscribe = function (x, error, complete) {
	            return this._subscribe(!x || typeof x === "function" ? { next: x, error: error, complete: complete } : x);
	        };
	        Observable.prototype[symbolObservable] = function () {
	            return this;
	        };
	        return Observable;
	    }());

	    var domDeps;
	    try {
	        domDeps = {
	            indexedDB: _global.indexedDB || _global.mozIndexedDB || _global.webkitIndexedDB || _global.msIndexedDB,
	            IDBKeyRange: _global.IDBKeyRange || _global.webkitIDBKeyRange
	        };
	    }
	    catch (e) {
	        domDeps = { indexedDB: null, IDBKeyRange: null };
	    }

	    function liveQuery(querier) {
	        var hasValue = false;
	        var currentValue;
	        var observable = new Observable(function (observer) {
	            var scopeFuncIsAsync = isAsyncFunction(querier);
	            function execute(ctx) {
	                var wasRootExec = beginMicroTickScope();
	                try {
	                    if (scopeFuncIsAsync) {
	                        incrementExpectedAwaits();
	                    }
	                    var rv = newScope(querier, ctx);
	                    if (scopeFuncIsAsync) {
	                        rv = rv.finally(decrementExpectedAwaits);
	                    }
	                    return rv;
	                }
	                finally {
	                    wasRootExec && endMicroTickScope();
	                }
	            }
	            var closed = false;
	            var abortController;
	            var accumMuts = {};
	            var currentObs = {};
	            var subscription = {
	                get closed() {
	                    return closed;
	                },
	                unsubscribe: function () {
	                    if (closed)
	                        return;
	                    closed = true;
	                    if (abortController)
	                        abortController.abort();
	                    if (startedListening)
	                        globalEvents.storagemutated.unsubscribe(mutationListener);
	                },
	            };
	            observer.start && observer.start(subscription);
	            var startedListening = false;
	            var doQuery = function () { return execInGlobalContext(_doQuery); };
	            function shouldNotify() {
	                return obsSetsOverlap(currentObs, accumMuts);
	            }
	            var mutationListener = function (parts) {
	                extendObservabilitySet(accumMuts, parts);
	                if (shouldNotify()) {
	                    doQuery();
	                }
	            };
	            var _doQuery = function () {
	                if (closed ||
	                    !domDeps.indexedDB)
	                 {
	                    return;
	                }
	                accumMuts = {};
	                var subscr = {};
	                if (abortController)
	                    abortController.abort();
	                abortController = new AbortController();
	                var ctx = {
	                    subscr: subscr,
	                    signal: abortController.signal,
	                    requery: doQuery,
	                    querier: querier,
	                    trans: null
	                };
	                var ret = execute(ctx);
	                Promise.resolve(ret).then(function (result) {
	                    hasValue = true;
	                    currentValue = result;
	                    if (closed || ctx.signal.aborted) {
	                        return;
	                    }
	                    accumMuts = {};
	                    currentObs = subscr;
	                    if (!objectIsEmpty(currentObs) && !startedListening) {
	                        globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME, mutationListener);
	                        startedListening = true;
	                    }
	                    execInGlobalContext(function () { return !closed && observer.next && observer.next(result); });
	                }, function (err) {
	                    hasValue = false;
	                    if (!['DatabaseClosedError', 'AbortError'].includes(err === null || err === void 0 ? void 0 : err.name)) {
	                        if (!closed)
	                            execInGlobalContext(function () {
	                                if (closed)
	                                    return;
	                                observer.error && observer.error(err);
	                            });
	                    }
	                });
	            };
	            setTimeout(doQuery, 0);
	            return subscription;
	        });
	        observable.hasValue = function () { return hasValue; };
	        observable.getValue = function () { return currentValue; };
	        return observable;
	    }

	    var Dexie = Dexie$1;
	    props(Dexie, __assign(__assign({}, fullNameExceptions), {
	        delete: function (databaseName) {
	            var db = new Dexie(databaseName, { addons: [] });
	            return db.delete();
	        },
	        exists: function (name) {
	            return new Dexie(name, { addons: [] }).open().then(function (db) {
	                db.close();
	                return true;
	            }).catch('NoSuchDatabaseError', function () { return false; });
	        },
	        getDatabaseNames: function (cb) {
	            try {
	                return getDatabaseNames(Dexie.dependencies).then(cb);
	            }
	            catch (_a) {
	                return rejection(new exceptions.MissingAPI());
	            }
	        },
	        defineClass: function () {
	            function Class(content) {
	                extend(this, content);
	            }
	            return Class;
	        }, ignoreTransaction: function (scopeFunc) {
	            return PSD.trans ?
	                usePSD(PSD.transless, scopeFunc) :
	                scopeFunc();
	        }, vip: vip, async: function (generatorFn) {
	            return function () {
	                try {
	                    var rv = awaitIterator(generatorFn.apply(this, arguments));
	                    if (!rv || typeof rv.then !== 'function')
	                        return DexiePromise.resolve(rv);
	                    return rv;
	                }
	                catch (e) {
	                    return rejection(e);
	                }
	            };
	        }, spawn: function (generatorFn, args, thiz) {
	            try {
	                var rv = awaitIterator(generatorFn.apply(thiz, args || []));
	                if (!rv || typeof rv.then !== 'function')
	                    return DexiePromise.resolve(rv);
	                return rv;
	            }
	            catch (e) {
	                return rejection(e);
	            }
	        },
	        currentTransaction: {
	            get: function () { return PSD.trans || null; }
	        }, waitFor: function (promiseOrFunction, optionalTimeout) {
	            var promise = DexiePromise.resolve(typeof promiseOrFunction === 'function' ?
	                Dexie.ignoreTransaction(promiseOrFunction) :
	                promiseOrFunction)
	                .timeout(optionalTimeout || 60000);
	            return PSD.trans ?
	                PSD.trans.waitFor(promise) :
	                promise;
	        },
	        Promise: DexiePromise,
	        debug: {
	            get: function () { return debug; },
	            set: function (value) {
	                setDebug(value);
	            }
	        },
	        derive: derive, extend: extend, props: props, override: override,
	        Events: Events, on: globalEvents, liveQuery: liveQuery, extendObservabilitySet: extendObservabilitySet,
	        getByKeyPath: getByKeyPath, setByKeyPath: setByKeyPath, delByKeyPath: delByKeyPath, shallowClone: shallowClone, deepClone: deepClone, getObjectDiff: getObjectDiff, cmp: cmp, asap: asap$1,
	        minKey: minKey,
	        addons: [],
	        connections: connections,
	        errnames: errnames,
	        dependencies: domDeps, cache: cache,
	        semVer: DEXIE_VERSION, version: DEXIE_VERSION.split('.')
	            .map(function (n) { return parseInt(n); })
	            .reduce(function (p, c, i) { return p + (c / Math.pow(10, i * 2)); }) }));
	    Dexie.maxKey = getMaxKey(Dexie.dependencies.IDBKeyRange);

	    if (typeof dispatchEvent !== 'undefined' && typeof addEventListener !== 'undefined') {
	        globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME, function (updatedParts) {
	            if (!propagatingLocally) {
	                var event_1;
	                event_1 = new CustomEvent(STORAGE_MUTATED_DOM_EVENT_NAME, {
	                    detail: updatedParts
	                });
	                propagatingLocally = true;
	                dispatchEvent(event_1);
	                propagatingLocally = false;
	            }
	        });
	        addEventListener(STORAGE_MUTATED_DOM_EVENT_NAME, function (_a) {
	            var detail = _a.detail;
	            if (!propagatingLocally) {
	                propagateLocally(detail);
	            }
	        });
	    }
	    function propagateLocally(updateParts) {
	        var wasMe = propagatingLocally;
	        try {
	            propagatingLocally = true;
	            globalEvents.storagemutated.fire(updateParts);
	            signalSubscribersNow(updateParts, true);
	        }
	        finally {
	            propagatingLocally = wasMe;
	        }
	    }
	    var propagatingLocally = false;

	    var bc;
	    var createBC = function () { };
	    if (typeof BroadcastChannel !== 'undefined') {
	        createBC = function () {
	            bc = new BroadcastChannel(STORAGE_MUTATED_DOM_EVENT_NAME);
	            bc.onmessage = function (ev) { return ev.data && propagateLocally(ev.data); };
	        };
	        createBC();
	        if (typeof bc.unref === 'function') {
	            bc.unref();
	        }
	        globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME, function (changedParts) {
	            if (!propagatingLocally) {
	                bc.postMessage(changedParts);
	            }
	        });
	    }

	    if (typeof addEventListener !== 'undefined') {
	        addEventListener('pagehide', function (event) {
	            if (!Dexie$1.disableBfCache && event.persisted) {
	                if (debug)
	                    console.debug('Dexie: handling persisted pagehide');
	                bc === null || bc === void 0 ? void 0 : bc.close();
	                for (var _i = 0, connections_1 = connections; _i < connections_1.length; _i++) {
	                    var db = connections_1[_i];
	                    db.close({ disableAutoOpen: false });
	                }
	            }
	        });
	        addEventListener('pageshow', function (event) {
	            if (!Dexie$1.disableBfCache && event.persisted) {
	                if (debug)
	                    console.debug('Dexie: handling persisted pageshow');
	                createBC();
	                propagateLocally({ all: new RangeSet(-Infinity, [[]]) });
	            }
	        });
	    }

	    function add(value) {
	        return new PropModification({ add: value });
	    }

	    function remove(value) {
	        return new PropModification({ remove: value });
	    }

	    function replacePrefix(a, b) {
	        return new PropModification({ replacePrefix: [a, b] });
	    }

	    DexiePromise.rejectionMapper = mapError;
	    setDebug(debug);

	    var namedExports = /*#__PURE__*/Object.freeze({
	        __proto__: null,
	        Dexie: Dexie$1,
	        liveQuery: liveQuery,
	        Entity: Entity,
	        cmp: cmp,
	        PropModSymbol: PropModSymbol,
	        PropModification: PropModification,
	        replacePrefix: replacePrefix,
	        add: add,
	        remove: remove,
	        'default': Dexie$1,
	        RangeSet: RangeSet,
	        mergeRanges: mergeRanges,
	        rangesOverlap: rangesOverlap
	    });

	    __assign(Dexie$1, namedExports, { default: Dexie$1 });

	    return Dexie$1;

	}));
	
} (dexie));

var dexieExports = dexie.exports;
var _Dexie = /*@__PURE__*/getDefaultExportFromCjs(dexieExports);

// Making the module version consumable via require - to prohibit
// multiple occurrancies of the same module in the same app
// (dual package hazard, https://nodejs.org/api/packages.html#dual-package-hazard)
const DexieSymbol = Symbol.for("Dexie");
const Dexie = globalThis[DexieSymbol] || (globalThis[DexieSymbol] = _Dexie);
if (_Dexie.semVer !== Dexie.semVer) {
    throw new Error(`Two different versions of Dexie loaded in the same app: ${_Dexie.semVer} and ${Dexie.semVer}`);
}

const DATABASE_NAME = "MidenClientDB";

async function openDatabase() {
  try {
    await db.open();
    return true;
  } catch (err) {
    console.error("Failed to open database: ", err.toString());
    return false;
  }
}

const Table = {
  AccountCode: "accountCode",
  AccountStorage: "accountStorage",
  AccountVaults: "accountVaults",
  AccountAuth: "accountAuth",
  Accounts: "accounts",
  Transactions: "transactions",
  TransactionScripts: "transactionScripts",
  InputNotes: "inputNotes",
  OutputNotes: "outputNotes",
  NotesScripts: "notesScripts",
  StateSync: "stateSync",
  BlockHeaders: "blockHeaders",
  PartialBlockchainNodes: "partialBlockchainNodes",
  Tags: "tags",
  ForeignAccountCode: "foreignAccountCode",
};

const db = new Dexie(DATABASE_NAME);
db.version(1).stores({
  [Table.AccountCode]: indexes("root"),
  [Table.AccountStorage]: indexes("root"),
  [Table.AccountVaults]: indexes("root"),
  [Table.AccountAuth]: indexes("pubKey"),
  [Table.Accounts]: indexes(
    "&accountCommitment",
    "id",
    "codeRoot",
    "storageRoot",
    "vaultRoot"
  ),
  [Table.Transactions]: indexes("id"),
  [Table.TransactionScripts]: indexes("scriptRoot"),
  [Table.InputNotes]: indexes("noteId", "nullifier", "stateDiscriminant"),
  [Table.OutputNotes]: indexes(
    "noteId",
    "recipientDigest",
    "stateDiscriminant",
    "nullifier"
  ),
  [Table.NotesScripts]: indexes("scriptRoot"),
  [Table.StateSync]: indexes("id"),
  [Table.BlockHeaders]: indexes("blockNum", "hasClientNotes"),
  [Table.PartialBlockchainNodes]: indexes("id"),
  [Table.Tags]: indexes("id++", "tag", "source_note_id", "source_account_id"),
  [Table.ForeignAccountCode]: indexes("accountId"),
});

function indexes(...items) {
  return items.join(",");
}

db.on("populate", () => {
  // Populate the stateSync table with default values
  db.stateSync.put({ id: 1, blockNum: "0" });
});

const accountCodes = db.table(Table.AccountCode);
const accountStorages = db.table(Table.AccountStorage);
const accountVaults = db.table(Table.AccountVaults);
const accountAuths = db.table(Table.AccountAuth);
const accounts = db.table(Table.Accounts);
const transactions = db.table(Table.Transactions);
const transactionScripts = db.table(Table.TransactionScripts);
const inputNotes = db.table(Table.InputNotes);
const outputNotes = db.table(Table.OutputNotes);
const notesScripts = db.table(Table.NotesScripts);
const stateSync = db.table(Table.StateSync);
const blockHeaders = db.table(Table.BlockHeaders);
const partialBlockchainNodes = db.table(Table.PartialBlockchainNodes);
const tags = db.table(Table.Tags);
const foreignAccountCode = db.table(Table.ForeignAccountCode);

// GET FUNCTIONS
async function getAccountIds() {
  try {
    let allIds = new Set(); // Use a Set to ensure uniqueness

    // Iterate over each account entry
    await accounts.each((account) => {
      allIds.add(account.id); // Assuming 'account' has an 'id' property
    });

    return Array.from(allIds); // Convert back to array to return a list of unique IDs
  } catch (error) {
    console.error("Failed to retrieve account IDs: ", error.toString());
    throw error;
  }
}

async function getAllAccountHeaders() {
  try {
    // Use a Map to track the latest record for each id based on nonce
    const latestRecordsMap = new Map();

    await accounts.each((record) => {
      const existingRecord = latestRecordsMap.get(record.id);
      if (
        !existingRecord ||
        BigInt(record.nonce) > BigInt(existingRecord.nonce)
      ) {
        latestRecordsMap.set(record.id, record);
      }
    });

    // Extract the latest records from the Map
    const latestRecords = Array.from(latestRecordsMap.values());

    const resultObject = await Promise.all(
      latestRecords.map(async (record) => {
        let accountSeedBase64 = null;
        if (record.accountSeed) {
          // Ensure accountSeed is processed as a Uint8Array and converted to Base64
          let accountSeedArrayBuffer = await record.accountSeed.arrayBuffer();
          let accountSeedArray = new Uint8Array(accountSeedArrayBuffer);
          accountSeedBase64 = uint8ArrayToBase64$5(accountSeedArray);
        }

        return {
          id: record.id,
          nonce: record.nonce,
          vaultRoot: record.vaultRoot,
          storageRoot: record.storageRoot,
          codeRoot: record.codeRoot,
          accountSeed: accountSeedBase64, // Now correctly formatted as Base64
          locked: record.locked,
        };
      })
    );

    return resultObject;
  } catch (error) {
    console.error(
      "Error fetching all latest account headers:",
      error.toString()
    );
    throw error;
  }
}

async function getAccountHeader(accountId) {
  try {
    // Fetch all records matching the given id
    const allMatchingRecords = await accounts
      .where("id")
      .equals(accountId)
      .toArray();

    if (allMatchingRecords.length === 0) {
      return null;
    }

    // Convert nonce to BigInt and sort
    // Note: This assumes all nonces are valid BigInt strings.
    const sortedRecords = allMatchingRecords.sort((a, b) => {
      const bigIntA = BigInt(a.nonce);
      const bigIntB = BigInt(b.nonce);
      return bigIntA > bigIntB ? -1 : bigIntA < bigIntB ? 1 : 0;
    });

    // The first record is the most recent one due to the sorting
    const mostRecentRecord = sortedRecords[0];

    let accountSeedBase64 = null;
    if (mostRecentRecord.accountSeed) {
      // Ensure accountSeed is processed as a Uint8Array and converted to Base64
      let accountSeedArrayBuffer =
        await mostRecentRecord.accountSeed.arrayBuffer();
      let accountSeedArray = new Uint8Array(accountSeedArrayBuffer);
      accountSeedBase64 = uint8ArrayToBase64$5(accountSeedArray);
    }
    const AccountHeader = {
      id: mostRecentRecord.id,
      nonce: mostRecentRecord.nonce,
      vaultRoot: mostRecentRecord.vaultRoot,
      storageRoot: mostRecentRecord.storageRoot,
      codeRoot: mostRecentRecord.codeRoot,
      accountSeed: accountSeedBase64,
      locked: mostRecentRecord.locked,
    };
    return AccountHeader;
  } catch (error) {
    console.error(
      `Error fetching account header for ID ${accountId}:`,
      error.toString()
    );
    throw error;
  }
}

async function getAccountHeaderByCommitment(accountCommitment) {
  try {
    // Fetch all records matching the given commitment
    const allMatchingRecords = await accounts
      .where("accountCommitment")
      .equals(accountCommitment)
      .toArray();

    if (allMatchingRecords.length === 0) {
      console.log("No account header record found for given commitment.");
      return null;
    }

    // There should be only one match
    const matchingRecord = allMatchingRecords[0];

    let accountSeedBase64 = null;
    if (matchingRecord.accountSeed) {
      // Ensure accountSeed is processed as a Uint8Array and converted to Base64
      let accountSeedArrayBuffer =
        await matchingRecord.accountSeed.arrayBuffer();
      let accountSeedArray = new Uint8Array(accountSeedArrayBuffer);
      accountSeedBase64 = uint8ArrayToBase64$5(accountSeedArray);
    }
    const AccountHeader = {
      id: matchingRecord.id,
      nonce: matchingRecord.nonce,
      vaultRoot: matchingRecord.vaultRoot,
      storageRoot: matchingRecord.storageRoot,
      codeRoot: matchingRecord.codeRoot,
      accountSeed: accountSeedBase64,
      locked: matchingRecord.locked,
    };
    return AccountHeader;
  } catch (error) {
    console.error(
      `Error fetching account header for commitment ${accountCommitment}:`,
      error.toString()
    );
    throw error;
  }
}

async function getAccountCode(codeRoot) {
  try {
    // Fetch all records matching the given root
    const allMatchingRecords = await accountCodes
      .where("root")
      .equals(codeRoot)
      .toArray();

    if (allMatchingRecords.length === 0) {
      console.log("No records found for given code root.");
      return null;
    }

    // The first record is the only one due to the uniqueness constraint
    const codeRecord = allMatchingRecords[0];

    // Convert the code Blob to an ArrayBuffer
    const codeArrayBuffer = await codeRecord.code.arrayBuffer();
    const codeArray = new Uint8Array(codeArrayBuffer);
    const codeBase64 = uint8ArrayToBase64$5(codeArray);

    return {
      root: codeRecord.root,
      code: codeBase64,
    };
  } catch (error) {
    console.error(
      `Error fetching account code for root ${codeRoot}:`,
      error.toString()
    );
    throw error;
  }
}

async function getAccountStorage(storageRoot) {
  try {
    // Fetch all records matching the given root
    const allMatchingRecords = await accountStorages
      .where("root")
      .equals(storageRoot)
      .toArray();

    if (allMatchingRecords.length === 0) {
      console.log("No records found for given storage root.");
      return null;
    }

    // The first record is the only one due to the uniqueness constraint
    const storageRecord = allMatchingRecords[0];

    // Convert the module Blob to an ArrayBuffer
    const storageArrayBuffer = await storageRecord.slots.arrayBuffer();
    const storageArray = new Uint8Array(storageArrayBuffer);
    const storageBase64 = uint8ArrayToBase64$5(storageArray);
    return {
      root: storageRecord.root,
      storage: storageBase64,
    };
  } catch (error) {
    console.error(
      `Error fetching account storage for root ${storageRoot}:`,
      error.toString()
    );
    throw error;
  }
}

async function getAccountAssetVault(vaultRoot) {
  try {
    // Fetch all records matching the given root
    const allMatchingRecords = await accountVaults
      .where("root")
      .equals(vaultRoot)
      .toArray();

    if (allMatchingRecords.length === 0) {
      return null;
    }

    // The first record is the only one due to the uniqueness constraint
    const vaultRecord = allMatchingRecords[0];

    // Convert the assets Blob to an ArrayBuffer
    const assetsArrayBuffer = await vaultRecord.assets.arrayBuffer();
    const assetsArray = new Uint8Array(assetsArrayBuffer);
    const assetsBase64 = uint8ArrayToBase64$5(assetsArray);

    return {
      root: vaultRecord.root,
      assets: assetsBase64,
    };
  } catch (error) {
    console.error(
      `Error fetching account vault for root ${vaultRoot}:`,
      error.toString()
    );
    throw error;
  }
}

function getAccountAuthByPubKey(pubKey) {
  // Try to get the account auth from the cache
  let cachedSecretKey = ACCOUNT_AUTH_MAP.get(pubKey);

  // If it's not in the cache, throw an error
  if (!cachedSecretKey) {
    throw new Error("Account auth not found in cache.");
  }

  let data = {
    secretKey: cachedSecretKey,
  };

  return data;
}

var ACCOUNT_AUTH_MAP = new Map();
async function fetchAndCacheAccountAuthByPubKey(pubKey) {
  try {
    // Fetch all records matching the given id
    const allMatchingRecords = await accountAuths
      .where("pubKey")
      .equals(pubKey)
      .toArray();

    if (allMatchingRecords.length === 0) {
      console.log("No account auth records found for given account ID.");
      return null; // No records found
    }

    // The first record is the only one due to the uniqueness constraint
    const authRecord = allMatchingRecords[0];

    // Store the auth info in the map
    ACCOUNT_AUTH_MAP.set(authRecord.pubKey, authRecord.secretKey);

    return {
      secretKey: authRecord.secretKey,
    };
  } catch (error) {
    console.error(
      `Error fetching account auth for pubKey ${pubKey}:`,
      error.toString()
    );
    throw error;
  }
}

// INSERT FUNCTIONS

async function insertAccountCode(codeRoot, code) {
  try {
    // Create a Blob from the ArrayBuffer
    const codeBlob = new Blob([new Uint8Array(code)]);

    // Prepare the data object to insert
    const data = {
      root: codeRoot, // Using codeRoot as the key
      code: codeBlob,
    };

    // Perform the insert using Dexie
    await accountCodes.put(data);
  } catch (error) {
    console.error(
      `Error inserting code with root: ${codeRoot}:`,
      error.toString()
    );
    throw error;
  }
}

async function insertAccountStorage(storageRoot, storageSlots) {
  try {
    const storageSlotsBlob = new Blob([new Uint8Array(storageSlots)]);

    // Prepare the data object to insert
    const data = {
      root: storageRoot, // Using storageRoot as the key
      slots: storageSlotsBlob, // Blob created from ArrayBuffer
    };

    // Perform the insert using Dexie
    await accountStorages.put(data);
  } catch (error) {
    console.error(
      `Error inserting storage with root: ${storageRoot}:`,
      error.toString()
    );
    throw error;
  }
}

async function insertAccountAssetVault(vaultRoot, assets) {
  try {
    const assetsBlob = new Blob([new Uint8Array(assets)]);

    // Prepare the data object to insert
    const data = {
      root: vaultRoot, // Using vaultRoot as the key
      assets: assetsBlob,
    };

    // Perform the insert using Dexie
    await accountVaults.put(data);
  } catch (error) {
    console.error(
      `Error inserting vault with root: ${vaultRoot}:`,
      error.toString()
    );
    throw error;
  }
}

async function insertAccountRecord(
  accountId,
  codeRoot,
  storageRoot,
  vaultRoot,
  nonce,
  committed,
  accountSeed,
  commitment
) {
  try {
    let accountSeedBlob = null;
    if (accountSeed) {
      accountSeedBlob = new Blob([new Uint8Array(accountSeed)]);
    }

    // Prepare the data object to insert
    const data = {
      id: accountId, // Using accountId as the key
      codeRoot: codeRoot,
      storageRoot: storageRoot,
      vaultRoot: vaultRoot,
      nonce: nonce,
      committed: committed,
      accountSeed: accountSeedBlob,
      accountCommitment: commitment,
      locked: false,
    };

    // Perform the insert using Dexie
    await accounts.add(data);
  } catch (error) {
    console.error(`Error inserting account: ${accountId}:`, error.toString());
    throw error;
  }
}

async function insertAccountAuth(pubKey, secretKey) {
  try {
    // Prepare the data object to insert
    const data = {
      pubKey: pubKey,
      secretKey: secretKey,
    };

    // Perform the insert using Dexie
    await accountAuths.add(data);
  } catch (error) {
    console.error(
      `Error inserting auth for account: ${accountId}:`,
      error.toString()
    );
    throw error;
  }
}

async function upsertForeignAccountCode(accountId, code, codeRoot) {
  try {
    await insertAccountCode(codeRoot, code);

    const data = {
      accountId,
      codeRoot,
    };

    await foreignAccountCode.put(data);
  } catch (error) {
    console.error(
      `Error updating foreign account code: (${accountId}, ${codeRoot}):`,
      error.toString()
    );
    throw error;
  }
}

async function getForeignAccountCode(accountIds) {
  try {
    const foreignAccounts = await foreignAccountCode
      .where("accountId")
      .anyOf(accountIds)
      .toArray();

    if (foreignAccounts.length === 0) {
      return null; // No records found
    }

    let codeRoots = foreignAccounts.map((account) => account.codeRoot);

    const accountCode = await accountCodes
      .where("root")
      .anyOf(codeRoots)
      .toArray();

    const processedCode = foreignAccounts.map(async (foreignAccount) => {
      const matchingCode = accountCode.find(
        (code) => code.root === foreignAccount.codeRoot
      );

      // Convert the code Blob to an ArrayBuffer
      const codeArrayBuffer = await matchingCode.code.arrayBuffer();
      const codeArray = new Uint8Array(codeArrayBuffer);
      const codeBase64 = uint8ArrayToBase64$5(codeArray);

      return {
        accountId: foreignAccount.accountId,
        code: codeBase64,
      };
    });
    return processedCode;
  } catch (error) {
    console.error("Error fetching foreign account code:", error.toString());
    throw error;
  }
}

async function lockAccount(accountId) {
  try {
    await accounts.where("id").equals(accountId).modify({ locked: true });
  } catch (error) {
    console.error(`Error locking account: ${accountId}:`, error.toString());
    throw error;
  }
}

// Delete functions

async function undoAccountStates(accountCommitments) {
  try {
    await accounts
      .where("accountCommitment")
      .anyOf(accountCommitments)
      .delete();
  } catch (error) {
    console.error(
      `Error undoing account states: ${accountCommitments}:`,
      error.toString()
    );
    throw error;
  }
}

function uint8ArrayToBase64$5(bytes) {
  const binary = bytes.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return btoa(binary);
}

// INSERT FUNCTIONS
async function insertBlockHeader(
  blockNum,
  header,
  partialBlockchainPeaks,
  hasClientNotes
) {
  try {
    const headerBlob = new Blob([new Uint8Array(header)]);
    const partialBlockchainPeaksBlob = new Blob([
      new Uint8Array(partialBlockchainPeaks),
    ]);

    const data = {
      blockNum: blockNum,
      header: headerBlob,
      partialBlockchainPeaks: partialBlockchainPeaksBlob,
      hasClientNotes: hasClientNotes.toString(),
    };

    const existingBlockHeader = await blockHeaders.get(blockNum);

    if (!existingBlockHeader) {
      await blockHeaders.add(data);
    } else {

      // Update the hasClientNotes if the existing value is false
      if (existingBlockHeader.hasClientNotes === "false" && hasClientNotes) {
        await blockHeaders.update(blockNum, {
          hasClientNotes: hasClientNotes.toString(),
        });
      } else {
      }
    }
  } catch (err) {
    console.error("Failed to insert block header: ", err.toString());
    throw err;
  }
}

async function insertPartialBlockchainNodes(ids, nodes) {
  try {
    // Check if the arrays are not of the same length
    if (ids.length !== nodes.length) {
      throw new Error("ids and nodes arrays must be of the same length");
    }

    if (ids.length === 0) {
      return;
    }

    // Create array of objects with id and node
    const data = nodes.map((node, index) => ({
      id: ids[index],
      node: node,
    }));

    // Use bulkPut to add/overwrite the entries
    await partialBlockchainNodes.bulkPut(data);
  } catch (err) {
    console.error(
      "Failed to insert partial blockchain nodes: ",
      err.toString()
    );
    throw err;
  }
}

// GET FUNCTIONS
async function getBlockHeaders(blockNumbers) {
  try {
    const results = await blockHeaders.bulkGet(blockNumbers);

    const processedResults = await Promise.all(
      results.map(async (result, index) => {
        if (result === undefined) {
          return null;
        } else {
          const headerArrayBuffer = await result.header.arrayBuffer();
          const headerArray = new Uint8Array(headerArrayBuffer);
          const headerBase64 = uint8ArrayToBase64$4(headerArray);

          const partialBlockchainPeaksArrayBuffer =
            await result.partialBlockchainPeaks.arrayBuffer();
          const partialBlockchainPeaksArray = new Uint8Array(
            partialBlockchainPeaksArrayBuffer
          );
          const partialBlockchainPeaksBase64 = uint8ArrayToBase64$4(
            partialBlockchainPeaksArray
          );

          return {
            blockNum: result.blockNum,
            header: headerBase64,
            partialBlockchainPeaks: partialBlockchainPeaksBase64,
            hasClientNotes: result.hasClientNotes === "true",
          };
        }
      })
    );

    return processedResults;
  } catch (err) {
    console.error("Failed to get block headers: ", err.toString());
    throw err;
  }
}

async function getTrackedBlockHeaders() {
  try {
    // Fetch all records matching the given root
    const allMatchingRecords = await blockHeaders
      .where("hasClientNotes")
      .equals("true")
      .toArray();

    // Process all records with async operations
    const processedRecords = await Promise.all(
      allMatchingRecords.map(async (record) => {
        const headerArrayBuffer = await record.header.arrayBuffer();
        const headerArray = new Uint8Array(headerArrayBuffer);
        const headerBase64 = uint8ArrayToBase64$4(headerArray);

        const partialBlockchainPeaksArrayBuffer =
          await record.partialBlockchainPeaks.arrayBuffer();
        const partialBlockchainPeaksArray = new Uint8Array(
          partialBlockchainPeaksArrayBuffer
        );
        const partialBlockchainPeaksBase64 = uint8ArrayToBase64$4(
          partialBlockchainPeaksArray
        );

        return {
          blockNum: record.blockNum,
          header: headerBase64,
          partialBlockchainPeaks: partialBlockchainPeaksBase64,
          hasClientNotes: record.hasClientNotes === "true",
        };
      })
    );

    return processedRecords;
  } catch (err) {
    console.error("Failed to get tracked block headers: ", err.toString());
    throw err;
  }
}

async function getPartialBlockchainPeaksByBlockNum(blockNum) {
  try {
    const blockHeader = await blockHeaders.get(blockNum);

    const partialBlockchainPeaksArrayBuffer =
      await blockHeader.partialBlockchainPeaks.arrayBuffer();
    const partialBlockchainPeaksArray = new Uint8Array(
      partialBlockchainPeaksArrayBuffer
    );
    const partialBlockchainPeaksBase64 = uint8ArrayToBase64$4(
      partialBlockchainPeaksArray
    );

    return {
      peaks: partialBlockchainPeaksBase64,
    };
  } catch (err) {
    console.error("Failed to get partial blockchain peaks: ", err.toString());
    throw err;
  }
}

async function getPartialBlockchainNodesAll() {
  try {
    const partialBlockchainNodesAll = await partialBlockchainNodes.toArray();
    return partialBlockchainNodesAll;
  } catch (err) {
    console.error("Failed to get partial blockchain nodes: ", err.toString());
    throw err;
  }
}

async function getPartialBlockchainNodes(ids) {
  try {
    const results = await partialBlockchainNodes.bulkGet(ids);

    return results;
  } catch (err) {
    console.error("Failed to get partial blockchain nodes: ", err.toString());
    throw err;
  }
}

async function pruneIrrelevantBlocks() {
  try {
    const syncHeight = await stateSync.get(1);

    const allMatchingRecords = await blockHeaders
      .where("hasClientNotes")
      .equals("false")
      .and(
        (record) =>
          record.blockNum !== 0 && record.blockNum !== syncHeight.blockNum
      )
      .toArray();

    await blockHeaders.bulkDelete(allMatchingRecords.map((r) => r.blockNum));
  } catch (err) {
    console.error("Failed to prune irrelevant blocks: ", err.toString());
    throw err;
  }
}

function uint8ArrayToBase64$4(bytes) {
  const binary = bytes.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return btoa(binary);
}

async function recursivelyTransformForExport(obj) {
  if (obj instanceof Blob) {
    const blobBuffer = await obj.arrayBuffer();
    return {
      __type: "Blob",
      data: uint8ArrayToBase64$3(new Uint8Array(blobBuffer)),
    };
  }

  if (Array.isArray(obj)) {
    return await Promise.all(obj.map(recursivelyTransformForExport));
  }

  if (obj && typeof obj === "object") {
    const entries = await Promise.all(
      Object.entries(obj).map(async ([key, value]) => [
        key,
        await recursivelyTransformForExport(value),
      ])
    );
    return Object.fromEntries(entries);
  }

  return obj;
}

async function exportStore() {
  const dbJson = {};
  for (const table of db.tables) {
    const records = await table.toArray();

    dbJson[table.name] = await Promise.all(
      records.map(recursivelyTransformForExport)
    );
  }

  const stringified = JSON.stringify(dbJson);
  return stringified;
}

function uint8ArrayToBase64$3(uint8Array) {
  return btoa(String.fromCharCode(...uint8Array));
}

async function recursivelyTransformForImport(obj) {
  if (obj && typeof obj === "object") {
    if (obj.__type === "Blob") {
      return new Blob([base64ToUint8Array(obj.data)]);
    }

    if (Array.isArray(obj)) {
      return await Promise.all(obj.map(recursivelyTransformForImport));
    }

    const entries = await Promise.all(
      Object.entries(obj).map(async ([key, value]) => [
        key,
        await recursivelyTransformForImport(value),
      ])
    );
    return Object.fromEntries(entries);
  }

  return obj; // Return unchanged if it's neither Blob, Array, nor Object
}

async function forceImportStore(jsonStr) {
  try {
    if (!db.isOpen) {
      await openDatabase();
    }

    let dbJson = JSON.parse(jsonStr);
    if (typeof dbJson === "string") {
      dbJson = JSON.parse(dbJson);
    }

    const jsonTableNames = Object.keys(dbJson);
    const dbTableNames = db.tables.map((t) => t.name);

    if (jsonTableNames.length === 0) {
      throw new Error("No tables found in the provided JSON.");
    }

    // Wrap everything in a transaction
    await db.transaction(
      "rw",
      ...dbTableNames.map((name) => db.table(name)),
      async () => {
        // Clear all tables in the database
        await Promise.all(db.tables.map((t) => t.clear()));

        // Import data from JSON into matching tables
        for (const tableName of jsonTableNames) {
          const table = db.table(tableName);

          if (!dbTableNames.includes(tableName)) {
            console.warn(
              `Table "${tableName}" does not exist in the database schema. Skipping.`
            );
            continue; // Skip tables not in the Dexie schema
          }

          const records = dbJson[tableName];

          const transformedRecords = await Promise.all(
            records.map(recursivelyTransformForImport)
          );

          await table.bulkPut(transformedRecords);
        }
      }
    );

  } catch (err) {
    console.error("Failed to import store: ", err.toString());
    throw err;
  }
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function getOutputNotes(states) {
  try {
    let notes;

    // Fetch the records based on the filter
    if (states.length === 0) {
      notes = await outputNotes.toArray();
    } else {
      notes = await outputNotes
        .where("stateDiscriminant")
        .anyOf(states)
        .toArray();
    }

    return await processOutputNotes(notes);
  } catch (err) {
    console.error("Failed to get input notes: ", err.toString());
    throw err;
  }
}

async function getInputNotes(states) {
  try {
    let notes;

    // Fetch the records based on the filter
    if (states.length === 0) {
      notes = await inputNotes.toArray();
    } else {
      notes = await inputNotes
        .where("stateDiscriminant")
        .anyOf(states)
        .toArray();
    }

    return await processInputNotes(notes);
  } catch (err) {
    console.error("Failed to get input notes: ", err.toString());
    throw err;
  }
}

async function getInputNotesFromIds(noteIds) {
  try {
    let notes;

    // Fetch the records based on a list of IDs
    notes = await inputNotes.where("noteId").anyOf(noteIds).toArray();

    return await processInputNotes(notes);
  } catch (err) {
    console.error("Failed to get input notes: ", err.toString());
    throw err;
  }
}

async function getInputNotesFromNullifiers(nullifiers) {
  try {
    let notes;

    // Fetch the records based on a list of IDs
    notes = await inputNotes.where("nullifier").anyOf(nullifiers).toArray();

    return await processInputNotes(notes);
  } catch (err) {
    console.error("Failed to get input notes: ", err.toString());
    throw err;
  }
}

async function getOutputNotesFromNullifiers(nullifiers) {
  try {
    let notes;

    // Fetch the records based on a list of IDs
    notes = await outputNotes.where("nullifier").anyOf(nullifiers).toArray();

    return await processOutputNotes(notes);
  } catch (err) {
    console.error("Failed to get output notes: ", err.toString());
    throw err;
  }
}

async function getOutputNotesFromIds(noteIds) {
  try {
    let notes;

    // Fetch the records based on a list of IDs
    notes = await outputNotes.where("noteId").anyOf(noteIds).toArray();

    return await processOutputNotes(notes);
  } catch (err) {
    console.error("Failed to get input notes: ", err.toString());
    throw err;
  }
}

async function getUnspentInputNoteNullifiers() {
  try {
    const notes = await inputNotes
      .where("stateDiscriminant")
      .anyOf([2, 4, 5]) // STATE_COMMITTED, STATE_PROCESSING_AUTHENTICATED, STATE_PROCESSING_UNAUTHENTICATED
      .toArray();
    const nullifiers = notes.map((note) => note.nullifier);

    return nullifiers;
  } catch (err) {
    console.error(
      "Failed to get unspent input note nullifiers: ",
      err.toString()
    );
    throw err;
  }
}

async function upsertInputNote(
  noteId,
  assets,
  serialNumber,
  inputs,
  noteScriptRoot,
  serializedNoteScript,
  nullifier,
  serializedCreatedAt,
  stateDiscriminant,
  state
) {
  return db.transaction("rw", inputNotes, notesScripts, async (tx) => {
    try {
      let assetsBlob = new Blob([new Uint8Array(assets)]);
      let serialNumberBlob = new Blob([new Uint8Array(serialNumber)]);
      let inputsBlob = new Blob([new Uint8Array(inputs)]);
      let stateBlob = new Blob([new Uint8Array(state)]);

      // Prepare the data object to insert
      const data = {
        noteId: noteId,
        assets: assetsBlob,
        serialNumber: serialNumberBlob,
        inputs: inputsBlob,
        noteScriptRoot,
        nullifier: nullifier,
        state: stateBlob,
        stateDiscriminant: stateDiscriminant,
        createdAt: serializedCreatedAt,
      };

      // Perform the insert using Dexie
      await tx.inputNotes.put(data);

      let serializedNoteScriptBlob = new Blob([
        new Uint8Array(serializedNoteScript),
      ]);

      const noteScriptData = {
        scriptRoot: noteScriptRoot,
        serializedNoteScript: serializedNoteScriptBlob,
      };

      await tx.notesScripts.put(noteScriptData);
    } catch (error) {
      console.error(`Error inserting note: ${noteId}:`, error);
      throw error;
    }
  });
}

async function upsertOutputNote(
  noteId,
  assets,
  recipientDigest,
  metadata,
  nullifier,
  expectedHeight,
  stateDiscriminant,
  state
) {
  return db.transaction("rw", outputNotes, notesScripts, async (tx) => {
    try {
      let assetsBlob = new Blob([new Uint8Array(assets)]);
      let metadataBlob = new Blob([new Uint8Array(metadata)]);
      let stateBlob = new Blob([new Uint8Array(state)]);

      // Prepare the data object to insert
      const data = {
        noteId: noteId,
        assets: assetsBlob,
        recipientDigest: recipientDigest,
        metadata: metadataBlob,
        nullifier: nullifier ? nullifier : null,
        expectedHeight: expectedHeight,
        stateDiscriminant,
        state: stateBlob,
      };

      // Perform the insert using Dexie
      await tx.outputNotes.put(data);
    } catch (error) {
      console.error(`Error inserting note: ${noteId}:`, error);
      throw error;
    }
  });
}

async function processInputNotes(notes) {
  // Fetch all scripts from the scripts table for joining
  const transactionRecords = await transactions.toArray();
  new Map(
    transactionRecords.map((transaction) => [
      transaction.id,
      transaction.accountId,
    ])
  );

  const processedNotes = await Promise.all(
    notes.map(async (note) => {
      // Convert the assets blob to base64
      const assetsArrayBuffer = await note.assets.arrayBuffer();
      const assetsArray = new Uint8Array(assetsArrayBuffer);
      const assetsBase64 = uint8ArrayToBase64$2(assetsArray);
      note.assets = assetsBase64;

      const serialNumberBuffer = await note.serialNumber.arrayBuffer();
      const serialNumberArray = new Uint8Array(serialNumberBuffer);
      const serialNumberBase64 = uint8ArrayToBase64$2(serialNumberArray);
      note.serialNumber = serialNumberBase64;

      const inputsBuffer = await note.inputs.arrayBuffer();
      const inputsArray = new Uint8Array(inputsBuffer);
      const inputsBase64 = uint8ArrayToBase64$2(inputsArray);
      note.inputs = inputsBase64;

      // Convert the serialized note script blob to base64
      let serializedNoteScriptBase64 = null;
      if (note.noteScriptRoot) {
        let record = await notesScripts.get(note.noteScriptRoot);
        let serializedNoteScriptArrayBuffer =
          await record.serializedNoteScript.arrayBuffer();
        const serializedNoteScriptArray = new Uint8Array(
          serializedNoteScriptArrayBuffer
        );
        serializedNoteScriptBase64 = uint8ArrayToBase64$2(
          serializedNoteScriptArray
        );
      }

      const stateBuffer = await note.state.arrayBuffer();
      const stateArray = new Uint8Array(stateBuffer);
      const stateBase64 = uint8ArrayToBase64$2(stateArray);
      note.state = stateBase64;

      return {
        assets: note.assets,
        serialNumber: note.serialNumber,
        inputs: note.inputs,
        createdAt: note.createdAt,
        serializedNoteScript: serializedNoteScriptBase64,
        state: note.state,
      };
    })
  );

  return processedNotes;
}

async function processOutputNotes(notes) {
  // Process each note to convert 'blobField' from Blob to Uint8Array
  const processedNotes = await Promise.all(
    notes.map(async (note) => {
      const assetsArrayBuffer = await note.assets.arrayBuffer();
      const assetsArray = new Uint8Array(assetsArrayBuffer);
      const assetsBase64 = uint8ArrayToBase64$2(assetsArray);
      note.assets = assetsBase64;

      // Convert the metadata blob to base64
      const metadataArrayBuffer = await note.metadata.arrayBuffer();
      const metadataArray = new Uint8Array(metadataArrayBuffer);
      const metadataBase64 = uint8ArrayToBase64$2(metadataArray);
      note.metadata = metadataBase64;

      // Convert the state blob to base64
      const stateBuffer = await note.state.arrayBuffer();
      const stateArray = new Uint8Array(stateBuffer);
      const stateBase64 = uint8ArrayToBase64$2(stateArray);
      note.state = stateBase64;

      return {
        assets: note.assets,
        recipientDigest: note.recipientDigest,
        metadata: note.metadata,
        expectedHeight: note.expectedHeight,
        state: note.state,
      };
    })
  );
  return processedNotes;
}

function uint8ArrayToBase64$2(bytes) {
  const binary = bytes.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return btoa(binary);
}

async function getNoteTags() {
  try {
    let records = await tags.toArray();

    let processedRecords = records.map((record) => {
      record.sourceNoteId =
        record.sourceNoteId == "" ? null : record.sourceNoteId;
      record.sourceAccountId =
        record.sourceAccountId == "" ? null : record.sourceAccountId;
      return record;
    });

    return processedRecords;
  } catch (error) {
    console.error("Error fetching tag record:", error.toString());
    throw error;
  }
}

async function getSyncHeight() {
  try {
    const record = await stateSync.get(1); // Since id is the primary key and always 1
    if (record) {
      let data = {
        blockNum: record.blockNum,
      };
      return data;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching sync height:", error.toString());
    throw error;
  }
}

async function addNoteTag(tag, sourceNoteId, sourceAccountId) {
  try {
    let tagArray = new Uint8Array(tag);
    let tagBase64 = uint8ArrayToBase64$1(tagArray);
    await tags.add({
      tag: tagBase64,
      sourceNoteId: sourceNoteId ? sourceNoteId : "",
      sourceAccountId: sourceAccountId ? sourceAccountId : "",
    });
  } catch (err) {
    console.error("Failed to add note tag: ", err.toString());
    throw err;
  }
}

async function removeNoteTag(tag, sourceNoteId, sourceAccountId) {
  try {
    let tagArray = new Uint8Array(tag);
    let tagBase64 = uint8ArrayToBase64$1(tagArray);

    return await tags
      .where({
        tag: tagBase64,
        sourceNoteId: sourceNoteId ? sourceNoteId : "",
        sourceAccountId: sourceAccountId ? sourceAccountId : "",
      })
      .delete();
  } catch (err) {
    // console.log("Failed to remove note tag: ", err.toString());
    throw err;
  }
}

async function applyStateSync(
  blockNum,
  newBlockHeadersAsFlattenedVec,
  newBlockNums,
  partialBlockchainPeaksAsFlattenedVec,
  hasClientNotes,
  nodeIndexes,
  nodes,
  inputNoteIds
) {
  const newBlockHeaders = reconstructFlattenedVec(
    newBlockHeadersAsFlattenedVec
  );
  const partialBlockchainPeaks = reconstructFlattenedVec(
    partialBlockchainPeaksAsFlattenedVec
  );

  return await db.transaction(
    "rw",
    stateSync,
    inputNotes,
    outputNotes,
    transactions,
    blockHeaders,
    partialBlockchainNodes,
    tags,
    async (tx) => {
      await updateSyncHeight(tx, blockNum);
      for (let i = 0; i < newBlockHeaders.length; i++) {
        await updateBlockHeader(
          tx,
          newBlockNums[i],
          newBlockHeaders[i],
          partialBlockchainPeaks[i],
          hasClientNotes[i] == 1 // hasClientNotes is a u8 array, so we convert it to boolean
        );
      }
      await updatePartialBlockchainNodes(tx, nodeIndexes, nodes);
      await updateCommittedNoteTags(tx, inputNoteIds);
    }
  );
}

async function updateSyncHeight(tx, blockNum) {
  try {
    await tx.stateSync.update(1, { blockNum: blockNum });
  } catch (error) {
    console.error("Failed to update sync height: ", error.toString());
    throw error;
  }
}

async function updateBlockHeader(
  tx,
  blockNum,
  blockHeader,
  partialBlockchainPeaks,
  hasClientNotes
) {
  try {
    const headerBlob = new Blob([new Uint8Array(blockHeader)]);
    const partialBlockchainPeaksBlob = new Blob([
      new Uint8Array(partialBlockchainPeaks),
    ]);

    const data = {
      blockNum: blockNum,
      header: headerBlob,
      partialBlockchainPeaks: partialBlockchainPeaksBlob,
      hasClientNotes: hasClientNotes.toString(),
    };

    const existingBlockHeader = await tx.blockHeaders.get(blockNum);

    if (!existingBlockHeader) {
      await tx.blockHeaders.add(data);
    }
  } catch (err) {
    console.error("Failed to insert block header: ", err.toString());
    throw err;
  }
}

async function updatePartialBlockchainNodes(tx, nodeIndexes, nodes) {
  try {
    // Check if the arrays are not of the same length
    if (nodeIndexes.length !== nodes.length) {
      throw new Error(
        "nodeIndexes and nodes arrays must be of the same length"
      );
    }

    if (nodeIndexes.length === 0) {
      return;
    }

    // Create array of objects with id and node
    const data = nodes.map((node, index) => ({
      id: nodeIndexes[index],
      node: node,
    }));

    // Use bulkPut to add/overwrite the entries
    await tx.partialBlockchainNodes.bulkPut(data);
  } catch (err) {
    console.error(
      "Failed to update partial blockchain nodes: ",
      err.toString()
    );
    throw err;
  }
}

async function updateCommittedNoteTags(tx, inputNoteIds) {
  try {
    for (let i = 0; i < inputNoteIds.length; i++) {
      const noteId = inputNoteIds[i];

      // Remove note tags
      await tx.tags.where("source_note_id").equals(noteId).delete();
    }
  } catch (error) {
    console.error("Error updating committed notes:", error.toString());
    throw error;
  }
}

function uint8ArrayToBase64$1(bytes) {
  const binary = bytes.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return btoa(binary);
}

// Helper function to reconstruct arrays from flattened data
function reconstructFlattenedVec(flattenedVec) {
  const data = flattenedVec.data();
  const lengths = flattenedVec.lengths();

  let index = 0;
  const result = [];
  lengths.forEach((length) => {
    result.push(data.slice(index, index + length));
    index += length;
  });
  return result;
}

const IDS_FILTER_PREFIX = "Ids:";
async function getTransactions(filter) {
  let transactionRecords;

  try {
    if (filter === "Uncommitted") {
      transactionRecords = await transactions
        .filter(
          (tx) => tx.commitHeight === undefined || tx.commitHeight === null
        )
        .toArray();
    } else if (filter.startsWith(IDS_FILTER_PREFIX)) {
      const idsString = filter.substring(IDS_FILTER_PREFIX.length);
      const ids = idsString.split(",");

      if (ids.length > 0) {
        transactionRecords = await transactions
          .where("id")
          .anyOf(ids)
          .toArray();
      } else {
        transactionRecords = [];
      }
    } else {
      transactionRecords = await transactions.toArray();
    }

    if (transactionRecords.length === 0) {
      return [];
    }

    const scriptRoots = transactionRecords.map((transactionRecord) => {
      return transactionRecord.scriptRoot;
    });

    const scripts = await transactionScripts
      .where("scriptRoot")
      .anyOf(scriptRoots)
      .toArray();

    // Create a map of scriptRoot to script for quick lookup
    const scriptMap = new Map();
    scripts.forEach((script) => {
      scriptMap.set(script.scriptRoot, script.txScript);
    });

    const processedTransactions = await Promise.all(
      transactionRecords.map(async (transactionRecord) => {
        let txScriptBase64 = null;

        if (transactionRecord.scriptRoot) {
          const txScript = scriptMap.get(transactionRecord.scriptRoot);

          if (txScript) {
            let txScriptArrayBuffer = await txScript.arrayBuffer();
            let txScriptArray = new Uint8Array(txScriptArrayBuffer);
            txScriptBase64 = uint8ArrayToBase64(txScriptArray);
          }
        }

        if (transactionRecord.discardCause) {
          let discardCauseArrayBuffer =
            await transactionRecord.discardCause.arrayBuffer();
          let discardCauseArray = new Uint8Array(discardCauseArrayBuffer);
          let discardCauseBase64 = uint8ArrayToBase64(discardCauseArray);
          transactionRecord.discardCause = discardCauseBase64;
        }

        let detailsArrayBuffer = await transactionRecord.details.arrayBuffer();
        let detailsArray = new Uint8Array(detailsArrayBuffer);
        let detailsBase64 = uint8ArrayToBase64(detailsArray);
        transactionRecord.details = detailsBase64;

        let data = {
          id: transactionRecord.id,
          details: transactionRecord.details,
          scriptRoot: transactionRecord.scriptRoot
            ? transactionRecord.scriptRoot
            : null,
          txScript: txScriptBase64,
          blockNum: transactionRecord.blockNum,
          commitHeight: transactionRecord.commitHeight
            ? transactionRecord.commitHeight
            : null,
          discardCause: transactionRecord.discardCause
            ? transactionRecord.discardCause
            : null,
        };

        return data;
      })
    );

    return processedTransactions;
  } catch (err) {
    console.error("Failed to get transactions: ", err.toString());
    throw err;
  }
}

async function insertTransactionScript(scriptRoot, txScript) {
  try {
    // check if script root already exists
    let record = await transactionScripts
      .where("scriptRoot")
      .equals(scriptRoot)
      .first();

    if (record) {
      return;
    }

    if (!scriptRoot) {
      throw new Error("Script root must be provided");
    }

    let scriptRootArray = new Uint8Array(scriptRoot);
    let scriptRootBase64 = uint8ArrayToBase64(scriptRootArray);

    let txScriptBlob = null;
    if (txScript) {
      txScriptBlob = new Blob([new Uint8Array(txScript)]);
    }

    const data = {
      scriptRoot: scriptRootBase64,
      txScript: txScriptBlob,
    };

    await transactionScripts.add(data);
  } catch (error) {
    // Check if the error is because the record already exists
    if (error.name === "ConstraintError") ; else {
      console.error("Failed to insert transaction script: ", error.toString());
      throw error;
    }
  }
}

async function upsertTransactionRecord(
  transactionId,
  details,
  scriptRoot,
  blockNum,
  committed,
  discardCause
) {
  try {
    let detailsBlob = new Blob([new Uint8Array(details)]);

    let scriptRootBase64 = null;
    if (scriptRoot !== null) {
      let scriptRootArray = new Uint8Array(scriptRoot);
      scriptRootBase64 = uint8ArrayToBase64(scriptRootArray);
    }

    let discardCauseBlob = null;
    if (discardCause !== null) {
      discardCauseBlob = new Blob([new Uint8Array(discardCause)]);
    }

    const data = {
      id: transactionId,
      details: detailsBlob,
      scriptRoot: scriptRootBase64,
      blockNum: blockNum,
      commitHeight: committed ? committed : null,
      discardCause: discardCauseBlob,
    };

    await transactions.put(data);
  } catch (err) {
    console.error("Failed to insert proven transaction data: ", err.toString());
    throw err;
  }
}

function uint8ArrayToBase64(bytes) {
  const binary = bytes.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return btoa(binary);
}

let wasm;

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let WASM_VECTOR_LEN = 0;

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); }
function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_export_3(addHeapObject(e));
    }
}

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(takeObject(mem.getUint32(i, true)));
    }
    return result;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => {
    wasm.__wbindgen_export_4.get(state.dtor)(state.a, state.b);
});

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_4.get(state.dtor)(a, state.b);
                CLOSURE_DTORS.unregister(state);
            } else {
                state.a = a;
            }
        }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let stack_pointer = 128;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    const mem = getDataViewMemory0();
    for (let i = 0; i < array.length; i++) {
        mem.setUint32(ptr + 4 * i, addHeapObject(array[i]), true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

let cachedBigUint64ArrayMemory0 = null;

function getBigUint64ArrayMemory0() {
    if (cachedBigUint64ArrayMemory0 === null || cachedBigUint64ArrayMemory0.byteLength === 0) {
        cachedBigUint64ArrayMemory0 = new BigUint64Array(wasm.memory.buffer);
    }
    return cachedBigUint64ArrayMemory0;
}

function passArray64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getBigUint64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedUint32ArrayMemory0 = null;

function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}
function __wbg_adapter_52(arg0, arg1, arg2) {
    wasm.__wbindgen_export_5(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_496(arg0, arg1, arg2, arg3) {
    wasm.__wbindgen_export_6(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

/**
 * @enum {0 | 1 | 2 | 3}
 */
const AccountType = Object.freeze({
    FungibleFaucet: 0, "0": "FungibleFaucet",
    NonFungibleFaucet: 1, "1": "NonFungibleFaucet",
    RegularAccountImmutableCode: 2, "2": "RegularAccountImmutableCode",
    RegularAccountUpdatableCode: 3, "3": "RegularAccountUpdatableCode",
});
/**
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
 */
const InputNoteState = Object.freeze({
    Expected: 0, "0": "Expected",
    Unverified: 1, "1": "Unverified",
    Committed: 2, "2": "Committed",
    Invalid: 3, "3": "Invalid",
    ProcessingAuthenticated: 4, "4": "ProcessingAuthenticated",
    ProcessingUnauthenticated: 5, "5": "ProcessingUnauthenticated",
    ConsumedAuthenticatedLocal: 6, "6": "ConsumedAuthenticatedLocal",
    ConsumedUnauthenticatedLocal: 7, "7": "ConsumedUnauthenticatedLocal",
    ConsumedExternal: 8, "8": "ConsumedExternal",
});
/**
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
 */
const NoteFilterTypes = Object.freeze({
    All: 0, "0": "All",
    Consumed: 1, "1": "Consumed",
    Committed: 2, "2": "Committed",
    Expected: 3, "3": "Expected",
    Processing: 4, "4": "Processing",
    List: 5, "5": "List",
    Unique: 6, "6": "Unique",
    Nullifiers: 7, "7": "Nullifiers",
    Unverified: 8, "8": "Unverified",
});
/**
 * @enum {2 | 3 | 1}
 */
const NoteType = Object.freeze({
    /**
     * Notes with this type have only their hash published to the network.
     */
    Private: 2, "2": "Private",
    /**
     * Notes with this type are shared with the network encrypted.
     */
    Encrypted: 3, "3": "Encrypted",
    /**
     * Notes with this type are fully shared with the network.
     */
    Public: 1, "1": "Public",
});

const __wbindgen_enum_ReadableStreamType = ["bytes"];

const __wbindgen_enum_ReferrerPolicy = ["", "no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin", "unsafe-url", "same-origin", "strict-origin", "strict-origin-when-cross-origin"];

const __wbindgen_enum_RequestCache = ["default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"];

const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];

const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];

const __wbindgen_enum_RequestRedirect = ["follow", "error", "manual"];

const AccountFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_account_free(ptr >>> 0, 1));

class Account {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Account.prototype);
        obj.__wbg_ptr = ptr;
        AccountFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_account_free(ptr, 0);
    }
    /**
     * @returns {AccountId}
     */
    id() {
        const ret = wasm.account_id(this.__wbg_ptr);
        return AccountId.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    commitment() {
        const ret = wasm.account_commitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {Felt}
     */
    nonce() {
        const ret = wasm.account_nonce(this.__wbg_ptr);
        return Felt.__wrap(ret);
    }
    /**
     * @returns {AssetVault}
     */
    vault() {
        const ret = wasm.account_vault(this.__wbg_ptr);
        return AssetVault.__wrap(ret);
    }
    /**
     * @returns {AccountStorage}
     */
    storage() {
        const ret = wasm.account_storage(this.__wbg_ptr);
        return AccountStorage.__wrap(ret);
    }
    /**
     * @returns {AccountCode}
     */
    code() {
        const ret = wasm.account_code(this.__wbg_ptr);
        return AccountCode.__wrap(ret);
    }
    /**
     * @returns {boolean}
     */
    isFaucet() {
        const ret = wasm.account_isFaucet(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    isRegularAccount() {
        const ret = wasm.account_isRegularAccount(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    isUpdatable() {
        const ret = wasm.account_isUpdatable(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    isPublic() {
        const ret = wasm.account_isPublic(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    isNew() {
        const ret = wasm.account_isNew(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Uint8Array}
     */
    serialize() {
        const ret = wasm.account_serialize(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {Account}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.account_deserialize(retptr, addBorrowedObject(bytes));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Account.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
}

const AccountBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_accountbuilder_free(ptr >>> 0, 1));

class AccountBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AccountBuilder.prototype);
        obj.__wbg_ptr = ptr;
        AccountBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_accountbuilder_free(ptr, 0);
    }
    /**
     * @param {Uint8Array} init_seed
     */
    constructor(init_seed) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(init_seed, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.accountbuilder_new(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            AccountBuilderFinalization.register(this, this.__wbg_ptr, this);
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {AccountType} account_type
     * @returns {AccountBuilder}
     */
    accountType(account_type) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.accountbuilder_accountType(ptr, account_type);
        return AccountBuilder.__wrap(ret);
    }
    /**
     * @param {AccountStorageMode} storage_mode
     * @returns {AccountBuilder}
     */
    storageMode(storage_mode) {
        const ptr = this.__destroy_into_raw();
        _assertClass(storage_mode, AccountStorageMode);
        const ret = wasm.accountbuilder_storageMode(ptr, storage_mode.__wbg_ptr);
        return AccountBuilder.__wrap(ret);
    }
    /**
     * @param {AccountComponent} account_component
     * @returns {AccountBuilder}
     */
    withComponent(account_component) {
        const ptr = this.__destroy_into_raw();
        _assertClass(account_component, AccountComponent);
        const ret = wasm.accountbuilder_withComponent(ptr, account_component.__wbg_ptr);
        return AccountBuilder.__wrap(ret);
    }
    /**
     * @param {AccountComponent} account_component
     * @returns {AccountBuilder}
     */
    withAuthComponent(account_component) {
        const ptr = this.__destroy_into_raw();
        _assertClass(account_component, AccountComponent);
        const ret = wasm.accountbuilder_withAuthComponent(ptr, account_component.__wbg_ptr);
        return AccountBuilder.__wrap(ret);
    }
    /**
     * @returns {AccountBuilderResult}
     */
    build() {
        try {
            const ptr = this.__destroy_into_raw();
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.accountbuilder_build(retptr, ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return AccountBuilderResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const AccountBuilderResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_accountbuilderresult_free(ptr >>> 0, 1));

class AccountBuilderResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AccountBuilderResult.prototype);
        obj.__wbg_ptr = ptr;
        AccountBuilderResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountBuilderResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_accountbuilderresult_free(ptr, 0);
    }
    /**
     * @returns {Account}
     */
    get account() {
        const ret = wasm.accountbuilderresult_account(this.__wbg_ptr);
        return Account.__wrap(ret);
    }
    /**
     * @returns {Word}
     */
    get seed() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return Word.__wrap(ret);
    }
}

const AccountCodeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_accountcode_free(ptr >>> 0, 1));

class AccountCode {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AccountCode.prototype);
        obj.__wbg_ptr = ptr;
        AccountCodeFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountCodeFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_accountcode_free(ptr, 0);
    }
    /**
     * @returns {RpoDigest}
     */
    commitment() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
}

const AccountComponentFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_accountcomponent_free(ptr >>> 0, 1));

class AccountComponent {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AccountComponent.prototype);
        obj.__wbg_ptr = ptr;
        AccountComponentFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountComponentFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_accountcomponent_free(ptr, 0);
    }
    /**
     * @param {string} account_code
     * @param {Assembler} assembler
     * @param {StorageSlot[]} storage_slots
     * @returns {AccountComponent}
     */
    static compile(account_code, assembler, storage_slots) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(account_code, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(assembler, Assembler);
            const ptr1 = passArrayJsValueToWasm0(storage_slots, wasm.__wbindgen_export_0);
            const len1 = WASM_VECTOR_LEN;
            wasm.accountcomponent_compile(retptr, ptr0, len0, assembler.__wbg_ptr, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return AccountComponent.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {AccountComponent}
     */
    withSupportsAllTypes() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.accountcomponent_withSupportsAllTypes(ptr);
        return AccountComponent.__wrap(ret);
    }
    /**
     * @param {string} procedure_name
     * @returns {string}
     */
    getProcedureHash(procedure_name) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(procedure_name, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.accountcomponent_getProcedureHash(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {SecretKey} secret_key
     * @returns {AccountComponent}
     */
    static createAuthComponent(secret_key) {
        _assertClass(secret_key, SecretKey);
        const ret = wasm.accountcomponent_createAuthComponent(secret_key.__wbg_ptr);
        return AccountComponent.__wrap(ret);
    }
}

const AccountDeltaFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_accountdelta_free(ptr >>> 0, 1));

class AccountDelta {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AccountDelta.prototype);
        obj.__wbg_ptr = ptr;
        AccountDeltaFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountDeltaFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_accountdelta_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    isEmpty() {
        const ret = wasm.accountdelta_isEmpty(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Felt}
     */
    nonceDelta() {
        const ret = wasm.accountdelta_nonceDelta(this.__wbg_ptr);
        return Felt.__wrap(ret);
    }
}

const AccountHeaderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_accountheader_free(ptr >>> 0, 1));

class AccountHeader {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AccountHeader.prototype);
        obj.__wbg_ptr = ptr;
        AccountHeaderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountHeaderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_accountheader_free(ptr, 0);
    }
    /**
     * @returns {RpoDigest}
     */
    commitment() {
        const ret = wasm.accountheader_commitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {AccountId}
     */
    id() {
        const ret = wasm.accountheader_id(this.__wbg_ptr);
        return AccountId.__wrap(ret);
    }
    /**
     * @returns {Felt}
     */
    nonce() {
        const ret = wasm.accountheader_nonce(this.__wbg_ptr);
        return Felt.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    vaultCommitment() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    storageCommitment() {
        const ret = wasm.accountheader_storageCommitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    codeCommitment() {
        const ret = wasm.accountheader_codeCommitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
}

const AccountIdFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_accountid_free(ptr >>> 0, 1));

class AccountId {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AccountId.prototype);
        obj.__wbg_ptr = ptr;
        AccountIdFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountIdFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_accountid_free(ptr, 0);
    }
    /**
     * @param {string} hex
     * @returns {AccountId}
     */
    static fromHex(hex) {
        const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.accountid_fromHex(ptr0, len0);
        return AccountId.__wrap(ret);
    }
    /**
     * @param {string} bech32
     * @returns {AccountId}
     */
    static fromBech32(bech32) {
        const ptr0 = passStringToWasm0(bech32, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.accountid_fromBech32(ptr0, len0);
        return AccountId.__wrap(ret);
    }
    /**
     * @returns {boolean}
     */
    isFaucet() {
        const ret = wasm.accountid_isFaucet(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    isRegularAccount() {
        const ret = wasm.accountid_isRegularAccount(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.accountid_toString(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    toBech32() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.accountid_toBech32(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {Felt}
     */
    prefix() {
        const ret = wasm.accountid_prefix(this.__wbg_ptr);
        return Felt.__wrap(ret);
    }
    /**
     * @returns {Felt}
     */
    suffix() {
        const ret = wasm.accountid_suffix(this.__wbg_ptr);
        return Felt.__wrap(ret);
    }
}

const AccountStorageFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_accountstorage_free(ptr >>> 0, 1));

class AccountStorage {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AccountStorage.prototype);
        obj.__wbg_ptr = ptr;
        AccountStorageFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountStorageFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_accountstorage_free(ptr, 0);
    }
    /**
     * @returns {RpoDigest}
     */
    commitment() {
        const ret = wasm.accountstorage_commitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @param {number} index
     * @returns {RpoDigest | undefined}
     */
    getItem(index) {
        const ret = wasm.accountstorage_getItem(this.__wbg_ptr, index);
        return ret === 0 ? undefined : RpoDigest.__wrap(ret);
    }
}

const AccountStorageModeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_accountstoragemode_free(ptr >>> 0, 1));

class AccountStorageMode {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AccountStorageMode.prototype);
        obj.__wbg_ptr = ptr;
        AccountStorageModeFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountStorageModeFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_accountstoragemode_free(ptr, 0);
    }
    /**
     * @returns {AccountStorageMode}
     */
    static private() {
        const ret = wasm.accountstoragemode_private();
        return AccountStorageMode.__wrap(ret);
    }
    /**
     * @returns {AccountStorageMode}
     */
    static public() {
        const ret = wasm.accountstoragemode_public();
        return AccountStorageMode.__wrap(ret);
    }
    /**
     * @returns {AccountStorageMode}
     */
    static network() {
        const ret = wasm.accountstoragemode_network();
        return AccountStorageMode.__wrap(ret);
    }
    /**
     * @param {string} s
     * @returns {AccountStorageMode}
     */
    static tryFromStr(s) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(s, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.accountstoragemode_tryFromStr(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return AccountStorageMode.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {string}
     */
    asStr() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.accountstoragemode_asStr(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    }
}

const AccountStorageRequirementsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_accountstoragerequirements_free(ptr >>> 0, 1));

class AccountStorageRequirements {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AccountStorageRequirements.prototype);
        obj.__wbg_ptr = ptr;
        AccountStorageRequirementsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AccountStorageRequirementsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_accountstoragerequirements_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.accountstoragerequirements_new();
        this.__wbg_ptr = ret >>> 0;
        AccountStorageRequirementsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {SlotAndKeys[]} slots_and_keys
     * @returns {AccountStorageRequirements}
     */
    static fromSlotAndKeysArray(slots_and_keys) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayJsValueToWasm0(slots_and_keys, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.accountstoragerequirements_fromSlotAndKeysArray(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return AccountStorageRequirements.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const AdviceInputsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_adviceinputs_free(ptr >>> 0, 1));

class AdviceInputs {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AdviceInputs.prototype);
        obj.__wbg_ptr = ptr;
        AdviceInputsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AdviceInputsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_adviceinputs_free(ptr, 0);
    }
    /**
     * @returns {Felt[]}
     */
    stack() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.adviceinputs_stack(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {RpoDigest} key
     * @returns {Felt[] | undefined}
     */
    mappedValues(key) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(key, RpoDigest);
            wasm.adviceinputs_mappedValues(retptr, this.__wbg_ptr, key.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayJsValueFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const AdviceMapFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_advicemap_free(ptr >>> 0, 1));

class AdviceMap {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AdviceMapFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_advicemap_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.accountstoragerequirements_new();
        this.__wbg_ptr = ret >>> 0;
        AdviceMapFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {RpoDigest} key
     * @param {FeltArray} value
     * @returns {Felt[] | undefined}
     */
    insert(key, value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(key, RpoDigest);
            _assertClass(value, FeltArray);
            wasm.advicemap_insert(retptr, this.__wbg_ptr, key.__wbg_ptr, value.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getArrayJsValueFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const AssemblerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_assembler_free(ptr >>> 0, 1));

class Assembler {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Assembler.prototype);
        obj.__wbg_ptr = ptr;
        AssemblerFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AssemblerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_assembler_free(ptr, 0);
    }
    /**
     * @param {Library} library
     * @returns {Assembler}
     */
    withLibrary(library) {
        try {
            const ptr = this.__destroy_into_raw();
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(library, Library);
            wasm.assembler_withLibrary(retptr, ptr, library.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Assembler.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {boolean} yes
     * @returns {Assembler}
     */
    withDebugMode(yes) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.assembler_withDebugMode(ptr, yes);
        return Assembler.__wrap(ret);
    }
    /**
     * @param {string} note_script
     * @returns {NoteScript}
     */
    compileNoteScript(note_script) {
        try {
            const ptr = this.__destroy_into_raw();
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(note_script, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.assembler_compileNoteScript(retptr, ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return NoteScript.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const AssemblerUtilsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_assemblerutils_free(ptr >>> 0, 1));

class AssemblerUtils {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AssemblerUtilsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_assemblerutils_free(ptr, 0);
    }
    /**
     * @param {Assembler} assembler
     * @param {string} library_path
     * @param {string} source_code
     * @returns {Library}
     */
    static createAccountComponentLibrary(assembler, library_path, source_code) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(assembler, Assembler);
            const ptr0 = passStringToWasm0(library_path, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(source_code, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len1 = WASM_VECTOR_LEN;
            wasm.assemblerutils_createAccountComponentLibrary(retptr, assembler.__wbg_ptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return Library.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const AssetVaultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_assetvault_free(ptr >>> 0, 1));

class AssetVault {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AssetVault.prototype);
        obj.__wbg_ptr = ptr;
        AssetVaultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AssetVaultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_assetvault_free(ptr, 0);
    }
    /**
     * @returns {RpoDigest}
     */
    root() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @param {AccountId} faucet_id
     * @returns {bigint}
     */
    getBalance(faucet_id) {
        _assertClass(faucet_id, AccountId);
        const ret = wasm.assetvault_getBalance(this.__wbg_ptr, faucet_id.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @returns {FungibleAsset[]}
     */
    fungibleAssets() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.assetvault_fungibleAssets(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const AuthSecretKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_authsecretkey_free(ptr >>> 0, 1));

class AuthSecretKey {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AuthSecretKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_authsecretkey_free(ptr, 0);
    }
    /**
     * @returns {Word}
     */
    getRpoFalcon512PublicKeyAsWord() {
        const ret = wasm.authsecretkey_getRpoFalcon512PublicKeyAsWord(this.__wbg_ptr);
        return Word.__wrap(ret);
    }
    /**
     * @returns {Felt[]}
     */
    getRpoFalcon512SecretKeyAsFelts() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.authsecretkey_getRpoFalcon512SecretKeyAsFelts(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const BlockHeaderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_blockheader_free(ptr >>> 0, 1));

class BlockHeader {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BlockHeader.prototype);
        obj.__wbg_ptr = ptr;
        BlockHeaderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BlockHeaderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_blockheader_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    version() {
        const ret = wasm.blockheader_version(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {RpoDigest}
     */
    commitment() {
        const ret = wasm.blockheader_commitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    subCommitment() {
        const ret = wasm.blockheader_subCommitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    prevBlockCommitment() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    blockNum() {
        const ret = wasm.blockheader_blockNum(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {RpoDigest}
     */
    chainCommitment() {
        const ret = wasm.accountheader_storageCommitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    accountRoot() {
        const ret = wasm.accountheader_codeCommitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    nullifierRoot() {
        const ret = wasm.blockheader_nullifierRoot(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    noteRoot() {
        const ret = wasm.blockheader_noteRoot(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    txCommitment() {
        const ret = wasm.blockheader_txCommitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    txKernelCommitment() {
        const ret = wasm.blockheader_txKernelCommitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    proofCommitment() {
        const ret = wasm.blockheader_proofCommitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    timestamp() {
        const ret = wasm.blockheader_timestamp(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const ConsumableNoteRecordFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_consumablenoterecord_free(ptr >>> 0, 1));

class ConsumableNoteRecord {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ConsumableNoteRecord.prototype);
        obj.__wbg_ptr = ptr;
        ConsumableNoteRecordFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ConsumableNoteRecordFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_consumablenoterecord_free(ptr, 0);
    }
    /**
     * @param {InputNoteRecord} input_note_record
     * @param {NoteConsumability[]} note_consumability
     */
    constructor(input_note_record, note_consumability) {
        _assertClass(input_note_record, InputNoteRecord);
        var ptr0 = input_note_record.__destroy_into_raw();
        const ptr1 = passArrayJsValueToWasm0(note_consumability, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.consumablenoterecord_new(ptr0, ptr1, len1);
        this.__wbg_ptr = ret >>> 0;
        ConsumableNoteRecordFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {InputNoteRecord}
     */
    inputNoteRecord() {
        const ret = wasm.consumablenoterecord_inputNoteRecord(this.__wbg_ptr);
        return InputNoteRecord.__wrap(ret);
    }
    /**
     * @returns {NoteConsumability[]}
     */
    noteConsumability() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.consumablenoterecord_noteConsumability(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const ExecutedTransactionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_executedtransaction_free(ptr >>> 0, 1));

class ExecutedTransaction {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ExecutedTransaction.prototype);
        obj.__wbg_ptr = ptr;
        ExecutedTransactionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ExecutedTransactionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_executedtransaction_free(ptr, 0);
    }
    /**
     * @returns {TransactionId}
     */
    id() {
        const ret = wasm.executedtransaction_id(this.__wbg_ptr);
        return TransactionId.__wrap(ret);
    }
    /**
     * @returns {AccountId}
     */
    accountId() {
        const ret = wasm.executedtransaction_accountId(this.__wbg_ptr);
        return AccountId.__wrap(ret);
    }
    /**
     * @returns {Account}
     */
    initialAccount() {
        const ret = wasm.executedtransaction_initialAccount(this.__wbg_ptr);
        return Account.__wrap(ret);
    }
    /**
     * @returns {AccountHeader}
     */
    finalAccount() {
        const ret = wasm.executedtransaction_finalAccount(this.__wbg_ptr);
        return AccountHeader.__wrap(ret);
    }
    /**
     * @returns {InputNotes}
     */
    inputNotes() {
        const ret = wasm.executedtransaction_inputNotes(this.__wbg_ptr);
        return InputNotes.__wrap(ret);
    }
    /**
     * @returns {OutputNotes}
     */
    outputNotes() {
        const ret = wasm.executedtransaction_outputNotes(this.__wbg_ptr);
        return OutputNotes.__wrap(ret);
    }
    /**
     * @returns {TransactionArgs}
     */
    txArgs() {
        const ret = wasm.executedtransaction_txArgs(this.__wbg_ptr);
        return TransactionArgs.__wrap(ret);
    }
    /**
     * @returns {BlockHeader}
     */
    blockHeader() {
        const ret = wasm.executedtransaction_blockHeader(this.__wbg_ptr);
        return BlockHeader.__wrap(ret);
    }
    /**
     * @returns {AccountDelta}
     */
    accountDelta() {
        const ret = wasm.executedtransaction_accountDelta(this.__wbg_ptr);
        return AccountDelta.__wrap(ret);
    }
}

const FeltFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_felt_free(ptr >>> 0, 1));

class Felt {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Felt.prototype);
        obj.__wbg_ptr = ptr;
        FeltFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof Felt)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FeltFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_felt_free(ptr, 0);
    }
    /**
     * @param {bigint} value
     */
    constructor(value) {
        const ret = wasm.felt_new(value);
        this.__wbg_ptr = ret >>> 0;
        FeltFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {bigint}
     */
    asInt() {
        const ret = wasm.felt_asInt(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.felt_toString(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    }
}

const FeltArrayFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_feltarray_free(ptr >>> 0, 1));

class FeltArray {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FeltArrayFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_feltarray_free(ptr, 0);
    }
    /**
     * @param {Felt[] | null} [felts_array]
     */
    constructor(felts_array) {
        var ptr0 = isLikeNone(felts_array) ? 0 : passArrayJsValueToWasm0(felts_array, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.feltarray_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        FeltArrayFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Felt} felt
     */
    append(felt) {
        _assertClass(felt, Felt);
        wasm.feltarray_append(this.__wbg_ptr, felt.__wbg_ptr);
    }
}

const FlattenedU8VecFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_flattenedu8vec_free(ptr >>> 0, 1));

class FlattenedU8Vec {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(FlattenedU8Vec.prototype);
        obj.__wbg_ptr = ptr;
        FlattenedU8VecFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FlattenedU8VecFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_flattenedu8vec_free(ptr, 0);
    }
    /**
     * @returns {Uint8Array}
     */
    data() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.flattenedu8vec_data(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Uint32Array}
     */
    lengths() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.flattenedu8vec_lengths(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {number}
     */
    num_inner_vecs() {
        const ret = wasm.flattenedu8vec_num_inner_vecs(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const ForeignAccountFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_foreignaccount_free(ptr >>> 0, 1));

class ForeignAccount {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ForeignAccount.prototype);
        obj.__wbg_ptr = ptr;
        ForeignAccountFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof ForeignAccount)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ForeignAccountFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_foreignaccount_free(ptr, 0);
    }
    /**
     * @param {AccountId} account_id
     * @param {AccountStorageRequirements} storage_requirements
     * @returns {ForeignAccount}
     */
    static public(account_id, storage_requirements) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(account_id, AccountId);
            var ptr0 = account_id.__destroy_into_raw();
            _assertClass(storage_requirements, AccountStorageRequirements);
            var ptr1 = storage_requirements.__destroy_into_raw();
            wasm.foreignaccount_public(retptr, ptr0, ptr1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return ForeignAccount.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {AccountStorageRequirements}
     */
    storage_slot_requirements() {
        const ret = wasm.foreignaccount_storage_slot_requirements(this.__wbg_ptr);
        return AccountStorageRequirements.__wrap(ret);
    }
    /**
     * @returns {AccountId}
     */
    account_id() {
        const ret = wasm.foreignaccount_account_id(this.__wbg_ptr);
        return AccountId.__wrap(ret);
    }
}

const FungibleAssetFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_fungibleasset_free(ptr >>> 0, 1));

class FungibleAsset {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(FungibleAsset.prototype);
        obj.__wbg_ptr = ptr;
        FungibleAssetFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof FungibleAsset)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FungibleAssetFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_fungibleasset_free(ptr, 0);
    }
    /**
     * @param {AccountId} faucet_id
     * @param {bigint} amount
     */
    constructor(faucet_id, amount) {
        _assertClass(faucet_id, AccountId);
        const ret = wasm.fungibleasset_new(faucet_id.__wbg_ptr, amount);
        this.__wbg_ptr = ret >>> 0;
        FungibleAssetFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {AccountId}
     */
    faucetId() {
        const ret = wasm.account_id(this.__wbg_ptr);
        return AccountId.__wrap(ret);
    }
    /**
     * @returns {bigint}
     */
    amount() {
        const ret = wasm.fungibleasset_amount(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @returns {Word}
     */
    intoWord() {
        const ret = wasm.fungibleasset_intoWord(this.__wbg_ptr);
        return Word.__wrap(ret);
    }
}

const InputNoteFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_inputnote_free(ptr >>> 0, 1));

class InputNote {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(InputNote.prototype);
        obj.__wbg_ptr = ptr;
        InputNoteFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        InputNoteFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_inputnote_free(ptr, 0);
    }
    /**
     * @returns {NoteId}
     */
    id() {
        const ret = wasm.inputnote_id(this.__wbg_ptr);
        return NoteId.__wrap(ret);
    }
    /**
     * @returns {Note}
     */
    note() {
        const ret = wasm.inputnote_note(this.__wbg_ptr);
        return Note.__wrap(ret);
    }
    /**
     * @returns {NoteInclusionProof | undefined}
     */
    proof() {
        const ret = wasm.inputnote_proof(this.__wbg_ptr);
        return ret === 0 ? undefined : NoteInclusionProof.__wrap(ret);
    }
    /**
     * @returns {NoteLocation | undefined}
     */
    location() {
        const ret = wasm.inputnote_location(this.__wbg_ptr);
        return ret === 0 ? undefined : NoteLocation.__wrap(ret);
    }
}

const InputNoteRecordFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_inputnoterecord_free(ptr >>> 0, 1));

class InputNoteRecord {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(InputNoteRecord.prototype);
        obj.__wbg_ptr = ptr;
        InputNoteRecordFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        InputNoteRecordFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_inputnoterecord_free(ptr, 0);
    }
    /**
     * @returns {NoteId}
     */
    id() {
        const ret = wasm.inputnoterecord_id(this.__wbg_ptr);
        return NoteId.__wrap(ret);
    }
    /**
     * @returns {InputNoteState}
     */
    state() {
        const ret = wasm.inputnoterecord_state(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {NoteDetails}
     */
    details() {
        const ret = wasm.inputnoterecord_details(this.__wbg_ptr);
        return NoteDetails.__wrap(ret);
    }
    /**
     * @returns {NoteMetadata | undefined}
     */
    metadata() {
        const ret = wasm.inputnoterecord_metadata(this.__wbg_ptr);
        return ret === 0 ? undefined : NoteMetadata.__wrap(ret);
    }
    /**
     * @returns {NoteInclusionProof | undefined}
     */
    inclusionProof() {
        const ret = wasm.inputnoterecord_inclusionProof(this.__wbg_ptr);
        return ret === 0 ? undefined : NoteInclusionProof.__wrap(ret);
    }
    /**
     * @returns {string | undefined}
     */
    consumerTransactionId() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.inputnoterecord_consumerTransactionId(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_2(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {string}
     */
    nullifier() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.inputnoterecord_nullifier(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    isAuthenticated() {
        const ret = wasm.inputnoterecord_isAuthenticated(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    isConsumed() {
        const ret = wasm.inputnoterecord_isConsumed(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    isProcessing() {
        const ret = wasm.inputnoterecord_isProcessing(this.__wbg_ptr);
        return ret !== 0;
    }
}

const InputNotesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_inputnotes_free(ptr >>> 0, 1));

class InputNotes {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(InputNotes.prototype);
        obj.__wbg_ptr = ptr;
        InputNotesFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        InputNotesFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_inputnotes_free(ptr, 0);
    }
    /**
     * @returns {RpoDigest}
     */
    commitment() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    numNotes() {
        const ret = wasm.inputnotes_numNotes(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    isEmpty() {
        const ret = wasm.inputnotes_isEmpty(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {number} index
     * @returns {InputNote}
     */
    getNote(index) {
        const ret = wasm.inputnotes_getNote(this.__wbg_ptr, index);
        return InputNote.__wrap(ret);
    }
    /**
     * @returns {InputNote[]}
     */
    notes() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.inputnotes_notes(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const IntoUnderlyingByteSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingbytesource_free(ptr >>> 0, 1));

class IntoUnderlyingByteSource {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingByteSourceFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingbytesource_free(ptr, 0);
    }
    /**
     * @returns {ReadableStreamType}
     */
    get type() {
        const ret = wasm.intounderlyingbytesource_type(this.__wbg_ptr);
        return __wbindgen_enum_ReadableStreamType[ret];
    }
    /**
     * @returns {number}
     */
    get autoAllocateChunkSize() {
        const ret = wasm.intounderlyingbytesource_autoAllocateChunkSize(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {ReadableByteStreamController} controller
     */
    start(controller) {
        wasm.intounderlyingbytesource_start(this.__wbg_ptr, addHeapObject(controller));
    }
    /**
     * @param {ReadableByteStreamController} controller
     * @returns {Promise<any>}
     */
    pull(controller) {
        const ret = wasm.intounderlyingbytesource_pull(this.__wbg_ptr, addHeapObject(controller));
        return takeObject(ret);
    }
    cancel() {
        const ptr = this.__destroy_into_raw();
        wasm.intounderlyingbytesource_cancel(ptr);
    }
}

const IntoUnderlyingSinkFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingsink_free(ptr >>> 0, 1));

class IntoUnderlyingSink {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingSinkFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingsink_free(ptr, 0);
    }
    /**
     * @param {any} chunk
     * @returns {Promise<any>}
     */
    write(chunk) {
        const ret = wasm.intounderlyingsink_write(this.__wbg_ptr, addHeapObject(chunk));
        return takeObject(ret);
    }
    /**
     * @returns {Promise<any>}
     */
    close() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.intounderlyingsink_close(ptr);
        return takeObject(ret);
    }
    /**
     * @param {any} reason
     * @returns {Promise<any>}
     */
    abort(reason) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.intounderlyingsink_abort(ptr, addHeapObject(reason));
        return takeObject(ret);
    }
}

const IntoUnderlyingSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingsource_free(ptr >>> 0, 1));

class IntoUnderlyingSource {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingSourceFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingsource_free(ptr, 0);
    }
    /**
     * @param {ReadableStreamDefaultController} controller
     * @returns {Promise<any>}
     */
    pull(controller) {
        const ret = wasm.intounderlyingsource_pull(this.__wbg_ptr, addHeapObject(controller));
        return takeObject(ret);
    }
    cancel() {
        const ptr = this.__destroy_into_raw();
        wasm.intounderlyingsource_cancel(ptr);
    }
}

const LibraryFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_library_free(ptr >>> 0, 1));

class Library {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Library.prototype);
        obj.__wbg_ptr = ptr;
        LibraryFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LibraryFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_library_free(ptr, 0);
    }
}

const MerklePathFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_merklepath_free(ptr >>> 0, 1));

class MerklePath {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(MerklePath.prototype);
        obj.__wbg_ptr = ptr;
        MerklePathFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MerklePathFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_merklepath_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    depth() {
        const ret = wasm.merklepath_depth(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {RpoDigest[]}
     */
    nodes() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.merklepath_nodes(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {bigint} index
     * @param {RpoDigest} node
     * @returns {RpoDigest}
     */
    computeRoot(index, node) {
        _assertClass(node, RpoDigest);
        const ret = wasm.merklepath_computeRoot(this.__wbg_ptr, index, node.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @param {bigint} index
     * @param {RpoDigest} node
     * @param {RpoDigest} root
     * @returns {boolean}
     */
    verify(index, node, root) {
        _assertClass(node, RpoDigest);
        _assertClass(root, RpoDigest);
        const ret = wasm.merklepath_verify(this.__wbg_ptr, index, node.__wbg_ptr, root.__wbg_ptr);
        return ret !== 0;
    }
}

const NoteFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_note_free(ptr >>> 0, 1));

class Note {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Note.prototype);
        obj.__wbg_ptr = ptr;
        NoteFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_note_free(ptr, 0);
    }
    /**
     * @param {NoteAssets} note_assets
     * @param {NoteMetadata} note_metadata
     * @param {NoteRecipient} note_recipient
     */
    constructor(note_assets, note_metadata, note_recipient) {
        _assertClass(note_assets, NoteAssets);
        _assertClass(note_metadata, NoteMetadata);
        _assertClass(note_recipient, NoteRecipient);
        const ret = wasm.note_new(note_assets.__wbg_ptr, note_metadata.__wbg_ptr, note_recipient.__wbg_ptr);
        this.__wbg_ptr = ret >>> 0;
        NoteFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {NoteId}
     */
    id() {
        const ret = wasm.note_id(this.__wbg_ptr);
        return NoteId.__wrap(ret);
    }
    /**
     * @returns {NoteMetadata}
     */
    metadata() {
        const ret = wasm.note_metadata(this.__wbg_ptr);
        return NoteMetadata.__wrap(ret);
    }
    /**
     * @returns {NoteRecipient}
     */
    recipient() {
        const ret = wasm.note_recipient(this.__wbg_ptr);
        return NoteRecipient.__wrap(ret);
    }
    /**
     * @returns {NoteAssets}
     */
    assets() {
        const ret = wasm.note_assets(this.__wbg_ptr);
        return NoteAssets.__wrap(ret);
    }
    /**
     * @param {AccountId} sender
     * @param {AccountId} target
     * @param {NoteAssets} assets
     * @param {NoteType} note_type
     * @param {Word} serial_num
     * @param {Felt} aux
     * @returns {Note}
     */
    static createP2IDNote(sender, target, assets, note_type, serial_num, aux) {
        _assertClass(sender, AccountId);
        _assertClass(target, AccountId);
        _assertClass(assets, NoteAssets);
        _assertClass(serial_num, Word);
        _assertClass(aux, Felt);
        const ret = wasm.note_createP2IDNote(sender.__wbg_ptr, target.__wbg_ptr, assets.__wbg_ptr, note_type, serial_num.__wbg_ptr, aux.__wbg_ptr);
        return Note.__wrap(ret);
    }
    /**
     * @param {AccountId} sender
     * @param {AccountId} target
     * @param {NoteAssets} assets
     * @param {NoteType} note_type
     * @param {Word} serial_num
     * @param {number} recall_height
     * @param {Felt} aux
     * @returns {Note}
     */
    static createP2IDENote(sender, target, assets, note_type, serial_num, recall_height, aux) {
        _assertClass(sender, AccountId);
        _assertClass(target, AccountId);
        _assertClass(assets, NoteAssets);
        _assertClass(serial_num, Word);
        _assertClass(aux, Felt);
        const ret = wasm.note_createP2IDENote(sender.__wbg_ptr, target.__wbg_ptr, assets.__wbg_ptr, note_type, serial_num.__wbg_ptr, recall_height, aux.__wbg_ptr);
        return Note.__wrap(ret);
    }
}

const NoteAndArgsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteandargs_free(ptr >>> 0, 1));

class NoteAndArgs {

    static __unwrap(jsValue) {
        if (!(jsValue instanceof NoteAndArgs)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteAndArgsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteandargs_free(ptr, 0);
    }
    /**
     * @param {Note} note
     * @param {Word | null} [args]
     */
    constructor(note, args) {
        _assertClass(note, Note);
        var ptr0 = note.__destroy_into_raw();
        let ptr1 = 0;
        if (!isLikeNone(args)) {
            _assertClass(args, Word);
            ptr1 = args.__destroy_into_raw();
        }
        const ret = wasm.noteandargs_new(ptr0, ptr1);
        this.__wbg_ptr = ret >>> 0;
        NoteAndArgsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const NoteAndArgsArrayFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteandargsarray_free(ptr >>> 0, 1));

class NoteAndArgsArray {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteAndArgsArrayFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteandargsarray_free(ptr, 0);
    }
    /**
     * @param {NoteAndArgs[] | null} [note_and_args]
     */
    constructor(note_and_args) {
        var ptr0 = isLikeNone(note_and_args) ? 0 : passArrayJsValueToWasm0(note_and_args, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.noteandargsarray_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        NoteAndArgsArrayFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {NoteAndArgs} note_and_args
     */
    push(note_and_args) {
        _assertClass(note_and_args, NoteAndArgs);
        wasm.noteandargsarray_push(this.__wbg_ptr, note_and_args.__wbg_ptr);
    }
}

const NoteAssetsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteassets_free(ptr >>> 0, 1));

class NoteAssets {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteAssets.prototype);
        obj.__wbg_ptr = ptr;
        NoteAssetsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteAssetsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteassets_free(ptr, 0);
    }
    /**
     * @param {FungibleAsset[] | null} [assets_array]
     */
    constructor(assets_array) {
        var ptr0 = isLikeNone(assets_array) ? 0 : passArrayJsValueToWasm0(assets_array, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.noteassets_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        NoteAssetsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {FungibleAsset} asset
     */
    push(asset) {
        _assertClass(asset, FungibleAsset);
        wasm.noteassets_push(this.__wbg_ptr, asset.__wbg_ptr);
    }
    /**
     * @returns {FungibleAsset[]}
     */
    fungibleAssets() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.noteassets_fungibleAssets(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const NoteConsumabilityFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteconsumability_free(ptr >>> 0, 1));

class NoteConsumability {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteConsumability.prototype);
        obj.__wbg_ptr = ptr;
        NoteConsumabilityFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof NoteConsumability)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteConsumabilityFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteconsumability_free(ptr, 0);
    }
    /**
     * @returns {AccountId}
     */
    accountId() {
        const ret = wasm.noteconsumability_accountId(this.__wbg_ptr);
        return AccountId.__wrap(ret);
    }
    /**
     * @returns {number | undefined}
     */
    consumableAfterBlock() {
        const ret = wasm.noteconsumability_consumableAfterBlock(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
}

const NoteDetailsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notedetails_free(ptr >>> 0, 1));

class NoteDetails {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteDetails.prototype);
        obj.__wbg_ptr = ptr;
        NoteDetailsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof NoteDetails)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteDetailsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notedetails_free(ptr, 0);
    }
    /**
     * @param {NoteAssets} note_assets
     * @param {NoteRecipient} note_recipient
     */
    constructor(note_assets, note_recipient) {
        _assertClass(note_assets, NoteAssets);
        _assertClass(note_recipient, NoteRecipient);
        const ret = wasm.notedetails_new(note_assets.__wbg_ptr, note_recipient.__wbg_ptr);
        this.__wbg_ptr = ret >>> 0;
        NoteDetailsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {NoteId}
     */
    id() {
        const ret = wasm.notedetails_id(this.__wbg_ptr);
        return NoteId.__wrap(ret);
    }
    /**
     * @returns {NoteAssets}
     */
    assets() {
        const ret = wasm.notedetails_assets(this.__wbg_ptr);
        return NoteAssets.__wrap(ret);
    }
    /**
     * @returns {NoteRecipient}
     */
    recipient() {
        const ret = wasm.notedetails_recipient(this.__wbg_ptr);
        return NoteRecipient.__wrap(ret);
    }
}

const NoteDetailsAndTagFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notedetailsandtag_free(ptr >>> 0, 1));

class NoteDetailsAndTag {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteDetailsAndTag.prototype);
        obj.__wbg_ptr = ptr;
        NoteDetailsAndTagFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof NoteDetailsAndTag)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteDetailsAndTagFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notedetailsandtag_free(ptr, 0);
    }
    /**
     * @param {NoteDetails} note_details
     * @param {NoteTag} tag
     */
    constructor(note_details, tag) {
        _assertClass(note_details, NoteDetails);
        var ptr0 = note_details.__destroy_into_raw();
        _assertClass(tag, NoteTag);
        var ptr1 = tag.__destroy_into_raw();
        const ret = wasm.notedetailsandtag_new(ptr0, ptr1);
        this.__wbg_ptr = ret >>> 0;
        NoteDetailsAndTagFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {NoteDetails}
     */
    get noteDetails() {
        const ret = wasm.notedetailsandtag_noteDetails(this.__wbg_ptr);
        return NoteDetails.__wrap(ret);
    }
    /**
     * @returns {NoteTag}
     */
    get tag() {
        const ret = wasm.notedetailsandtag_tag(this.__wbg_ptr);
        return NoteTag.__wrap(ret);
    }
}

const NoteDetailsAndTagArrayFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notedetailsandtagarray_free(ptr >>> 0, 1));

class NoteDetailsAndTagArray {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteDetailsAndTagArrayFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notedetailsandtagarray_free(ptr, 0);
    }
    /**
     * @param {NoteDetailsAndTag[] | null} [note_details_and_tag_array]
     */
    constructor(note_details_and_tag_array) {
        var ptr0 = isLikeNone(note_details_and_tag_array) ? 0 : passArrayJsValueToWasm0(note_details_and_tag_array, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.notedetailsandtagarray_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        NoteDetailsAndTagArrayFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {NoteDetailsAndTag} note_details_and_tag
     */
    push(note_details_and_tag) {
        _assertClass(note_details_and_tag, NoteDetailsAndTag);
        wasm.notedetailsandtagarray_push(this.__wbg_ptr, note_details_and_tag.__wbg_ptr);
    }
}

const NoteDetailsArrayFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notedetailsarray_free(ptr >>> 0, 1));

class NoteDetailsArray {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteDetailsArrayFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notedetailsarray_free(ptr, 0);
    }
    /**
     * @param {NoteDetails[] | null} [note_details_array]
     */
    constructor(note_details_array) {
        var ptr0 = isLikeNone(note_details_array) ? 0 : passArrayJsValueToWasm0(note_details_array, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.notedetailsarray_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        NoteDetailsArrayFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {NoteDetails} note_details
     */
    push(note_details) {
        _assertClass(note_details, NoteDetails);
        wasm.notedetailsarray_push(this.__wbg_ptr, note_details.__wbg_ptr);
    }
}

const NoteExecutionHintFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteexecutionhint_free(ptr >>> 0, 1));

class NoteExecutionHint {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteExecutionHint.prototype);
        obj.__wbg_ptr = ptr;
        NoteExecutionHintFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteExecutionHintFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteexecutionhint_free(ptr, 0);
    }
    /**
     * @returns {NoteExecutionHint}
     */
    static none() {
        const ret = wasm.noteexecutionhint_none();
        return NoteExecutionHint.__wrap(ret);
    }
    /**
     * @returns {NoteExecutionHint}
     */
    static always() {
        const ret = wasm.noteexecutionhint_always();
        return NoteExecutionHint.__wrap(ret);
    }
    /**
     * @param {number} block_num
     * @returns {NoteExecutionHint}
     */
    static afterBlock(block_num) {
        const ret = wasm.noteexecutionhint_afterBlock(block_num);
        return NoteExecutionHint.__wrap(ret);
    }
    /**
     * @param {number} epoch_len
     * @param {number} slot_len
     * @param {number} slot_offset
     * @returns {NoteExecutionHint}
     */
    static onBlockSlot(epoch_len, slot_len, slot_offset) {
        const ret = wasm.noteexecutionhint_onBlockSlot(epoch_len, slot_len, slot_offset);
        return NoteExecutionHint.__wrap(ret);
    }
    /**
     * @param {number} tag
     * @param {number} payload
     * @returns {NoteExecutionHint}
     */
    static fromParts(tag, payload) {
        const ret = wasm.noteexecutionhint_fromParts(tag, payload);
        return NoteExecutionHint.__wrap(ret);
    }
    /**
     * @param {number} block_num
     * @returns {boolean}
     */
    canBeConsumed(block_num) {
        const ret = wasm.noteexecutionhint_canBeConsumed(this.__wbg_ptr, block_num);
        return ret !== 0;
    }
}

const NoteExecutionModeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteexecutionmode_free(ptr >>> 0, 1));

class NoteExecutionMode {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteExecutionMode.prototype);
        obj.__wbg_ptr = ptr;
        NoteExecutionModeFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteExecutionModeFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteexecutionmode_free(ptr, 0);
    }
    /**
     * @returns {NoteExecutionMode}
     */
    static newLocal() {
        const ret = wasm.accountstoragemode_network();
        return NoteExecutionMode.__wrap(ret);
    }
    /**
     * @returns {NoteExecutionMode}
     */
    static newNetwork() {
        const ret = wasm.accountstoragemode_public();
        return NoteExecutionMode.__wrap(ret);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.noteexecutionmode_toString(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    }
}

const NoteFilterFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notefilter_free(ptr >>> 0, 1));

class NoteFilter {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteFilterFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notefilter_free(ptr, 0);
    }
    /**
     * @param {NoteFilterTypes} note_type
     * @param {NoteId[] | null} [note_ids]
     */
    constructor(note_type, note_ids) {
        var ptr0 = isLikeNone(note_ids) ? 0 : passArrayJsValueToWasm0(note_ids, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.notefilter_new(note_type, ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        NoteFilterFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const NoteHeaderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteheader_free(ptr >>> 0, 1));

class NoteHeader {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteHeaderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteheader_free(ptr, 0);
    }
    /**
     * @returns {NoteId}
     */
    id() {
        const ret = wasm.noteheader_id(this.__wbg_ptr);
        return NoteId.__wrap(ret);
    }
    /**
     * @returns {NoteMetadata}
     */
    metadata() {
        const ret = wasm.noteheader_metadata(this.__wbg_ptr);
        return NoteMetadata.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    commitment() {
        const ret = wasm.noteheader_commitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
}

const NoteIdFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteid_free(ptr >>> 0, 1));

class NoteId {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteId.prototype);
        obj.__wbg_ptr = ptr;
        NoteIdFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof NoteId)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteIdFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteid_free(ptr, 0);
    }
    /**
     * @param {RpoDigest} recipient_digest
     * @param {RpoDigest} asset_commitment_digest
     */
    constructor(recipient_digest, asset_commitment_digest) {
        _assertClass(recipient_digest, RpoDigest);
        _assertClass(asset_commitment_digest, RpoDigest);
        const ret = wasm.noteid_new(recipient_digest.__wbg_ptr, asset_commitment_digest.__wbg_ptr);
        this.__wbg_ptr = ret >>> 0;
        NoteIdFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.noteid_toString(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    }
}

const NoteIdAndArgsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteidandargs_free(ptr >>> 0, 1));

class NoteIdAndArgs {

    static __unwrap(jsValue) {
        if (!(jsValue instanceof NoteIdAndArgs)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteIdAndArgsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteidandargs_free(ptr, 0);
    }
    /**
     * @param {NoteId} note_id
     * @param {Word | null} [args]
     */
    constructor(note_id, args) {
        _assertClass(note_id, NoteId);
        var ptr0 = note_id.__destroy_into_raw();
        let ptr1 = 0;
        if (!isLikeNone(args)) {
            _assertClass(args, Word);
            ptr1 = args.__destroy_into_raw();
        }
        const ret = wasm.noteidandargs_new(ptr0, ptr1);
        this.__wbg_ptr = ret >>> 0;
        NoteIdAndArgsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const NoteIdAndArgsArrayFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteidandargsarray_free(ptr >>> 0, 1));

class NoteIdAndArgsArray {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteIdAndArgsArrayFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteidandargsarray_free(ptr, 0);
    }
    /**
     * @param {NoteIdAndArgs[] | null} [note_id_and_args]
     */
    constructor(note_id_and_args) {
        var ptr0 = isLikeNone(note_id_and_args) ? 0 : passArrayJsValueToWasm0(note_id_and_args, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.noteidandargsarray_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        NoteIdAndArgsArrayFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {NoteIdAndArgs} note_id_and_args
     */
    push(note_id_and_args) {
        _assertClass(note_id_and_args, NoteIdAndArgs);
        wasm.noteidandargsarray_push(this.__wbg_ptr, note_id_and_args.__wbg_ptr);
    }
}

const NoteInclusionProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteinclusionproof_free(ptr >>> 0, 1));

class NoteInclusionProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteInclusionProof.prototype);
        obj.__wbg_ptr = ptr;
        NoteInclusionProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteInclusionProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteinclusionproof_free(ptr, 0);
    }
    /**
     * @returns {NoteLocation}
     */
    location() {
        const ret = wasm.noteinclusionproof_location(this.__wbg_ptr);
        return NoteLocation.__wrap(ret);
    }
    /**
     * @returns {MerklePath}
     */
    notePath() {
        const ret = wasm.noteinclusionproof_notePath(this.__wbg_ptr);
        return MerklePath.__wrap(ret);
    }
}

const NoteInputsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noteinputs_free(ptr >>> 0, 1));

class NoteInputs {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteInputsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noteinputs_free(ptr, 0);
    }
    /**
     * @param {FeltArray} felt_array
     */
    constructor(felt_array) {
        _assertClass(felt_array, FeltArray);
        const ret = wasm.noteinputs_new(felt_array.__wbg_ptr);
        this.__wbg_ptr = ret >>> 0;
        NoteInputsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const NoteLocationFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notelocation_free(ptr >>> 0, 1));

class NoteLocation {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteLocation.prototype);
        obj.__wbg_ptr = ptr;
        NoteLocationFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteLocationFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notelocation_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    blockNum() {
        const ret = wasm.notelocation_blockNum(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    nodeIndexInBlock() {
        const ret = wasm.notelocation_nodeIndexInBlock(this.__wbg_ptr);
        return ret;
    }
}

const NoteMetadataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notemetadata_free(ptr >>> 0, 1));

class NoteMetadata {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteMetadata.prototype);
        obj.__wbg_ptr = ptr;
        NoteMetadataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteMetadataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notemetadata_free(ptr, 0);
    }
    /**
     * @param {AccountId} sender
     * @param {NoteType} note_type
     * @param {NoteTag} note_tag
     * @param {NoteExecutionHint} note_execution_hint
     * @param {Felt | null} [aux]
     */
    constructor(sender, note_type, note_tag, note_execution_hint, aux) {
        _assertClass(sender, AccountId);
        _assertClass(note_tag, NoteTag);
        _assertClass(note_execution_hint, NoteExecutionHint);
        let ptr0 = 0;
        if (!isLikeNone(aux)) {
            _assertClass(aux, Felt);
            ptr0 = aux.__destroy_into_raw();
        }
        const ret = wasm.notemetadata_new(sender.__wbg_ptr, note_type, note_tag.__wbg_ptr, note_execution_hint.__wbg_ptr, ptr0);
        this.__wbg_ptr = ret >>> 0;
        NoteMetadataFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {AccountId}
     */
    sender() {
        const ret = wasm.notemetadata_sender(this.__wbg_ptr);
        return AccountId.__wrap(ret);
    }
    /**
     * @returns {NoteTag}
     */
    tag() {
        const ret = wasm.notedetailsandtag_tag(this.__wbg_ptr);
        return NoteTag.__wrap(ret);
    }
    /**
     * @returns {NoteType}
     */
    noteType() {
        const ret = wasm.notemetadata_noteType(this.__wbg_ptr);
        return ret;
    }
}

const NoteRecipientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_noterecipient_free(ptr >>> 0, 1));

class NoteRecipient {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteRecipient.prototype);
        obj.__wbg_ptr = ptr;
        NoteRecipientFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof NoteRecipient)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteRecipientFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_noterecipient_free(ptr, 0);
    }
    /**
     * @param {Word} serial_num
     * @param {NoteScript} note_script
     * @param {NoteInputs} inputs
     */
    constructor(serial_num, note_script, inputs) {
        _assertClass(serial_num, Word);
        _assertClass(note_script, NoteScript);
        _assertClass(inputs, NoteInputs);
        const ret = wasm.noterecipient_new(serial_num.__wbg_ptr, note_script.__wbg_ptr, inputs.__wbg_ptr);
        this.__wbg_ptr = ret >>> 0;
        NoteRecipientFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {RpoDigest}
     */
    digest() {
        const ret = wasm.accountheader_storageCommitment(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
}

const NoteScriptFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notescript_free(ptr >>> 0, 1));

class NoteScript {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteScript.prototype);
        obj.__wbg_ptr = ptr;
        NoteScriptFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteScriptFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notescript_free(ptr, 0);
    }
    /**
     * @returns {NoteScript}
     */
    static p2id() {
        const ret = wasm.notescript_p2id();
        return NoteScript.__wrap(ret);
    }
    /**
     * @returns {NoteScript}
     */
    static p2ide() {
        const ret = wasm.notescript_p2ide();
        return NoteScript.__wrap(ret);
    }
    /**
     * @returns {NoteScript}
     */
    static swap() {
        const ret = wasm.notescript_swap();
        return NoteScript.__wrap(ret);
    }
}

const NoteTagFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notetag_free(ptr >>> 0, 1));

class NoteTag {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteTag.prototype);
        obj.__wbg_ptr = ptr;
        NoteTagFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteTagFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notetag_free(ptr, 0);
    }
    /**
     * @param {AccountId} account_id
     * @returns {NoteTag}
     */
    static fromAccountId(account_id) {
        _assertClass(account_id, AccountId);
        const ret = wasm.notetag_fromAccountId(account_id.__wbg_ptr);
        return NoteTag.__wrap(ret);
    }
    /**
     * @param {number} use_case_id
     * @param {number} payload
     * @param {NoteExecutionMode} execution
     * @returns {NoteTag}
     */
    static forPublicUseCase(use_case_id, payload, execution) {
        _assertClass(execution, NoteExecutionMode);
        const ret = wasm.notetag_forPublicUseCase(use_case_id, payload, execution.__wbg_ptr);
        return NoteTag.__wrap(ret);
    }
    /**
     * @param {number} use_case_id
     * @param {number} payload
     * @returns {NoteTag}
     */
    static forLocalUseCase(use_case_id, payload) {
        const ret = wasm.notetag_forLocalUseCase(use_case_id, payload);
        return NoteTag.__wrap(ret);
    }
    /**
     * @returns {boolean}
     */
    isSingleTarget() {
        const ret = wasm.notetag_isSingleTarget(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {NoteExecutionMode}
     */
    executionMode() {
        const ret = wasm.notetag_executionMode(this.__wbg_ptr);
        return NoteExecutionMode.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    asU32() {
        const ret = wasm.notetag_asU32(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const OutputNoteFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_outputnote_free(ptr >>> 0, 1));

class OutputNote {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(OutputNote.prototype);
        obj.__wbg_ptr = ptr;
        OutputNoteFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof OutputNote)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OutputNoteFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_outputnote_free(ptr, 0);
    }
    /**
     * @param {Note} note
     * @returns {OutputNote}
     */
    static full(note) {
        _assertClass(note, Note);
        const ret = wasm.outputnote_full(note.__wbg_ptr);
        return OutputNote.__wrap(ret);
    }
    /**
     * @param {PartialNote} partial_note
     * @returns {OutputNote}
     */
    static partial(partial_note) {
        _assertClass(partial_note, PartialNote);
        const ret = wasm.outputnote_partial(partial_note.__wbg_ptr);
        return OutputNote.__wrap(ret);
    }
    /**
     * @param {NoteHeader} note_header
     * @returns {OutputNote}
     */
    static header(note_header) {
        _assertClass(note_header, NoteHeader);
        const ret = wasm.outputnote_header(note_header.__wbg_ptr);
        return OutputNote.__wrap(ret);
    }
    /**
     * @returns {NoteAssets | undefined}
     */
    assets() {
        const ret = wasm.outputnote_assets(this.__wbg_ptr);
        return ret === 0 ? undefined : NoteAssets.__wrap(ret);
    }
    /**
     * @returns {NoteId}
     */
    id() {
        const ret = wasm.outputnote_id(this.__wbg_ptr);
        return NoteId.__wrap(ret);
    }
    /**
     * @returns {RpoDigest | undefined}
     */
    recipientDigest() {
        const ret = wasm.outputnote_recipientDigest(this.__wbg_ptr);
        return ret === 0 ? undefined : RpoDigest.__wrap(ret);
    }
    /**
     * @returns {NoteMetadata}
     */
    metadata() {
        const ret = wasm.outputnote_metadata(this.__wbg_ptr);
        return NoteMetadata.__wrap(ret);
    }
    /**
     * @returns {OutputNote}
     */
    shrink() {
        const ret = wasm.outputnote_shrink(this.__wbg_ptr);
        return OutputNote.__wrap(ret);
    }
    /**
     * @returns {Note | undefined}
     */
    intoFull() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.outputnote_intoFull(ptr);
        return ret === 0 ? undefined : Note.__wrap(ret);
    }
}

const OutputNotesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_outputnotes_free(ptr >>> 0, 1));

class OutputNotes {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(OutputNotes.prototype);
        obj.__wbg_ptr = ptr;
        OutputNotesFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OutputNotesFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_outputnotes_free(ptr, 0);
    }
    /**
     * @returns {RpoDigest}
     */
    commitment() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    numNotes() {
        const ret = wasm.outputnotes_numNotes(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    isEmpty() {
        const ret = wasm.outputnotes_isEmpty(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {number} index
     * @returns {OutputNote}
     */
    getNote(index) {
        const ret = wasm.outputnotes_getNote(this.__wbg_ptr, index);
        return OutputNote.__wrap(ret);
    }
    /**
     * @returns {OutputNote[]}
     */
    notes() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.outputnotes_notes(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const OutputNotesArrayFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_outputnotesarray_free(ptr >>> 0, 1));

class OutputNotesArray {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OutputNotesArrayFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_outputnotesarray_free(ptr, 0);
    }
    /**
     * @param {OutputNote[] | null} [output_notes_array]
     */
    constructor(output_notes_array) {
        var ptr0 = isLikeNone(output_notes_array) ? 0 : passArrayJsValueToWasm0(output_notes_array, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.outputnotesarray_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        OutputNotesArrayFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {OutputNote} output_note
     */
    append(output_note) {
        _assertClass(output_note, OutputNote);
        wasm.outputnotesarray_append(this.__wbg_ptr, output_note.__wbg_ptr);
    }
}

const PartialNoteFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_partialnote_free(ptr >>> 0, 1));

class PartialNote {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PartialNoteFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_partialnote_free(ptr, 0);
    }
    /**
     * @returns {NoteId}
     */
    id() {
        const ret = wasm.partialnote_id(this.__wbg_ptr);
        return NoteId.__wrap(ret);
    }
    /**
     * @returns {NoteMetadata}
     */
    metadata() {
        const ret = wasm.note_metadata(this.__wbg_ptr);
        return NoteMetadata.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    recipientDigest() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {NoteAssets}
     */
    assets() {
        const ret = wasm.partialnote_assets(this.__wbg_ptr);
        return NoteAssets.__wrap(ret);
    }
}

const PublicKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_publickey_free(ptr >>> 0, 1));

class PublicKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PublicKey.prototype);
        obj.__wbg_ptr = ptr;
        PublicKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PublicKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_publickey_free(ptr, 0);
    }
}

const RecipientArrayFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_recipientarray_free(ptr >>> 0, 1));

class RecipientArray {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RecipientArrayFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_recipientarray_free(ptr, 0);
    }
    /**
     * @param {NoteRecipient[] | null} [recipient_array]
     */
    constructor(recipient_array) {
        var ptr0 = isLikeNone(recipient_array) ? 0 : passArrayJsValueToWasm0(recipient_array, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.recipientarray_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        RecipientArrayFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {NoteRecipient} recipient
     */
    push(recipient) {
        _assertClass(recipient, NoteRecipient);
        wasm.recipientarray_push(this.__wbg_ptr, recipient.__wbg_ptr);
    }
}

const Rpo256Finalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rpo256_free(ptr >>> 0, 1));

class Rpo256 {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        Rpo256Finalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rpo256_free(ptr, 0);
    }
    /**
     * @param {FeltArray} felt_array
     * @returns {RpoDigest}
     */
    static hashElements(felt_array) {
        _assertClass(felt_array, FeltArray);
        const ret = wasm.rpo256_hashElements(felt_array.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
}

const RpoDigestFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rpodigest_free(ptr >>> 0, 1));

class RpoDigest {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RpoDigest.prototype);
        obj.__wbg_ptr = ptr;
        RpoDigestFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof RpoDigest)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RpoDigestFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rpodigest_free(ptr, 0);
    }
    /**
     * @param {Felt[]} value
     */
    constructor(value) {
        const ptr0 = passArrayJsValueToWasm0(value, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rpodigest_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        RpoDigestFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {Word}
     */
    toWord() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return Word.__wrap(ret);
    }
    /**
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rpodigest_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    }
}

const SecretKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_secretkey_free(ptr >>> 0, 1));

class SecretKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SecretKey.prototype);
        obj.__wbg_ptr = ptr;
        SecretKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SecretKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_secretkey_free(ptr, 0);
    }
    /**
     * @param {Uint8Array | null} [seed]
     * @returns {SecretKey}
     */
    static withRng(seed) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            var ptr0 = isLikeNone(seed) ? 0 : passArray8ToWasm0(seed, wasm.__wbindgen_export_0);
            var len0 = WASM_VECTOR_LEN;
            wasm.secretkey_withRng(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return SecretKey.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {PublicKey}
     */
    publicKey() {
        const ret = wasm.secretkey_publicKey(this.__wbg_ptr);
        return PublicKey.__wrap(ret);
    }
}

const SlotAndKeysFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_slotandkeys_free(ptr >>> 0, 1));

class SlotAndKeys {

    static __unwrap(jsValue) {
        if (!(jsValue instanceof SlotAndKeys)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SlotAndKeysFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_slotandkeys_free(ptr, 0);
    }
    /**
     * @param {number} storage_slot_index
     * @param {RpoDigest[]} storage_map_keys
     */
    constructor(storage_slot_index, storage_map_keys) {
        const ptr0 = passArrayJsValueToWasm0(storage_map_keys, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.slotandkeys_new(storage_slot_index, ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        SlotAndKeysFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    storage_slot_index() {
        const ret = wasm.slotandkeys_storage_slot_index(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {RpoDigest[]}
     */
    storage_map_keys() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.slotandkeys_storage_map_keys(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const StorageMapFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_storagemap_free(ptr >>> 0, 1));

class StorageMap {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        StorageMapFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_storagemap_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.storagemap_new();
        this.__wbg_ptr = ret >>> 0;
        StorageMapFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {RpoDigest} key
     * @param {Word} value
     * @returns {Word}
     */
    insert(key, value) {
        _assertClass(key, RpoDigest);
        _assertClass(value, Word);
        const ret = wasm.storagemap_insert(this.__wbg_ptr, key.__wbg_ptr, value.__wbg_ptr);
        return Word.__wrap(ret);
    }
}

const StorageSlotFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_storageslot_free(ptr >>> 0, 1));

class StorageSlot {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(StorageSlot.prototype);
        obj.__wbg_ptr = ptr;
        StorageSlotFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof StorageSlot)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        StorageSlotFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_storageslot_free(ptr, 0);
    }
    /**
     * @param {Word} value
     * @returns {StorageSlot}
     */
    static fromValue(value) {
        _assertClass(value, Word);
        const ret = wasm.storageslot_fromValue(value.__wbg_ptr);
        return StorageSlot.__wrap(ret);
    }
    /**
     * @returns {StorageSlot}
     */
    static emptyValue() {
        const ret = wasm.storageslot_emptyValue();
        return StorageSlot.__wrap(ret);
    }
    /**
     * @param {StorageMap} storage_map
     * @returns {StorageSlot}
     */
    static map(storage_map) {
        _assertClass(storage_map, StorageMap);
        const ret = wasm.storageslot_map(storage_map.__wbg_ptr);
        return StorageSlot.__wrap(ret);
    }
}

const SyncSummaryFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_syncsummary_free(ptr >>> 0, 1));

class SyncSummary {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SyncSummary.prototype);
        obj.__wbg_ptr = ptr;
        SyncSummaryFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SyncSummaryFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_syncsummary_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    blockNum() {
        const ret = wasm.syncsummary_blockNum(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {NoteId[]}
     */
    committedNotes() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.syncsummary_committedNotes(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {NoteId[]}
     */
    consumedNotes() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.syncsummary_consumedNotes(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {AccountId[]}
     */
    updatedAccounts() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.syncsummary_updatedAccounts(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {TransactionId[]}
     */
    committedTransactions() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.syncsummary_committedTransactions(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    serialize() {
        const ret = wasm.syncsummary_serialize(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {SyncSummary}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.syncsummary_deserialize(retptr, addBorrowedObject(bytes));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return SyncSummary.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
}

const TestUtilsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_testutils_free(ptr >>> 0, 1));

class TestUtils {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TestUtilsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_testutils_free(ptr, 0);
    }
    /**
     * @returns {AccountId}
     */
    static createMockAccountId() {
        const ret = wasm.testutils_createMockAccountId();
        return AccountId.__wrap(ret);
    }
}

const TransactionArgsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionargs_free(ptr >>> 0, 1));

class TransactionArgs {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionArgs.prototype);
        obj.__wbg_ptr = ptr;
        TransactionArgsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionArgsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionargs_free(ptr, 0);
    }
    /**
     * @returns {TransactionScript | undefined}
     */
    txScript() {
        const ret = wasm.transactionargs_txScript(this.__wbg_ptr);
        return ret === 0 ? undefined : TransactionScript.__wrap(ret);
    }
    /**
     * @param {NoteId} note_id
     * @returns {Word | undefined}
     */
    getNoteArgs(note_id) {
        _assertClass(note_id, NoteId);
        const ret = wasm.transactionargs_getNoteArgs(this.__wbg_ptr, note_id.__wbg_ptr);
        return ret === 0 ? undefined : Word.__wrap(ret);
    }
    /**
     * @returns {AdviceInputs}
     */
    adviceInputs() {
        const ret = wasm.transactionargs_adviceInputs(this.__wbg_ptr);
        return AdviceInputs.__wrap(ret);
    }
}

const TransactionFilterFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionfilter_free(ptr >>> 0, 1));

class TransactionFilter {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionFilter.prototype);
        obj.__wbg_ptr = ptr;
        TransactionFilterFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionFilterFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionfilter_free(ptr, 0);
    }
    /**
     * @returns {TransactionFilter}
     */
    static all() {
        const ret = wasm.transactionfilter_all();
        return TransactionFilter.__wrap(ret);
    }
    /**
     * @returns {TransactionFilter}
     */
    static uncommitted() {
        const ret = wasm.transactionfilter_uncommitted();
        return TransactionFilter.__wrap(ret);
    }
}

const TransactionIdFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionid_free(ptr >>> 0, 1));

class TransactionId {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionId.prototype);
        obj.__wbg_ptr = ptr;
        TransactionIdFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionIdFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionid_free(ptr, 0);
    }
    /**
     * @returns {Felt[]}
     */
    asElements() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transactionid_asElements(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    asBytes() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transactionid_asBytes(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {string}
     */
    toHex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rpodigest_toHex(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {RpoDigest}
     */
    inner() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
}

const TransactionKernelFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionkernel_free(ptr >>> 0, 1));

class TransactionKernel {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionKernelFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionkernel_free(ptr, 0);
    }
    /**
     * @returns {Assembler}
     */
    static assembler() {
        const ret = wasm.transactionkernel_assembler();
        return Assembler.__wrap(ret);
    }
}

const TransactionProverFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionprover_free(ptr >>> 0, 1));

class TransactionProver {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionProver.prototype);
        obj.__wbg_ptr = ptr;
        TransactionProverFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionProverFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionprover_free(ptr, 0);
    }
    /**
     * @returns {TransactionProver}
     */
    static newLocalProver() {
        const ret = wasm.transactionprover_newLocalProver();
        return TransactionProver.__wrap(ret);
    }
    /**
     * @param {string} endpoint
     * @returns {TransactionProver}
     */
    static newRemoteProver(endpoint) {
        const ptr0 = passStringToWasm0(endpoint, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.transactionprover_newRemoteProver(ptr0, len0);
        return TransactionProver.__wrap(ret);
    }
    /**
     * @returns {string}
     */
    serialize() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transactionprover_serialize(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} prover_type
     * @param {string | null} [endpoint]
     * @returns {TransactionProver}
     */
    static deserialize(prover_type, endpoint) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(prover_type, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(endpoint) ? 0 : passStringToWasm0(endpoint, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            var len1 = WASM_VECTOR_LEN;
            wasm.transactionprover_deserialize(retptr, ptr0, len0, ptr1, len1);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TransactionProver.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {string | undefined}
     */
    endpoint() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transactionprover_endpoint(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_2(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const TransactionRecordFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionrecord_free(ptr >>> 0, 1));

class TransactionRecord {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionRecord.prototype);
        obj.__wbg_ptr = ptr;
        TransactionRecordFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionRecordFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionrecord_free(ptr, 0);
    }
    /**
     * @returns {TransactionId}
     */
    id() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return TransactionId.__wrap(ret);
    }
    /**
     * @returns {AccountId}
     */
    accountId() {
        const ret = wasm.transactionrecord_accountId(this.__wbg_ptr);
        return AccountId.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    initAccountState() {
        const ret = wasm.noteheader_id(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest}
     */
    finalAccountState() {
        const ret = wasm.note_id(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @returns {RpoDigest[]}
     */
    inputNoteNullifiers() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transactionrecord_inputNoteNullifiers(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {OutputNotes}
     */
    outputNotes() {
        const ret = wasm.transactionrecord_outputNotes(this.__wbg_ptr);
        return OutputNotes.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    blockNum() {
        const ret = wasm.transactionrecord_blockNum(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {TransactionStatus}
     */
    transactionStatus() {
        const ret = wasm.transactionrecord_transactionStatus(this.__wbg_ptr);
        return TransactionStatus.__wrap(ret);
    }
}

const TransactionRequestFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionrequest_free(ptr >>> 0, 1));

class TransactionRequest {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionRequest.prototype);
        obj.__wbg_ptr = ptr;
        TransactionRequestFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionRequestFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionrequest_free(ptr, 0);
    }
    /**
     * @returns {Uint8Array}
     */
    serialize() {
        const ret = wasm.transactionrequest_serialize(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {TransactionRequest}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transactionrequest_deserialize(retptr, addBorrowedObject(bytes));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TransactionRequest.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * @returns {Note[]}
     */
    expectedOutputOwnNotes() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transactionrequest_expectedOutputOwnNotes(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {NoteDetailsAndTag[]}
     */
    expectedFutureNotes() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transactionrequest_expectedFutureNotes(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const TransactionRequestBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionrequestbuilder_free(ptr >>> 0, 1));

class TransactionRequestBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionRequestBuilder.prototype);
        obj.__wbg_ptr = ptr;
        TransactionRequestBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionRequestBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionrequestbuilder_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.transactionrequestbuilder_new();
        this.__wbg_ptr = ret >>> 0;
        TransactionRequestBuilderFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {NoteAndArgsArray} notes
     * @returns {TransactionRequestBuilder}
     */
    withUnauthenticatedInputNotes(notes) {
        const ptr = this.__destroy_into_raw();
        _assertClass(notes, NoteAndArgsArray);
        const ret = wasm.transactionrequestbuilder_withUnauthenticatedInputNotes(ptr, notes.__wbg_ptr);
        return TransactionRequestBuilder.__wrap(ret);
    }
    /**
     * @param {NoteIdAndArgsArray} notes
     * @returns {TransactionRequestBuilder}
     */
    withAuthenticatedInputNotes(notes) {
        const ptr = this.__destroy_into_raw();
        _assertClass(notes, NoteIdAndArgsArray);
        const ret = wasm.transactionrequestbuilder_withAuthenticatedInputNotes(ptr, notes.__wbg_ptr);
        return TransactionRequestBuilder.__wrap(ret);
    }
    /**
     * @param {OutputNotesArray} notes
     * @returns {TransactionRequestBuilder}
     */
    withOwnOutputNotes(notes) {
        const ptr = this.__destroy_into_raw();
        _assertClass(notes, OutputNotesArray);
        const ret = wasm.transactionrequestbuilder_withOwnOutputNotes(ptr, notes.__wbg_ptr);
        return TransactionRequestBuilder.__wrap(ret);
    }
    /**
     * @param {TransactionScript} script
     * @returns {TransactionRequestBuilder}
     */
    withCustomScript(script) {
        const ptr = this.__destroy_into_raw();
        _assertClass(script, TransactionScript);
        const ret = wasm.transactionrequestbuilder_withCustomScript(ptr, script.__wbg_ptr);
        return TransactionRequestBuilder.__wrap(ret);
    }
    /**
     * @param {RecipientArray} recipients
     * @returns {TransactionRequestBuilder}
     */
    withExpectedOutputRecipients(recipients) {
        const ptr = this.__destroy_into_raw();
        _assertClass(recipients, RecipientArray);
        const ret = wasm.transactionrequestbuilder_withExpectedOutputRecipients(ptr, recipients.__wbg_ptr);
        return TransactionRequestBuilder.__wrap(ret);
    }
    /**
     * @param {NoteDetailsAndTagArray} note_details_and_tag
     * @returns {TransactionRequestBuilder}
     */
    withExpectedFutureNotes(note_details_and_tag) {
        const ptr = this.__destroy_into_raw();
        _assertClass(note_details_and_tag, NoteDetailsAndTagArray);
        const ret = wasm.transactionrequestbuilder_withExpectedFutureNotes(ptr, note_details_and_tag.__wbg_ptr);
        return TransactionRequestBuilder.__wrap(ret);
    }
    /**
     * @param {AdviceMap} advice_map
     * @returns {TransactionRequestBuilder}
     */
    extendAdviceMap(advice_map) {
        const ptr = this.__destroy_into_raw();
        _assertClass(advice_map, AdviceMap);
        const ret = wasm.transactionrequestbuilder_extendAdviceMap(ptr, advice_map.__wbg_ptr);
        return TransactionRequestBuilder.__wrap(ret);
    }
    /**
     * @param {ForeignAccount[]} foreign_accounts
     * @returns {TransactionRequestBuilder}
     */
    withForeignAccounts(foreign_accounts) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passArrayJsValueToWasm0(foreign_accounts, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.transactionrequestbuilder_withForeignAccounts(ptr, ptr0, len0);
        return TransactionRequestBuilder.__wrap(ret);
    }
    /**
     * @returns {TransactionRequest}
     */
    build() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.transactionrequestbuilder_build(ptr);
        return TransactionRequest.__wrap(ret);
    }
}

const TransactionResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionresult_free(ptr >>> 0, 1));

class TransactionResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionResult.prototype);
        obj.__wbg_ptr = ptr;
        TransactionResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionresult_free(ptr, 0);
    }
    /**
     * @returns {ExecutedTransaction}
     */
    executedTransaction() {
        const ret = wasm.transactionresult_executedTransaction(this.__wbg_ptr);
        return ExecutedTransaction.__wrap(ret);
    }
    /**
     * @returns {OutputNotes}
     */
    createdNotes() {
        const ret = wasm.transactionresult_createdNotes(this.__wbg_ptr);
        return OutputNotes.__wrap(ret);
    }
    /**
     * @returns {number}
     */
    blockNum() {
        const ret = wasm.transactionresult_blockNum(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {TransactionArgs}
     */
    transactionArguments() {
        const ret = wasm.transactionresult_transactionArguments(this.__wbg_ptr);
        return TransactionArgs.__wrap(ret);
    }
    /**
     * @returns {AccountDelta}
     */
    accountDelta() {
        const ret = wasm.transactionresult_accountDelta(this.__wbg_ptr);
        return AccountDelta.__wrap(ret);
    }
    /**
     * @returns {InputNotes}
     */
    consumedNotes() {
        const ret = wasm.transactionresult_consumedNotes(this.__wbg_ptr);
        return InputNotes.__wrap(ret);
    }
    /**
     * @returns {Uint8Array}
     */
    serialize() {
        const ret = wasm.transactionresult_serialize(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {TransactionResult}
     */
    static deserialize(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transactionresult_deserialize(retptr, addBorrowedObject(bytes));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TransactionResult.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
}

const TransactionScriptFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionscript_free(ptr >>> 0, 1));

class TransactionScript {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionScript.prototype);
        obj.__wbg_ptr = ptr;
        TransactionScriptFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionScriptFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionscript_free(ptr, 0);
    }
    /**
     * @returns {RpoDigest}
     */
    root() {
        const ret = wasm.transactionscript_root(this.__wbg_ptr);
        return RpoDigest.__wrap(ret);
    }
    /**
     * @param {string} script_code
     * @param {Assembler} assembler
     * @returns {TransactionScript}
     */
    static compile(script_code, assembler) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(script_code, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(assembler, Assembler);
            wasm.transactionscript_compile(retptr, ptr0, len0, assembler.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TransactionScript.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const TransactionScriptInputPairFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionscriptinputpair_free(ptr >>> 0, 1));

class TransactionScriptInputPair {

    static __unwrap(jsValue) {
        if (!(jsValue instanceof TransactionScriptInputPair)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionScriptInputPairFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionscriptinputpair_free(ptr, 0);
    }
    /**
     * @param {Word} word
     * @param {Felt[]} felts
     */
    constructor(word, felts) {
        _assertClass(word, Word);
        var ptr0 = word.__destroy_into_raw();
        const ptr1 = passArrayJsValueToWasm0(felts, wasm.__wbindgen_export_0);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.transactionscriptinputpair_new(ptr0, ptr1, len1);
        this.__wbg_ptr = ret >>> 0;
        TransactionScriptInputPairFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {Word}
     */
    word() {
        const ret = wasm.accountbuilderresult_seed(this.__wbg_ptr);
        return Word.__wrap(ret);
    }
    /**
     * @returns {Felt[]}
     */
    felts() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.transactionscriptinputpair_felts(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export_2(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const TransactionScriptInputPairArrayFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionscriptinputpairarray_free(ptr >>> 0, 1));

class TransactionScriptInputPairArray {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionScriptInputPairArrayFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionscriptinputpairarray_free(ptr, 0);
    }
    /**
     * @param {TransactionScriptInputPair[] | null} [transaction_script_input_pairs]
     */
    constructor(transaction_script_input_pairs) {
        var ptr0 = isLikeNone(transaction_script_input_pairs) ? 0 : passArrayJsValueToWasm0(transaction_script_input_pairs, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.transactionscriptinputpairarray_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        TransactionScriptInputPairArrayFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {TransactionScriptInputPair} transaction_script_input_pair
     */
    push(transaction_script_input_pair) {
        _assertClass(transaction_script_input_pair, TransactionScriptInputPair);
        wasm.transactionscriptinputpairarray_push(this.__wbg_ptr, transaction_script_input_pair.__wbg_ptr);
    }
}

const TransactionStatusFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactionstatus_free(ptr >>> 0, 1));

class TransactionStatus {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionStatus.prototype);
        obj.__wbg_ptr = ptr;
        TransactionStatusFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionStatusFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactionstatus_free(ptr, 0);
    }
    /**
     * @returns {TransactionStatus}
     */
    static pending() {
        const ret = wasm.noteexecutionhint_none();
        return TransactionStatus.__wrap(ret);
    }
    /**
     * @param {number} block_num
     * @returns {TransactionStatus}
     */
    static committed(block_num) {
        const ret = wasm.transactionstatus_committed(block_num);
        return TransactionStatus.__wrap(ret);
    }
    /**
     * @param {string} cause
     * @returns {TransactionStatus}
     */
    static discarded(cause) {
        const ptr0 = passStringToWasm0(cause, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.transactionstatus_discarded(ptr0, len0);
        return TransactionStatus.__wrap(ret);
    }
    /**
     * @returns {boolean}
     */
    isPending() {
        const ret = wasm.transactionstatus_isPending(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    isCommitted() {
        const ret = wasm.transactionstatus_isCommitted(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    isDiscarded() {
        const ret = wasm.transactionstatus_isDiscarded(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number | undefined}
     */
    getBlockNum() {
        const ret = wasm.transactionstatus_getBlockNum(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
}

const WebClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_webclient_free(ptr >>> 0, 1));

class WebClient {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WebClientFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_webclient_free(ptr, 0);
    }
    /**
     * @returns {Promise<AccountHeader[]>}
     */
    getAccounts() {
        const ret = wasm.webclient_getAccounts(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {AccountId} account_id
     * @returns {Promise<Account | undefined>}
     */
    getAccount(account_id) {
        _assertClass(account_id, AccountId);
        const ret = wasm.webclient_getAccount(this.__wbg_ptr, account_id.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {string} note_id
     * @param {string} export_type
     * @returns {Promise<any>}
     */
    exportNote(note_id, export_type) {
        const ptr0 = passStringToWasm0(note_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(export_type, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_exportNote(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * Retrieves the entire underlying web store and returns it as a JsValue
     *
     * Meant to be used in conjunction with the force_import_store method
     * @returns {Promise<any>}
     */
    exportStore() {
        const ret = wasm.webclient_exportStore(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {any} account_bytes
     * @returns {Promise<any>}
     */
    importAccount(account_bytes) {
        const ret = wasm.webclient_importAccount(this.__wbg_ptr, addHeapObject(account_bytes));
        return takeObject(ret);
    }
    /**
     * @param {Uint8Array} init_seed
     * @param {boolean} mutable
     * @returns {Promise<Account>}
     */
    importPublicAccountFromSeed(init_seed, mutable) {
        const ptr0 = passArray8ToWasm0(init_seed, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_importPublicAccountFromSeed(this.__wbg_ptr, ptr0, len0, mutable);
        return takeObject(ret);
    }
    /**
     * @param {AccountId} account_id
     * @returns {Promise<any>}
     */
    importAccountById(account_id) {
        _assertClass(account_id, AccountId);
        const ret = wasm.webclient_importAccountById(this.__wbg_ptr, account_id.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {any} note_bytes
     * @returns {Promise<any>}
     */
    importNote(note_bytes) {
        const ret = wasm.webclient_importNote(this.__wbg_ptr, addHeapObject(note_bytes));
        return takeObject(ret);
    }
    /**
     * @param {any} store_dump
     * @returns {Promise<any>}
     */
    forceImportStore(store_dump) {
        const ret = wasm.webclient_forceImportStore(this.__wbg_ptr, addHeapObject(store_dump));
        return takeObject(ret);
    }
    /**
     * @param {AccountStorageMode} storage_mode
     * @param {boolean} mutable
     * @param {Uint8Array | null} [init_seed]
     * @returns {Promise<Account>}
     */
    newWallet(storage_mode, mutable, init_seed) {
        _assertClass(storage_mode, AccountStorageMode);
        var ptr0 = isLikeNone(init_seed) ? 0 : passArray8ToWasm0(init_seed, wasm.__wbindgen_export_0);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_newWallet(this.__wbg_ptr, storage_mode.__wbg_ptr, mutable, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {AccountStorageMode} storage_mode
     * @param {boolean} non_fungible
     * @param {string} token_symbol
     * @param {number} decimals
     * @param {bigint} max_supply
     * @returns {Promise<Account>}
     */
    newFaucet(storage_mode, non_fungible, token_symbol, decimals, max_supply) {
        _assertClass(storage_mode, AccountStorageMode);
        const ptr0 = passStringToWasm0(token_symbol, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_newFaucet(this.__wbg_ptr, storage_mode.__wbg_ptr, non_fungible, ptr0, len0, decimals, max_supply);
        return takeObject(ret);
    }
    /**
     * @param {Account} account
     * @param {Word | null | undefined} account_seed
     * @param {boolean} overwrite
     * @returns {Promise<void>}
     */
    newAccount(account, account_seed, overwrite) {
        _assertClass(account, Account);
        let ptr0 = 0;
        if (!isLikeNone(account_seed)) {
            _assertClass(account_seed, Word);
            ptr0 = account_seed.__destroy_into_raw();
        }
        const ret = wasm.webclient_newAccount(this.__wbg_ptr, account.__wbg_ptr, ptr0, overwrite);
        return takeObject(ret);
    }
    /**
     * @param {SecretKey} secret_key
     * @returns {Promise<void>}
     */
    addAccountSecretKeyToWebStore(secret_key) {
        _assertClass(secret_key, SecretKey);
        const ret = wasm.webclient_addAccountSecretKeyToWebStore(this.__wbg_ptr, secret_key.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {AccountId} account_id
     * @param {TransactionRequest} transaction_request
     * @returns {Promise<TransactionResult>}
     */
    newTransaction(account_id, transaction_request) {
        _assertClass(account_id, AccountId);
        _assertClass(transaction_request, TransactionRequest);
        const ret = wasm.webclient_newTransaction(this.__wbg_ptr, account_id.__wbg_ptr, transaction_request.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {TransactionResult} transaction_result
     * @param {TransactionProver | null} [prover]
     * @returns {Promise<void>}
     */
    submitTransaction(transaction_result, prover) {
        _assertClass(transaction_result, TransactionResult);
        let ptr0 = 0;
        if (!isLikeNone(prover)) {
            _assertClass(prover, TransactionProver);
            ptr0 = prover.__destroy_into_raw();
        }
        const ret = wasm.webclient_submitTransaction(this.__wbg_ptr, transaction_result.__wbg_ptr, ptr0);
        return takeObject(ret);
    }
    /**
     * @param {AccountId} target_account_id
     * @param {AccountId} faucet_id
     * @param {NoteType} note_type
     * @param {bigint} amount
     * @returns {TransactionRequest}
     */
    newMintTransactionRequest(target_account_id, faucet_id, note_type, amount) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(target_account_id, AccountId);
            _assertClass(faucet_id, AccountId);
            wasm.webclient_newMintTransactionRequest(retptr, this.__wbg_ptr, target_account_id.__wbg_ptr, faucet_id.__wbg_ptr, note_type, amount);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TransactionRequest.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {AccountId} sender_account_id
     * @param {AccountId} target_account_id
     * @param {AccountId} faucet_id
     * @param {NoteType} note_type
     * @param {bigint} amount
     * @param {number | null} [recall_height]
     * @param {number | null} [timelock_height]
     * @returns {TransactionRequest}
     */
    newSendTransactionRequest(sender_account_id, target_account_id, faucet_id, note_type, amount, recall_height, timelock_height) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender_account_id, AccountId);
            _assertClass(target_account_id, AccountId);
            _assertClass(faucet_id, AccountId);
            wasm.webclient_newSendTransactionRequest(retptr, this.__wbg_ptr, sender_account_id.__wbg_ptr, target_account_id.__wbg_ptr, faucet_id.__wbg_ptr, note_type, amount, isLikeNone(recall_height) ? 0x100000001 : (recall_height) >>> 0, isLikeNone(timelock_height) ? 0x100000001 : (timelock_height) >>> 0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TransactionRequest.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {string[]} list_of_note_ids
     * @returns {TransactionRequest}
     */
    newConsumeTransactionRequest(list_of_note_ids) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayJsValueToWasm0(list_of_note_ids, wasm.__wbindgen_export_0);
            const len0 = WASM_VECTOR_LEN;
            wasm.webclient_newConsumeTransactionRequest(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TransactionRequest.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {AccountId} sender_account_id
     * @param {AccountId} offered_asset_faucet_id
     * @param {bigint} offered_asset_amount
     * @param {AccountId} requested_asset_faucet_id
     * @param {bigint} requested_asset_amount
     * @param {NoteType} note_type
     * @returns {TransactionRequest}
     */
    newSwapTransactionRequest(sender_account_id, offered_asset_faucet_id, offered_asset_amount, requested_asset_faucet_id, requested_asset_amount, note_type) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(sender_account_id, AccountId);
            _assertClass(offered_asset_faucet_id, AccountId);
            _assertClass(requested_asset_faucet_id, AccountId);
            wasm.webclient_newSwapTransactionRequest(retptr, this.__wbg_ptr, sender_account_id.__wbg_ptr, offered_asset_faucet_id.__wbg_ptr, offered_asset_amount, requested_asset_faucet_id.__wbg_ptr, requested_asset_amount, note_type);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TransactionRequest.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {NoteFilter} filter
     * @returns {Promise<InputNoteRecord[]>}
     */
    getInputNotes(filter) {
        _assertClass(filter, NoteFilter);
        var ptr0 = filter.__destroy_into_raw();
        const ret = wasm.webclient_getInputNotes(this.__wbg_ptr, ptr0);
        return takeObject(ret);
    }
    /**
     * @param {string} note_id
     * @returns {Promise<InputNoteRecord | undefined>}
     */
    getInputNote(note_id) {
        const ptr0 = passStringToWasm0(note_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_getInputNote(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {NoteFilter} filter
     * @returns {Promise<any>}
     */
    getOutputNotes(filter) {
        _assertClass(filter, NoteFilter);
        var ptr0 = filter.__destroy_into_raw();
        const ret = wasm.webclient_getOutputNotes(this.__wbg_ptr, ptr0);
        return takeObject(ret);
    }
    /**
     * @param {string} note_id
     * @returns {Promise<any>}
     */
    getOutputNote(note_id) {
        const ptr0 = passStringToWasm0(note_id, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_getOutputNote(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} script
     * @returns {NoteScript}
     */
    compileNoteScript(script) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(script, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.webclient_compileNoteScript(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return NoteScript.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {AccountId | null} [account_id]
     * @returns {Promise<ConsumableNoteRecord[]>}
     */
    getConsumableNotes(account_id) {
        let ptr0 = 0;
        if (!isLikeNone(account_id)) {
            _assertClass(account_id, AccountId);
            ptr0 = account_id.__destroy_into_raw();
        }
        const ret = wasm.webclient_getConsumableNotes(this.__wbg_ptr, ptr0);
        return takeObject(ret);
    }
    /**
     * @returns {Promise<SyncSummary>}
     */
    syncState() {
        const ret = wasm.webclient_syncState(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {Promise<number>}
     */
    getSyncHeight() {
        const ret = wasm.webclient_getSyncHeight(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {NoteType} note_type
     * @param {AccountId} offered_asset_faucet_id
     * @param {bigint} offered_asset_amount
     * @param {AccountId} requested_asset_faucet_id
     * @param {bigint} requested_asset_amount
     * @returns {NoteTag}
     */
    static buildSwapTag(note_type, offered_asset_faucet_id, offered_asset_amount, requested_asset_faucet_id, requested_asset_amount) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(offered_asset_faucet_id, AccountId);
            _assertClass(requested_asset_faucet_id, AccountId);
            wasm.webclient_buildSwapTag(retptr, note_type, offered_asset_faucet_id.__wbg_ptr, offered_asset_amount, requested_asset_faucet_id.__wbg_ptr, requested_asset_amount);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return NoteTag.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {string} tag
     * @returns {Promise<void>}
     */
    addTag(tag) {
        const ptr0 = passStringToWasm0(tag, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_addTag(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} tag
     * @returns {Promise<void>}
     */
    removeTag(tag) {
        const ptr0 = passStringToWasm0(tag, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_removeTag(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @returns {Promise<any>}
     */
    listTags() {
        const ret = wasm.webclient_listTags(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {TransactionFilter} transaction_filter
     * @returns {Promise<TransactionRecord[]>}
     */
    getTransactions(transaction_filter) {
        _assertClass(transaction_filter, TransactionFilter);
        var ptr0 = transaction_filter.__destroy_into_raw();
        const ret = wasm.webclient_getTransactions(this.__wbg_ptr, ptr0);
        return takeObject(ret);
    }
    /**
     * @param {string} script
     * @returns {TransactionScript}
     */
    compileTxScript(script) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(script, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
            const len0 = WASM_VECTOR_LEN;
            wasm.webclient_compileTxScript(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return TransactionScript.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {TransactionResult} tx_result
     * @returns {Promise<void>}
     */
    testingApplyTransaction(tx_result) {
        _assertClass(tx_result, TransactionResult);
        var ptr0 = tx_result.__destroy_into_raw();
        const ret = wasm.webclient_testingApplyTransaction(this.__wbg_ptr, ptr0);
        return takeObject(ret);
    }
    constructor() {
        const ret = wasm.webclient_new();
        this.__wbg_ptr = ret >>> 0;
        WebClientFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string | null} [node_url]
     * @param {Uint8Array | null} [seed]
     * @returns {Promise<any>}
     */
    createClient(node_url, seed) {
        var ptr0 = isLikeNone(node_url) ? 0 : passStringToWasm0(node_url, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(seed) ? 0 : passArray8ToWasm0(seed, wasm.__wbindgen_export_0);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.webclient_createClient(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
}

const WordFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_word_free(ptr >>> 0, 1));

class Word {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Word.prototype);
        obj.__wbg_ptr = ptr;
        WordFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WordFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_word_free(ptr, 0);
    }
    /**
     * @param {BigUint64Array} u64_vec
     * @returns {Word}
     */
    static newFromU64s(u64_vec) {
        const ptr0 = passArray64ToWasm0(u64_vec, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.word_newFromU64s(ptr0, len0);
        return Word.__wrap(ret);
    }
    /**
     * @param {Felt[]} felt_vec
     * @returns {Word}
     */
    static newFromFelts(felt_vec) {
        const ptr0 = passArrayJsValueToWasm0(felt_vec, wasm.__wbindgen_export_0);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.word_newFromFelts(ptr0, len0);
        return Word.__wrap(ret);
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_String_8f0eb39a4a4c2f66 = function(arg0, arg1) {
        const ret = String(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_account_new = function(arg0) {
        const ret = Account.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_accountheader_new = function(arg0) {
        const ret = AccountHeader.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_accountid_new = function(arg0) {
        const ret = AccountId.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_addNoteTag_e6917611577f1aae = function(arg0, arg1, arg2, arg3, arg4, arg5) {
        var v0 = getArrayU8FromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 1, 1);
        let v1;
        if (arg2 !== 0) {
            v1 = getStringFromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
        }
        let v2;
        if (arg4 !== 0) {
            v2 = getStringFromWasm0(arg4, arg5).slice();
            wasm.__wbindgen_export_2(arg4, arg5 * 1, 1);
        }
        const ret = addNoteTag(v0, v1, v2);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_append_8c7dd8d641a5f01b = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_applyStateSync_11f6bac24d7c7dad = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            var v1 = getArrayJsValueFromWasm0(arg3, arg4).slice();
            wasm.__wbindgen_export_2(arg3, arg4 * 4, 4);
            var v2 = getArrayU8FromWasm0(arg6, arg7).slice();
            wasm.__wbindgen_export_2(arg6, arg7 * 1, 1);
            var v3 = getArrayJsValueFromWasm0(arg8, arg9).slice();
            wasm.__wbindgen_export_2(arg8, arg9 * 4, 4);
            var v4 = getArrayJsValueFromWasm0(arg10, arg11).slice();
            wasm.__wbindgen_export_2(arg10, arg11 * 4, 4);
            var v5 = getArrayJsValueFromWasm0(arg12, arg13).slice();
            wasm.__wbindgen_export_2(arg12, arg13 * 4, 4);
            const ret = applyStateSync(getStringFromWasm0(arg0, arg1), FlattenedU8Vec.__wrap(arg2), v1, FlattenedU8Vec.__wrap(arg5), v2, v3, v4, v5);
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_body_0b8fd1fe671660df = function(arg0) {
        const ret = getObject(arg0).body;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_buffer_09165b52af8c5237 = function(arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_buffer_609cc3eee51ed158 = function(arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_byobRequest_77d9adf63337edfb = function(arg0) {
        const ret = getObject(arg0).byobRequest;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_byteLength_e674b853d9c77e1d = function(arg0) {
        const ret = getObject(arg0).byteLength;
        return ret;
    };
    imports.wbg.__wbg_byteOffset_fd862df290ef848d = function(arg0) {
        const ret = getObject(arg0).byteOffset;
        return ret;
    };
    imports.wbg.__wbg_call_672a4d21634d4a24 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_7cccdd69e0791ae2 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_cancel_8a308660caa6cadf = function(arg0) {
        const ret = getObject(arg0).cancel();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_catch_a6e601879b2610e9 = function(arg0, arg1) {
        const ret = getObject(arg0).catch(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_close_304cc1fef3466669 = function() { return handleError(function (arg0) {
        getObject(arg0).close();
    }, arguments) };
    imports.wbg.__wbg_close_5ce03e29be453811 = function() { return handleError(function (arg0) {
        getObject(arg0).close();
    }, arguments) };
    imports.wbg.__wbg_consumablenoterecord_new = function(arg0) {
        const ret = ConsumableNoteRecord.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_done_769e5ede4b31c67b = function(arg0) {
        const ret = getObject(arg0).done;
        return ret;
    };
    imports.wbg.__wbg_enqueue_bb16ba72f537dc9e = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).enqueue(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_exportStore_02a8c59d9703412f = function() {
        const ret = exportStore();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_felt_new = function(arg0) {
        const ret = Felt.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_felt_unwrap = function(arg0) {
        const ret = Felt.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_fetchAndCacheAccountAuthByPubKey_4003b3308e42e3f3 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            const ret = fetchAndCacheAccountAuthByPubKey(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_fetch_07cd86dd296a5a63 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).fetch(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_fetch_f083e6da40cefe09 = function(arg0, arg1) {
        const ret = fetch(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_forceImportStore_ed2644628e9b1ca4 = function(arg0) {
        const ret = forceImportStore(takeObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_foreignaccount_unwrap = function(arg0) {
        const ret = ForeignAccount.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_fungibleasset_new = function(arg0) {
        const ret = FungibleAsset.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_fungibleasset_unwrap = function(arg0) {
        const ret = FungibleAsset.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_getAccountAssetVault_1208fce0d2456f32 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            const ret = getAccountAssetVault(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_getAccountAuthByPubKey_f4f3f6d6785bd959 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            const ret = getAccountAuthByPubKey(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_getAccountCode_aa650de094cca4c5 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            const ret = getAccountCode(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_getAccountHeaderByCommitment_5aca20dd99c6801c = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            const ret = getAccountHeaderByCommitment(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_getAccountHeader_137318caf1c78f4f = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            const ret = getAccountHeader(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_getAccountIds_367e7bba9c851de1 = function() {
        const ret = getAccountIds();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getAccountStorage_aca929e7ca1d2e2c = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            const ret = getAccountStorage(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_getAllAccountHeaders_1407bad4a065532f = function() {
        const ret = getAllAccountHeaders();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getBlockHeaders_29197f84cc55fa1b = function(arg0, arg1) {
        var v0 = getArrayJsValueFromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 4, 4);
        const ret = getBlockHeaders(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getForeignAccountCode_1021b5b382883983 = function(arg0, arg1) {
        var v0 = getArrayJsValueFromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 4, 4);
        const ret = getForeignAccountCode(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getInputNotesFromIds_8261e58444d79e11 = function(arg0, arg1) {
        var v0 = getArrayJsValueFromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 4, 4);
        const ret = getInputNotesFromIds(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getInputNotesFromNullifiers_76b13b9cb1bd5230 = function(arg0, arg1) {
        var v0 = getArrayJsValueFromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 4, 4);
        const ret = getInputNotesFromNullifiers(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getInputNotes_1ac9905a855da0d5 = function(arg0, arg1) {
        var v0 = getArrayU8FromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 1, 1);
        const ret = getInputNotes(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getNoteTags_ca51034f0494d479 = function() {
        const ret = getNoteTags();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getOutputNotesFromIds_59651c12e012e297 = function(arg0, arg1) {
        var v0 = getArrayJsValueFromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 4, 4);
        const ret = getOutputNotesFromIds(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getOutputNotesFromNullifiers_fb2928ef18ba7b6e = function(arg0, arg1) {
        var v0 = getArrayJsValueFromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 4, 4);
        const ret = getOutputNotesFromNullifiers(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getOutputNotes_e75f1286507bdfd1 = function(arg0, arg1) {
        var v0 = getArrayU8FromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 1, 1);
        const ret = getOutputNotes(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getPartialBlockchainNodesAll_053f77f2e0d237ab = function() {
        const ret = getPartialBlockchainNodesAll();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getPartialBlockchainNodes_0fea26061a2137ed = function(arg0, arg1) {
        var v0 = getArrayJsValueFromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 4, 4);
        const ret = getPartialBlockchainNodes(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getPartialBlockchainPeaksByBlockNum_41d9068daeebe7b3 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            const ret = getPartialBlockchainPeaksByBlockNum(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_getRandomValues_3c9c0d586e575a16 = function() { return handleError(function (arg0, arg1) {
        globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
    }, arguments) };
    imports.wbg.__wbg_getReader_48e00749fe3f6089 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).getReader();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getSyncHeight_afc9d3cd4ce735f4 = function() {
        const ret = getSyncHeight();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getTime_46267b1c24877e30 = function(arg0) {
        const ret = getObject(arg0).getTime();
        return ret;
    };
    imports.wbg.__wbg_getTrackedBlockHeaders_3f3bd87cc278792e = function() {
        const ret = getTrackedBlockHeaders();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getTransactions_4b852662b886c943 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            const ret = getTransactions(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_getUnspentInputNoteNullifiers_4434219182df2f97 = function() {
        const ret = getUnspentInputNoteNullifiers();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_get_67b2ba62fc30de12 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_get_b9b93047fe3cf45b = function(arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getdone_d47073731acd3e74 = function(arg0) {
        const ret = getObject(arg0).done;
        return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
    };
    imports.wbg.__wbg_getvalue_009dcd63692bee1f = function(arg0) {
        const ret = getObject(arg0).value;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getwithrefkey_1dc361bd10053bfe = function(arg0, arg1) {
        const ret = getObject(arg0)[getObject(arg1)];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_has_a5ea9117f258a0ec = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.has(getObject(arg0), getObject(arg1));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_headers_9cb51cfd2ac780a4 = function(arg0) {
        const ret = getObject(arg0).headers;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_inputnote_new = function(arg0) {
        const ret = InputNote.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_inputnoterecord_new = function(arg0) {
        const ret = InputNoteRecord.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_insertAccountAssetVault_b7673cc02306203a = function(arg0, arg1, arg2, arg3) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            var v1 = getArrayU8FromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
            const ret = insertAccountAssetVault(getStringFromWasm0(arg0, arg1), v1);
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_insertAccountAuth_2d39b18e01304132 = function(arg0, arg1, arg2, arg3) {
        let deferred0_0;
        let deferred0_1;
        let deferred1_0;
        let deferred1_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            deferred1_0 = arg2;
            deferred1_1 = arg3;
            const ret = insertAccountAuth(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
        }
    };
    imports.wbg.__wbg_insertAccountCode_c7090940592dda3f = function(arg0, arg1, arg2, arg3) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            var v1 = getArrayU8FromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
            const ret = insertAccountCode(getStringFromWasm0(arg0, arg1), v1);
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_insertAccountRecord_359c6de4f224717f = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14) {
        let deferred0_0;
        let deferred0_1;
        let deferred1_0;
        let deferred1_1;
        let deferred2_0;
        let deferred2_1;
        let deferred3_0;
        let deferred3_1;
        let deferred4_0;
        let deferred4_1;
        let deferred6_0;
        let deferred6_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            deferred1_0 = arg2;
            deferred1_1 = arg3;
            deferred2_0 = arg4;
            deferred2_1 = arg5;
            deferred3_0 = arg6;
            deferred3_1 = arg7;
            deferred4_0 = arg8;
            deferred4_1 = arg9;
            let v5;
            if (arg11 !== 0) {
                v5 = getArrayU8FromWasm0(arg11, arg12).slice();
                wasm.__wbindgen_export_2(arg11, arg12 * 1, 1);
            }
            deferred6_0 = arg13;
            deferred6_1 = arg14;
            const ret = insertAccountRecord(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3), getStringFromWasm0(arg4, arg5), getStringFromWasm0(arg6, arg7), getStringFromWasm0(arg8, arg9), arg10 !== 0, v5, getStringFromWasm0(arg13, arg14));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
            wasm.__wbindgen_export_2(deferred1_0, deferred1_1, 1);
            wasm.__wbindgen_export_2(deferred2_0, deferred2_1, 1);
            wasm.__wbindgen_export_2(deferred3_0, deferred3_1, 1);
            wasm.__wbindgen_export_2(deferred4_0, deferred4_1, 1);
            wasm.__wbindgen_export_2(deferred6_0, deferred6_1, 1);
        }
    };
    imports.wbg.__wbg_insertAccountStorage_8d03e748f975f351 = function(arg0, arg1, arg2, arg3) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            var v1 = getArrayU8FromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
            const ret = insertAccountStorage(getStringFromWasm0(arg0, arg1), v1);
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_insertBlockHeader_c98cbfc4c75ed66c = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            var v1 = getArrayU8FromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
            var v2 = getArrayU8FromWasm0(arg4, arg5).slice();
            wasm.__wbindgen_export_2(arg4, arg5 * 1, 1);
            const ret = insertBlockHeader(getStringFromWasm0(arg0, arg1), v1, v2, arg6 !== 0);
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_insertPartialBlockchainNodes_85f22c2e4b077c7b = function(arg0, arg1, arg2, arg3) {
        var v0 = getArrayJsValueFromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 4, 4);
        var v1 = getArrayJsValueFromWasm0(arg2, arg3).slice();
        wasm.__wbindgen_export_2(arg2, arg3 * 4, 4);
        const ret = insertPartialBlockchainNodes(v0, v1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_insertTransactionScript_f00f3bed62d88c73 = function(arg0, arg1, arg2, arg3) {
        var v0 = getArrayU8FromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 1, 1);
        let v1;
        if (arg2 !== 0) {
            v1 = getArrayU8FromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
        }
        const ret = insertTransactionScript(v0, v1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_e14585432e3737fc = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof ArrayBuffer;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Uint8Array_17156bcf118086a9 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_isArray_a1eab7e0d067391b = function(arg0) {
        const ret = Array.isArray(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_isSafeInteger_343e2beeeece1bb0 = function(arg0) {
        const ret = Number.isSafeInteger(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_iterator_9a24c88df860dc65 = function() {
        const ret = Symbol.iterator;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_length_a446193dc22c12f8 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_length_e2d2a49132c1b256 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_lockAccount_c26a46fd83e688d9 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            const ret = lockAccount(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_new0_f788a2397c7ca929 = function() {
        const ret = new Date();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_018dcc2d6c8c2f6a = function() { return handleError(function () {
        const ret = new Headers();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_23a2665fac83c611 = function(arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_496(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            const ret = new Promise(cb0);
            return addHeapObject(ret);
        } finally {
            state0.a = state0.b = 0;
        }
    };
    imports.wbg.__wbg_new_405e22f390576ce2 = function() {
        const ret = new Object();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_78feb108b6472713 = function() {
        const ret = new Array();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_a12002a7f91c75be = function(arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_c68d7209be747379 = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newnoargs_105ed471475aaf50 = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_d97e637ebe145a9a = function(arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithstrandinit_06c535e0a867c635 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_next_25feadfc0913fea9 = function(arg0) {
        const ret = getObject(arg0).next;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_next_6574e1a8a62d1055 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).next();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_note_new = function(arg0) {
        const ret = Note.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_noteandargs_unwrap = function(arg0) {
        const ret = NoteAndArgs.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_noteconsumability_new = function(arg0) {
        const ret = NoteConsumability.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_noteconsumability_unwrap = function(arg0) {
        const ret = NoteConsumability.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_notedetails_unwrap = function(arg0) {
        const ret = NoteDetails.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_notedetailsandtag_new = function(arg0) {
        const ret = NoteDetailsAndTag.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_notedetailsandtag_unwrap = function(arg0) {
        const ret = NoteDetailsAndTag.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_noteid_new = function(arg0) {
        const ret = NoteId.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_noteid_unwrap = function(arg0) {
        const ret = NoteId.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_noteidandargs_unwrap = function(arg0) {
        const ret = NoteIdAndArgs.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_noterecipient_unwrap = function(arg0) {
        const ret = NoteRecipient.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_openDatabase_44c789e7e6007bcb = function() {
        const ret = openDatabase();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_outputnote_new = function(arg0) {
        const ret = OutputNote.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_outputnote_unwrap = function(arg0) {
        const ret = OutputNote.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_pruneIrrelevantBlocks_85e2b6d10155dd0d = function() {
        const ret = pruneIrrelevantBlocks();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_queueMicrotask_97d92b4fcc8a61c5 = function(arg0) {
        queueMicrotask(getObject(arg0));
    };
    imports.wbg.__wbg_queueMicrotask_d3219def82552485 = function(arg0) {
        const ret = getObject(arg0).queueMicrotask;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_read_a2434af1186cb56c = function(arg0) {
        const ret = getObject(arg0).read();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_releaseLock_091899af97991d2e = function(arg0) {
        getObject(arg0).releaseLock();
    };
    imports.wbg.__wbg_removeNoteTag_23f00dee052112aa = function(arg0, arg1, arg2, arg3, arg4, arg5) {
        var v0 = getArrayU8FromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 1, 1);
        let v1;
        if (arg2 !== 0) {
            v1 = getStringFromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
        }
        let v2;
        if (arg4 !== 0) {
            v2 = getStringFromWasm0(arg4, arg5).slice();
            wasm.__wbindgen_export_2(arg4, arg5 * 1, 1);
        }
        const ret = removeNoteTag(v0, v1, v2);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_resolve_4851785c9c5f573d = function(arg0) {
        const ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_respond_1f279fa9f8edcb1c = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).respond(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_rpodigest_new = function(arg0) {
        const ret = RpoDigest.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_rpodigest_unwrap = function(arg0) {
        const ret = RpoDigest.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_set_11cd83f45504cedf = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_set_37837023f3d740e8 = function(arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_set_65595bdd868b3009 = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_setbody_5923b78a95eedf29 = function(arg0, arg1) {
        getObject(arg0).body = getObject(arg1);
    };
    imports.wbg.__wbg_setcache_12f17c3a980650e4 = function(arg0, arg1) {
        getObject(arg0).cache = __wbindgen_enum_RequestCache[arg1];
    };
    imports.wbg.__wbg_setcredentials_c3a22f1cd105a2c6 = function(arg0, arg1) {
        getObject(arg0).credentials = __wbindgen_enum_RequestCredentials[arg1];
    };
    imports.wbg.__wbg_setheaders_834c0bdb6a8949ad = function(arg0, arg1) {
        getObject(arg0).headers = getObject(arg1);
    };
    imports.wbg.__wbg_setintegrity_564a2397cf837760 = function(arg0, arg1, arg2) {
        getObject(arg0).integrity = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setmethod_3c5280fe5d890842 = function(arg0, arg1, arg2) {
        getObject(arg0).method = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setmode_5dc300b865044b65 = function(arg0, arg1) {
        getObject(arg0).mode = __wbindgen_enum_RequestMode[arg1];
    };
    imports.wbg.__wbg_setredirect_40e6a7f717a2f86a = function(arg0, arg1) {
        getObject(arg0).redirect = __wbindgen_enum_RequestRedirect[arg1];
    };
    imports.wbg.__wbg_setreferrer_fea46c1230e5e29a = function(arg0, arg1, arg2) {
        getObject(arg0).referrer = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setreferrerpolicy_b73612479f761b6f = function(arg0, arg1) {
        getObject(arg0).referrerPolicy = __wbindgen_enum_ReferrerPolicy[arg1];
    };
    imports.wbg.__wbg_slotandkeys_unwrap = function(arg0) {
        const ret = SlotAndKeys.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_88a902d13a557d07 = function() {
        const ret = typeof global === 'undefined' ? null : global;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0 = function() {
        const ret = typeof globalThis === 'undefined' ? null : globalThis;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_static_accessor_SELF_37c5d418e4bf5819 = function() {
        const ret = typeof self === 'undefined' ? null : self;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_static_accessor_WINDOW_5de37043a91a9c40 = function() {
        const ret = typeof window === 'undefined' ? null : window;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_status_f6360336ca686bf0 = function(arg0) {
        const ret = getObject(arg0).status;
        return ret;
    };
    imports.wbg.__wbg_storageslot_unwrap = function(arg0) {
        const ret = StorageSlot.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_syncsummary_new = function(arg0) {
        const ret = SyncSummary.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_44b73946d2fb3e7d = function(arg0, arg1) {
        const ret = getObject(arg0).then(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_48b406749878a531 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_toString_5285597960676b7b = function(arg0) {
        const ret = getObject(arg0).toString();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_transactionid_new = function(arg0) {
        const ret = TransactionId.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_transactionrecord_new = function(arg0) {
        const ret = TransactionRecord.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_transactionresult_new = function(arg0) {
        const ret = TransactionResult.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_transactionscriptinputpair_unwrap = function(arg0) {
        const ret = TransactionScriptInputPair.__unwrap(takeObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_undoAccountStates_44ae974c316270aa = function(arg0, arg1) {
        var v0 = getArrayJsValueFromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_export_2(arg0, arg1 * 4, 4);
        const ret = undoAccountStates(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_upsertForeignAccountCode_12612290b778842d = function(arg0, arg1, arg2, arg3, arg4, arg5) {
        let deferred0_0;
        let deferred0_1;
        let deferred2_0;
        let deferred2_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            var v1 = getArrayU8FromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
            deferred2_0 = arg4;
            deferred2_1 = arg5;
            const ret = upsertForeignAccountCode(getStringFromWasm0(arg0, arg1), v1, getStringFromWasm0(arg4, arg5));
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
            wasm.__wbindgen_export_2(deferred2_0, deferred2_1, 1);
        }
    };
    imports.wbg.__wbg_upsertInputNote_6a834b3cb5c8a828 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14, arg15, arg16, arg17, arg18) {
        let deferred0_0;
        let deferred0_1;
        let deferred4_0;
        let deferred4_1;
        let deferred6_0;
        let deferred6_1;
        let deferred7_0;
        let deferred7_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            var v1 = getArrayU8FromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
            var v2 = getArrayU8FromWasm0(arg4, arg5).slice();
            wasm.__wbindgen_export_2(arg4, arg5 * 1, 1);
            var v3 = getArrayU8FromWasm0(arg6, arg7).slice();
            wasm.__wbindgen_export_2(arg6, arg7 * 1, 1);
            deferred4_0 = arg8;
            deferred4_1 = arg9;
            var v5 = getArrayU8FromWasm0(arg10, arg11).slice();
            wasm.__wbindgen_export_2(arg10, arg11 * 1, 1);
            deferred6_0 = arg12;
            deferred6_1 = arg13;
            deferred7_0 = arg14;
            deferred7_1 = arg15;
            var v8 = getArrayU8FromWasm0(arg17, arg18).slice();
            wasm.__wbindgen_export_2(arg17, arg18 * 1, 1);
            const ret = upsertInputNote(getStringFromWasm0(arg0, arg1), v1, v2, v3, getStringFromWasm0(arg8, arg9), v5, getStringFromWasm0(arg12, arg13), getStringFromWasm0(arg14, arg15), arg16, v8);
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
            wasm.__wbindgen_export_2(deferred4_0, deferred4_1, 1);
            wasm.__wbindgen_export_2(deferred6_0, deferred6_1, 1);
            wasm.__wbindgen_export_2(deferred7_0, deferred7_1, 1);
        }
    };
    imports.wbg.__wbg_upsertOutputNote_96c3b6759f0f2773 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13) {
        let deferred0_0;
        let deferred0_1;
        let deferred2_0;
        let deferred2_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            var v1 = getArrayU8FromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
            deferred2_0 = arg4;
            deferred2_1 = arg5;
            var v3 = getArrayU8FromWasm0(arg6, arg7).slice();
            wasm.__wbindgen_export_2(arg6, arg7 * 1, 1);
            let v4;
            if (arg8 !== 0) {
                v4 = getStringFromWasm0(arg8, arg9).slice();
                wasm.__wbindgen_export_2(arg8, arg9 * 1, 1);
            }
            var v5 = getArrayU8FromWasm0(arg12, arg13).slice();
            wasm.__wbindgen_export_2(arg12, arg13 * 1, 1);
            const ret = upsertOutputNote(getStringFromWasm0(arg0, arg1), v1, getStringFromWasm0(arg4, arg5), v3, v4, arg10 >>> 0, arg11, v5);
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
            wasm.__wbindgen_export_2(deferred2_0, deferred2_1, 1);
        }
    };
    imports.wbg.__wbg_upsertTransactionRecord_76e673b0558a7446 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
        let deferred0_0;
        let deferred0_1;
        let deferred3_0;
        let deferred3_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            var v1 = getArrayU8FromWasm0(arg2, arg3).slice();
            wasm.__wbindgen_export_2(arg2, arg3 * 1, 1);
            let v2;
            if (arg4 !== 0) {
                v2 = getArrayU8FromWasm0(arg4, arg5).slice();
                wasm.__wbindgen_export_2(arg4, arg5 * 1, 1);
            }
            deferred3_0 = arg6;
            deferred3_1 = arg7;
            let v4;
            if (arg8 !== 0) {
                v4 = getStringFromWasm0(arg8, arg9).slice();
                wasm.__wbindgen_export_2(arg8, arg9 * 1, 1);
            }
            let v5;
            if (arg10 !== 0) {
                v5 = getArrayU8FromWasm0(arg10, arg11).slice();
                wasm.__wbindgen_export_2(arg10, arg11 * 1, 1);
            }
            const ret = upsertTransactionRecord(getStringFromWasm0(arg0, arg1), v1, v2, getStringFromWasm0(arg6, arg7), v4, v5);
            return addHeapObject(ret);
        } finally {
            wasm.__wbindgen_export_2(deferred0_0, deferred0_1, 1);
            wasm.__wbindgen_export_2(deferred3_0, deferred3_1, 1);
        }
    };
    imports.wbg.__wbg_value_cd1ffa7b1ab794f1 = function(arg0) {
        const ret = getObject(arg0).value;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_view_fd8a56e8983f448d = function(arg0) {
        const ret = getObject(arg0).view;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbindgen_array_new = function() {
        const ret = [];
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_array_push = function(arg0, arg1) {
        getObject(arg0).push(takeObject(arg1));
    };
    imports.wbg.__wbindgen_as_number = function(arg0) {
        const ret = +getObject(arg0);
        return ret;
    };
    imports.wbg.__wbindgen_bigint_from_u64 = function(arg0) {
        const ret = BigInt.asUintN(64, arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_bigint_get_as_i64 = function(arg0, arg1) {
        const v = getObject(arg1);
        const ret = typeof(v) === 'bigint' ? v : undefined;
        getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
        const v = getObject(arg0);
        const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
        return ret;
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        const ret = false;
        return ret;
    };
    imports.wbg.__wbindgen_closure_wrapper6495 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 325, __wbg_adapter_52);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_in = function(arg0, arg1) {
        const ret = getObject(arg0) in getObject(arg1);
        return ret;
    };
    imports.wbg.__wbindgen_is_bigint = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'bigint';
        return ret;
    };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
        return ret;
    };
    imports.wbg.__wbindgen_is_null = function(arg0) {
        const ret = getObject(arg0) === null;
        return ret;
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = getObject(arg0);
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbindgen_jsval_eq = function(arg0, arg1) {
        const ret = getObject(arg0) === getObject(arg1);
        return ret;
    };
    imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
        const ret = getObject(arg0) == getObject(arg1);
        return ret;
    };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'number' ? obj : undefined;
        getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export_0, wasm.__wbindgen_export_1);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedBigUint64ArrayMemory0 = null;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;



    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module);
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead');
        }
    }

    const imports = __wbg_get_imports();

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path);
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead');
        }
    }


    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

const module = new URL("assets/miden_client_web.wasm", import.meta.url);
                
                    await __wbg_init({ module_or_path: module });

var wasmModule = /*#__PURE__*/Object.freeze({
	__proto__: null,
	Account: Account,
	AccountBuilder: AccountBuilder,
	AccountBuilderResult: AccountBuilderResult,
	AccountCode: AccountCode,
	AccountComponent: AccountComponent,
	AccountDelta: AccountDelta,
	AccountHeader: AccountHeader,
	AccountId: AccountId,
	AccountStorage: AccountStorage,
	AccountStorageMode: AccountStorageMode,
	AccountStorageRequirements: AccountStorageRequirements,
	AccountType: AccountType,
	AdviceInputs: AdviceInputs,
	AdviceMap: AdviceMap,
	Assembler: Assembler,
	AssemblerUtils: AssemblerUtils,
	AssetVault: AssetVault,
	AuthSecretKey: AuthSecretKey,
	BlockHeader: BlockHeader,
	ConsumableNoteRecord: ConsumableNoteRecord,
	ExecutedTransaction: ExecutedTransaction,
	Felt: Felt,
	FeltArray: FeltArray,
	FlattenedU8Vec: FlattenedU8Vec,
	ForeignAccount: ForeignAccount,
	FungibleAsset: FungibleAsset,
	InputNote: InputNote,
	InputNoteRecord: InputNoteRecord,
	InputNoteState: InputNoteState,
	InputNotes: InputNotes,
	IntoUnderlyingByteSource: IntoUnderlyingByteSource,
	IntoUnderlyingSink: IntoUnderlyingSink,
	IntoUnderlyingSource: IntoUnderlyingSource,
	Library: Library,
	MerklePath: MerklePath,
	Note: Note,
	NoteAndArgs: NoteAndArgs,
	NoteAndArgsArray: NoteAndArgsArray,
	NoteAssets: NoteAssets,
	NoteConsumability: NoteConsumability,
	NoteDetails: NoteDetails,
	NoteDetailsAndTag: NoteDetailsAndTag,
	NoteDetailsAndTagArray: NoteDetailsAndTagArray,
	NoteDetailsArray: NoteDetailsArray,
	NoteExecutionHint: NoteExecutionHint,
	NoteExecutionMode: NoteExecutionMode,
	NoteFilter: NoteFilter,
	NoteFilterTypes: NoteFilterTypes,
	NoteHeader: NoteHeader,
	NoteId: NoteId,
	NoteIdAndArgs: NoteIdAndArgs,
	NoteIdAndArgsArray: NoteIdAndArgsArray,
	NoteInclusionProof: NoteInclusionProof,
	NoteInputs: NoteInputs,
	NoteLocation: NoteLocation,
	NoteMetadata: NoteMetadata,
	NoteRecipient: NoteRecipient,
	NoteScript: NoteScript,
	NoteTag: NoteTag,
	NoteType: NoteType,
	OutputNote: OutputNote,
	OutputNotes: OutputNotes,
	OutputNotesArray: OutputNotesArray,
	PartialNote: PartialNote,
	PublicKey: PublicKey,
	RecipientArray: RecipientArray,
	Rpo256: Rpo256,
	RpoDigest: RpoDigest,
	SecretKey: SecretKey,
	SlotAndKeys: SlotAndKeys,
	StorageMap: StorageMap,
	StorageSlot: StorageSlot,
	SyncSummary: SyncSummary,
	TestUtils: TestUtils,
	TransactionArgs: TransactionArgs,
	TransactionFilter: TransactionFilter,
	TransactionId: TransactionId,
	TransactionKernel: TransactionKernel,
	TransactionProver: TransactionProver,
	TransactionRecord: TransactionRecord,
	TransactionRequest: TransactionRequest,
	TransactionRequestBuilder: TransactionRequestBuilder,
	TransactionResult: TransactionResult,
	TransactionScript: TransactionScript,
	TransactionScriptInputPair: TransactionScriptInputPair,
	TransactionScriptInputPairArray: TransactionScriptInputPairArray,
	TransactionStatus: TransactionStatus,
	WebClient: WebClient,
	Word: Word,
	initSync: initSync
});

const WorkerAction = Object.freeze({
  INIT: "init",
  CALL_METHOD: "callMethod",
});

const MethodName = Object.freeze({
  CREATE_CLIENT: "createClient",
  NEW_WALLET: "newWallet",
  NEW_FAUCET: "newFaucet",
  NEW_TRANSACTION: "newTransaction",
  SUBMIT_TRANSACTION: "submitTransaction",
  SYNC_STATE: "syncState",
});

/**
 * Worker for executing WebClient methods in a separate thread.
 *
 * This worker offloads computationally heavy tasks from the main thread by handling
 * WebClient operations asynchronously. It imports the WASM module and instantiates a
 * WASM WebClient, then listens for messages from the main thread to perform one of two actions:
 *
 * 1. **Initialization (init):**
 *    - The worker receives an "init" message along with user parameters (RPC URL and seed).
 *    - It instantiates the WASM WebClient and calls its createClient method.
 *    - Once initialization is complete, the worker sends a `{ ready: true }` message back to signal
 *      that it is fully initialized.
 *
 * 2. **Method Invocation (callMethod):**
 *    - The worker receives a "callMethod" message with a specific method name and arguments.
 *    - It uses a mapping (defined in `methodHandlers`) to route the call to the corresponding WASM WebClient method.
 *    - Complex data is serialized before being sent and deserialized upon return.
 *    - The result (or any error) is then posted back to the main thread.
 *
 * The worker uses a message queue to process incoming messages sequentially, ensuring that only one message
 * is handled at a time.
 *
 * Additionally, the worker immediately sends a `{ loaded: true }` message upon script load. This informs the main
 * thread that the worker script is loaded and ready to receive the "init" message.
 *
 * Supported actions (defined in `WorkerAction`):
 *   - "init"       : Initialize the WASM WebClient with provided parameters.
 *   - "callMethod" : Invoke a designated method on the WASM WebClient.
 *
 * Supported method names are defined in the `MethodName` constant.
 */

// Global state variables.
let wasmWebClient = null;
let ready = false; // Indicates if the worker is fully initialized.
let messageQueue = []; // Queue for sequential processing.
let processing = false; // Flag to ensure one message is processed at a time.

// Define a mapping from method names to handler functions.
const methodHandlers = {
  [MethodName.NEW_WALLET]: async (args) => {
    const [walletStorageModeStr, mutable, seed] = args;
    const walletStorageMode =
      wasmModule.AccountStorageMode.tryFromStr(walletStorageModeStr);
    const wallet = await wasmWebClient.newWallet(
      walletStorageMode,
      mutable,
      seed
    );
    const serializedWallet = wallet.serialize();
    return serializedWallet.buffer;
  },
  [MethodName.NEW_FAUCET]: async (args) => {
    const [
      faucetStorageModeStr,
      nonFungible,
      tokenSymbol,
      decimals,
      maxSupplyStr,
    ] = args;
    const faucetStorageMode =
      wasmModule.AccountStorageMode.tryFromStr(faucetStorageModeStr);
    const maxSupply = BigInt(maxSupplyStr);
    const faucet = await wasmWebClient.newFaucet(
      faucetStorageMode,
      nonFungible,
      tokenSymbol,
      decimals,
      maxSupply
    );
    const serializedFaucet = faucet.serialize();
    return serializedFaucet.buffer;
  },
  [MethodName.NEW_TRANSACTION]: async (args) => {
    const [accountIdStr, serializedTransactionRequest] = args;
    const accountId = wasmModule.AccountId.fromHex(accountIdStr);
    const transactionRequest = wasmModule.TransactionRequest.deserialize(
      new Uint8Array(serializedTransactionRequest)
    );

    const transactionResult = await wasmWebClient.newTransaction(
      accountId,
      transactionRequest
    );
    const serializedTransactionResult = transactionResult.serialize();
    return serializedTransactionResult.buffer;
  },
  [MethodName.SUBMIT_TRANSACTION]: async (args) => {
    // Destructure the arguments. The prover may be undefined.
    const [serializedTransactionResult, serializedProver] = args;
    const transactionResult = wasmModule.TransactionResult.deserialize(
      new Uint8Array(serializedTransactionResult)
    );

    let prover = undefined;
    if (serializedProver) {
      if (serializedProver.startsWith("remote:")) {
        // For a remote prover, extract the endpoint.
        // For example, "remote:https://my-custom-endpoint.com" becomes "https://my-custom-endpoint.com"
        const endpoint = serializedProver.split("remote:")[1];
        prover = wasmModule.TransactionProver.deserialize("remote", endpoint);
      } else if (serializedProver === "local") {
        prover = wasmModule.TransactionProver.deserialize("local");
      } else {
        throw new Error("Invalid prover tag received in worker");
      }
    }

    // Call the unified submit_transaction method with an optional prover.
    await wasmWebClient.submitTransaction(transactionResult, prover);
    return;
  },
  [MethodName.SYNC_STATE]: async () => {
    const syncSummary = await wasmWebClient.syncState();
    const serializedSyncSummary = syncSummary.serialize();
    return serializedSyncSummary.buffer;
  },
};

/**
 * Process a single message event.
 */
async function processMessage(event) {
  const { action, args, methodName, requestId } = event.data;
  try {
    if (action === WorkerAction.INIT) {
      const [rpcUrl, seed] = args;
      // Initialize the WASM WebClient.
      wasmWebClient = new wasmModule.WebClient();
      await wasmWebClient.createClient(rpcUrl, seed);
      ready = true;
      // Signal that the worker is fully initialized.
      self.postMessage({ ready: true });
      return;
    } else if (action === WorkerAction.CALL_METHOD) {
      if (!ready) {
        throw new Error("Worker is not ready. Please initialize first.");
      }
      if (!wasmWebClient) {
        throw new Error("WebClient not initialized in worker.");
      }
      // Look up the handler from the mapping.
      const handler = methodHandlers[methodName];
      if (!handler) {
        throw new Error(`Unsupported method: ${methodName}`);
      }
      const result = await handler(args);
      self.postMessage({ requestId, result });
      return;
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }
  } catch (error) {
    console.error(`WORKER: Error occurred - ${error}`);
    self.postMessage({ requestId, error: error });
  }
}

/**
 * Process messages one at a time from the messageQueue.
 */
async function processQueue() {
  if (processing || messageQueue.length === 0) return;
  processing = true;
  const event = messageQueue.shift();
  try {
    await processMessage(event);
  } finally {
    processing = false;
    processQueue(); // Process next message in queue.
  }
}

// Enqueue incoming messages and process them sequentially.
self.onmessage = (event) => {
  messageQueue.push(event);
  processQueue();
};

// Immediately signal that the worker script has loaded.
// This tells the main thread that the file is fully loaded before sending the "init" message.
self.postMessage({ loaded: true });
//# sourceMappingURL=web-client-methods-worker.js.map
