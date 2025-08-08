import "./utils/console"
import { BinanceWSClient } from './clients/binance-ws-client';
import { handleTickerData } from './handlers/ticker-handler';
import { initTelegramBot } from './notifiers/telegram-notifier';
import dotenv from 'dotenv';

dotenv.config();
// ✅ 初始化 Telegram
initTelegramBot(
    process.env.TG_API_KEY || '',
    process.env.TG_CHAT_ID || '',
    process.env.WS_PROXY || undefined
);

const wsClient = new BinanceWSClient(
    'wss://fstream.binance.com/ws/!ticker@arr',
    {
        onOpen: () => {
            console.info('🛰️ Subscribed to all tickers');
        },
        onMessage: handleTickerData,
    },
    {
        proxyUrl: process.env.WS_PROXY || undefined,
    }
);



wsClient.connect();

process.on('SIGINT', () => {
    console.info('🛑 Shutting down...');
    wsClient.close();
    process.exit(0);
});
