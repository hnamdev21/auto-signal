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
  rsiPeriod: number; // Default: 14
  rsiOverbought: number; // Default: 70
  rsiOversold: number; // Default: 30
  rsiDivergenceLookback: number; // Default: 20
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

export interface RSIAlert {
  type: "rsi_divergence";
  symbol: string;
  timeframe: string;
  timestamp: number;
  currentPrice: number;
  rsiValue: number;
  divergenceType: "bullish" | "bearish";
  divergenceData: {
    priceHigh: number;
    priceLow: number;
    rsiHigh: number;
    rsiLow: number;
    priceChange: number;
    rsiChange: number;
    lookbackPeriod: number;
  };
}

export interface VolumeDivergenceTracker {
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

export interface RSIDivergenceTracker {
  [key: string]: {
    [timeframe: string]: {
      rsiData: Array<{
        openTime: number;
        close: number;
        rsi: number;
        isClosed: boolean;
      }>;
      lastAlertTime?: number;
    };
  };
}

// Scalping Indicators Types
export interface ScalpingAlert {
  type:
    | "ema_crossover"
    | "stochastic_signal"
    | "bollinger_squeeze"
    | "volume_spike";
  symbol: string;
  timeframe: string;
  timestamp: number;
  currentPrice: number;
  signal: "buy" | "sell";
  confidence: number; // 0-100
  indicatorData: {
    ema9?: number;
    ema21?: number;
    stochasticK?: number;
    stochasticD?: number;
    bollingerUpper?: number;
    bollingerMiddle?: number;
    bollingerLower?: number;
    volume?: number;
    averageVolume?: number;
  };
}

export interface ScalpingConfig {
  pairs: string[];
  timeframes: string[];
  // EMA Settings
  emaFastPeriod: number; // Default: 9
  emaSlowPeriod: number; // Default: 21
  // Stochastic Settings
  stochasticKPeriod: number; // Default: 14
  stochasticDPeriod: number; // Default: 3
  stochasticOverbought: number; // Default: 80
  stochasticOversold: number; // Default: 20
  // Bollinger Bands Settings
  bollingerPeriod: number; // Default: 20
  bollingerStdDev: number; // Default: 2
  // Volume Settings
  volumeSpikeThreshold: number; // Default: 2.0
  volumePeriod: number; // Default: 20
  // Alert Settings
  minConfidence: number; // Default: 70
  alertCooldown: number; // Default: 300000 (5 minutes)
}

export interface ScalpingTracker {
  [key: string]: {
    [timeframe: string]: {
      emaData: Array<{
        openTime: number;
        close: number;
        ema9: number;
        ema21: number;
        isClosed: boolean;
      }>;
      stochasticData: Array<{
        openTime: number;
        close: number;
        k: number;
        d: number;
        isClosed: boolean;
      }>;
      bollingerData: Array<{
        openTime: number;
        close: number;
        upper: number;
        middle: number;
        lower: number;
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
