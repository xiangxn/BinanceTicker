import "../utils/console"
import { parentPort } from "worker_threads";
import { BinanceTicker, Candle, CandlePeriod } from "../utils/types";
import { getPeriodStart } from "../utils/helper";

if (!parentPort) throw new Error("Must be run as a Worker");
parentPort.on("message", (msg) => {
    handleData(msg);
});

interface TrendHandlerConfig {
    candlePeriod: CandlePeriod;
    historyCandlesCount: number;
    successive: number;
    quoteAsset: string;
    minTurnover: number;
}

const defaultConfig: TrendHandlerConfig = {
    candlePeriod: '1h',
    historyCandlesCount: 5,
    successive: 5,
    quoteAsset: 'USDT',
    minTurnover: 15000000,   //24小时成交额太小的不关注
};

const symbolCandles: Map<string, Candle[]> = new Map();
const currentCandleState: Map<string, Candle> = new Map();

let config: TrendHandlerConfig = defaultConfig;

function handleData(data: string) {
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
            checkTrend(symbol);
        } else {
            // 更新当前周期最高最低
            c.high = Math.max(c.high, high);
            c.low = Math.min(c.low, low);
            c.volume += volume;
            c.close = close;
        }
    });
}

function checkTrend(symbol: string) {
    const history = symbolCandles.get(symbol);
    if (!history || history.length < config.historyCandlesCount) return;

    // 非严格递增
    const isNonDecreasing = history.every((v, i, arr) => i === 0 || arr[i - 1].close <= v.close);

    // 非严格递减
    const isNonIncreasing = history.every((v, i, arr) => i === 0 || arr[i - 1].close >= v.close);

    if (isNonDecreasing || isNonIncreasing) {
        const msg = `⚠️ [${symbol}](https://www.binance.com/zh-CN/futures/${symbol}) 连续${config.successive}个${config.candlePeriod}周期价格${isNonDecreasing ? "🔺" : "🔻"}`
        parentPort?.postMessage({
            type: "sendTGMsg",
            text: msg
        });
    }
}
