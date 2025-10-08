import TelegramBot from 'node-telegram-bot-api';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { TGMessage } from '../utils/types';

let bot: TelegramBot;

export function initTelegramBot(token: string, onMessage?: (message: TelegramBot.Message, metadata: TelegramBot.Metadata) => any, proxyUrl?: string) {
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
    if (onMessage) {
        bot.on('message', onMessage);
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
