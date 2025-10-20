import TelegramBot from 'node-telegram-bot-api';
import { config } from "./config";
import { deleteMsg, sendAlert, sendMiniApp } from './notifiers/telegram-notifier';
import { login, grokChat } from "./utils/grok";
import mysql from "mysql2/promise";
import { User } from './db/user';

let lastAskTime = 0

export async function onTGMessage(message: TelegramBot.Message, metadata: TelegramBot.Metadata, db: mysql.Pool) {
    console.debug(message, metadata)
    if (message.chat.id === parseInt(config.TG_CHAT_ID) && message.message_thread_id && message.message_thread_id === parseInt(config.TG_MESSAGE_THREAD_ID)) {
        if (message.message_thread_id) {
            if (message.message_thread_id === Number(config.TG_MESSAGE_THREAD_ID)) {
                if (message.text?.startsWith(`@${config.BOT_NAME}`)) {
                    const [, coin] = message.text.split(" ")
                    if (coin && coin.length > 0) {
                        const result = await askCoin(coin)
                        if (result) {
                            await sendAlert({
                                chatId: config.TG_CHAT_ID,
                                message: result,
                                messageThreadId: config.TG_MESSAGE_THREAD_ID,
                                replyToMessageId: message.message_id
                            })
                        } else {
                            console.warn(`[ask_coin] ask coin ${coin} failed`)
                        }
                    }
                }
            } else {
                await deleteMsg(Number(config.TG_CHAT_ID), message.message_id)
            }
        }
    }
    // 绑定用户
    if (message.text?.startsWith("/start bind_user") && message.from && message.chat) {
        await bindUser(db, message.from.id, message.chat.id)
    }
    // 绑定群组  /start@bn_ticker_bot bind_group
    if (message.text?.startsWith(`/start@${config.BOT_NAME} bind_group`) && message.from && message.chat) {
        await bindGroup(db, message.from.id, message.chat.id, message.message_id, message.message_thread_id ? message.message_thread_id : null)
    }
}



/**
 * 处理/start bind_user
 * @param db 
 * @param tgId 
 * @param chatId 
 */
async function bindUser(db: mysql.Pool, tgId: number, chatId: number) {
    const user = new User(db)
    const ok = await user.updateTelegramChatId(tgId.toString(), chatId, null)
    if (ok) {
        await sendMiniApp(chatId)
    }
}

async function bindGroup(db: mysql.Pool, tgId: number, chatId: number, replyToMessageId: number, threadId: number | null = null) {
    const user = new User(db)
    const ok = await user.updateTelegramChatId(tgId.toString(), chatId, threadId)
    if (ok) {
        await sendMiniApp(chatId, threadId, replyToMessageId)
    }
}

async function askCoin(coin: string) {
    const now = Date.now()
    if (now - lastAskTime < config.TG_ASK_COIN_INTERVAL * 60 * 1000) {
        return `${config.TG_ASK_COIN_INTERVAL}分钟内只能问一次`
    }
    lastAskTime = now
    try {
        const loggedIn = await login()
        if (loggedIn) {
            const message = await grokChat(`你好, 请帮我查看“${coin}”这个加密货币的简介、背景、融资情况, 以简短的文字回答, 不要超过500字。`)
            console.debug(`[ask_coin] ask coin ${coin} success: ${message}`)
            if (message) {
                const msg = filterContent(message)
                console.debug("[ask_coin] filterContent:", msg)
                return msg
            }
        }
    } catch (e) {
        console.error(`[ask_coin] ask coin ${coin} failed`, e)
    }
    return "机器人上厕所去了, 请稍后再试!"
}

function filterContent(content: string) {
    content = content.replace(/<xai:tool_usage_card>\n?[\s\S]*?<\/xai:tool_usage_card>\n?/g, "")
    content = content.replace(/<grok:render [\s\S]*?<\/grok:render>\n?/g, "")
    let lines = content.split("\n")
    lines = lines.filter(line => !line.includes("- ") && line !== "\n" && line !== "")
    content = lines.join("\n")
    return content
}