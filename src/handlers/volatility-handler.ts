import "../utils/console"
import { BinanceTicker, CandlePeriod } from '../utils/types';
import { Candle } from '../utils/types';
import { parentPort } from "worker_threads";
import { formatNumberCN, getPeriodStart } from "../utils/helper";

if (!parentPort) throw new Error("Must be run as a Worker");
parentPort.on("message", (msg) => {
    handleTickerData(msg);
});


interface TickerHandlerConfig {
    candlePeriod: CandlePeriod;
    historyCandlesCount: number;
    magnification: number;
    quoteAsset: string;
    minTurnover: number;
}

const defaultConfig: TickerHandlerConfig = {
    candlePeriod: '5m',
    historyCandlesCount: 3,
    magnification: 5,
    quoteAsset: 'USDT',
    minTurnover: 20000000,   //24小时成交额小于2000万，不关注
};

const symbolCandles: Map<string, Candle[]> = new Map();
const currentCandleState: Map<string, Candle> = new Map();
const lastCheckTime: Map<string, number> = new Map();
const lastRemind: Map<string, number> = new Map();

let config: TickerHandlerConfig = defaultConfig;


// 每秒收到数据，更新当前小时的 open/high/low
function handleTickerData(data: string) {
    const tickers: BinanceTicker[] = JSON.parse(data);
    const now = Date.now();
    const periodStart = getPeriodStart(now, config.candlePeriod);

    console.info(`Symbol changes: ${tickers.length}/${currentCandleState.size}`)

    tickers.forEach((ticker) => {
        const symbol = ticker.s;
        if (!symbol.endsWith(config.quoteAsset)) return;

        const turnover = parseFloat(ticker.q); //24小时成交额
        if (turnover < config.minTurnover) return;

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
            checkAbnormal(symbol, periodStart, turnover);
            lastCheckTime.set(symbol, now);
        }
    });
}

function checkAbnormal(symbol: string, periodStart: number, turnover: number) {
    const history = symbolCandles.get(symbol);
    const current = currentCandleState.get(symbol);
    if (!history || history.length < config.historyCandlesCount || !current) return;

    const currentAmp = (current.high - current.low) / current.open;
    const prevAmps = history.slice(-config.historyCandlesCount).map((c) => (c.high - c.low) / c.open);
    const avgPrevAmp = prevAmps.reduce((sum, a) => sum + a, 0) / prevAmps.length;

    const direction = (current.close > history.slice(-1)[0].close) ? "🔺" : "🔻"
    const volume = current.volume;

    if (currentAmp > 0.0001 && currentAmp >= avgPrevAmp * config.magnification) {  // 震幅大于之前周期2倍以上,且不为0
        const msg = `⚠️ 异常波动 [${symbol}](https://www.binance.com/zh-CN/futures/${symbol}) 当前${config.candlePeriod} ${direction} 震幅: ${(currentAmp * 100).toFixed(2)}%, 过去${config.historyCandlesCount}个周期平均 ${(avgPrevAmp * 100).toFixed(2)}%, 成交量: ${volume}
        24小时成交额: ${formatNumberCN(turnover)} `
        console.warn(msg);
        if (!lastRemind.has(symbol) || lastRemind.get(symbol) !== periodStart) {
            lastRemind.set(symbol, periodStart);
            // sendAlert(msg);
            parentPort?.postMessage({
                type: "sendTGMsg",
                text: msg
            });
        }
    } else {
        console.info(`${symbol} 当前${config.candlePeriod}震幅: ${(currentAmp * 100).toFixed(2)}%, 过去平均: ${(avgPrevAmp * 100).toFixed(2)}%`)
    }
}
