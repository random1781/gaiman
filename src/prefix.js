/*    ______      _
 *   / ____/___ _(_)___ ___  ____ _____
 *  / / __/ __ `/ / __ `__ \/ __ `/ __ \
 * / /_/ / /_/ / / / / / / / /_/ / / / /
 * \____/\__,_/_/_/ /_/ /_/\__,_/_/ /_/
 *
 * Code generated by Gaiman version {{VER}}
 * https://gaiman.js.org
 */
function parse_cookies(cookies) {
    const result = {};
    cookies.split(/\s*;\s*/).forEach(function(pair) {
        pair = pair.split(/\s*=\s*/);
        var name = decodeURIComponent(pair[0]);
        var value = decodeURIComponent(pair.splice(1).join('='));
        result[name] = value;
    });
    return result;
}

function is_function(obj) {
    return typeof obj === 'function';
}

function is_promise(obj) {
    return obj && is_function(obj.then);
}

function is_node() {
    return typeof process !== 'undefined' &&
        process.release.name === 'node';
}

// based on https://stackoverflow.com/a/46282334/387194
function extend(object, prototype) {
    const descriptors = Object.getOwnPropertyDescriptors(object);
    for (const prop in descriptors) {
        Object.defineProperty(prototype, prop, descriptors[prop]);
    }
}

const loops = {};

const Gaiman = {
    _get_time() {
        return +new Date;
    },
    should_break_loop(id) {
        if (!loops[id]) {
            loops[id] = {
                start: this._get_time(),
                count: 1
            };
            return false;
        } else {
            var now = this._get_time();
            const { start } = loops[id];
            const count = ++loops[id].count;
            if (count > this._config.loop_threshold) {
                const stop = now - start > this._config.loop_timeout;
                if (stop) {
                    window.parent.postMessage({
                        message: 'Infinite Loop detected!',
                        colno: null,
                        lineno: null
                    });
                }
                return stop;
            }
            return false;
        }
    },
    exit_loop(id) {
        delete loops[id];
    },
    type(obj) {
        if (obj === 'null') {
            return 'null';
        } else if (Number.isNaN(obj)) {
            return 'nan';
        } else if (obj instanceof Array) {
            return 'array';
        } else {
            var type = typeof obj;
            if (type === 'object') {
                // https://tinyurl.com/fixing-typeof
                return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
            }
            return type;
        }
    },
    parse(input) {
        return $.terminal.parse_arguments(input);
    },
    parse_extra(input) {
        return $.terminal.split_arguments(input);
    },
    set_cookie(name, value) {
        document.cookie = `${name}=${value}`;
        cookie[name] = value;
    },
    post(url, data = {}) {
        return $.post(url, data);
    },
    post_extra(url, data = {}) {
        return $.post(url, data, $.noop, "text");
    },
    get(url, data) {
        if (data) {
            return $.get(url, data);
        }
        return $.get(url);
    },
    get_extra(url, data) {
        if (data) {
            return $.get(url, data, $.noop, "text");
        }
        return $.get(url, $.noop, "text");
    },
    load(url) {
        return $.getScript(url);
    },
    ['async'](fn) {
        setTimeout(fn, 0);
    },
    async rpc(url) {
        // TODO: add Open-RPC
        return new Proxy({}, {
            get(target, name) {
                if (name in target) {
                    return target[name];
                }
                if (name === 'then') {
                    return undefined;
                }
                return (...args) => {
                    return $.rpc(url, name, args);
                };
            },
            set() {
                throw new Error("You can't set properties on rpc object");
            }
        });
    }
};

function to_string(object) {
    if (object instanceof Array) {
        object = object.map(to_string);
    } else {
        var type = typeof object;
        if (type === 'number') {
            object = String(object);
        } else if (type !== 'string') {
            if (object) {
                object = JSON.stringify(object, null, 2);
            } else {
                object = String(object);
            }
        }
    }
    return object;
}

class WebAdapter {
    constructor(config = {}) {
        this._config = $.extend({
            keepWords: false,
            newline: true,
            loop_threshold: 500,
            loop_timeout: 200
        }, config);
        var root = $('#term');
        var options = root.css('--options');
        if (typeof options === 'undefined') {
            options = {};
        } else {
            try {
                options = JSON.parse(options);
            } catch(e) {
                console.warn('Gaiman: Invalid --option CSS variable');
                options = {};
            }
        }
        this._term = root.terminal($.noop, $.extend({
            greetings: false,
            exit: false,
            keydown: () => {
                if (this._animation) {
                    return false;
                }
            },
            exceptionHandler(e) {
                if (is_iframe) {
                    window.parent.postMessage({
                        message: 'Internal: ' + e.message,
                        colno: null,
                        lineno: null
                    });
                } else {
                    throw e;
                }
            }
        }, options));
    }
    config(name) {
        if (typeof name === 'object') {
            for (const [key, value] of Object.entries(name)) {
                this._config[key] = value
            }
        }
    }
    store(name, ...args) {
        try {
            if (args.length === 0) {
                return JSON.parse(localStorage.getItem(name));
            } else {
                const [ value ] = args;
                localStorage.setItem(name, JSON.stringify(value));
            }
        } catch(e) {
            // ignore errors that may happen in Incognito mode
        }
    }
    sleep(timeout, visible = false) {
        this._term.pause(visible);
        return new Promise(resolve => {
            setTimeout(() => {
                this._term.resume();
                resolve();
            }, Number(timeout));
        });
    }
    sleep_extra(timeout) {
        return this.sleep(timeout, true);
    }
    mask(char) {
        if (arguments.length === 0) {
            return this._term.cmd().mask();
        }
        this._term.set_mask(char);
    }
    error(e) {
        var message;
        if (e.statusText) {
            message = `Failed to fetch: ${e.url}\n${e.statusText}`;
        } else {
            message = e.message || e;
        }
        this._term.error(message);
    }
    echo(arg = "") {
        if (typeof arg !== 'function') {
            arg = to_string(arg);
        }
        this._term.echo(arg, { keepWords: this._config.keepWords, newline: this._config.newline });
    }
    echo_extra(string, delay) {
        return this._term.echo(string, { keepWords: this._config.keepWords, typing: true, delay });
    }
    enter(string) {
        return this._term.enter(string);
    }
    enter_extra(string, delay) {
        return this._term.enter(string, { typing: true, delay });
    }
    ask(message, validator = () => true) {
        return new Promise(resolve => {
            this._term.push(result => {
                return Promise.resolve().then(async () => {
                    if (typeof validator !== 'function') {
                        throw new Error('ask validator needs to be a function');
                    }
                    if (await validator(result)) {
                        this._term.pop();
                        resolve(result);
                    }
                });
            }, {
                prompt: message
            });
        });
    }
    ask_extra(message, delay, validator = () => true) {
        return new Promise(resolve => {
            const prompt = this._term.get_prompt();
            this._term.push(result => {
                return Promise.resolve().then(async () => {
                    if (typeof validator !== 'function') {
                        throw new Error('ask* validator needs to be a function');
                    }
                    if (await validator(result)) {
                        this._term.pop().set_prompt(prompt);
                        resolve(result);
                    } else {
                        this._term.set_prompt(message, {
                            typing: true,
                            delay
                        });
                    }
                })
            }).set_prompt(message, {
                typing: true,
                delay
            });
        });
    }
    update(index, string) {
        this._term.update(index, string);
    }
    prompt(string) {
        this._term.set_prompt(string);
    }
    prompt_extra(string, delay) {
        return this._term.set_prompt(string, { typing: true, delay });
    }
    input(string) {
        return this._term.exec(string);
    }
    input_extra(string, delay) {
        return this._term.exec(string, { typing: true, delay });
    }
    exec(command) {
        return this._term.exec(command);
    }
    exec_extra(command, delay) {
        return this._term.exec(command, { typing: true, delay });
    }
    async animate(fn) {
        this._animation = true;
        await fn();
        this._animation = false;
    }
    clear() {
        this._term.clear();
    }
}

$.ajaxSetup({
    beforeSend: function(jqXHR, settings) {
        jqXHR.url = settings.url;
    }
});

extend(Gaiman, WebAdapter.prototype);

class GaimanArray extends Array {
    map(...args) {
        function call(arr) {
            return new GaimanArray(...arr);
        }
        const arr = super.map.apply(this, args);
        const some = super.some;
        const has_promise = some.call(arr, is_promise);
        if (has_promise) {
            return Promise.all(arr).then(call);
        } else {
            return call(arr);
        }
    }
    forEach(...args) {
        return this.map(...args);
    }
    filter(fn, ctx) {
        const filter = super.filter;
        function call(arr) {
            return new GaimanArray(...filter.call(arr, x => x));
        }
        const items = this.map(fn, ctx);
        if (is_promise(items)) {
            return items.then(arr => {
                return call(arr);
            });
        } else {
            return call(items);
        }
    }
    reduce(fn, init) {
        return new GaimanArray(...super.reduce.call(this, function(acc, ...args) {
            if (is_promise(acc)) {
                return acc.then(acc => {
                    return fn(acc, ...args);
                });
            } else {
                return fn(acc, ...args);
            }
        }, init));
    }
    sort(fn = defaultSortFn) {
        return mergeSort(this, fn);
    }
    some(fn, ctx) {
        const some = super.some;
        return this.mapWithCallback(fn, (arr) => {
            return some.call(arr, x => x);
        }, ctx);
    }
    every(fn, ctx) {
        const every = super.every;
        return this.mapWithCallback(fn, (arr) => {
            return every.call(arr, x => x);
        }, ctx);
    }
    find(fn, ctx) {
        return this.mapWithCallback(fn, (arr) => {
            const index = arr.findIndex(x => x);
            return this[index];
        }, ctx);
    }
    flatMap(fn, ...args) {
        return this.map(...args).flat();
    }
    mapWithCallback(fn, callback, ctx) {
        const items = this.map(fn, ctx);
        if (is_promise(items)) {
            return items.then(arr => {
                return callback(arr);
            });
        } else {
            return callback(items);
        }
    }
}

function defaultSortFn(a, b) {
    if (typeof a !== 'string') {
        a = String(a);
    }
    if (typeof b !== 'string') {
        b = String(b);
    }
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}

// based on: https://rosettacode.org/wiki/Sorting_algorithms/Merge_sort#JavaScript
async function mergeSort(array, fn = defaultSortFn) {
    if (array.length <= 1) {
        return array;
    }
    const mid = Math.floor(array.length / 2),
          left = array.slice(0, mid), right = array.slice(mid);
    await mergeSort(left, fn);
    await mergeSort(right, fn);
    let ia = 0, il = 0, ir = 0;
    while (il < left.length && ir < right.length) {
        array[ia++] = (await fn(left[il], right[ir]) <= 0) ? left[il++] : right[ir++];
    }
    while (il < left.length) {
        array[ia++] = left[il++];
    }
    while (ir < right.length) {
        array[ia++] = right[ir++];
    }
    return array;
}

// STD library
function $_ord(x) {
    const type = typeof x;
    if (type !== 'string') {
        throw new Error(`ord: Invalid argument, expected string got ${type}`);
    }
    const len = [...x].length;
    if (len > 1) {
        throw new Error('ord: argument need to be string of length 1');
    }
    return x.codePointAt(0);
}

function $_chr(x) {
    const type = typeof x;
    if (type !== 'number') {
        throw new Error(`chr: Invalid argument, expected number got ${type}`);
    }
    return String.fromCodePoint(x);
}

function $_range(start, stop, step) {
    if (!stop) {
        stop = start;
        start = 0;
    }
    if (!step) {
        if (start > stop) {
            step = -1;
        } else {
            step = 1;
        }
    }
    if (start > stop && step > 0) {
        return new GaimanArray();
    }
    let result = new GaimanArray();
    function run() {
        result.push(start);
        start += step;
    }
    if (start > stop) {
        while (start > stop) {
            run();
        }
    } else {
        while (start < stop) {
            run();
        }
    }
    return result;
}
let $_abs = Math.abs;
let $_acos = Math.acos;
let $_acosh = Math.acosh;
let $_asin = Math.asin;
let $_asinh = Math.asinh;
let $_atan = Math.atan;
let $_atanh = Math.atanh;
let $_atan2 = Math.atan2;
let $_ceil = Math.ceil;
let $_cbrt = Math.cbrt;
let $_expm1 = Math.expm1;
let $_clz32 = Math.clz32;
let $_cos = Math.cos;
let $_cosh = Math.cosh;
let $_exp = Math.exp;
let $_floor = Math.floor;
let $_fround = Math.fround;
let $_hypot = Math.hypot;
let $_imul = Math.imul;
let $_log = Math.log;
let $_log1p = Math.log1p;
let $_log2 = Math.log2;
let $_log10 = Math.log10;
let $_max = Math.max;
let $_min = Math.min;
let $_pow = Math.pow;
let $_random = Math.random;
let $_round = Math.round;
let $_sign = Math.sign;
let $_sin = Math.sin;
let $_sinh = Math.sinh;
let $_sqrt = Math.sqrt;
let $_tan = Math.tan;
let $_tanh = Math.tanh;
let $_trunc = Math.trunc;
let $_E = Math.E;
let $_LN10 = Math.LN10;
let $_LN2 = Math.LN2;
let $_LOG10E = Math.LOG10E;
let $_LOG2E = Math.LOG2E;
let $_PI = Math.PI;
let $_SQRT1_2 = Math.SQRT1_2;
let $_SQRT2 = Math.SQRT2;
let $_to_base64 = btoa;
let $_from_base64 = atob;
let $_sprintf = sprintf;

let $_cols = function() {
    return gaiman._term.cols();
};
let $_rows = function() {
    return gaiman._term.rows();
};
let $_delay = function(time) {
    return new Promise(resolve => setTimeout(resolve, time));
};

// Fisher-Yates (aka Knuth) Shuffle
// ref: https://stackoverflow.com/a/2450976/387194
function $_shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

var cookie, argv, gaiman, $$__m;
try {
    if (is_node()) {
        argv = process.argv;
    } else {
        cookie = parse_cookies(document.cookie);
        gaiman = new WebAdapter();
    }
    main();
} catch (e) {
    window.parent.postMessage({
        message: e.message,
        colno: null,
        lineno: null
    });
}
