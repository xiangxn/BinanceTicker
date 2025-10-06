import Redis from "ioredis";
import mysql from "mysql2/promise";
import { sleep } from "./utils/helper";
import { config } from "./config";
import { EventMessage, TGMessage } from "./utils/types";
import { buildTGMessage, findMatchingSubs, loadUserStrategies } from "./strategy";

export async function startDispatcherLoop(redis: Redis, mysqlPool: mysql.Pool) {
    console.info("[dispatcher] starting...");
    // Periodically refresh sub cache
    loadUserStrategies(mysqlPool).catch((e) => console.error("initial UserStrategies error", e));
    setInterval(() => {
        loadUserStrategies(mysqlPool).catch((e) => console.error("refresh UserStrategies error", e));
    }, config.SUBS_CACHE_REFRESH_MS);

    while (true) {
        try {
            const entries = await redis.lpop(config.RUST_QUEUE_KEY, 100);
            if (!entries || entries.length === 0) {
                await sleep(1000);
                continue;
            }
            for (let entry of entries) {
                const msg = await redis.get(entry)
                console.debug(`New event: ${entry} => ${msg}`)
                if (!msg) {
                    continue;
                }
                let event: EventMessage;
                try {
                    event = JSON.parse(msg) as EventMessage;
                } catch (e) {
                    console.warn(`[dispatcher] invalid event JSON, skipping`, e);
                    continue;
                }
                const matched = findMatchingSubs(event);
                if (matched.length === 0) {
                    continue;
                }
                const notifyJobs = matched.map((strategy) => buildTGMessage(strategy, event));
                for (const job of notifyJobs) {
                    await redis.rpush(config.NOTIFY_QUEUE_KEY, JSON.stringify(job));
                }
            }
        } catch (err) {
            console.error("[dispatcher] loop error", err);
            // backoff a bit on error to avoid tight loop
            await sleep(1000);
        }
    }
}