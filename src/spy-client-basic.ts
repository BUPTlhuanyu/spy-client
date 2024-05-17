/**
 * @file SpyClient
 * @author kaivean
 */

import {SpyClientOption} from './lib/interface';
import {assign} from './lib/util';

interface Option {
    /**
     * 指标组，它的每个key就是指标名称（英文表示），在平台对应分组添加该指标名称便能实现自动统计
     */
    info: object;

    /**
     * 维度信息对象，它的每个字段就是一个维度名称（英文表示），在平台对应分组添加该维度名称便能实现自动统计
     */
    dim?: object;

    /**
     * 分组，默认：common
     */
    group?: string;

    /**
     * 抽样，会覆盖全局抽样配置，默认是 1，取值从[0, 1]
     */
    sample?: number;

    /**
     * 日志服务器，默认是webb服务器，尾部需要加?
     */
    logServer?: string;
}

interface ErrorInfo {
    /**
     * 错误唯一标识，平台会统计该错误唯一标识的数量
     */
    [propName: string]: any;
}

interface ErrorOption {
    /**
     * 错误信息对象，它必须有msg字段，是错误唯一标识，其他字段可用户随意添加用来补充错误信息
     */
    info?: ErrorInfo;

    /**
     * 维度信息对象，它的每个字段就是一个维度名称（英文表示），在平台对应分组添加该维度名称便能实现自动统计
     */
    dim?: object;

    /**
     * 分组，默认：common
     */
    group?: string;

    /**
     * 抽样，默认是 1，取值从[0, 1]，该抽样会覆盖实例初始化时的抽样配置
     */
    sample?: number;

    /**
     * 业务拓展信息
     */
    ext?: any;
}

const defaultLogServer = 'https://sp1.baidu.com/5b1ZeDe5KgQFm2e88IuM_a/mwb2.gif?';
// 基础版本兼容非浏览器环境
const ver = navigator && navigator.userAgent ? navigator.userAgent.toLowerCase().match(/cpu iphone os (.*?)_/) : '';


function err(msg: string) {
    console.error(`[SpyClient_log]${msg}`);
    // throw new Error(msg);
}

function stringify(obj: any) {
    return Object.keys(obj).map((key: string) => {
        let value = obj[key];

        if (typeof value === 'undefined') {
            value = '';
        }
        else if (typeof value !== 'string') {
            value = JSON.stringify(value);
        }

        return encodeURIComponent(key) + '=' + encodeURIComponent(value);
    }).join('&');
}

function isArray(arr: any) {
    return Object.prototype.toString.call(arr) === '[object Array]';
}

interface SpyClientInnerOption extends SpyClientOption {
    logServer: string;
}

export default class SpyClient {

    sample: any = {};

    markCache: any = {};

    option: SpyClientInnerOption;

    constructor(option: SpyClientOption) {
        if (!option.pid) {
            throw new Error('pid is required');
        }

        this.option = {
            pid: option.pid,
            lid: option.lid,
            sample: option.sample,
            logServer: option.logServer || defaultLogServer,
        };
    }

    handle(logItem: any) {
        logItem = assign(
            {
                pid: this.option.pid,
                lid: this.option.lid,
                ts: Date.now(),
                group: 'common',
            },
            logItem
        );

        // 当前api设置了抽样，
        if (typeof logItem.sample === 'number') {
            if (Math.random() > logItem.sample) {
                return;
            }
        }
        else if (typeof this.option.sample === 'number' && Math.random() > this.option.sample) { // 否则，用全局抽样
            return;
        }

        delete logItem.sample;
        return logItem;
    }

    send(data: any) {
        let logItems: any[] = isArray(data) ? data : [data];

        for (let logItem of logItems) {
            logItem = this.handle(logItem);
            if (!logItem) {
                continue;
            }

            const url = this.option.logServer + stringify(logItem);
            this.request(url);
        }
    }

    /**
     *
     * @param option 配置
     */
    sendPerf(option: Option) {
        this.send(assign({
            type: 'perf',
        }, option));
    }

    /**
     *
     * @param option 错误配置项
     */
    sendExcept(option: ErrorOption) {
        this.send(assign({
            type: 'except',
        }, option));
    }

    /**
     *
     * @param option 配置
     */
    sendDist(option: Option) {
        this.send(assign({
            type: 'dist',
        }, option));
    }

    /**
     *
     * @param option 配置
     */
    sendCount(option: Option) {
        this.send(assign({
            type: 'count',
        }, option));
    }

    /**
     *
     * @param e 错误实例
     * @param option 错误配置项
     */
    sendExceptForError(e: Error, option: ErrorOption) {
        const newOpt: ErrorOption = assign({}, option);
        newOpt.info = assign({}, option.info || {}, {
            msg: e.message,
            stack: e.stack,
        });

        this.sendExcept(newOpt);
    }

    startMark(sign: string) {
        this.markCache[sign] = {
            start: Date.now(),
        };
    }

    endMark(sign: string): number {
        if (this.markCache[sign]) {
            this.markCache[sign].total = Date.now() - this.markCache[sign].start;
            return this.markCache[sign].total;
        }
        return 0;
    }

    clearMark(sign: string) {
        if (this.markCache[sign]) {
            delete this.markCache[sign];
        }
    }

    getAllMark() {
        const ret: {[propName: string]: number} = {};
        for (const sign of Object.keys(this.markCache)) {
            ret[sign] = this.markCache[sign].total;
        }
        return ret;
    }

    clearAllMark() {
        this.markCache = {};
    }

    // 有data时，意味着要用post发送请求
    protected request(url: string) {
        (new Image()).src = url;
    }
}
