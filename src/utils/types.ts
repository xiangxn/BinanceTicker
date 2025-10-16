// 字段名不能动，这里同rust的struct
export type EventMessage = {
  symbol: string;
  event_type: string;
  period: string;
  value: any;
  timestamp: number;
}

export type TGMessage = {
  chatId: string;
  message: string;
  messageThreadId?: string;
  replyToMessageId?: number
}

export type UserStrategy = {
  id: number;
  userId: number;
  strategyType: string; // 策略类型: ConsecutiveMove, VolatilitySpike, FundingRate
  symbol: string;   // 指定交易对(如:BTCUSDT)，或者通配符*
  period: string;   // 当类型为FundingRate时，period必须为all
  params: any;
  chatId: string;
  threadId: string;
}

export type ConsecutiveMoveValue = {
  count: number;
  turnover: string;
  direction: number;  // 1: 上涨，-1: 下跌
}
export type ConsecutiveMoveParams = {
  count: number;  // 允许3-10个连续的涨跌
  turnover: string; // 允许的24小时成交额
}

export type VolatilitySpikeValue = {
  amplitude: number;  // 当前周期振幅
  avg_amplitude: number;  // 前3个周期的平均振幅
  volume: number; // 当前周期成交量
  turnover: string; // 24小时成交额
  direction: number;  // 1: 上涨，-1: 下跌
}
export type VolatilitySpikeParams = {
  amplitudeMultiple: number;  // 振幅倍数,>=2
  volume: number;  // 允许的周期成交量
  turnover: string; // 允许的24小时成交额
}

export type FundingRateValue = {
  funding_rate: string; // 0.0001以上才会监听
  next_funding_time: number;
}
export type FundingRateParams = {
  fundingRate: string;
}