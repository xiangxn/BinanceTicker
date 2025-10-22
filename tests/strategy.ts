import dotenv from 'dotenv'
dotenv.config()

import { initEncryptor } from "../src/config";
initEncryptor()

import mysql from "mysql2/promise";
import { getConfig } from "../src/config";
import { findMatchingSubs, getStrategyCache, loadUserStrategies } from '../src/strategy';
import { EventMessage } from '../src/utils/types';

const config = getConfig()

const mysqlPool = mysql.createPool({
    host: config.MYSQL_HOST,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASS,
    database: config.MYSQL_DB,
    connectionLimit: 10,
});

loadUserStrategies(mysqlPool).then(() => {
    const strategies = getStrategyCache()
    console.log(strategies)
    const event: EventMessage = {
        symbol: "FUSDT",
        event_type: "FundingRate",
        period: "",
        value: { "funding_rate": 0.0005 },
        timestamp: 1234567812
    }
    const matched = findMatchingSubs(event);
    console.log(matched)
})