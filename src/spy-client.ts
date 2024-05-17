/**
 * @file SpyClient
 * @author kaivean
 */

import SpyClientBasic from './spy-client-basic';

import {
    Module,
    SpyClientOption,

    LCPCB,
    ResourceCB,
    ResourceErrorCB,
    TimingCB,

    ResOption,
    BigImgOption,
    SlowOption,
} from './lib/interface';

import Timing from './module/timing';
import Resource from './module/resource';
import LCP from './module/lcp';

export default class SpyClient extends SpyClientBasic {
    private readonly modules: Module[] = [];

    constructor(option: SpyClientOption) {
        super(option);

        this.register(new Timing());
        this.register(new Resource());
        this.register(new LCP());

        this.visibilitychangeCB = this.visibilitychangeCB.bind(this);
        this.load = this.load.bind(this);
        this.leave = this.leave.bind(this);

        if (document.readyState === 'complete') {
            this.load();
        }
        else {
            window.addEventListener('load', this.load);
        }

        document.addEventListener('visibilitychange', this.visibilitychangeCB);
        window.addEventListener('beforeunload', this.leave, false);
        window.addEventListener('unload', this.leave, false);
    }

    load() {
        for (let index = 0; index < this.modules.length; index++) {
            const mod = this.modules[index];
            mod.load && mod.load();
        }
    }

    listenLCP(cb: LCPCB) {
        this.invoke('listenLCP', cb as any);
    }

    listenResource(cb: ResourceCB, option?: ResOption) {
        this.invoke('listenResource', cb as any, option);
    }

    listenBigImg(cb: ResourceErrorCB, option?: BigImgOption) {
        this.invoke('listenBigImg', cb as any, option);
    }

    listenSlowResource(cb: ResourceErrorCB, option?: SlowOption) {
        this.invoke('listenSlowResource', cb as any, option);
    }

    listenTiming(cb: TimingCB) {
        this.invoke('listenTiming', cb as any);
    }

    invoke(name: string, cb?: any, option?: any) {
        for (let index = 0; index < this.modules.length; index++) {
            const mod = this.modules[index];
            if (typeof (mod as any)[name] === 'function') {
                return (mod as any)[name].apply(mod, [cb, option]);
            }
        }
        console.error('no method', name);
    }

    register(mod: Module) {
        this.modules.push(mod);
    }

    leave() {
        for (let index = 0; index < this.modules.length; index++) {
            const mod = this.modules[index];
            mod.leave && mod.leave();
        }
    }

    destroy() {
        for (let index = 0; index < this.modules.length; index++) {
            const mod = this.modules[index];
            mod.destroy && mod.destroy();
        }

        document.removeEventListener('visibilitychange', this.visibilitychangeCB);
        window.removeEventListener('load', this.load);
        window.removeEventListener('beforeunload', this.leave);
        window.removeEventListener('unload', this.destroy);
    }

    private visibilitychangeCB() {
        if (document.visibilityState === 'hidden') {
            this.leave();
        }
    }
}