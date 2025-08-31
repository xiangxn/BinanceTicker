import "./utils/console"
import { BinanceWSClient } from './clients/binance-ws-client';
import { initTelegramBot, sendAlert } from './notifiers/telegram-notifier';
import dotenv from 'dotenv';
import { join } from "path";
import { HandlerManager } from "./handlerManager";
import Denque from "denque";
import { sleep } from "./utils/helper";

dotenv.config();
// ✅ 初始化 Telegram
initTelegramBot(
    process.env.TG_API_KEY || '',
    process.env.TG_CHAT_ID || '',
    process.env.WS_PROXY || undefined
);

const messageQueue = new Denque<string>();
const manager = new HandlerManager(join(__dirname, "handlers"), sendTGMsg);
let sending = false; // 是否正在发送

function sendTGMsg(msg: any) {
    if (msg.type === 'sendTGMsg') {
        messageQueue.push(msg.text);
    }
}

function onMessage(data: string) {
    manager.broadcast(data);
}

// 处理队列的函数
async function processQueue() {
    while (sending) {
        if (messageQueue.length === 0) {
            await sleep(100);
            continue;
        }
        const msg = messageQueue.shift()!;
        try {
            sendAlert(msg)
        } catch (err) {
            console.error("❌ 发送失败，重试:", err);
            // 失败时重新入队
            messageQueue.unshift(msg);
            await sleep(2000); // 等待再试
        }
        // 加点间隔，避免 Telegram 429 (Too Many Requests)
        await sleep(300);
    }
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


sending = true;
processQueue();
wsClient.connect();

process.on('SIGINT', () => {
    console.info('🛑 Shutting down...');
    sending = false;
    wsClient.close();
    manager.close().then(() => {
        process.exit(0);
    })
});
