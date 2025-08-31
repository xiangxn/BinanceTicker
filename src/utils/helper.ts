import { CandlePeriod } from "./types";

export function getPeriodStart(timestamp: number, period: CandlePeriod): number {
    const date = new Date(timestamp);
    const unit = period.charAt(period.length - 1).toLowerCase();
    const t = parseInt(period.replace(unit, ''));
    switch (unit) {
        case 'm':
            date.setMinutes(Math.floor(date.getMinutes() / t) * t, 0, 0);
            break;
        case 'h':
            date.setHours(Math.floor(date.getHours() / t) * t, 0, 0, 0);
            break;
        case 'd':
            const msPerDay = 86400000;
            const alignedTime = Math.floor(date.getTime() / (msPerDay * t)) * msPerDay * t;
            date.setTime(alignedTime)
            break;
        default:
    }
    return date.getTime();
}

export function formatNumberCN(num: number): string {
    if (num >= 1e8) {
        // 亿
        return (num / 1e8).toFixed(2).replace(/\.00$/, '') + '亿';
    } else if (num >= 1e4) {
        // 万
        return (num / 1e4).toFixed(2).replace(/\.00$/, '') + '万';
    }
    return num.toFixed(2).replace(/\.00$/, ''); // 小于 1 万保持原值
}