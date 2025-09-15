import { KlineData, RSIData } from "../types/market.model";

/**
 * Calculate RSI (Relative Strength Index) using standard formula
 * RSI = 100 - (100 / (1 + RS))
 * RS = Average Gain / Average Loss
 */
export function calculateRSI(
  klineData: KlineData[],
  period: number = 14
): RSIData {
  if (klineData.length < period + 1) {
    throw new Error(
      `Insufficient data for RSI calculation. Need at least ${
        period + 1
      } periods, got ${klineData.length}`
    );
  }

  // Convert string prices to numbers and get close prices
  const closePrices = klineData.map((kline) => parseFloat(kline.close));

  // Calculate price changes
  const priceChanges: number[] = [];
  for (let i = 1; i < closePrices.length; i++) {
    priceChanges.push((closePrices[i] || 0) - (closePrices[i - 1] || 0));
  }

  // Separate gains and losses
  const gains: number[] = priceChanges.map((change) =>
    change > 0 ? change : 0
  );
  const losses: number[] = priceChanges.map((change) =>
    change < 0 ? Math.abs(change) : 0
  );

  // Calculate initial average gain and loss (simple moving average)
  let avgGain =
    gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss =
    losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  // Calculate smoothed averages using Wilder's smoothing method
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + (gains[i] || 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (losses[i] || 0)) / period;
  }

  // Calculate RS and RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return {
    rsi: Math.round(rsi * 100) / 100, // Round to 2 decimal places
    timestamp: Date.now(),
    period: period,
  };
}

/**
 * Get RSI signal interpretation
 */
export function getRSISignal(rsi: number): string {
  if (rsi >= 70) {
    return "🔴 OVERBOUGHT";
  } else if (rsi <= 30) {
    return "🟢 OVERSOLD";
  } else if (rsi >= 60) {
    return "🟡 BULLISH";
  } else if (rsi <= 40) {
    return "🟡 BEARISH";
  } else {
    return "⚪ NEUTRAL";
  }
}
