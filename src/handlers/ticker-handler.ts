import { BinanceTicker } from '../utils/types';
import { Candle } from '../utils/types';
import { sendAlert } from '../notifiers/telegram-notifier';

const symbolCandles: Map<string, Candle[]> = new Map();
const currentHourState: Map<string, Candle> = new Map();

function getHourStart(timestamp: number): number {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    return date.getTime();
}

// 每秒收到数据，更新当前小时的 open/high/low
export function handleTickerData(data: string) {
    const tickers: BinanceTicker[] = JSON.parse(data);
    const now = Date.now();
    const hourStart = getHourStart(now);

    tickers.forEach((ticker) => {
        const symbol = ticker.s;
        if (!symbol.endsWith('USDT')) return;

        const price = parseFloat(ticker.o); // 开盘价
        const high = parseFloat(ticker.h);
        const low = parseFloat(ticker.l);

        // 初始化当前小时 Candle
        if (!currentHourState.has(symbol)) {
            currentHourState.set(symbol, {
                startTime: hourStart,
                open: price,
                high: high,
                low: low,
            });
        }

        const c = currentHourState.get(symbol)!;

        // 若新小时，则封存旧K线
        if (c.startTime !== hourStart) {
            // 存入历史记录
            if (!symbolCandles.has(symbol)) symbolCandles.set(symbol, []);
            const history = symbolCandles.get(symbol)!;
            history.push(c);

            // 仅保留 3 小时内的
            symbolCandles.set(
                symbol,
                history.filter((c) => now - c.startTime <= 3 * 60 * 60 * 1000)
            );

            // 开启新一小时 Candle
            currentHourState.set(symbol, {
                startTime: hourStart,
                open: price,
                high: high,
                low: low,
            });

            // 做异常波动判断
            checkAbnormal(symbol);
        } else {
            // 更新当前小时最高最低
            c.high = Math.max(c.high, high);
            c.low = Math.min(c.low, low);
        }
    });
}

function checkAbnormal(symbol: string) {
    const history = symbolCandles.get(symbol);
    const current = currentHourState.get(symbol);
    if (!history || history.length < 2 || !current) return;

    const currentAmp = (current.high - current.low) / current.open;
    const prevAmps = history.slice(-2).map((c) => (c.high - c.low) / c.open);
    const avgPrevAmp = prevAmps.reduce((sum, a) => sum + a, 0) / prevAmps.length;

    if (currentAmp > avgPrevAmp * 2) {  // 震幅大于之前2倍
        const msg = `[⚠️ 异常波动] ${symbol} 当前1h震幅: ${(currentAmp * 100).toFixed(2)}%, 过去2小时平均 ${(avgPrevAmp * 100).toFixed(2)}%`
        console.log(msg);
        sendAlert(msg);
    }
}
