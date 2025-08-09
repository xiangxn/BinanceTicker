export interface BinanceTicker {
  s: string; // symbol 交易对
  o: string; // 24小时内第一比成交的价格
  h: string; // 24小时内最高成交价
  l: string; // 24小时内最低成交价
  c: string; // 最新成交价格
  Q: string; // volume 最新成交价格上的成交量
}

export interface Candle {
  startTime: number;  // 毫秒时间戳
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
