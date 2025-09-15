import {
  KlineData,
  MACDData,
  MACDDivergenceSignal,
} from "../types/market.model";
import {
  detectPivotHighs,
  detectPivotLows,
  getRecentPivots,
} from "./pivot.utils";

/**
 * Calculate EMA (Exponential Moving Average)
 * @param prices Array of price values
 * @param period EMA period
 * @returns Array of EMA values
 */
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i] || 0;
  }
  ema[period - 1] = sum / period;

  // Calculate subsequent EMAs
  for (let i = period; i < prices.length; i++) {
    ema[i] =
      (prices[i] || 0) * multiplier + (ema[i - 1] || 0) * (1 - multiplier);
  }

  return ema;
}

/**
 * Calculate MACD values for the entire dataset
 * @param prices Array of price values
 * @param fastPeriod Fast EMA period (default: 12)
 * @param slowPeriod Slow EMA period (default: 26)
 * @param signalPeriod Signal line period (default: 9)
 * @returns Array of MACD data
 */
export function calculateMACDValues(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDData[] {
  const macdData: MACDData[] = [];

  // Calculate EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Calculate MACD line
  const macdLine: number[] = [];
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    macdLine[i] = (fastEMA[i] || 0) - (slowEMA[i] || 0);
  }

  // Calculate Signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdLine.slice(slowPeriod - 1), signalPeriod);

  // Calculate Histogram
  for (let i = slowPeriod + signalPeriod - 2; i < prices.length; i++) {
    const macd = macdLine[i] || 0;
    const signal = signalLine[i - (slowPeriod + signalPeriod - 2)] || 0;
    const histogram = macd - signal;

    macdData.push({
      macd: Math.round(macd * 1000000) / 1000000, // Round to 6 decimal places
      signal: Math.round(signal * 1000000) / 1000000,
      histogram: Math.round(histogram * 1000000) / 1000000,
      timestamp: Date.now() - (prices.length - i) * 60000, // Approximate timestamp
    });
  }

  return macdData;
}

/**
 * Detect MACD divergence signals
 * @param klineData Array of kline data
 * @param config Divergence configuration
 * @returns MACD divergence signal if found, null otherwise
 */
export function detectMACDDivergence(
  klineData: KlineData[],
  config: { pivotLength: number; tpPercent: number; slPercent: number }
): MACDDivergenceSignal | null {
  try {
    // Ensure we have enough data
    if (klineData.length < 50) {
      console.log("Insufficient data for MACD divergence detection");
      return null;
    }

    const closePrices = klineData.map((kline) => parseFloat(kline.close));

    // Calculate MACD values
    const macdData = calculateMACDValues(closePrices);
    const macdValues = macdData.map((d) => d.macd);

    // Detect pivot points
    const priceHighs = detectPivotHighs(
      closePrices,
      config.pivotLength,
      config.pivotLength
    );
    const priceLows = detectPivotLows(
      closePrices,
      config.pivotLength,
      config.pivotLength
    );
    const macdHighs = detectPivotHighs(
      macdValues,
      config.pivotLength,
      config.pivotLength
    );
    const macdLows = detectPivotLows(
      macdValues,
      config.pivotLength,
      config.pivotLength
    );

    // Get recent pivots
    const recentPriceHighs = getRecentPivots(priceHighs, 2);
    const recentPriceLows = getRecentPivots(priceLows, 2);
    const recentMACDHighs = getRecentPivots(macdHighs, 2);
    const recentMACDLows = getRecentPivots(macdLows, 2);

    // Check for bullish divergence (price low + MACD low)
    if (recentPriceLows.length >= 2 && recentMACDLows.length >= 2) {
      const currentPriceLow = recentPriceLows[recentPriceLows.length - 1];
      const prevPriceLow = recentPriceLows[recentPriceLows.length - 2];
      const currentMACDLow = recentMACDLows[recentMACDLows.length - 1];
      const prevMACDLow = recentMACDLows[recentMACDLows.length - 2];

      if (
        !currentPriceLow ||
        !prevPriceLow ||
        !currentMACDLow ||
        !prevMACDLow
      ) {
        return null;
      }

      // Bullish divergence conditions:
      // 1. Current price low < previous price low
      // 2. Current MACD low > previous MACD low
      if (
        currentPriceLow.value < prevPriceLow.value &&
        currentMACDLow.value > prevMACDLow.value
      ) {
        const { takeProfit, stopLoss } = calculateTPSL(
          currentPriceLow.value,
          true,
          config.tpPercent,
          config.slPercent
        );

        return {
          type: "BULLISH",
          price: currentPriceLow.value,
          macd: currentMACDLow.value,
          timestamp: Date.now(),
          takeProfit,
          stopLoss,
          confidence: Math.min(
            100,
            (currentMACDLow.value - prevMACDLow.value) * 1000
          ),
        };
      }
    }

    // Check for bearish divergence (price high + MACD high)
    if (recentPriceHighs.length >= 2 && recentMACDHighs.length >= 2) {
      const currentPriceHigh = recentPriceHighs[recentPriceHighs.length - 1];
      const prevPriceHigh = recentPriceHighs[recentPriceHighs.length - 2];
      const currentMACDHigh = recentMACDHighs[recentMACDHighs.length - 1];
      const prevMACDHigh = recentMACDHighs[recentMACDHighs.length - 2];

      if (
        !currentPriceHigh ||
        !prevPriceHigh ||
        !currentMACDHigh ||
        !prevMACDHigh
      ) {
        return null;
      }

      // Bearish divergence conditions:
      // 1. Current price high > previous price high
      // 2. Current MACD high < previous MACD high
      if (
        currentPriceHigh.value > prevPriceHigh.value &&
        currentMACDHigh.value < prevMACDHigh.value
      ) {
        const { takeProfit, stopLoss } = calculateTPSL(
          currentPriceHigh.value,
          false,
          config.tpPercent,
          config.slPercent
        );

        return {
          type: "BEARISH",
          price: currentPriceHigh.value,
          macd: currentMACDHigh.value,
          timestamp: Date.now(),
          takeProfit,
          stopLoss,
          confidence: Math.min(
            100,
            (prevMACDHigh.value - currentMACDHigh.value) * 1000
          ),
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error detecting MACD divergence:", error);
    return null;
  }
}

/**
 * Calculate take profit and stop loss levels for MACD signals
 */
function calculateTPSL(
  price: number,
  isBullish: boolean,
  tpPercent: number,
  slPercent: number
): { takeProfit: number; stopLoss: number } {
  if (isBullish) {
    return {
      takeProfit: price * (1 + tpPercent / 100),
      stopLoss: price * (1 - slPercent / 100),
    };
  } else {
    return {
      takeProfit: price * (1 - tpPercent / 100),
      stopLoss: price * (1 + slPercent / 100),
    };
  }
}

/**
 * Get current MACD data
 * @param klineData Array of kline data
 * @returns Current MACD data
 */
export function getCurrentMACD(klineData: KlineData[]): MACDData | null {
  try {
    if (klineData.length < 26) {
      return null;
    }

    const closePrices = klineData.map((kline) => parseFloat(kline.close));
    const macdData = calculateMACDValues(closePrices);

    if (macdData.length === 0) {
      return null;
    }

    return macdData[macdData.length - 1] || null;
  } catch (error) {
    console.error("Error getting current MACD:", error);
    return null;
  }
}
