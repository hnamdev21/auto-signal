import {
  KlineData,
  DivergenceConfig,
  DivergenceSignal,
} from "../types/market.model";
import {
  detectPivotHighs,
  detectPivotLows,
  getRecentPivots,
} from "./pivot.utils";

/**
 * Calculate RSI values for each point in the dataset
 * @param prices Array of price values
 * @param period RSI period
 * @returns Array of RSI values
 */
function calculateRSIValues(prices: number[], period: number = 14): number[] {
  const rsiValues: number[] = [];

  // Fill initial values with neutral RSI (50)
  for (let i = 0; i < period; i++) {
    rsiValues.push(50);
  }

  // Calculate price changes
  const priceChanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const _prices = prices[i];
    const _pricesMinus1 = prices[i - 1];

    if (typeof _prices !== "number" || typeof _pricesMinus1 !== "number") {
      continue;
    }

    priceChanges.push(_prices - _pricesMinus1);
  }

  // Separate gains and losses
  const gains: number[] = priceChanges.map((change) =>
    change > 0 ? change : 0
  );
  const losses: number[] = priceChanges.map((change) =>
    change < 0 ? Math.abs(change) : 0
  );

  // Calculate initial average gain and loss
  let avgGain =
    gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss =
    losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  // Calculate RSI for each point
  for (let i = period; i < prices.length; i++) {
    // Calculate RS and RSI
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsiValues.push(Math.round(rsi * 100) / 100);

    // Update averages using Wilder's smoothing
    if (i < gains.length) {
      const _gains = gains[i];
      const _losses = losses[i];

      if (typeof _gains !== "number" || typeof _losses !== "number") {
        continue;
      }

      avgGain = (avgGain * (period - 1) + _gains) / period;
      avgLoss = (avgLoss * (period - 1) + _losses) / period;
    }
  }

  return rsiValues;
}

/**
 * Calculate take profit and stop loss levels
 * @param price Entry price
 * @param isBullish Whether it's a bullish signal
 * @param tpPercent Take profit percentage
 * @param slPercent Stop loss percentage
 * @returns Object with TP and SL levels
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
 * Detect RSI divergence signals based on Pine Script logic
 * @param klineData Array of kline data
 * @param config Divergence configuration
 * @returns Divergence signal if found, null otherwise
 */
export function detectRSIDivergence(
  klineData: KlineData[],
  config: DivergenceConfig
): DivergenceSignal | null {
  try {
    // Ensure we have enough data
    if (klineData.length < 30) {
      console.log("Insufficient data for divergence detection");
      return null;
    }

    const closePrices = klineData.map((kline) => parseFloat(kline.close));

    // Calculate RSI values for the entire dataset
    const rsiValues = calculateRSIValues(closePrices, 14);

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
    const rsiHighs = detectPivotHighs(
      rsiValues,
      config.pivotLength,
      config.pivotLength
    );
    const rsiLows = detectPivotLows(
      rsiValues,
      config.pivotLength,
      config.pivotLength
    );

    // Get recent pivots
    const recentPriceHighs = getRecentPivots(priceHighs, 2);
    const recentPriceLows = getRecentPivots(priceLows, 2);
    const recentRsiHighs = getRecentPivots(rsiHighs, 2);
    const recentRsiLows = getRecentPivots(rsiLows, 2);

    // Check for bullish divergence (price low + RSI low)
    if (recentPriceLows.length >= 2 && recentRsiLows.length >= 2) {
      const currentPriceLow = recentPriceLows[recentPriceLows.length - 1];
      const prevPriceLow = recentPriceLows[recentPriceLows.length - 2];
      const currentRsiLow = recentRsiLows[recentRsiLows.length - 1];
      const prevRsiLow = recentRsiLows[recentRsiLows.length - 2];

      if (!currentPriceLow || !prevPriceLow || !currentRsiLow || !prevRsiLow) {
        return null;
      }

      // Bullish divergence conditions:
      // 1. Current price low < previous price low
      // 2. Current RSI low > previous RSI low + bullDivergenceDiff
      // 3. Current RSI low <= bullRsiLevel
      if (
        currentPriceLow.value < prevPriceLow.value &&
        currentRsiLow.value > prevRsiLow.value + config.bullDivergenceDiff &&
        currentRsiLow.value <= config.bullRsiLevel
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
          rsi: currentRsiLow.value,
          timestamp: Date.now(),
          takeProfit,
          stopLoss,
          confidence: Math.min(
            100,
            (currentRsiLow.value - prevRsiLow.value) * 10
          ),
        };
      }
    }

    // Check for bearish divergence (price high + RSI high)
    if (recentPriceHighs.length >= 2 && recentRsiHighs.length >= 2) {
      const currentPriceHigh = recentPriceHighs[recentPriceHighs.length - 1];
      const prevPriceHigh = recentPriceHighs[recentPriceHighs.length - 2];
      const currentRsiHigh = recentRsiHighs[recentRsiHighs.length - 1];
      const prevRsiHigh = recentRsiHighs[recentRsiHighs.length - 2];

      if (
        !currentPriceHigh ||
        !prevPriceHigh ||
        !currentRsiHigh ||
        !prevRsiHigh
      ) {
        return null;
      }

      // Bearish divergence conditions:
      // 1. Current price high > previous price high
      // 2. Current RSI high < previous RSI high - bearDivergenceDiff
      // 3. Current RSI high >= bearRsiLevel
      if (
        currentPriceHigh.value > prevPriceHigh.value &&
        currentRsiHigh.value < prevRsiHigh.value - config.bearDivergenceDiff &&
        currentRsiHigh.value >= config.bearRsiLevel
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
          rsi: currentRsiHigh.value,
          timestamp: Date.now(),
          takeProfit,
          stopLoss,
          confidence: Math.min(
            100,
            (prevRsiHigh.value - currentRsiHigh.value) * 10
          ),
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error detecting RSI divergence:", error);
    return null;
  }
}

/**
 * Get default divergence configuration
 * @returns Default configuration matching Pine Script
 */
export function getDefaultDivergenceConfig(): DivergenceConfig {
  return {
    pivotLength: 2,
    bullDivergenceDiff: 5,
    bearDivergenceDiff: 5,
    bullRsiLevel: 35.0,
    bearRsiLevel: 65.0,
    tpPercent: 1.0,
    slPercent: 1.0,
  };
}

/**
 * Validate divergence configuration
 * @param config Configuration to validate
 * @returns True if valid, false otherwise
 */
export function validateDivergenceConfig(config: DivergenceConfig): boolean {
  return (
    config.pivotLength > 0 &&
    config.bullDivergenceDiff > 0 &&
    config.bearDivergenceDiff > 0 &&
    config.bullRsiLevel > 0 &&
    config.bullRsiLevel < 50 &&
    config.bearRsiLevel > 50 &&
    config.bearRsiLevel < 100 &&
    config.tpPercent > 0 &&
    config.slPercent > 0
  );
}
