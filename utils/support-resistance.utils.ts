import { KlineData } from "../types/market.model";

export interface SupportResistanceLevel {
  price: number;
  strength: number; // 1-10, based on touches and volume
  type: "SUPPORT" | "RESISTANCE";
  touches: number; // Number of times price touched this level
  lastTouch: number; // Timestamp of last touch
  volume: number; // Average volume at this level
  isActive: boolean; // Whether this level is still relevant
}

export interface SupportResistanceConfig {
  lookbackPeriod: number; // Number of candles to look back
  minTouches: number; // Minimum touches to consider a level
  tolerancePercent: number; // Price tolerance for level detection (0.5% = 0.005)
  volumeWeight: number; // Weight of volume in strength calculation
  timeDecay: number; // How much older levels lose strength over time
}

/**
 * Detect Support and Resistance levels from price data
 */
export function detectSupportResistance(
  klineData: KlineData[],
  config?: Partial<SupportResistanceConfig>
): {
  support: SupportResistanceLevel[];
  resistance: SupportResistanceLevel[];
  nearestSupport: SupportResistanceLevel | null;
  nearestResistance: SupportResistanceLevel | null;
} {
  const defaultConfig: SupportResistanceConfig = {
    lookbackPeriod: 100,
    minTouches: 2,
    tolerancePercent: 0.005, // 0.5%
    volumeWeight: 0.3,
    timeDecay: 0.1,
  };

  const finalConfig = { ...defaultConfig, ...config };

  if (klineData.length < finalConfig.lookbackPeriod) {
    return {
      support: [],
      resistance: [],
      nearestSupport: null,
      nearestResistance: null,
    };
  }

  // Get recent data
  const recentData = klineData.slice(-finalConfig.lookbackPeriod);
  const currentData = recentData[recentData.length - 1];
  if (!currentData) {
    return {
      support: [],
      resistance: [],
      nearestSupport: null,
      nearestResistance: null,
    };
  }
  const currentPrice = parseFloat(currentData.close);

  // Find pivot highs and lows
  const pivotHighs = findPivotHighs(recentData, 3);
  const pivotLows = findPivotLows(recentData, 3);

  // Group similar levels
  const resistanceLevels = groupSimilarLevels(
    pivotHighs,
    finalConfig.tolerancePercent
  );
  const supportLevels = groupSimilarLevels(
    pivotLows,
    finalConfig.tolerancePercent
  );

  // Calculate strength for each level
  const resistance = calculateLevelStrength(
    resistanceLevels,
    recentData,
    "RESISTANCE",
    finalConfig
  );
  const support = calculateLevelStrength(
    supportLevels,
    recentData,
    "SUPPORT",
    finalConfig
  );

  // Filter active levels
  const activeResistance = resistance.filter((level) => level.isActive);
  const activeSupport = support.filter((level) => level.isActive);

  // Find nearest levels to current price
  const nearestResistance = findNearestLevel(
    activeResistance,
    currentPrice,
    "above"
  );
  const nearestSupport = findNearestLevel(activeSupport, currentPrice, "below");

  return {
    support: activeSupport,
    resistance: activeResistance,
    nearestSupport,
    nearestResistance,
  };
}

/**
 * Find pivot highs in price data
 */
function findPivotHighs(klineData: KlineData[], period: number): number[] {
  const highs: number[] = [];

  for (let i = period; i < klineData.length - period; i++) {
    const currentData = klineData[i];
    if (!currentData) {
      continue;
    }

    const currentHigh = parseFloat(currentData.high);
    let isPivot = true;

    // Check if current high is higher than surrounding highs
    for (let j = i - period; j <= i + period; j++) {
      if (j !== i) {
        const compareData = klineData[j];
        if (!compareData) {
          continue;
        }
        const compareHigh = parseFloat(compareData.high);
        if (compareHigh >= currentHigh) {
          isPivot = false;
          break;
        }
      }
    }

    if (isPivot) {
      highs.push(currentHigh);
    }
  }

  return highs;
}

/**
 * Find pivot lows in price data
 */
function findPivotLows(klineData: KlineData[], period: number): number[] {
  const lows: number[] = [];

  for (let i = period; i < klineData.length - period; i++) {
    const currentData = klineData[i];
    if (!currentData) {
      continue;
    }
    const currentLow = parseFloat(currentData.low);
    let isPivot = true;

    // Check if current low is lower than surrounding lows
    for (let j = i - period; j <= i + period; j++) {
      if (j !== i) {
        const compareData = klineData[j];
        if (!compareData) {
          continue;
        }
        const compareLow = parseFloat(compareData.low);
        if (compareLow <= currentLow) {
          isPivot = false;
          break;
        }
      }
    }

    if (isPivot) {
      lows.push(currentLow);
    }
  }

  return lows;
}

/**
 * Group similar price levels together
 */
function groupSimilarLevels(
  levels: number[],
  tolerancePercent: number
): { price: number; touches: number; timestamps: number[] }[] {
  const grouped: { price: number; touches: number; timestamps: number[] }[] =
    [];

  for (const level of levels) {
    let found = false;

    for (const group of grouped) {
      const tolerance = group.price * tolerancePercent;
      if (Math.abs(level - group.price) <= tolerance) {
        // Add to existing group
        group.touches++;
        group.timestamps.push(Date.now());
        found = true;
        break;
      }
    }

    if (!found) {
      // Create new group
      grouped.push({
        price: level,
        touches: 1,
        timestamps: [Date.now()],
      });
    }
  }

  return grouped;
}

/**
 * Calculate strength for support/resistance levels
 */
function calculateLevelStrength(
  groupedLevels: { price: number; touches: number; timestamps: number[] }[],
  klineData: KlineData[],
  type: "SUPPORT" | "RESISTANCE",
  config: SupportResistanceConfig
): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = [];

  for (const group of groupedLevels) {
    if (group.touches < config.minTouches) continue;

    // Calculate average volume at this level
    const volumeAtLevel = calculateVolumeAtLevel(
      group.price,
      klineData,
      config.tolerancePercent
    );

    // Calculate strength based on touches, volume, and recency
    const touchStrength = Math.min(10, group.touches * 2);
    const volumeStrength = Math.min(5, volumeAtLevel / 1000000); // Normalize volume
    const recencyStrength = calculateRecencyStrength(group.timestamps);

    const totalStrength = Math.min(
      10,
      touchStrength * 0.5 +
        volumeStrength * config.volumeWeight +
        recencyStrength * (1 - config.volumeWeight)
    );

    // Determine if level is still active
    const isActive = totalStrength >= 3 && recencyStrength >= 2;

    levels.push({
      price: group.price,
      strength: totalStrength,
      type,
      touches: group.touches,
      lastTouch: Math.max(...group.timestamps),
      volume: volumeAtLevel,
      isActive,
    });
  }

  // Sort by strength (highest first)
  return levels.sort((a, b) => b.strength - a.strength);
}

/**
 * Calculate average volume at a specific price level
 */
function calculateVolumeAtLevel(
  price: number,
  klineData: KlineData[],
  tolerancePercent: number
): number {
  const tolerance = price * tolerancePercent;
  let totalVolume = 0;
  let count = 0;

  for (const kline of klineData) {
    const high = parseFloat(kline.high);
    const low = parseFloat(kline.low);
    const volume = parseFloat(kline.volume);

    // Check if price level is within this candle's range
    if (price >= low - tolerance && price <= high + tolerance) {
      totalVolume += volume;
      count++;
    }
  }

  return count > 0 ? totalVolume / count : 0;
}

/**
 * Calculate recency strength based on timestamps
 */
function calculateRecencyStrength(timestamps: number[]): number {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  let totalRecency = 0;
  for (const timestamp of timestamps) {
    const age = now - timestamp;
    const recency = Math.max(0, 1 - age / maxAge);
    totalRecency += recency;
  }

  return Math.min(10, totalRecency);
}

/**
 * Find nearest level to current price
 */
function findNearestLevel(
  levels: SupportResistanceLevel[],
  currentPrice: number,
  direction: "above" | "below"
): SupportResistanceLevel | null {
  let nearest: SupportResistanceLevel | null = null;
  let minDistance = Infinity;

  for (const level of levels) {
    let distance: number;

    if (direction === "above" && level.price > currentPrice) {
      distance = level.price - currentPrice;
    } else if (direction === "below" && level.price < currentPrice) {
      distance = currentPrice - level.price;
    } else {
      continue;
    }

    if (distance < minDistance) {
      minDistance = distance;
      nearest = level;
    }
  }

  return nearest;
}

/**
 * Calculate dynamic TP/SL based on Support/Resistance levels
 */
export function calculateDynamicTPSL(
  currentPrice: number,
  isBullish: boolean,
  supportLevels: SupportResistanceLevel[],
  resistanceLevels: SupportResistanceLevel[],
  config?: {
    tpBufferPercent?: number; // Buffer above/below S/R levels
    slBufferPercent?: number;
    minRiskReward?: number;
    maxRiskReward?: number;
  }
): {
  takeProfit: number;
  stopLoss: number;
  riskRewardRatio: number;
  method: string;
  confidence: number;
  supportLevel?: SupportResistanceLevel | undefined;
  resistanceLevel?: SupportResistanceLevel | undefined;
} {
  const defaultConfig = {
    tpBufferPercent: 0.002, // 0.2% buffer
    slBufferPercent: 0.001, // 0.1% buffer
    minRiskReward: 1.5,
    maxRiskReward: 4.0,
  };

  const finalConfig = { ...defaultConfig, ...config };

  let takeProfit: number;
  let stopLoss: number;
  let method: string;
  let confidence: number;
  let supportLevel: SupportResistanceLevel | undefined;
  let resistanceLevel: SupportResistanceLevel | undefined;

  if (isBullish) {
    // For bullish signals
    const nearestResistance = findNearestLevel(
      resistanceLevels,
      currentPrice,
      "above"
    );
    const nearestSupport = findNearestLevel(
      supportLevels,
      currentPrice,
      "below"
    );

    if (nearestResistance && nearestSupport) {
      // Use S/R levels
      takeProfit = nearestResistance.price * (1 - finalConfig.tpBufferPercent);
      stopLoss = nearestSupport.price * (1 + finalConfig.slBufferPercent);
      method = "SUPPORT_RESISTANCE";
      confidence = Math.min(
        100,
        (nearestResistance.strength + nearestSupport.strength) * 10
      );
      resistanceLevel = nearestResistance;
      supportLevel = nearestSupport;
    } else {
      // Fallback to percentage-based
      takeProfit = currentPrice * 1.025; // 2.5%
      stopLoss = currentPrice * 0.985; // 1.5%
      method = "PERCENTAGE_FALLBACK";
      confidence = 50;
    }
  } else {
    // For bearish signals
    const nearestSupport = findNearestLevel(
      supportLevels,
      currentPrice,
      "below"
    );
    const nearestResistance = findNearestLevel(
      resistanceLevels,
      currentPrice,
      "above"
    );

    if (nearestSupport && nearestResistance) {
      // Use S/R levels
      takeProfit = nearestSupport.price * (1 + finalConfig.tpBufferPercent);
      stopLoss = nearestResistance.price * (1 - finalConfig.slBufferPercent);
      method = "SUPPORT_RESISTANCE";
      confidence = Math.min(
        100,
        (nearestSupport.strength + nearestResistance.strength) * 10
      );
      supportLevel = nearestSupport;
      resistanceLevel = nearestResistance;
    } else {
      // Fallback to percentage-based
      takeProfit = currentPrice * 0.975; // 2.5%
      stopLoss = currentPrice * 1.015; // 1.5%
      method = "PERCENTAGE_FALLBACK";
      confidence = 50;
    }
  }

  // Calculate risk/reward ratio
  const risk = Math.abs(currentPrice - stopLoss);
  const reward = Math.abs(takeProfit - currentPrice);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  // Adjust confidence based on risk/reward ratio
  if (
    riskRewardRatio >= finalConfig.minRiskReward &&
    riskRewardRatio <= finalConfig.maxRiskReward
  ) {
    confidence += 20;
  } else if (riskRewardRatio < finalConfig.minRiskReward) {
    confidence -= 20;
  }

  return {
    takeProfit: parseFloat(takeProfit.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
    method,
    confidence: Math.min(100, Math.max(0, confidence)),
    supportLevel: supportLevel || undefined,
    resistanceLevel: resistanceLevel || undefined,
  };
}

/**
 * Get S/R levels summary for display
 */
export function getSupportResistanceSummary(
  support: SupportResistanceLevel[],
  resistance: SupportResistanceLevel[],
  currentPrice: number
): string {
  const nearestSupport = findNearestLevel(support, currentPrice, "below");
  const nearestResistance = findNearestLevel(resistance, currentPrice, "above");

  let summary = `📊 <b>Support/Resistance Levels</b>\n\n`;

  if (nearestSupport) {
    const distance = (
      ((currentPrice - nearestSupport.price) / currentPrice) *
      100
    ).toFixed(2);
    summary += `🟢 <b>Nearest Support:</b> ${nearestSupport.price.toLocaleString()} USDT\n`;
    summary += `   • Distance: -${distance}%\n`;
    summary += `   • Strength: ${nearestSupport.strength.toFixed(1)}/10\n`;
    summary += `   • Touches: ${nearestSupport.touches}\n\n`;
  }

  if (nearestResistance) {
    const distance = (
      ((nearestResistance.price - currentPrice) / currentPrice) *
      100
    ).toFixed(2);
    summary += `🔴 <b>Nearest Resistance:</b> ${nearestResistance.price.toLocaleString()} USDT\n`;
    summary += `   • Distance: +${distance}%\n`;
    summary += `   • Strength: ${nearestResistance.strength.toFixed(1)}/10\n`;
    summary += `   • Touches: ${nearestResistance.touches}\n\n`;
  }

  summary += `📊 <b>Total Levels:</b> ${support.length} Support, ${resistance.length} Resistance`;

  return summary;
}
