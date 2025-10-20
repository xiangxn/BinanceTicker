export const config = {
    debug: true,
    TG_API_KEY: process.env.TG_API_KEY || '',
    PROXY: process.env.PROXY || undefined,

    // mysql
    MYSQL_HOST: process.env.MYSQL_HOST || 'localhost',
    MYSQL_PORT: parseInt(process.env.MYSQL_PORT || '3306'),
    MYSQL_USER: process.env.MYSQL_USER || 'root',
    MYSQL_PASS: process.env.MYSQL_PASS || '<PASSWORD>',
    MYSQL_DB: 'perpx',

    // redis
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
    REDIS_USER: process.env.REDIS_USER || 'root',
    REDIS_PASS: process.env.REDIS_PASS || '<PASSWORD>',

    RUST_QUEUE_KEY: 'perpx:queue:events',
    NOTIFY_QUEUE_KEY: 'perpx:queue:notify',

    // strategy
    EVENT_HANDLER_OPEN: process.env.EVENT_HANDLER_OPEN === 'true',
    SUBS_CACHE_REFRESH_MS: parseInt(process.env.SUBS_CACHE_REFRESH_MS || String(20 * 1000)), // 20s

    // notify
    NOTIFY_OPEN: process.env.NOTIFY_OPEN === 'true',
    NOTIFY_CONCURRENCY_COUNT: parseInt(process.env.NOTIFY_CONCURRENCY_COUNT || String(5)),

    // bot logic
    BOT_NAME: "bn_ticker_bot",
    BOT_LOGIC_OPEN: process.env.BOT_LOGIC_OPEN === 'true',
    TG_CHAT_ID: "-1002876070327",
    TG_MESSAGE_THREAD_ID: "15",
    TG_ASK_COIN_INTERVAL: 2,   // minute

    // grpc
    JWT_SECRET: process.env.JWT_SECRET || '0x0000001570BD7753dFCb42E1AD2E33D86eBA8870',

    // mini app 
    MINI_APP_URL: "https://perpxui.bitsflea.com"
}