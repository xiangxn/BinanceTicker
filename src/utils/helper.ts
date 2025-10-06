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

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}