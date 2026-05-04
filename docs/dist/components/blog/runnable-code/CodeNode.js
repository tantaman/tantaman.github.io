/**
 * RunnableCode has imports and exports.
 *
 * Imports are what we need from other blocks.
 * Exports are what we provide to blocks.
 *
 * Blocks with no imports can be run immediately.
 * Blocks with imports must wait until those imports are ready.
 *
 * We can create a cache of promises for each import.
 *
 * When someone exports, they can resolve that promise.
 * When someone imports, they await on that promise.
 */
const pathToResources = new Map();
const USE_REG = /^use\s+([A-z]{1}[A-z|0-9]*);$/gm;
const PROVIDE_REG = /^provide\s+([A-z]{1}[A-z|0-9]*);$/gm;
export function getResource(id) {
    if (!pathToResources.has(window.location.pathname)) {
        pathToResources.set(window.location.pathname, new Map());
    }
    const resources = pathToResources.get(window.location.pathname);
    if (!resources.has(id)) {
        resources.set(id, new Resource(id));
    }
    return resources.get(id);
}
export function clearResources() {
    for (const [, resources] of pathToResources) {
        for (const [, resource] of resources) {
            if (resource.resolution && typeof resource.resolution === 'object') {
                maybeDispose(resource.resolution);
            }
        }
    }
    pathToResources.clear();
}
function maybeDispose(obj) {
    if (obj == null)
        return;
    const cleanups = ['close', 'dispose', 'destroy'];
    for (const cleanup of cleanups) {
        if (obj[cleanup] != null && typeof obj[cleanup] === 'function') {
            maybeCatch(() => obj[cleanup]());
        }
    }
}
function maybeCatch(fn) {
    try {
        const ret = fn();
        if (isPromise(ret)) {
            ret.catch((e) => console.warn(e));
        }
    }
    catch (e) {
        console.warn(e);
    }
}
export class CodeNode {
    constructor() {
        this.uses = new Map();
        this.provides = new Set();
        this.body = null;
        this.pendingPromise = null;
        this.on = null;
        this.onResourceReady = (id, resolution, rejection, version) => {
            let allReady = true;
            let seenAllVersions = true;
            for (const [u, v] of this.uses) {
                const resource = getResource(u);
                if (!(resource === null || resource === void 0 ? void 0 : resource.isReady)) {
                    allReady = false;
                    break;
                }
                if (v < resource.version)
                    seenAllVersions = false;
            }
            if (!allReady)
                return;
            if (!seenAllVersions)
                this.run(this.body);
        };
    }
    eval(code) {
        var _a, _b, _c;
        const [uses, body, provides] = this.parse(code);
        this.body = body;
        const noLongerUses = [...this.uses.keys()].filter((u) => !uses.has(u));
        for (const u of noLongerUses) {
            (_a = getResource(u)) === null || _a === void 0 ? void 0 : _a.off(this.onResourceReady);
        }
        this.uses = new Map();
        for (const u of uses)
            this.uses.set(u, 0);
        this.provides = provides;
        for (const p of this.provides) {
            (_b = getResource(p)) === null || _b === void 0 ? void 0 : _b.invalidate();
        }
        if (this.uses.size == 0)
            this.run(body);
        for (const u of this.uses.keys()) {
            (_c = getResource(u)) === null || _c === void 0 ? void 0 : _c.on(this.onResourceReady);
        }
    }
    run(body) {
        let rejected = false;
        const inputs = [];
        for (const u of this.uses.keys()) {
            const resource = getResource(u);
            this.uses.set(u, (resource === null || resource === void 0 ? void 0 : resource.version) || 0);
            rejected = rejected || (resource === null || resource === void 0 ? void 0 : resource.rejection) !== undefined;
            if (rejected) {
                console.error(resource === null || resource === void 0 ? void 0 : resource.rejection);
                return;
            }
            inputs.push(resource === null || resource === void 0 ? void 0 : resource.resolution);
        }
        const code = `async (${[...this.uses.keys()].join(', ')}) => {
      let ___ret = await (async () => {
        ${body}
      })();

      return [___ret, ${[...this.provides].join(', ')}];
    }`;
        let fn;
        try {
            fn = eval(code);
        }
        catch (e) {
            console.log(code);
            throw e;
        }
        const result = fn(...inputs);
        let i = 1;
        for (const p of this.provides) {
            const resource = getResource(p);
            const index = i;
            resource === null || resource === void 0 ? void 0 : resource.setPromise(result.then((r) => r[index]));
            ++i;
        }
        this.pendingPromise = result;
        result.then((r) => {
            if (this.pendingPromise != result)
                return;
            if (isPromise(r[0])) {
                r[0].then((r) => this.runComplete(r));
            }
            else {
                this.runComplete(r[0]);
            }
        }, (e) => this.runComplete(undefined, e));
    }
    runComplete(result, e) {
        var _a;
        (_a = this.on) === null || _a === void 0 ? void 0 : _a.call(this, result, e);
    }
    waitingFor() {
        return [...this.uses.keys()].filter((u) => { var _a; return !((_a = getResource(u)) === null || _a === void 0 ? void 0 : _a.isReady); });
    }
    parse(code) {
        const uses = new Set();
        for (const m of code.matchAll(USE_REG)) {
            uses.add(m[1]);
        }
        const provides = new Set();
        for (const m of code.matchAll(PROVIDE_REG)) {
            provides.add(m[1]);
            code = code.replace(m[0], `self.${m[1]} = ${m[1]};`);
        }
        const body = code.replaceAll(USE_REG, '');
        return [uses, body, provides];
    }
}
class Resource {
    constructor(id) {
        this.id = id;
        this.promise = Promise.resolve();
        this.resolution = undefined;
        this.rejection = undefined;
        this.ready = false;
        this.consumers = new Set();
        this.v = 1;
    }
    invalidate() {
        this.promise = Promise.resolve();
        maybeDispose(this.resolution);
        this.resolution = undefined;
        this.rejection = undefined;
        this.ready = false;
    }
    setPromise(promise) {
        this.promise = promise;
        this.resolution = undefined;
        this.rejection = undefined;
        this.ready = false;
        promise.then((value) => {
            if (promise == this.promise) {
                ++this.v;
                this.resolution = value;
                this.ready = true;
                this.notifyConsumers();
            }
        }, (error) => {
            if (promise == this.promise) {
                ++this.v;
                this.rejection = error;
                this.ready = true;
                this.notifyConsumers();
            }
        });
    }
    on(consumer) {
        this.consumers.add(consumer);
        if (this.isReady) {
            consumer(this.id, this.resolution, this.rejection, this.version);
        }
        return () => this.off(consumer);
    }
    off(consumer) {
        this.consumers.delete(consumer);
    }
    notifyConsumers() {
        for (const c of this.consumers) {
            c(this.id, this.resolution, this.rejection, this.version);
        }
    }
    get isReady() {
        return this.ready;
    }
    get version() {
        return this.v;
    }
}
function isPromise(obj) {
    return (!!obj &&
        (typeof obj === 'object' || typeof obj === 'function') &&
        typeof obj.then === 'function');
}
