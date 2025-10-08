import dotenv from 'dotenv'
dotenv.config()

import { login, grokChat } from "../src/utils/grok";

async function main() {
    const loggedIn = await login()
    if (loggedIn) {
        const message = await grokChat('你好, 你当前是什么版本？')
        console.log(message)
    }
}

main()