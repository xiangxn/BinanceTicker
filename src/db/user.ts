import mysql from "mysql2/promise";
import { ProfileResponse } from "../rpc/proto/perpx";

export class User {
    private mysql: mysql.Pool

    constructor(mysql: mysql.Pool) {
        this.mysql = mysql
    }

    async getUser(tgId: string) {
        const sql = `SELECT u.id,u.tg_id AS telegramId,u.tg_name AS telegramName,u.email,
s.max_strategies as maxStrategies,s.start_at as subscriptionStart,s.end_at as subscriptionEnd,IFNULL(s.active,0) as active
FROM users AS u
LEFT JOIN subscriptions AS s ON u.id = s.user_id
WHERE u.tg_id = ?`;
        const [rows] = await this.mysql.query(sql, [tgId]);
        return (rows as any[])[0] as ProfileResponse ?? null;
    }

    async addUser(tgId: string, tgName: string, email?: string) {
        const sql = `INSERT INTO users (tg_id,tg_name,email)
VALUES (?,?,?)
ON DUPLICATE KEY UPDATE tg_id = tg_id;`
        const [result] = await this.mysql.execute<mysql.ResultSetHeader>(sql, [tgId, tgName, email])
        return result.affectedRows > 0
    }
}