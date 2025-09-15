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

export interface AlertData {
  symbol: string;
  currentPrice: number;
  timestamp: number;
  timeframe: string;
}

export interface BotConfig {
  symbol: string;
  interval: string;
  telegramBotToken: string;
  telegramChatId: string;
}
