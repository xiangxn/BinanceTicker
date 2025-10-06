import dotenv from 'dotenv'
dotenv.config()

import "./utils/console"
import { config } from "./config";
import { initTelegramBot } from './notifiers/telegram-notifier';
import Redis from "ioredis";
import mysql from "mysql2/promise";
import { notifyWorker } from "./notify";
import { startDispatcherLoop } from "./dispatcher";

// ✅ 初始化 Telegram
initTelegramBot(config.TG_API_KEY, config.WS_PROXY);

const mysqlPool = mysql.createPool({
    host: config.MYSQL_HOST,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASS,
    database: config.MYSQL_DB,
    connectionLimit: 10,
});

const redis = new Redis(config.REDIS_PORT, config.REDIS_HOST, {
    username: config.REDIS_USER,
    password: config.REDIS_PASS,
});

async function shutdown() {
    console.info("shutting down...");
    try {
        await redis.quit();
    } catch (e) {
        console.warn("redis quit error", e);
    }
    try {
        await mysqlPool.end();
    } catch (e) {
        console.warn("mysql pool end error", e);
    }
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
    try {
        // test connections
        await redis.ping();
        const conn = await mysqlPool.getConnection();
        conn.release();

        // kick off dispatcher and notify workers in parallel
        startDispatcherLoop(redis, mysqlPool).catch((e) => console.error("dispatcher crash", e));
        notifyWorker(redis).catch((e) => console.error("notify crash", e));
    } catch (e) {
        console.error("startup error", e);
        process.exit(1);
    }
}
main()
