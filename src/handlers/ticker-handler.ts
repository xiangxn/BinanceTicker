import { BinanceTicker } from '../utils/types';
import { Candle } from '../utils/types';
import { sendAlert } from '../notifiers/telegram-notifier';

type CandlePeriod = `${number}${'m' | 'h' | 'd'}`;

interface TickerHandlerConfig {
    candlePeriod: CandlePeriod;
    historyCandlesCount: number;
    magnification: number;
    quoteAsset: string;
}

const defaultConfig: TickerHandlerConfig = {
    candlePeriod: '5m',
    historyCandlesCount: 3,
    magnification: 3,
    quoteAsset: 'USDT',
};

const symbolCandles: Map<string, Candle[]> = new Map();
const currentCandleState: Map<string, Candle> = new Map();
const lastCheckTime: Map<string, number> = new Map();
const lastRemind: Map<string, number> = new Map();

let config: TickerHandlerConfig = defaultConfig;

function getPeriodStart(timestamp: number, period: CandlePeriod): number {
    const date = new Date(timestamp);
    const unit = period.charAt(period.length - 1).toLowerCase();
    const t = parseInt(period.replace(unit, ''));
    switch (unit) {
        case 'm':
            date.setMinutes(Math.floor(date.getMinutes() / t) * t, 0, 0);
            break;
        case 'h':
            date.setHours(Math.floor(date.getHours() / t) * t, 0, 0, 0);
            break;
        case 'd':
            const msPerDay = 86400000;
            const alignedTime = Math.floor(date.getTime() / (msPerDay * t)) * msPerDay * t;
            date.setTime(alignedTime)
            break;
        default:
    }
    return date.getTime();
}

// 每秒收到数据，更新当前小时的 open/high/low
export function handleTickerData(data: string) {
    const tickers: BinanceTicker[] = JSON.parse(data);
    const now = Date.now();
    const periodStart = getPeriodStart(now, config.candlePeriod);

    console.info(`Symbol changes: ${tickers.length}/${currentCandleState.size}`)

    tickers.forEach((ticker) => {
        const symbol = ticker.s;
        if (!symbol.endsWith(config.quoteAsset)) return;

        const price = parseFloat(ticker.c); // 最新成交价格
        const volume = parseFloat(ticker.Q); // 最新成交价上的成交量
        const high = price;
        const low = price;
        const close = price;

        // 初始化当前小时 Candle
        if (!currentCandleState.has(symbol)) {
            currentCandleState.set(symbol, {
                startTime: periodStart,
                open: price,
                high: high,
                low: low,
                close,
                volume
            });
        }

        const c = currentCandleState.get(symbol)!;

        // 若新周期，则封存旧K线
        if (c.startTime !== periodStart) {
            // 存入历史记录
            if (!symbolCandles.has(symbol)) symbolCandles.set(symbol, []);
            const history = symbolCandles.get(symbol)!;
            history.push(c);

            // 仅保留指定数量的历史Candles
            symbolCandles.set(
                symbol,
                history.slice(-config.historyCandlesCount)
            );

            // 开启新周期 Candle
            currentCandleState.set(symbol, {
                startTime: periodStart,
                open: price,
                high: high,
                low: low,
                close,
                volume
            });
        } else {
            // 更新当前周期最高最低
            c.high = Math.max(c.high, high);
            c.low = Math.min(c.low, low);
            c.volume += volume;
            c.close = close;
        }

        // 每分钟做一次异常波动判断
        const now = Date.now();
        const lastCheck = lastCheckTime.get(symbol) || 0;
        if (now - lastCheck >= 60 * 1000) { // 1分钟间隔
            checkAbnormal(symbol, periodStart);
            lastCheckTime.set(symbol, now);
        }
    });
}

function checkAbnormal(symbol: string, periodStart: number) {
    const history = symbolCandles.get(symbol);
    const current = currentCandleState.get(symbol);
    if (!history || history.length < config.historyCandlesCount || !current) return;

    const currentAmp = (current.high - current.low) / current.open;
    const prevAmps = history.slice(-config.historyCandlesCount).map((c) => (c.high - c.low) / c.open);
    const avgPrevAmp = prevAmps.reduce((sum, a) => sum + a, 0) / prevAmps.length;

    const direction = (current.close > history.slice(-1)[0].close) ? "🔺" : "🔻"
    const volume = current.volume;

    if (currentAmp >= avgPrevAmp * config.magnification) {  // 震幅大于之前周期2倍以上
        const msg = `[⚠️ 异常波动] ${symbol} 当前${config.candlePeriod} ${direction} 震幅: ${(currentAmp * 100).toFixed(2)}%, 过去${config.historyCandlesCount}个周期平均 ${(avgPrevAmp * 100).toFixed(2)}%, 成交量: ${volume}`
        console.warn(msg);
        if (!lastRemind.has(symbol) || lastRemind.get(symbol) !== periodStart) {
            lastRemind.set(symbol, periodStart);
            sendAlert(msg);
        }
    } else {
        console.info(`${symbol} 当前${config.candlePeriod}震幅: ${(currentAmp * 100).toFixed(2)}%, 过去平均: ${(avgPrevAmp * 100).toFixed(2)}%`)
    }
}
