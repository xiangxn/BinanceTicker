import dotenv from 'dotenv'
dotenv.config()

import { login, grokChat } from "../src/utils/grok";

async function main() {
    const loggedIn = await login()
    if (loggedIn) {
        const message = await grokChat('你好, 请帮我查看“KLINK”这个加密货币的背景、融资情况以及简介, 以简短的文字回答, 不要超过500字。不要在返回的内容中带xai标签。')
        console.log(message)
    }
}

main()