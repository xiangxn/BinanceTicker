import dotenv from 'dotenv'
dotenv.config()

import * as grpc from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import "../utils/console"
import { config } from "../config";
import * as protoLoader from '@grpc/proto-loader';
import mysql from "mysql2/promise";
import { User } from '../db/user';
import path from 'path';
import { GetInvoicesResponse, Invoice, ProfileResponse } from './proto/perpx';
import { isValid } from '@tma.js/init-data-node';


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