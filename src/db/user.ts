import mysql from "mysql2/promise";

export class User {
    private mysql: mysql.Pool

    constructor(mysql: mysql.Pool) {
        this.mysql = mysql
    }

    async getUser(tgId: string) {
        const sql = `SELECT u.id,u.tg_id AS telegramId,u.tg_name AS telegramName,u.email,u.avatar,
s.max_strategies as maxStrategies,s.start_at as subscriptionStart,s.end_at as subscriptionEnd,IFNULL(s.active,0) as active
FROM users AS u
LEFT JOIN subscriptions AS s ON u.id = s.user_id
WHERE u.tg_id = ?;`;
        const [rows] = await this.mysql.query(sql, [tgId]);
        return (rows as any[])[0] ?? null;
    }

    async addUser(tgId: string, tgName: string, tgAvatar: string | null = null) {
        if (tgAvatar === undefined) tgAvatar = null
        const sql = `INSERT INTO users (tg_id,tg_name,avatar)
VALUES (?,?,?)
ON DUPLICATE KEY UPDATE tg_id = tg_id;`
        const [result] = await this.mysql.execute<mysql.ResultSetHeader>(sql, [tgId, tgName, tgAvatar])
        return result.affectedRows > 0
    }

    async updateAvatar(tgId: string, avatar: string) {
        const sql = `UPDATE users SET avatar = ? WHERE tg_id = ?;`
        const [result] = await this.mysql.execute<mysql.ResultSetHeader>(sql, [avatar, tgId])
        return result.affectedRows > 0
    }

    async updateEmail(tgId: string, email: string) {
        const sql = `UPDATE users SET email = ? WHERE tg_id = ?;`
        const [result] = await this.mysql.execute<mysql.ResultSetHeader>(sql, [email, tgId])
        return result.affectedRows > 0
    }

    async getInvoices(tgId: string, page: number, pageSize: number) {
        const limit = Number(pageSize) || 20;
        const offset = Math.max(0, (Number(page) - 1) * limit);

        const [countRows] = await this.mysql.query(
            `SELECT COUNT(i.id) as total
            FROM invoices AS i
            LEFT JOIN users AS u ON i.user_id = u.id
            WHERE u.tg_id = ?`,
            [tgId]
        );
        const total = (countRows as any[])[0]?.total ?? 0;

        const [rows] = await this.mysql.query(
            `SELECT
            invoice_id AS invoiceId,
            amount,
            currency,
            chain,
            status,
            paid_at AS paidAt,
            tx_hash AS txHash,
            confirmations
            FROM invoices AS i
            LEFT JOIN users AS u ON i.user_id = u.id
            WHERE u.tg_id = ?
            ORDER BY i.paid_at DESC
            LIMIT ?, ?`,
            [tgId, offset, limit]
        );

        return {
            total,
            page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit),
            list: rows as any[],
        };
    }
}