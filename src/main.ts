import "./utils/console"
import { BinanceWSClient } from './clients/binance-ws-client';
import { initTelegramBot } from './notifiers/telegram-notifier';
import dotenv from 'dotenv';
import { join } from "path";
import { HandlerManager } from "./handlerManager";

dotenv.config();
// ✅ 初始化 Telegram
initTelegramBot(
    process.env.TG_API_KEY || '',
    process.env.TG_CHAT_ID || '',
    process.env.WS_PROXY || undefined
);

const manager = new HandlerManager(join(__dirname, "handlers"));

function onMessage(data: string) {
    manager.broadcast(data);
}

const wsClient = new BinanceWSClient(
    'wss://fstream.binance.com/ws/!ticker@arr',
    {
        onOpen: () => {
            console.info('🛰️ Subscribed to all tickers');
        },
        onMessage: onMessage,
    },
    {
        proxyUrl: process.env.WS_PROXY || undefined,
    }
);



wsClient.connect();

process.on('SIGINT', () => {
    console.info('🛑 Shutting down...');
    wsClient.close();
    manager.close().then(() => {
        process.exit(0);
    })
});
