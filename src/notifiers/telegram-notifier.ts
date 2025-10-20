import TelegramBot from 'node-telegram-bot-api';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { TGMessage } from '../utils/types';
import mysql from "mysql2/promise";
import { config } from "../config";

let bot: TelegramBot;
let DB: mysql.Pool

export function initTelegramBot(token: string, database: mysql.Pool, onMessage?: (message: TelegramBot.Message, metadata: TelegramBot.Metadata, db: mysql.Pool) => any, proxyUrl?: string) {
    if (proxyUrl) {
        const agent = new HttpsProxyAgent(proxyUrl);

        bot = new TelegramBot(token, {
            polling: false,
            request: {
                agent,
            } as any
        });
    } else {
        bot = new TelegramBot(token, { polling: false });
    }
    DB = database
    if (onMessage) {
        bot.on('message', (message, metadata) => {
            onMessage(message, metadata, DB)
        });
    }
    console.info('[Telegram] Bot 初始化完成');
    return bot
}

export async function sendAlert(msg: TGMessage) {
    if (!bot) {
        console.warn('[Telegram] Bot 未初始化，无法发送');
        return;
    }
    let opt = { parse_mode: 'Markdown' } as any
    if (msg.messageThreadId) {
        opt['message_thread_id'] = msg.messageThreadId
    }
    if (msg.replyToMessageId) {
        opt['reply_to_message_id'] = msg.replyToMessageId
    }
    await bot.sendMessage(msg.chatId, msg.message, opt).catch((err) => {
        console.error('[Telegram] 发送失败：', err.message);
    });
}

export async function sendMiniApp(chatId: number, messageThreadId?: number | null, replyToMessageId?: number | null) {
    if (!bot) {
        console.warn('[Telegram] Bot 未初始化，无法发送');
        return;
    }
    let botton = { text: "Open PerpX", web_app: { url: config.MINI_APP_URL } } as any
    if (replyToMessageId) {
        botton = { text: "Open PerpX", url: `https://t.me/${config.BOT_NAME}/?startapp` }
    }
    let opt = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { ...botton }
            ]]
        }
    } as any
    if (messageThreadId) {
        opt['message_thread_id'] = messageThreadId
    }
    if (replyToMessageId) {
        opt['reply_to_message_id'] = replyToMessageId
    }
    await bot.sendMessage(chatId, "点击下方按钮打开PerpX", opt).catch((err) => {
        console.error('[Telegram] 发送失败：', err.message);
    });
}

export async function deleteMsg(chatId: number, messageId: number) {
  try {
    await bot.deleteMessage(chatId, messageId);
    console.debug(`[Telegram] ✅ 已删除消息 ${messageId} 于群 ${chatId}`);
  } catch (err: any) {
    console.error('[Telegram] ❌ 删除失败：', err.message);
  }
}
