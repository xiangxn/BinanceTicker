import { formatNumberCN } from "./utils/helper";
import { ConsecutiveMoveParams, ConsecutiveMoveValue, EventMessage, FundingRateParams, FundingRateValue, TGMessage, UserStrategy, VolatilitySpikeParams, VolatilitySpikeValue } from "./utils/types";
import mysql from "mysql2/promise";
import dayjs from 'dayjs';

let strategyCache: Map<string, Map<string, Map<string, UserStrategy[]>>> = new Map();

export async function loadUserStrategies(mysqlPool: mysql.Pool) {
    const sql = `SELECT us.id,us.user_id as userId,us.strategy_type as strategyType,us.symbol,us.period,us.params,u.tg_chat_id as chatId,u.tg_thread_id as threadId FROM user_strategies as us
                LEFT JOIN users as u ON u.id = us.user_id
                WHERE is_active = 1`;
    const [rows] = await mysqlPool.query(sql);
    // strategy_type => symbol => period => UserStrategy
    const next: Map<string, Map<string, Map<string, UserStrategy[]>>> = new Map();

    let strategyCount = 0;
    for (const r of rows as any[]) {
        let params: any;
        try {
            params = typeof r.params === "string" ? JSON.parse(r.params) : r.params;
        } catch (e) {
            console.warn("invalid params JSON for subscription", r.id, e);
            continue;
        }

        const strategy: UserStrategy = r as UserStrategy;
        strategy.params = params;

        if (!next.has(strategy.strategyType)) next.set(strategy.strategyType, new Map());
        const symbolMap = next.get(strategy.strategyType)!;

        if (!symbolMap.has(strategy.symbol)) symbolMap.set(strategy.symbol, new Map());
        const periodMap = symbolMap.get(strategy.symbol)!;

        if (!periodMap.has(strategy.period)) periodMap.set(strategy.period, []);
        periodMap.get(strategy.period)!.push(strategy);
        strategyCount++;
    }

    // swap to global cache
    strategyCache = next;
    console.info(`[cache] loaded subscriptions. strategies=${strategyCount}`);
}

export function findMatchingSubs(event: EventMessage): UserStrategy[] {
    let result: UserStrategy[] = [];

    const typeMap = strategyCache.get(event.event_type);
    if (!typeMap) return result;

    switch (event.event_type) {
        case "ConsecutiveMove":
            result = matchingConsecutiveMove(event, typeMap);
            break;
        case "VolatilitySpike":
            result = matchingVolatilitySpike(event, typeMap);
            break;
        case "FundingRate":
            result = matchingFundingRate(event, typeMap);
            break;
        default:
            break;
    }
    return result;
}

function matchingConsecutiveMove(event: EventMessage, symbolMap: Map<string, Map<string, UserStrategy[]>>): UserStrategy[] {
    const result: UserStrategy[] = [];
    // symbol matches
    const arr0 = symbolMap.get(event.symbol)?.get(event.period) ?? [];
    const arr1 = symbolMap.get("*")?.get(event.period) ?? [];
    const strategies = [...arr0, ...arr1];

    // params match
    for (const strategy of strategies) {
        const params = strategy.params as ConsecutiveMoveParams;
        const value = event.value as ConsecutiveMoveValue;
        if (value.count >= params.count && parseFloat(value.turnover) >= parseFloat(params.turnover)) {
            result.push(strategy);
        }
    }
    return result;
}

function matchingVolatilitySpike(event: EventMessage, symbolMap: Map<string, Map<string, UserStrategy[]>>): UserStrategy[] {
    const result: UserStrategy[] = [];
    // symbol matches
    const arr0 = symbolMap.get(event.symbol)?.get(event.period) ?? [];
    const arr1 = symbolMap.get("*")?.get(event.period) ?? [];
    const strategies = [...arr0, ...arr1];

    // params match
    for (const strategy of strategies) {
        const params = strategy.params as VolatilitySpikeParams;
        const value = event.value as VolatilitySpikeValue;
        if (value.amplitude >= params.amplitudeMultiple * value.avg_amplitude && parseFloat(value.turnover) >= parseFloat(params.turnover) && value.volume >= params.volume) {
            result.push(strategy);
        }
    }
    return result;
}

function matchingFundingRate(event: EventMessage, symbolMap: Map<string, Map<string, UserStrategy[]>>): UserStrategy[] {
    const result: UserStrategy[] = [];
    // symbol matches
    const arr0 = symbolMap.get(event.symbol)?.get('all') ?? []; // funding rate 只支持all, 没有period分别
    const arr1 = symbolMap.get("*")?.get('all') ?? [];
    const strategies = [...arr0, ...arr1];

    // params match
    for (const strategy of strategies) {
        const params = strategy.params as FundingRateParams;
        const value = event.value as FundingRateValue;
        if (Math.abs(parseFloat(value.funding_rate)) >= parseFloat(params.fundingRate)) {
            result.push(strategy);
        }
    }
    return result;
}

export function buildTGMessage(strategy: UserStrategy, event: EventMessage): TGMessage {
    let msg: TGMessage = {
        chatId: strategy.chatId,
        message: ""
    };
    if (strategy.threadId) {
        msg.messageThreadId = strategy.threadId;
    }
    switch (strategy.strategyType) {
        case "ConsecutiveMove":
            msg.message = `⚠️ [${event.symbol}](https://www.binance.com/zh-CN/futures/${event.symbol})
连续${event.value.count}个${event.period}周期价格${event.value.direction == 1 ? "🔺" : "🔻"}
24小时成交额: ${formatNumberCN(event.value.turnover)}`;
            break;
        case "VolatilitySpike":
            const direction = event.value.direction == 1 ? "🔺" : "🔻"
            msg.message = `🚨 异常波动 [${event.symbol}](https://www.binance.com/zh-CN/futures/${event.symbol}) 
当前${event.period} ${direction} 震幅: ${(event.value.amplitude * 100).toFixed(2)}%
过去3个周期平均 ${(event.value.avg_amplitude * 100).toFixed(2)}%
成交量: ${event.value.volume}
24小时成交额: ${formatNumberCN(event.value.turnover)}`;
            break;
        case "FundingRate":
            const nft = dayjs.unix(event.value.next_funding_time / 1000).format("YYYY-MM-DD HH:mm:ss")
            const rate = (parseFloat(event.value.funding_rate) * 100).toFixed(4)
            msg.message = `⚠️ [${event.symbol}](https://www.binance.com/zh-CN/futures/${event.symbol}) 资金费率: ${rate}%, 下次资金时间: ${nft}`;
            break;
        default:
            break;
    }
    return msg;
}

export function getStrategyCache() {
    return strategyCache
}