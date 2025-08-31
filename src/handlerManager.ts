import { Worker } from "worker_threads";
import { readdirSync } from "fs";
import { join, extname, basename } from "path";

export class HandlerManager {
    private workers: Worker[] = [];
    private isDev: boolean;

    constructor(private handlersDir: string) {
        // 判断是否开发环境
        this.isDev = process.env.NODE_ENV !== "production";
        this.loadHandlers();
    }

    /** 扫描目录并启动 worker */
    private loadHandlers() {
        const files = readdirSync(this.handlersDir);

        for (const file of files) {
            // 只加载 ts/js 文件
            if (![".js", ".ts"].includes(extname(file))) continue;

            let workerPath = join(this.handlersDir, file);

            if (this.isDev && extname(file) === ".ts") {
                // 开发环境，ts-node register
                const worker = new Worker(workerPath, {
                    execArgv: ["-r", "ts-node/register"],
                });
                this.workers.push(worker);
            } else if (!this.isDev && extname(file) === ".js") {
                // 生产环境，直接加载 js
                const worker = new Worker(workerPath);
                this.workers.push(worker);
            } else {
                console.warn(`[HandlerManager] Skipping file ${file} (wrong extension for env)`);
            }

            console.info(`[HandlerManager] Loaded handler: ${basename(file)}`);
        }
    }

    /** 广播消息，不收集结果 */
    broadcast(message: any): void {
        this.workers.forEach((worker) => worker.postMessage(message));
    }

    /** 关闭所有 handler */
    async close() {
        await Promise.all(this.workers.map((w) => w.terminate()));
        console.info("[HandlerManager] All workers terminated");
    }
}
