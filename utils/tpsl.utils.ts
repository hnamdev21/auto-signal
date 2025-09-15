import { KlineData, TPSLConfig, TPSLResult } from "../types/market.model";

/**
 * Calculate Average True Range (ATR) for dynamic stop loss
 * @param klineData Array of kline data
 * @param period ATR period (default: 14)
 * @returns ATR value
 */
export function calculateATR(
  klineData: KlineData[],
  period: number = 14
): number {
  try {
    if (klineData.length < period + 1) {
      return 0;
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < klineData.length; i++) {
      const current = klineData[i];
      const previous = klineData[i - 1];

      if (!current || !previous) {
        continue;
      }

      const high = parseFloat(current.high);
      const low = parseFloat(current.low);
      const prevClose = parseFloat(previous.close);

      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);

      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }

    // Calculate ATR as simple moving average of true ranges
    const recentTRs = trueRanges.slice(-period);
    const atr = recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;

    return atr;
  } catch (error) {
    console.error("Error calculating ATR:", error);
    return 0;
  }
}

/**
 * Calculate support and resistance levels
 * @param klineData Array of kline data
 * @param lookbackPeriod Period to look back for levels
 * @returns Support and resistance levels
 */
export function calculateSupportResistance(
  klineData: KlineData[],
  lookbackPeriod: number = 20
): { support: number; resistance: number } {
  try {
    if (klineData.length < lookbackPeriod) {
      return { support: 0, resistance: 0 };
    }

    const recentData = klineData.slice(-lookbackPeriod);
    const highs = recentData.map((kline) => parseFloat(kline.high));
    const lows = recentData.map((kline) => parseFloat(kline.low));

    const resistance = Math.max(...highs);
    const support = Math.min(...lows);

    return { support, resistance };
  } catch (error) {
    console.error("Error calculating support/resistance:", error);
    return { support: 0, resistance: 0 };
  }
}

/**
 * Calculate Fibonacci retracement levels
 * @param high Highest price
 * @param low Lowest price
 * @returns Fibonacci levels
 */
export function calculateFibonacciLevels(
  high: number,
  low: number
): { level23: number; level38: number; level50: number; level61: number } {
  const diff = high - low;

  return {
    level23: high - diff * 0.236,
    level38: high - diff * 0.382,
    level50: high - diff * 0.5,
    level61: high - diff * 0.618,
  };
}

/**
 * Calculate TP/SL for RSI Divergence
 * @param entryPrice Entry price
 * @param isBullish Whether it's bullish divergence
 * @param config TP/SL configuration
 * @param klineData Kline data for ATR calculation
 * @returns TP/SL result
 */
export function calculateRSIDivergenceTPSL(
  entryPrice: number,
  isBullish: boolean,
  config: TPSLConfig["rsiDivergence"],
  klineData: KlineData[]
): TPSLResult {
  const atr = calculateATR(klineData);
  const atrSL = atr * config.atrMultiplier;

  let takeProfit: number;
  let stopLoss: number;

  if (isBullish) {
    // Bullish divergence: expect price to go up
    takeProfit = entryPrice * (1 + config.tpPercent / 100);
    stopLoss = Math.max(
      entryPrice * (1 - config.slPercent / 100),
      entryPrice - atrSL
    );
  } else {
    // Bearish divergence: expect price to go down
    takeProfit = entryPrice * (1 - config.tpPercent / 100);
    stopLoss = Math.min(
      entryPrice * (1 + config.slPercent / 100),
      entryPrice + atrSL
    );
  }

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  return {
    takeProfit,
    stopLoss,
    riskRewardRatio,
    method: "RSI_DIVERGENCE_ATR",
    confidence: Math.min(100, riskRewardRatio * 50),
  };
}

/**
 * Calculate TP/SL for MACD Divergence
 * @param entryPrice Entry price
 * @param isBullish Whether it's bullish divergence
 * @param config TP/SL configuration
 * @param klineData Kline data for ATR calculation
 * @returns TP/SL result
 */
export function calculateMACDDivergenceTPSL(
  entryPrice: number,
  isBullish: boolean,
  config: TPSLConfig["macdDivergence"],
  klineData: KlineData[]
): TPSLResult {
  const atr = calculateATR(klineData);
  const atrSL = atr * config.atrMultiplier;

  let takeProfit: number;
  let stopLoss: number;

  if (isBullish) {
    takeProfit = entryPrice * (1 + config.tpPercent / 100);
    stopLoss = Math.max(
      entryPrice * (1 - config.slPercent / 100),
      entryPrice - atrSL
    );
  } else {
    takeProfit = entryPrice * (1 - config.tpPercent / 100);
    stopLoss = Math.min(
      entryPrice * (1 + config.slPercent / 100),
      entryPrice + atrSL
    );
  }

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  return {
    takeProfit,
    stopLoss,
    riskRewardRatio,
    method: "MACD_DIVERGENCE_ATR",
    confidence: Math.min(100, riskRewardRatio * 45),
  };
}

/**
 * Calculate TP/SL for Market Structure
 * @param entryPrice Entry price
 * @param structureType Structure type (HH, HL, LH, LL)
 * @param config TP/SL configuration
 * @param klineData Kline data for calculations
 * @returns TP/SL result
 */
export function calculateMarketStructureTPSL(
  entryPrice: number,
  structureType: "HH" | "HL" | "LH" | "LL",
  config: TPSLConfig["marketStructure"],
  klineData: KlineData[]
): TPSLResult {
  const atr = calculateATR(klineData);
  const { support, resistance } = calculateSupportResistance(klineData);

  let takeProfit: number;
  let stopLoss: number;
  let method = "MARKET_STRUCTURE_BASIC";

  if (config.structureBased) {
    // Use structure levels for more precise SL
    if (structureType === "HH" || structureType === "HL") {
      // Bullish structure
      takeProfit = entryPrice * (1 + config.tpPercent / 100);
      stopLoss = Math.max(
        entryPrice * (1 - config.slPercent / 100),
        support - atr * 0.5
      );
      method = "MARKET_STRUCTURE_SUPPORT";
    } else {
      // Bearish structure
      takeProfit = entryPrice * (1 - config.tpPercent / 100);
      stopLoss = Math.min(
        entryPrice * (1 + config.slPercent / 100),
        resistance + atr * 0.5
      );
      method = "MARKET_STRUCTURE_RESISTANCE";
    }
  } else {
    // Standard percentage-based TP/SL
    if (structureType === "HH" || structureType === "HL") {
      takeProfit = entryPrice * (1 + config.tpPercent / 100);
      stopLoss = Math.max(
        entryPrice * (1 - config.slPercent / 100),
        entryPrice - atr * config.atrMultiplier
      );
    } else {
      takeProfit = entryPrice * (1 - config.tpPercent / 100);
      stopLoss = Math.min(
        entryPrice * (1 + config.slPercent / 100),
        entryPrice + atr * config.atrMultiplier
      );
    }
  }

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  return {
    takeProfit,
    stopLoss,
    riskRewardRatio,
    method,
    confidence: Math.min(100, riskRewardRatio * 60),
  };
}

/**
 * Calculate TP/SL for Volume Spike
 * @param entryPrice Entry price
 * @param volumeRatio Volume ratio (current/average)
 * @param config TP/SL configuration
 * @param klineData Kline data for calculations
 * @returns TP/SL result
 */
export function calculateVolumeSpikeTPSL(
  entryPrice: number,
  volumeRatio: number,
  config: TPSLConfig["volumeSpike"],
  klineData: KlineData[]
): TPSLResult {
  const atr = calculateATR(klineData);

  // Adjust TP/SL based on volume strength
  let tpMultiplier = 1;
  let slMultiplier = 1;

  if (config.volumeBased) {
    if (volumeRatio > 3) {
      // High volume - wider TP, tighter SL
      tpMultiplier = 1.5;
      slMultiplier = 0.7;
    } else if (volumeRatio > 2) {
      // Medium volume - standard
      tpMultiplier = 1.2;
      slMultiplier = 0.8;
    } else {
      // Low volume - tighter TP, wider SL
      tpMultiplier = 0.8;
      slMultiplier = 1.2;
    }
  }

  const takeProfit = entryPrice * (1 + (config.tpPercent * tpMultiplier) / 100);
  const stopLoss = Math.max(
    entryPrice * (1 - (config.slPercent * slMultiplier) / 100),
    entryPrice - atr * config.atrMultiplier * slMultiplier
  );

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  return {
    takeProfit,
    stopLoss,
    riskRewardRatio,
    method: "VOLUME_SPIKE_DYNAMIC",
    confidence: Math.min(100, riskRewardRatio * 40),
  };
}

/**
 * Calculate TP/SL for Volume Divergence
 * @param entryPrice Entry price
 * @param reversalProbability Reversal probability
 * @param isBullish Whether it's bullish divergence
 * @param config TP/SL configuration
 * @param klineData Kline data for calculations
 * @returns TP/SL result
 */
export function calculateVolumeDivergenceTPSL(
  entryPrice: number,
  reversalProbability: "LOW" | "MEDIUM" | "HIGH",
  isBullish: boolean,
  config: TPSLConfig["volumeDivergence"],
  klineData: KlineData[]
): TPSLResult {
  const atr = calculateATR(klineData);

  // Adjust TP/SL based on reversal probability
  let tpMultiplier = 1;
  let slMultiplier = 1;

  if (config.reversalBased) {
    switch (reversalProbability) {
      case "HIGH":
        tpMultiplier = 1.3;
        slMultiplier = 0.6;
        break;
      case "MEDIUM":
        tpMultiplier = 1.1;
        slMultiplier = 0.8;
        break;
      case "LOW":
        tpMultiplier = 0.9;
        slMultiplier = 1.1;
        break;
    }
  }

  let takeProfit: number;
  let stopLoss: number;

  if (isBullish) {
    takeProfit = entryPrice * (1 + (config.tpPercent * tpMultiplier) / 100);
    stopLoss = Math.max(
      entryPrice * (1 - (config.slPercent * slMultiplier) / 100),
      entryPrice - atr * config.atrMultiplier * slMultiplier
    );
  } else {
    takeProfit = entryPrice * (1 - (config.tpPercent * tpMultiplier) / 100);
    stopLoss = Math.min(
      entryPrice * (1 + (config.slPercent * slMultiplier) / 100),
      entryPrice + atr * config.atrMultiplier * slMultiplier
    );
  }

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  return {
    takeProfit,
    stopLoss,
    riskRewardRatio,
    method: "VOLUME_DIVERGENCE_REVERSAL",
    confidence: Math.min(100, riskRewardRatio * 55),
  };
}

/**
 * Get default TP/SL configuration
 * @returns Default configuration
 */
export function getDefaultTPSLConfig(): TPSLConfig {
  return {
    rsiDivergence: {
      tpPercent: 2.5,
      slPercent: 1.2,
      atrMultiplier: 1.5,
    },
    macdDivergence: {
      tpPercent: 3.0,
      slPercent: 1.5,
      atrMultiplier: 2.0,
    },
    marketStructure: {
      tpPercent: 2.0,
      slPercent: 1.0,
      atrMultiplier: 1.0,
      structureBased: true,
    },
    volumeSpike: {
      tpPercent: 1.5,
      slPercent: 0.8,
      atrMultiplier: 1.2,
      volumeBased: true,
    },
    volumeDivergence: {
      tpPercent: 2.2,
      slPercent: 1.1,
      atrMultiplier: 1.3,
      reversalBased: true,
    },
  };
}
