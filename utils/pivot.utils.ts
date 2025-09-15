import { PivotPoint } from "../types/market.model";

/**
 * Detect pivot high points in price data
 * @param data Array of price values
 * @param leftBars Number of bars to look left
 * @param rightBars Number of bars to look right
 * @returns Array of pivot high points
 */
export function detectPivotHighs(
  data: number[],
  leftBars: number = 2,
  rightBars: number = 2
): PivotPoint[] {
  const pivotHighs: PivotPoint[] = [];

  for (let i = leftBars; i < data.length - rightBars; i++) {
    const currentValue = data[i];
    let isPivotHigh = true;

    if (typeof currentValue !== "number") {
      continue;
    }

    // Check left side
    for (let j = i - leftBars; j < i; j++) {
      const _currentValue = data[j];

      if (typeof _currentValue !== "number") {
        continue;
      }

      if (_currentValue >= currentValue) {
        isPivotHigh = false;
        break;
      }
    }

    // Check right side
    if (isPivotHigh) {
      for (let j = i + 1; j <= i + rightBars; j++) {
        const _currentValue = data[j];

        if (typeof _currentValue !== "number") {
          continue;
        }

        if (_currentValue >= currentValue) {
          isPivotHigh = false;
          break;
        }
      }
    }

    if (isPivotHigh) {
      pivotHighs.push({
        value: currentValue,
        index: i,
        timestamp: Date.now() - (data.length - i) * 60000, // Approximate timestamp
      });
    }
  }

  return pivotHighs;
}

/**
 * Detect pivot low points in price data
 * @param data Array of price values
 * @param leftBars Number of bars to look left
 * @param rightBars Number of bars to look right
 * @returns Array of pivot low points
 */
export function detectPivotLows(
  data: number[],
  leftBars: number = 2,
  rightBars: number = 2
): PivotPoint[] {
  const pivotLows: PivotPoint[] = [];

  for (let i = leftBars; i < data.length - rightBars; i++) {
    const currentValue = data[i];
    let isPivotLow = true;

    if (typeof currentValue !== "number") {
      continue;
    }

    // Check left side
    for (let j = i - leftBars; j < i; j++) {
      const _currentValue = data[j];

      if (typeof _currentValue !== "number") {
        continue;
      }

      if (_currentValue <= currentValue) {
        isPivotLow = false;
        break;
      }
    }

    // Check right side
    if (isPivotLow) {
      for (let j = i + 1; j <= i + rightBars; j++) {
        const _currentValue = data[j];

        if (typeof _currentValue !== "number") {
          continue;
        }

        if (_currentValue <= currentValue) {
          isPivotLow = false;
          break;
        }
      }
    }

    if (isPivotLow) {
      pivotLows.push({
        value: currentValue,
        index: i,
        timestamp: Date.now() - (data.length - i) * 60000, // Approximate timestamp
      });
    }
  }

  return pivotLows;
}

/**
 * Get the last N pivot points from an array
 * @param pivotPoints Array of pivot points
 * @param count Number of recent pivots to return
 * @returns Array of recent pivot points
 */
export function getRecentPivots(
  pivotPoints: PivotPoint[],
  count: number = 2
): PivotPoint[] {
  return pivotPoints.slice(-count);
}

/**
 * Check if two pivot points form a valid divergence pattern
 * @param currentPivot Current pivot point
 * @param previousPivot Previous pivot point
 * @param minDifference Minimum difference required
 * @returns Object with divergence info
 */
export function checkDivergencePattern(
  currentPivot: PivotPoint,
  previousPivot: PivotPoint,
  minDifference: number
): {
  hasDivergence: boolean;
  divergenceType: "BULLISH" | "BEARISH" | "NONE";
  strength: number;
} {
  const priceDiff = currentPivot.value - previousPivot.value;
  const indexDiff = currentPivot.index - previousPivot.index;

  // Need at least some distance between pivots
  if (indexDiff < 5) {
    return {
      hasDivergence: false,
      divergenceType: "NONE",
      strength: 0,
    };
  }

  // Bullish divergence: Lower price, higher RSI
  if (priceDiff < 0 && Math.abs(priceDiff) >= minDifference) {
    return {
      hasDivergence: true,
      divergenceType: "BULLISH",
      strength: Math.abs(priceDiff),
    };
  }

  // Bearish divergence: Higher price, lower RSI
  if (priceDiff > 0 && Math.abs(priceDiff) >= minDifference) {
    return {
      hasDivergence: true,
      divergenceType: "BEARISH",
      strength: Math.abs(priceDiff),
    };
  }

  return {
    hasDivergence: false,
    divergenceType: "NONE",
    strength: 0,
  };
}
