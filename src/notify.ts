import { sleep } from "./utils/helper";
import Redis from "ioredis";
import { config } from "./config";
import { sendAlert } from './notifiers/telegram-notifier';
import { TGMessage } from "./utils/types";

export async function notifyWorker(redis: Redis) {
    console.info(`[notify] starting...`);
    while (true) {
        try {
            const res = await redis.lpop(config.NOTIFY_QUEUE_KEY, 6);
            if (!res) {
                await sleep(100);
                continue;
            }
            const senders: Promise<void>[] = [];
            for (let raw of res) {
                let job: TGMessage;
                try {
                    job = JSON.parse(raw) as TGMessage;
                } catch (e) {
                    console.warn(`[notify] invalid job JSON, skipping`, e);
                    continue;
                }
                senders.push(sendAlert(job));
            }
            if (senders.length > 0) {
                await Promise.all(senders);
            }
            await sleep(500);
        } catch (e) {
            console.error(`[notify] error`, e);
            await sleep(1000);
        }
    }
}