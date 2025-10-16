import * as grpc from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { config } from "../config";
import "../utils/console"
import * as protoLoader from '@grpc/proto-loader';
import mysql from "mysql2/promise";
import { User } from '../db/user';
import path from 'path';

// 验证 Telegram initData
function validateTelegramInitData(initData: string): boolean {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataToCheck = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secret = crypto.createHmac('sha256', 'WebAppData').update(config.TG_API_KEY).digest();
    const computedHash = crypto.createHmac('sha256', secret).update(dataToCheck).digest('hex');
    return computedHash === hash;
}

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
  keepCase: true,
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
        const { init_data } = call.request;
        if (!validateTelegramInitData(init_data)) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid Telegram initData' });
            return;
        }

        const params = new URLSearchParams(init_data);
        const user = JSON.parse(params.get('user')!);
        await new User(mysqlPool).addUser(user.id, user.username)
        const token = jwt.sign({ user_id: user.id }, config.JWT_SECRET, { expiresIn: '24h' });
        callback(null, { token });
    },
    getProfile: async (call: any, callback: any) => {
        const { token } = call.request;
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
            const user = await new User(mysqlPool).getUser(decoded.user_id)
            if (!user) {
                callback({ code: grpc.status.INVALID_ARGUMENT, message: 'User does not exist' });
            } else {
                callback(null, user);
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
        console.log(`gRPC server running on port ${port}`);
    }
);