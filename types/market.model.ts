export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
  ignore: string;
}

export interface MarketData {
  symbol: string;
  currentPrice: number;
  timestamp: number;
  klineData: KlineData[];
}

export interface RSIData {
  rsi: number;
  timestamp: number;
  period: number;
}

export interface AlertData {
  symbol: string;
  currentPrice: number;
  rsi: number;
  timestamp: number;
  timeframe: string;
}

export interface BotConfig {
  symbol: string;
  rsiPeriod: number;
  interval: string;
  telegramBotToken: string;
  telegramChatId: string;
}

export interface PivotPoint {
  value: number;
  index: number;
  timestamp: number;
}

export interface DivergenceConfig {
  pivotLength: number;
  bullDivergenceDiff: number;
  bearDivergenceDiff: number;
  bullRsiLevel: number;
  bearRsiLevel: number;
  tpPercent: number;
  slPercent: number;
}

export interface DivergenceSignal {
  type: "BULLISH" | "BEARISH";
  price: number;
  rsi: number;
  timestamp: number;
  takeProfit: number;
  stopLoss: number;
  confidence: number;
}

export interface TradingSignal {
  symbol: string;
  currentPrice: number;
  rsi: number;
  divergenceSignal?: DivergenceSignal | null;
  timestamp: number;
  timeframe: string;
}
