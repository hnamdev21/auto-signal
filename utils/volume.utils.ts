import {
  KlineData,
  VolumeData,
  VolumeSpikeSignal,
  VolumeDivergenceSignal,
} from "../types/market.model";

/**
 * Calculate volume statistics from kline data
 * @param klineData Array of kline data
 * @param period Period for average calculation (default: 20)
 * @returns Volume data with current and average volume
 */
export function calculateVolumeData(
  klineData: KlineData[],
  period: number = 20
): VolumeData | null {
  try {
    if (klineData.length < period + 1) {
      return null;
    }

    const volumes = klineData.map((kline) => parseFloat(kline.volume));
    const currentVolume = volumes[volumes.length - 1];

    // Calculate average volume over the specified period
    const recentVolumes = volumes.slice(-period - 1, -1); // Exclude current volume
    const averageVolume =
      recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;

    const volumeRatio =
      averageVolume > 0 ? (currentVolume || 0) / averageVolume : 1;

    return {
      currentVolume: currentVolume || 0,
      averageVolume,
      volumeRatio,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error calculating volume data:", error);
    return null;
  }
}

/**
 * Detect volume spike based on volume ratio
 * @param volumeData Volume data
 * @param thresholds Volume spike thresholds
 * @returns Volume spike signal if detected
 */
export function detectVolumeSpike(
  volumeData: VolumeData,
  currentPrice: number,
  thresholds: {
    low: number;
    medium: number;
    high: number;
    extreme: number;
  } = {
    low: 1.5, // 1.5x average volume
    medium: 2.0, // 2x average volume
    high: 3.0, // 3x average volume
    extreme: 5.0, // 5x average volume
  }
): VolumeSpikeSignal | null {
  try {
    const { currentVolume, averageVolume, volumeRatio } = volumeData;

    // Determine severity based on volume ratio
    let severity: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
    let description: string;

    if (volumeRatio >= thresholds.extreme) {
      severity = "EXTREME";
      description = `🚨 EXTREME volume spike! ${volumeRatio.toFixed(
        1
      )}x average volume`;
    } else if (volumeRatio >= thresholds.high) {
      severity = "HIGH";
      description = `🔥 High volume spike! ${volumeRatio.toFixed(
        1
      )}x average volume`;
    } else if (volumeRatio >= thresholds.medium) {
      severity = "MEDIUM";
      description = `⚡ Medium volume spike! ${volumeRatio.toFixed(
        1
      )}x average volume`;
    } else if (volumeRatio >= thresholds.low) {
      severity = "LOW";
      description = `📈 Low volume spike! ${volumeRatio.toFixed(
        1
      )}x average volume`;
    } else {
      return null; // No significant volume spike
    }

    return {
      type: "VOLUME_SPIKE",
      currentVolume,
      averageVolume,
      volumeRatio,
      price: currentPrice,
      timestamp: Date.now(),
      severity,
      description,
    };
  } catch (error) {
    console.error("Error detecting volume spike:", error);
    return null;
  }
}

/**
 * Get volume trend direction
 * @param klineData Array of kline data
 * @param period Period for trend calculation
 * @returns Volume trend direction
 */
export function getVolumeTrend(
  klineData: KlineData[],
  period: number = 5
): "INCREASING" | "DECREASING" | "STABLE" {
  try {
    if (klineData.length < period + 1) {
      return "STABLE";
    }

    const volumes = klineData.map((kline) => parseFloat(kline.volume));
    const recentVolumes = volumes.slice(-period);

    // Calculate trend using linear regression slope
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < recentVolumes.length; i++) {
      sumX += i;
      sumY += recentVolumes[i] || 0;
      sumXY += i * (recentVolumes[i] || 0);
      sumXX += i * i;
    }

    const n = recentVolumes.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Determine trend based on slope
    if (slope > 0.1) return "INCREASING";
    if (slope < -0.1) return "DECREASING";
    return "STABLE";
  } catch (error) {
    console.error("Error calculating volume trend:", error);
    return "STABLE";
  }
}

/**
 * Calculate volume-weighted average price (VWAP) for recent periods
 * @param klineData Array of kline data
 * @param period Period for VWAP calculation
 * @returns VWAP value
 */
export function calculateVWAP(
  klineData: KlineData[],
  period: number = 20
): number | null {
  try {
    if (klineData.length < period) {
      return null;
    }

    const recentData = klineData.slice(-period);
    let totalVolumePrice = 0;
    let totalVolume = 0;

    for (const kline of recentData) {
      const volume = parseFloat(kline.volume);
      const typicalPrice =
        (parseFloat(kline.high) +
          parseFloat(kline.low) +
          parseFloat(kline.close)) /
        3;

      totalVolumePrice += typicalPrice * volume;
      totalVolume += volume;
    }

    return totalVolume > 0 ? totalVolumePrice / totalVolume : null;
  } catch (error) {
    console.error("Error calculating VWAP:", error);
    return null;
  }
}

/**
 * Get volume profile analysis
 * @param klineData Array of kline data
 * @returns Volume profile analysis
 */
export function getVolumeProfile(klineData: KlineData[]): {
  totalVolume: number;
  averageVolume: number;
  maxVolume: number;
  minVolume: number;
  volumeVolatility: number;
} {
  try {
    const volumes = klineData.map((kline) => parseFloat(kline.volume));

    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
    const averageVolume = totalVolume / volumes.length;
    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);

    // Calculate volume volatility (standard deviation)
    const variance =
      volumes.reduce((sum, vol) => sum + Math.pow(vol - averageVolume, 2), 0) /
      volumes.length;
    const volumeVolatility = Math.sqrt(variance);

    return {
      totalVolume,
      averageVolume,
      maxVolume,
      minVolume,
      volumeVolatility,
    };
  } catch (error) {
    console.error("Error calculating volume profile:", error);
    return {
      totalVolume: 0,
      averageVolume: 0,
      maxVolume: 0,
      minVolume: 0,
      volumeVolatility: 0,
    };
  }
}

/**
 * Check if current volume is above VWAP
 * @param klineData Array of kline data
 * @returns True if volume is above VWAP
 */
export function isVolumeAboveVWAP(klineData: KlineData[]): boolean {
  try {
    const vwap = calculateVWAP(klineData);
    if (!vwap) return false;

    const currentPrice = parseFloat(
      klineData[klineData.length - 1]?.close || "0"
    );
    return currentPrice > vwap;
  } catch (error) {
    console.error("Error checking volume above VWAP:", error);
    return false;
  }
}

/**
 * Detect volume divergence (volume giảm dần khi price tăng/giảm)
 * @param klineData Array of kline data
 * @param lookbackPeriod Number of candles to analyze (default: 3)
 * @returns Volume divergence signal if detected
 */
export function detectVolumeDivergence(
  klineData: KlineData[],
  lookbackPeriod: number = 3
): VolumeDivergenceSignal | null {
  try {
    if (klineData.length < lookbackPeriod + 1) {
      return null;
    }

    // Get recent data
    const recentData = klineData.slice(-lookbackPeriod - 1);
    const prices = recentData.map((kline) => parseFloat(kline.close));
    const volumes = recentData.map((kline) => parseFloat(kline.volume));

    // Calculate price and volume trends
    const priceTrend = calculateTrend(prices);
    const volumeTrend = calculateTrend(volumes);

    // Check for divergence conditions
    let divergenceType: "BULLISH" | "BEARISH" | null = null;
    let reversalProbability: "LOW" | "MEDIUM" | "HIGH" = "LOW";

    // Bearish divergence: Price tăng nhưng volume giảm
    if (priceTrend === "INCREASING" && volumeTrend === "DECREASING") {
      divergenceType = "BEARISH";
      reversalProbability = calculateReversalProbability(
        prices,
        volumes,
        "BEARISH"
      );
    }
    // Bullish divergence: Price giảm nhưng volume giảm (volume không theo price)
    else if (priceTrend === "DECREASING" && volumeTrend === "DECREASING") {
      const _prices = prices[prices.length - 1];
      const _volumes = volumes[volumes.length - 1];
      const _pricesMinus1 = prices[0];
      const _volumesMinus1 = volumes[0];

      if (
        typeof _prices !== "number" ||
        typeof _pricesMinus1 !== "number" ||
        typeof _volumes !== "number" ||
        typeof _volumesMinus1 !== "number"
      ) {
        return null;
      }

      // Check if volume is decreasing more than price
      const priceChange = Math.abs(_prices - _pricesMinus1) / _pricesMinus1;
      const volumeChange = Math.abs(_volumes - _volumesMinus1) / _volumesMinus1;

      if (volumeChange > priceChange * 1.5) {
        // Volume giảm nhiều hơn price
        divergenceType = "BULLISH";
        reversalProbability = calculateReversalProbability(
          prices,
          volumes,
          "BULLISH"
        );
      }
    }

    if (!divergenceType) {
      return null;
    }

    const currentPrice = prices[prices.length - 1] || 0;
    const currentVolume = volumes[volumes.length - 1] || 0;
    const averageVolume =
      volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : 1;

    // Calculate confidence based on divergence strength
    const confidence = calculateDivergenceConfidence(
      prices,
      volumes,
      divergenceType
    );

    const description =
      divergenceType === "BULLISH"
        ? `🟢 Phân kỳ tăng giá: Giá giảm nhưng volume giảm mạnh hơn - Có thể đảo chiều tăng`
        : `🔴 Phân kỳ giảm giá: Giá tăng nhưng volume giảm - Có thể đảo chiều giảm`;

    // Calculate basic TP/SL (will be enhanced by TPSLService)
    const tpPercent = 2.2;
    const slPercent = 1.1;
    const takeProfit =
      divergenceType === "BULLISH"
        ? currentPrice * (1 + tpPercent / 100)
        : currentPrice * (1 - tpPercent / 100);
    const stopLoss =
      divergenceType === "BULLISH"
        ? currentPrice * (1 - slPercent / 100)
        : currentPrice * (1 + slPercent / 100);

    return {
      type: "VOLUME_DIVERGENCE",
      priceDirection: priceTrend as "INCREASING" | "DECREASING",
      volumeDirection: volumeTrend as "INCREASING" | "DECREASING",
      divergenceType,
      price: currentPrice,
      volumeRatio,
      timestamp: Date.now(),
      confidence,
      description,
      reversalProbability,
      takeProfit,
      stopLoss,
    };
  } catch (error) {
    console.error("Error detecting volume divergence:", error);
    return null;
  }
}

/**
 * Calculate trend direction for a series of values
 * @param values Array of numeric values
 * @returns Trend direction
 */
function calculateTrend(
  values: number[]
): "INCREASING" | "DECREASING" | "STABLE" {
  if (values.length < 2) return "STABLE";

  let increasingCount = 0;
  let decreasingCount = 0;

  for (let i = 1; i < values.length; i++) {
    const _values = values[i];
    const _valuesMinus1 = values[i - 1];

    if (typeof _values !== "number" || typeof _valuesMinus1 !== "number") {
      continue;
    }

    if (_values > _valuesMinus1) {
      increasingCount++;
    } else if (_values < _valuesMinus1) {
      decreasingCount++;
    }
  }

  if (increasingCount > decreasingCount) return "INCREASING";
  if (decreasingCount > increasingCount) return "DECREASING";
  return "STABLE";
}

/**
 * Calculate reversal probability based on divergence strength
 * @param prices Array of prices
 * @param volumes Array of volumes
 * @param divergenceType Type of divergence
 * @returns Reversal probability
 */
function calculateReversalProbability(
  prices: number[],
  volumes: number[],
  divergenceType: "BULLISH" | "BEARISH"
): "LOW" | "MEDIUM" | "HIGH" {
  const _prices = prices[prices.length - 1];
  const _volumes = volumes[volumes.length - 1];
  const _pricesMinus1 = prices[0];
  const _volumesMinus1 = volumes[0];

  if (
    typeof _prices !== "number" ||
    typeof _pricesMinus1 !== "number" ||
    typeof _volumes !== "number" ||
    typeof _volumesMinus1 !== "number"
  ) {
    return "LOW";
  }

  const priceChange = Math.abs(_prices - _pricesMinus1) / _pricesMinus1;
  const volumeChange = Math.abs(_volumes - _volumesMinus1) / _volumesMinus1;

  // Calculate divergence strength
  const divergenceStrength = volumeChange / (priceChange + 0.001); // Avoid division by zero

  if (divergenceStrength > 2.0) return "HIGH";
  if (divergenceStrength > 1.5) return "MEDIUM";
  return "LOW";
}

/**
 * Calculate confidence score for divergence
 * @param prices Array of prices
 * @param volumes Array of volumes
 * @param divergenceType Type of divergence
 * @returns Confidence score (0-100)
 */
function calculateDivergenceConfidence(
  prices: number[],
  volumes: number[],
  divergenceType: "BULLISH" | "BEARISH"
): number {
  const _prices = prices[prices.length - 1];
  const _volumes = volumes[volumes.length - 1];
  const _pricesMinus1 = prices[0];
  const _volumesMinus1 = volumes[0];

  if (
    typeof _prices !== "number" ||
    typeof _pricesMinus1 !== "number" ||
    typeof _volumes !== "number" ||
    typeof _volumesMinus1 !== "number"
  ) {
    return 0;
  }

  const priceChange = Math.abs(_prices - _pricesMinus1) / _pricesMinus1;
  const volumeChange = Math.abs(_volumes - _volumesMinus1) / _volumesMinus1;

  // Base confidence on divergence strength
  let confidence = Math.min(100, (volumeChange / (priceChange + 0.001)) * 30);

  // Adjust based on divergence type
  if (divergenceType === "BEARISH") {
    // Bearish divergence is more reliable
    confidence *= 1.2;
  } else {
    // Bullish divergence (volume decreasing with price) is less common but significant
    confidence *= 1.1;
  }

  return Math.min(100, confidence);
}
