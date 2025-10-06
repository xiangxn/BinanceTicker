export const config = {
    debug: true,
    TG_API_KEY: process.env.TG_API_KEY || '',
    WS_PROXY: process.env.WS_PROXY || undefined,

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
    SUBS_CACHE_REFRESH_MS: parseInt(process.env.SUBS_CACHE_REFRESH_MS || String(20 * 1000)), // 20s
}