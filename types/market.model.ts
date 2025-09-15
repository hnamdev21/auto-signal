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

// Alert System Types
export interface AlertConfig {
  pairs: string[];
  timeframes: string[];
  volumeSpikeThreshold: number; // Default: 1.5
  divergenceCandleCount: number; // Default: 3
}

export interface VolumeAlert {
  type: "spike" | "divergence";
  symbol: string;
  timeframe: string;
  timestamp: number;
  currentPrice: number;
  volume: number;
  averageVolume: number;
  spikeRatio?: number;
  divergenceData?: {
    candleCount: number;
    priceChange: number;
    volumeChange: number;
    candles: Array<{
      openTime: number;
      close: number;
      volume: number;
    }>;
  };
}

export interface DivergenceTracker {
  [key: string]: {
    [timeframe: string]: {
      candles: Array<{
        openTime: number;
        close: number;
        volume: number;
        isClosed: boolean;
      }>;
      lastAlertTime?: number;
    };
  };
}

export interface MultiPairMarketData {
  [symbol: string]: {
    [timeframe: string]: MarketData;
  };
}
