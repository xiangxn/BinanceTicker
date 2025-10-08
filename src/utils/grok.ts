import { Scraper } from 'agent-twitter-client';
import fs from 'node:fs/promises';
import { Cookie } from 'tough-cookie'
import { ProxyAgent } from 'undici';
import { cycleTLSFetch, cycleTLSExit } from './cycletls-fetch';

const cookiesFilePath = './datas/cookies.json'
async function checkFileExists(filePath: string) {
    try {
        await fs.access(filePath, fs.constants.F_OK);
        return true
    } catch (err) {
        return false
    }
}
async function readCookies() {
    let cookiesArray;
    try {
        const exists = await checkFileExists(cookiesFilePath);
        if (!exists) {
            console.error('cookies.json not found, using password auth - this is NOT recommended!');
        } else {
            const cookiesText = await fs.readFile(cookiesFilePath, 'utf8');
            cookiesArray = JSON.parse(cookiesText);
        }
    } catch (e) {
        console.error('Error reading or parsing cookies.json', e);
    }
    if (cookiesArray) {
        cookiesArray = cookiesArray.map((item: any) => Cookie.fromJSON(item)!);
    }
    return cookiesArray;
}

function getProxyAgent(proxy: string) {
    const url = new URL(proxy);
    const username = url.username;
    const password = url.password;

    // Strip auth from URL if present
    url.username = '';
    url.password = '';

    const agentOptions: any = {
        uri: url.toString(),
        requestTls: {
            rejectUnauthorized: false,
        },
    };

    // Add Basic auth if credentials exist
    if (username && password) {
        agentOptions.token = `Basic ${Buffer.from(
            `${username}:${password}`,
        ).toString('base64')}`;
    }

    return new ProxyAgent(agentOptions);
}
function getScraper(cycle: boolean = false) {
    if (process.env.PROXY) {
        if (cycle) {
            const scraper = new Scraper({
                fetch: cycleTLSFetch
            })
            return scraper
        } else {
            const agent = getProxyAgent(process.env.PROXY)
            const scraper = new Scraper({
                transform: {
                    request: (input, init) => {
                        return [input, { ...init, dispatcher: agent }];
                    },
                }
            })
            return scraper
        }
    } else {
        return new Scraper()
    }
}

async function getScraperWithCookie() {
    const scraper = getScraper()
    const cookies = await readCookies()
    if (cookies) {
        await scraper.setCookies(cookies)
    } else {
        throw new Error('Cookies not found')
    }
    return scraper
}

export async function login(cycle: boolean = false) {
    const scraper = getScraper(cycle)
    let loggedIn = await scraper.isLoggedIn()
    if (!loggedIn) {
        let cookies = await readCookies()
        if (cookies) {
            await scraper.setCookies(cookies)
        } else {
            try {
                await scraper.login(process.env.TWITTER_USERNAME!, process.env.TWITTER_PASSWORD!, process.env.TWITTER_EMAIL)
            } catch (e: any) {
                if (e.message.includes('You are unable to access')) {
                    console.warn('X login failed, retrying with CycleTLS')
                    if (cycle && process.env.PROXY) {
                        cycleTLSExit()
                    }
                    return await login(true)
                } else {
                    throw e
                }
            }
        }
        loggedIn = await scraper.isLoggedIn()
        if (loggedIn) {
            cookies = await scraper.getCookies()
            await fs.writeFile(cookiesFilePath, JSON.stringify(cookies))
            console.info('X login success')
        } else {
            await fs.rm(cookiesFilePath)
            console.info('X login failed')
        }
    }
    if (cycle && process.env.PROXY) {
        cycleTLSExit()
    }
    return loggedIn
}

export async function grokChat(content: string) {
    const scraper = await getScraperWithCookie()
    if (!scraper) {
        console.error('Cookies not found, please login first')
        return null
    }
    const chat = await scraper.grokChat({ messages: [{ role: 'user', content }] })
    console.debug(chat)
    /**
    {
        conversationId: '1975950867204640890',
        message: '我是Grok 3，由xAI创建。我是2025年10月8日的最新版本，随时为您提供帮助！有什么我可以帮您的？',
        messages: [
            { role: 'user', content: '你好, 你当前是什么版本？' },
            {
            role: 'assistant',
            content: '我是Grok 3，由xAI创建。我是2025年10月8日的最新版本，随时为您提供帮助！有什么我可以帮您的？'
            }
        ],
        webResults: undefined,
        metadata: {
            conversationId: '1975950867204640890',
            userChatItemId: '1975950870459338752',
            agentChatItemId: '1975950870459338753'
        }
    }
    */
    return chat.message
}
