import { BinanceTicker } from '../utils/types';
import { Candle } from '../utils/types';
import { sendAlert } from '../notifiers/telegram-notifier';

type CandlePeriod = '5m' | '1h';

interface TickerHandlerConfig {
    candlePeriod: CandlePeriod;
    historyCandlesCount: number;
    magnification: number;
}

const defaultConfig: TickerHandlerConfig = {
    candlePeriod: '5m',
    historyCandlesCount: 3,
    magnification: 2
};

const symbolCandles: Map<string, Candle[]> = new Map();
const currentCandleState: Map<string, Candle> = new Map();
const lastCheckTime: Map<string, number> = new Map();

let config: TickerHandlerConfig = defaultConfig;

function getPeriodStart(timestamp: number, period: CandlePeriod): number {
    const date = new Date(timestamp);
    if (period === '5m') {
        date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
    } else {
        date.setMinutes(0, 0, 0);
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
        if (!symbol.endsWith('USDT')) return;

        const price = parseFloat(ticker.o); // 开盘价
        const high = parseFloat(ticker.h);
        const low = parseFloat(ticker.l);

        // 初始化当前小时 Candle
        if (!currentCandleState.has(symbol)) {
            currentCandleState.set(symbol, {
                startTime: periodStart,
                open: price,
                high: high,
                low: low,
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
            });
        } else {
            // 更新当前周期最高最低
            c.high = Math.max(c.high, high);
            c.low = Math.min(c.low, low);
        }

        // 每分钟做一次异常波动判断
        const now = Date.now();
        const lastCheck = lastCheckTime.get(symbol) || 0;
        if (now - lastCheck >= 60 * 1000) { // 1分钟间隔
            checkAbnormal(symbol);
            lastCheckTime.set(symbol, now);
        }
    });
}

function checkAbnormal(symbol: string) {
    const history = symbolCandles.get(symbol);
    const current = currentCandleState.get(symbol);
    if (!history || history.length < config.historyCandlesCount || !current) return;

    const currentAmp = (current.high - current.low) / current.open;
    const prevAmps = history.slice(-2).map((c) => (c.high - c.low) / c.open);
    const avgPrevAmp = prevAmps.reduce((sum, a) => sum + a, 0) / prevAmps.length;

    console.info(`${symbol} 当前${config.candlePeriod}震幅: ${(currentAmp * 100).toFixed(2)}%, 过去平均: ${(avgPrevAmp * 100).toFixed(2)}%`)
    if (currentAmp >= avgPrevAmp * config.magnification) {  // 震幅大于之前2倍
        const msg = `[⚠️ 异常波动] ${symbol} 当前${config.candlePeriod}震幅: ${(currentAmp * 100).toFixed(2)}%, 过去${config.historyCandlesCount}周期平均 ${(avgPrevAmp * 100).toFixed(2)}%`
        console.warn(msg);
        sendAlert(msg);
    }
}
