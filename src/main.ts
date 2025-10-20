import dotenv from 'dotenv'
dotenv.config()

import { fork, execSync } from 'child_process';
import path from 'path';

import "./utils/console"
import { config } from "./config";
import { initTelegramBot } from './notifiers/telegram-notifier';
import Redis from "ioredis";
import mysql from "mysql2/promise";
import { notifyWorker } from "./notify";
import { startDispatcherLoop } from "./dispatcher";
import { onTGMessage } from './bot_logic';

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

// ✅ 初始化 Telegram
const bot = initTelegramBot(config.TG_API_KEY, mysqlPool, onTGMessage, config.PROXY);

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
    // 关闭gRPC进程（如果有）
    if (serverProcess) {
        serverProcess.kill();
    }
    // 关闭envoy的docker容器
    // try {
    //     execSync('docker stop perpx-envoy');
    //     console.info('Docker container "perpx-envoy" stopped.');
    // } catch (e) {
    //     console.warn('Failed to stop Docker container:', e);
    // }
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// 全局变量保存gRPC进程引用
let serverProcess: ReturnType<typeof fork> | null = null;
async function main() {
    try {
        // test connections
        await redis.ping()
        const conn = await mysqlPool.getConnection()
        conn.release()

        // start gRPC server
        const rpcfile = process.env.NODE_ENV === 'production' ? 'rpc/server.js' : 'rpc/server.ts'
        serverProcess = fork(path.join(__dirname, rpcfile));
        // 监听子进程退出事件
        serverProcess.on('exit', (code) => {
            console.info(`gRPC server process exited with code ${code}`);
        });
        // 监听子进程错误事件
        serverProcess.on('error', (err) => {
            console.error('gRPC server process error:', err);
        });

        // 根据事件匹配生成通知消息
        if (config.EVENT_HANDLER_OPEN) {
            startDispatcherLoop(redis, mysqlPool).catch((e) => console.error("dispatcher crash", e))
        }
        // 推送通知消息
        if (config.NOTIFY_OPEN) {
            notifyWorker(redis).catch((e) => console.error("notify crash", e))
        }
        // 启动TG处理ask coin
        if (config.BOT_LOGIC_OPEN) {
            bot.startPolling()
        }
    } catch (e) {
        console.error("startup error", e)
        process.exit(1)
    }
}
main()
