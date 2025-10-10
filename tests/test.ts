import dotenv from 'dotenv'
dotenv.config()

import { login, grokChat } from "../src/utils/grok";

function filterContent(content: string) {
    content = content.replace(/<xai:tool_usage_card>\n?[\s\S]*?<\/xai:tool_usage_card>\n?/g, "")
    content = content.replace(/<grok:render [\s\S]*?<\/grok:render>\n?/g, "")
    let lines = content.split("\n")
    lines = lines.filter(line => !line.includes("- ") && line !== "\n" && line !== "")
    console.log("Filtered lines:", lines)
    content = lines.join("\n")
    return content
}

async function main() {
    const loggedIn = await login()
    if (loggedIn) {
        const message = await grokChat(`你好, 请帮我查看“客服小何”这个加密货币的简介、背景、融资情况。以简短的文字回答, 不要超过500字。`)
        console.log("结果:",filterContent(message!))
    }

    // const msg = '<xai:tool_usage_card>\n' +
    //     '  <xai:tool_usage_card_id>75abe25b-1b16-4314-aae9-cf4c7344f6d2</xai:tool_usage_card_id>\n' +
    //     '  <xai:tool_name>web_search</xai:tool_name>\n' +
    //     '  <xai:tool_args><![CDATA[{"query":"币安人生 加密货币 简介 背景 融资","num_results":10}]]></xai:tool_args>\n' +
    //     '</xai:tool_usage_card>分析用户请求- 目前正在查看用户关于“币安人生”加密货币的请求。\n' +
    //     '- 接下来将搜索相关信息，获取简介、背景和融资情况。\n' +
    //     '\n' +
    //     '<xai:tool_usage_card>\n' +
    //     '  <xai:tool_usage_card_id>75abe25b-1b16-4314-aae9-cf4c7344f6d2</xai:tool_usage_card_id>\n' +
    //     '  <xai:tool_name>web_search</xai:tool_name>\n' +
    //     '  <xai:tool_args><![CDATA[{"query":"币安人生 加密货币 简介 背景 融资","num_results":10}]]></xai:tool_args>\n' +
    //     '</xai:tool_usage_card>\n' +
    //     '### 币安人生（Binance Life）简介\n' +
    //     '\n' +
    //     '**简介**：币安人生（$币安人生）是一个基于BNB链（BSC）的中文Meme币，灵感源于币安生态的文化梗，类似于“苹果人生”的调侃，象征在币安平台上的“高端加密生活”。它以幽默社群叙事驱动，强调华语加密社区的文化共鸣，目前流通供应量10亿枚，当前价格约0.2592美元，市值2.59亿美元，24小时交易量5.08亿美元。<grok:render card_id="50e4f1" card_type="citation_card" type="render_inline_citation">\n' +
    //     '<argument name="citation_id">0</argument>\n' +
    //     '</grok:render>\n' +
    //     '\n' +
    //     '**背景**：2025年10月4日上线，受币安联合创始人何一在X平台回复“祝你享币安人生”引发社群热议，迅速点燃Meme热潮。币安交易所首次上线中文代币，进一步助推其在BNB生态的流行。涨幅曾达6000倍，最高市值超5亿美元，吸引贾跃亭等名人互动，凸显社群力量与市场情绪的爆发。<grok:render card_id="957ce2" card_type="citation_card" type="render_inline_citation">\n' +
    //     '<argument name="citation_id">1</argument>\n' +
    //     '</grok:render><grok:render card_id="193886" card_type="citation_card" type="render_inline_citation">\n' +
    //     '<argument name="citation_id">3</argument>\n' +
    //     '</grok:render>\n' +
    //     '\n' +
    //     '**融资情况**：作为纯社区驱动的Meme币，无传统VC融资或种子轮记录。早期交易员通过链上投资获巨额回报，如一地址以3500美元买入，浮盈790万美元（回报率超2260倍）。多位KOL（如冷静冷静再冷静）以数万美元成本获超2600%回报，但整体依赖社群共识，无正式募资。<grok:render card_id="c53f29" card_type="citation_card" type="render_inline_citation">\n' +
    //     '<argument name="citation_id">7</argument>\n' +
    //     '</grok:render><grok:render card_id="4f1224" card_type="citation_card" type="render_inline_citation">\n' +
    //     '<argument name="citation_id">6</argument>\n' +
    //     '</grok:render>\n' +
    //     '\n' +
    //     '（总字数：248）'
    // console.log("结果:", filterContent(msg))
}

main()