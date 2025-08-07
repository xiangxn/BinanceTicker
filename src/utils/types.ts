export interface BinanceTicker {
  s: string; // symbol
  o: string; // open price
  h: string; // high price
  l: string; // low price
}

export interface Candle {
  startTime: number;  // 毫秒时间戳
  open: number;
  high: number;
  low: number;
}
