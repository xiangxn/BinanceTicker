import TelegramBot from 'node-telegram-bot-api';
import { config } from "./config";
import { sendAlert } from './notifiers/telegram-notifier';
import { login, grokChat } from "./utils/grok";

let lastAskTime = 0

export async function onTGMessage(message: TelegramBot.Message, metadata: TelegramBot.Metadata) {
    console.debug(message, metadata)
    if (message.chat.id === parseInt(config.TG_CHAT_ID) && message.message_thread_id && message.message_thread_id === parseInt(config.TG_MESSAGE_THREAD_ID)) {
        if (message.text?.startsWith("@bn_ticker_bot ")) {
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
    }
}

async function askCoin(coin: string) {
    const now = Date.now()
    if (now - lastAskTime < 5 * 60 * 1000) {
        return "5分钟内只能问一次"
    }
    lastAskTime = now
    try {
        const loggedIn = await login()
        if (loggedIn) {
            const message = await grokChat(`你好, 请帮我查看“${coin}”这个加密货币的背景、融资情况以及简介, 以简短的文字回答, 不要超过500字。`)
            console.debug(`[ask_coin] ask coin ${coin} success: ${message}`)
            if (message) {
                const msg = filterContent(message)
                console.log("msg:", msg)
                return msg
            }
        }
    } catch (e) {
        console.error(`[ask_coin] ask coin ${coin} failed`, e)
    }
    return "机器人上厕所去了, 请稍后再试!"
}

function filterContent(content: string) {
    const lines = content.split("\n")
    console.log(lines)
    const filteredLines = lines.filter(line => {
        return !line.includes("<xai:tool_")
            && !line.includes("</xai:tool_")
            && !line.includes("<argument")
            && !line.includes("</grok:render")
            && !line.includes("（总字数：")
            && !line.includes("（字数：")
            && !line.includes("了解用户请求")
            && !line.includes("- ")
    })
    console.log(filteredLines)
    return filteredLines.join("\n")
}