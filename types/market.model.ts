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

export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
  timestamp: number;
}

export interface MACDDivergenceSignal {
  type: "BULLISH" | "BEARISH";
  price: number;
  macd: number;
  timestamp: number;
  takeProfit: number;
  stopLoss: number;
  confidence: number;
}

export interface MarketStructurePoint {
  price: number;
  index: number;
  timestamp: number;
  type: "HIGH" | "LOW";
}

export interface MarketStructureSignal {
  type:
    | "BULLISH_BREAK"
    | "BEARISH_BREAK"
    | "BULLISH_CONTINUATION"
    | "BEARISH_CONTINUATION";
  price: number;
  structureType: "HH" | "HL" | "LH" | "LL";
  timestamp: number;
  takeProfit: number;
  stopLoss: number;
  confidence: number;
}

export interface MultiSignalAlert {
  symbol: string;
  currentPrice: number;
  rsi: number;
  macd?: MACDData | null;
  timestamp: number;
  timeframe: string;
  rsiDivergence?: DivergenceSignal | null;
  macdDivergence?: MACDDivergenceSignal | null;
  marketStructure?: MarketStructureSignal | null;
}

export interface VolumeData {
  currentVolume: number;
  averageVolume: number;
  volumeRatio: number;
  timestamp: number;
}

export interface VolumeSpikeSignal {
  type: "VOLUME_SPIKE";
  currentVolume: number;
  averageVolume: number;
  volumeRatio: number;
  price: number;
  timestamp: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  description: string;
}

export interface VolumeAlert {
  symbol: string;
  currentPrice: number;
  volumeSpike?: VolumeSpikeSignal | null;
  timestamp: number;
  timeframe: string;
}

export interface VolumeDivergenceSignal {
  type: "VOLUME_DIVERGENCE";
  priceDirection: "INCREASING" | "DECREASING";
  volumeDirection: "INCREASING" | "DECREASING";
  divergenceType: "BULLISH" | "BEARISH";
  price: number;
  volumeRatio: number;
  timestamp: number;
  confidence: number;
  description: string;
  reversalProbability: "LOW" | "MEDIUM" | "HIGH";
  takeProfit: number;
  stopLoss: number;
}

export interface TPSLConfig {
  // RSI Divergence TP/SL
  rsiDivergence: {
    tpPercent: number;
    slPercent: number;
    atrMultiplier: number; // ATR multiplier for dynamic SL
  };
  // MACD Divergence TP/SL
  macdDivergence: {
    tpPercent: number;
    slPercent: number;
    atrMultiplier: number;
  };
  // Market Structure TP/SL
  marketStructure: {
    tpPercent: number;
    slPercent: number;
    atrMultiplier: number;
    structureBased: boolean; // Use structure levels for SL
  };
  // Volume Spike TP/SL
  volumeSpike: {
    tpPercent: number;
    slPercent: number;
    atrMultiplier: number;
    volumeBased: boolean; // Adjust based on volume strength
  };
  // Volume Divergence TP/SL
  volumeDivergence: {
    tpPercent: number;
    slPercent: number;
    atrMultiplier: number;
    reversalBased: boolean; // Adjust based on reversal probability
  };
}

export interface TPSLResult {
  takeProfit: number;
  stopLoss: number;
  riskRewardRatio: number;
  method: string;
  confidence: number;
}

export interface SignalRecord {
  id: string;
  symbol: string;
  signalType:
    | "RSI_DIVERGENCE"
    | "MACD_DIVERGENCE"
    | "MARKET_STRUCTURE"
    | "VOLUME_SPIKE"
    | "VOLUME_DIVERGENCE";
  signalSubType: string; // BULLISH/BEARISH, HH/HL/LH/LL, etc.
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  entryTime: number;
  entryReason: string;
  confidence: number;
  status: "ACTIVE" | "TP_HIT" | "SL_HIT" | "EXPIRED";
  exitPrice?: number;
  exitTime?: number;
  pnl?: number;
  pnlPercent?: number;
  duration?: number; // in minutes
  riskRewardRatio: number;
  metadata: {
    rsi?: number;
    macd?: number;
    volumeRatio?: number;
    reversalProbability?: string;
    structureType?: string;
    [key: string]: any;
  };
}

export interface SignalStatistics {
  totalSignals: number;
  activeSignals: number;
  completedSignals: number;
  tpHit: number;
  slHit: number;
  expired: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  averagePnl: number;
  averagePnlPercent: number;
  averageDuration: number;
  bestTrade: SignalRecord | null;
  worstTrade: SignalRecord | null;
  signalTypeStats: {
    [signalType: string]: {
      count: number;
      winRate: number;
      totalPnl: number;
      averagePnl: number;
    };
  };
  timeStats: {
    hourly: { [hour: string]: number };
    daily: { [day: string]: number };
  };
}

export interface SignalTrackingConfig {
  dataFilePath: string;
  maxActiveSignals: number;
  signalExpiryHours: number;
  statisticsUpdateInterval: number; // in minutes
}
