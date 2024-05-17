/**
 * @file 白屏监控
 * @author kaivean
 */

import {
    ErrorHandlerData,
    SpyHeadConf,
    WhiteScreenErrorConf,
} from '../lib/spyHeadInterface';
import {getResTiming} from '../lib/util';

import spyHead from './base';

export function init(conf: SpyHeadConf) {
    const whiteScreenError = conf.whiteScreenError || {} as WhiteScreenErrorConf;
    const handler = whiteScreenError.handler;
    const selector = whiteScreenError.selector;
    const subSelector = whiteScreenError.subSelector;
    const timeout = whiteScreenError.timeout || 6000;

    // 补充白屏信息：期间的网络时间
    function getNetTime() {
        if (!window.performance) {
            return false;
        }
        const pf = getResTiming(window.performance.timing);
        const netStr = `&wait=${pf.wait}`
            + `&dns=${pf.dns}`
            + `&connect=${pf.connect}`
            + `&requestTime=${pf.req}`
            + `&resoneTime=${pf.res}`;
        return netStr;
    }

    // 补充白屏信息：期间发生的JS Error 和 资源 Error
    function getHisError() {
        if (!(spyHead.winerrors)) {
            return false;
        }
        const errors = spyHead.winerrors;
        const historys = [];
        for (let i = 0; i < errors.length; i++) {
            const stack = (errors[i].info.stack || '').split('\n')[0];
            historys.push(`(${i })${stack || errors[i].info.msg}`);
        }
        return historys.join(';;');
    }

    // 补充白屏信息: 设备信息
    function getDeviceInfo() {
        const ret = {} as any;
        // 设备信息
        const dataConnection = navigator.connection || {};
        ret.downlink = dataConnection.downlink; // 网站下载速度 M/s
        ret.effectiveType = dataConnection.effectiveType; // 网络类型
        ret.rtt = dataConnection.rtt; // 网络往返时间 ms
        ret.deviceMemory = navigator.deviceMemory || 0;
        ret.hardwareConcurrency = navigator.hardwareConcurrency || 0;
        return ret;
    }

    function isWhiteScreen() {
        const ele = document.querySelector(selector);
        if (!ele) {
            return true;
        }
        const sub = ele.querySelector(subSelector);
        if (!sub) {
            return true;
        }
        if (ele.clientHeight < (window.innerHeight * 2 / 3)) {
            return true;
        }
        return false;
    }

    if (selector) {
        setTimeout(function () {
            if (isWhiteScreen()) {
                const obj = {
                    group: whiteScreenError.group,
                    info: {
                        msg: '',
                        netTime: getNetTime(),
                        hisErrors: getHisError(),
                        deviceInfo: getDeviceInfo(),
                    },
                } as ErrorHandlerData;

                obj.info.msg = 'WhiteScren Error';

                let allow: boolean | undefined | void = true;
                if (handler) {
                    allow = handler(obj);
                }

                if (allow !== false && obj.info.msg) {
                    spyHead && spyHead.send(obj);
                }
            }
        }, timeout);
    }
}
