import dotenv from 'dotenv'
dotenv.config()

import { login, grokChat } from "../src/utils/grok";

function filterContent(content: string) {
    let lines = content.split("\n")
    lines = lines.slice(5)
    content = lines.join("\n")
    content = content.replace(/- [\s\S]*?<\/xai:tool_usage_card>\n?/g, "")
    lines = content.split("\n")
    return lines.slice(0, -1).join("\n")
}

async function main() {
    const loggedIn = await login()
    if (loggedIn) {
        const message = await grokChat(`你好, 请帮我查看“KLINK”这个加密货币的简介、背景、融资情况。以简短的文字回答, 不要超过500字。`)
        console.log(filterContent(message!))
    }
}

main()