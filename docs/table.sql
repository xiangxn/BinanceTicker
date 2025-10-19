-- 用户 VIP 状态
DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE `subscriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    `user_id` INT COMMENT '关联用户ID',
    `type` VARCHAR(32) COMMENT '订阅类型，如 vip_monthly / vip_yearly',
    `max_strategies` INT DEFAULT 10 COMMENT '最大策略数量',
    `start_at` datetime NULL COMMENT '订阅开始时间',
    `end_at` datetime NULL COMMENT '订阅结束时间',
    `active` BOOLEAN DEFAULT FALSE COMMENT '是否激活',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户订阅(VIP)表';

-- 链上通知/对账流水
DROP TABLE IF EXISTS `onchain_events`;
CREATE TABLE `onchain_events` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    `invoice_id` VARCHAR(64) COMMENT '关联订单ID',
    `tx_hash` VARCHAR(128) COMMENT '交易哈希',
    `from_address` VARCHAR(128) COMMENT '发送地址',
    `to_address` VARCHAR(128) COMMENT '接收地址',
    `amount` DECIMAL(30,18) COMMENT '交易金额',
    `token_contract` VARCHAR(128) NULL COMMENT '代币合约地址',
    `block_number` BIGINT COMMENT '区块号',
    `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '接收时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='链上事件表';

-- 每次支付订单
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    `invoice_id` VARCHAR(64) UNIQUE COMMENT '业务级订单号',
    `user_id` INT COMMENT '关联用户ID',
    `amount` DECIMAL(30, 18) NOT NULL COMMENT '期望金额（以 token 单位）',
    `currency` VARCHAR(32) NOT NULL COMMENT '货币类型，如 USDT / USDC',
    `chain` VARCHAR(32) NOT NULL COMMENT '区块链类型，如 eth / bsc / tron',
    `derived_address` VARCHAR(128) COMMENT '分配给此 invoice 的收款地址',
    `derivation_path` VARCHAR(128) COMMENT '派生路径，用于 debug',
    `status` VARCHAR(32) DEFAULT 'pending' COMMENT '订单状态:pending / partial / paid / expired / failed',
    `paid_at` datetime NULL COMMENT '支付时间',
    `tx_hash` VARCHAR(128) NULL COMMENT '首次识别到的交易哈希',
    `confirmations` INT DEFAULT 0 COMMENT '确认数',
    `expires_at` TIMESTAMP NULL COMMENT '订单过期时间',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付订单表';

-- 用户订阅的策略表
DROP TABLE IF EXISTS `user_strategies`;
CREATE TABLE `user_strategies` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '关联用户ID',
  `strategy_type` VARCHAR(64) NOT NULL COMMENT '策略类型，如 ConsecutiveMove / VolatilitySpike / FundingRate',
  `symbol` VARCHAR(32) DEFAULT NULL COMMENT '交易对，例如 BTCUSDT',
  `period` VARCHAR(32) DEFAULT NULL COMMENT '策略周期，例如 5m,1h',
  `params` JSON NOT NULL COMMENT '策略参数JSON,如 {"interval":"1h","cycle_count":5,"threshold":-5}',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否启用该策略',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_strategy` (`strategy_type`),
  KEY `idx_symbol` (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户订阅策略表';

-- 用户表
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  `tg_id` BIGINT UNIQUE COMMENT 'TG 登录 ID 或用户标识',
  `tg_name` VARCHAR(255) COMMENT 'TG 用户名',
  `email` VARCHAR(255) COMMENT '用户邮箱',
  `avatar` VARCHAR(500) COMMENT '用户头像',
  `tg_chat_id` VARCHAR(255) COMMENT '用于发送消息到用户的聊天ID',
  `tg_thread_id` VARCHAR(255) COMMENT '群组话题ID,可为空',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';







