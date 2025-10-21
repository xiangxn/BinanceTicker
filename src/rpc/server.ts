import dotenv from 'dotenv'
dotenv.config()

import * as grpc from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import "../utils/console"
import * as protoLoader from '@grpc/proto-loader';
import mysql from "mysql2/promise";
import { User } from '../db/user';
import path from 'path';
import { GetInvoicesResponse, GetStrategiesResponse, Invoice, ProfileResponse, Strategy } from './proto/perpx';
import { isValid } from '@tma.js/init-data-node';
import { getConfig } from '../config';

const config = getConfig();

// 初始化数据库
const mysqlPool = mysql.createPool({
    host: config.MYSQL_HOST,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASS,
    database: config.MYSQL_DB,
    connectionLimit: 10,
});

// 加载proto
const PROTO_PATH = "../../src/rpc/proto/perpx.proto";
const packageDef = protoLoader.loadSync(path.join(__dirname, PROTO_PATH), {
    // keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const grpcObj = grpc.loadPackageDefinition(packageDef) as any;

// 实现 gRPC 服务
const server = new grpc.Server();
server.addService(grpcObj.perpx.PerpxService.service, {
    loginWithTelegram: async (call: any, callback: any) => {
        const { initData } = call.request;
        if (!isValid(initData, config.TG_API_KEY)) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid Telegram initData' });
            return;
        }

        const params = new URLSearchParams(initData);
        const user = JSON.parse(params.get('user')!);
        await new User(mysqlPool).addUser(user.id, user.username, user.photo_url)
        const token = jwt.sign({ user_id: user.id }, config.JWT_SECRET, { expiresIn: '24h' });
        console.debug("token:", token)
        callback(null, { token });
    },
    getProfile: async (call: any, callback: any) => {
        const { token } = call.request;
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
            console.debug("decoded:", decoded)
            const user = await new User(mysqlPool).getUser(decoded.user_id)

            if (!user) {
                callback({ code: grpc.status.INVALID_ARGUMENT, message: 'User does not exist' });
            } else {
                const response = ProfileResponse.fromJSON(user)
                console.debug("response:", response)
                callback(null, response);
            }
        } catch (err) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid JWT' });
        }
    },
    updateAvatar: async (call: any, callback: any) => {
        const { token, avatar } = call.request;
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
            console.debug("decoded:", decoded)
            const ok = await new User(mysqlPool).updateAvatar(decoded.user_id, avatar)
            if (!ok) {
                callback({ code: grpc.status.INVALID_ARGUMENT, message: 'User does not exist' });
            } else {
                callback(null, { success: true });
            }
        } catch (err) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid JWT' });
        }
    },
    updateEmail: async (call: any, callback: any) => {
        const { token, email } = call.request;
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
            console.debug("decoded:", decoded)
            const ok = await new User(mysqlPool).updateEmail(decoded.user_id, email)
            if (!ok) {
                callback({ code: grpc.status.INVALID_ARGUMENT, message: 'User does not exist' });
            } else {
                callback(null, { success: true });
            }
        } catch (err) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid JWT' });
        }
    },
    getInvoices: async (call: any, callback: any) => {
        const { token, page, pageSize } = call.request;
        console.debug("getInvoices:", token, page, pageSize)
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
            const invoices = await new User(mysqlPool).getInvoices(decoded.user_id, page, pageSize)
            callback(null, GetInvoicesResponse.fromJSON({
                invoices: invoices.list.map(invoice => Invoice.fromJSON(invoice)),
                total: invoices.total
            }));
        } catch (err) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid JWT' });
        }
    },
    getStrategies: async (call: any, callback: any) => {
        const { token } = call.request;
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
            const strategies = await new User(mysqlPool).getStrategies(decoded.user_id)
            console.debug("strategies:", strategies)
            callback(null, GetStrategiesResponse.fromJSON({
                strategies: strategies.map(strategy => Strategy.fromJSON({
                    ...strategy,
                    params: JSON.stringify(strategy.params)
                }))
            }));
        } catch (err) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid JWT' });
        }
    },
    updateStrategy: async (call: any, callback: any) => {
        // TODO:检查params与类型是否匹配
        let { token, id, strategyType, symbol, period, params } = call.request;
        if (symbol.includes("*") || period.includes("*")) {
            callback({ code: grpc.status.INVALID_ARGUMENT, message: 'No permission to use wildcards' });
            return
        }
        try {
            const db = new User(mysqlPool)
            const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
            const user = await db.getUser(decoded.user_id)
            if (user) {
                if (strategyType === "FundingRate") {
                    period = "all"
                }
                const ok = await db.updateStrategy(id, strategyType, symbol, period, params)
                if (!ok) {
                    callback({ code: grpc.status.INVALID_ARGUMENT, message: 'User does not exist' });
                } else {
                    callback(null, { success: true });
                }
            } else {
                callback({ code: grpc.status.INVALID_ARGUMENT, message: 'User does not exist' });
            }
        } catch (err) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid JWT' });
        }
    },
    addStrategy: async (call: any, callback: any) => {
        // TODO:检查params与类型是否匹配
        let { token, strategyType, symbol, period, params } = call.request;
        if (symbol.includes("*") || period.includes("*")) {
            callback({ code: grpc.status.INVALID_ARGUMENT, message: 'No permission to use wildcards' });
            return
        }
        try {
            const db = new User(mysqlPool)
            const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
            const user = await db.getUser(decoded.user_id)
            if (user) {
                const count = await db.getStrategyCount(user.id)
                // 检查是否有free订阅，如果没有就添加一条
                if (count === 0) {
                    await db.addSubscription(user.id, "free")
                }
                if (count + 1 > user.maxStrategies) {
                    callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Max strategies reached' });
                    return
                }
                if (strategyType === "FundingRate") {
                    period = "all"
                }
                const ok = await db.addStrategy(user.id, strategyType, symbol, period, params)
                if (!ok) {
                    callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Failed to add strategy' });
                } else {
                    callback(null, { success: true });
                }
            } else {
                callback({ code: grpc.status.INVALID_ARGUMENT, message: 'User does not exist' });
            }

        } catch (err) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid JWT' });
        }
    },
    deleteStrategy: async (call: any, callback: any) => {
        const { token, id } = call.request;
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
            const ok = await new User(mysqlPool).deleteStrategy(id)
            if (!ok) {
                callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Strategy does not exist' });
            } else {
                callback(null, { success: true });
            }
        } catch (err) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid JWT' });
        }
    },
});

// 启动服务
server.bindAsync(
    '0.0.0.0:50051',
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
        if (error) {
            console.error('Failed to bind server:', error);
            return;
        }
        console.info(`gRPC server running on port ${port}`);
    }
);