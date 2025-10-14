import * as grpc from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { config } from "../config";
import "../utils/console"
import { PerpxServiceService } from "./proto/perpx_grpc_pb";

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

// 实现 gRPC 服务
const server = new grpc.Server();
server.addService(PerpxServiceService, {
    loginWithTelegram: (call: any, callback: any) => {
        const { init_data } = call.request;
        if (!validateTelegramInitData(init_data)) {
            callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid Telegram initData' });
            return;
        }

        const params = new URLSearchParams(init_data);
        const user = JSON.parse(params.get('user')!);
        const token = jwt.sign({ user_id: user.id }, config.JWT_SECRET, { expiresIn: '1h' });
        callback(null, { token });
    },
    getProfile: (call: any, callback: any) => {
        const { token } = call.request;
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { user_id: string };
            callback(null, { user_id: decoded.user_id, username: `user_${decoded.user_id}` });
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