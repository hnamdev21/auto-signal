import fs from "fs";
import path from "path";
import {
  AlertConfig,
  RSIAlert,
  RSIDivergenceTracker,
  KlineData,
} from "../types/market.model";

export class RSIDivergenceService {
  private config: AlertConfig;
  private divergenceTracker: RSIDivergenceTracker = {};
  private readonly divergenceTrackerFile: string;

  constructor(config: AlertConfig) {
    this.config = config;
    this.divergenceTrackerFile = path.join(
      process.cwd(),
      "/data/rsi-divergence-tracker.json"
    );
    this.loadDivergenceTracker();
  }

  /**
   * Load divergence tracker from JSON file
   */
  private loadDivergenceTracker(): void {
    try {
      if (fs.existsSync(this.divergenceTrackerFile)) {
        const data = fs.readFileSync(this.divergenceTrackerFile, "utf8");
        this.divergenceTracker = JSON.parse(data);
        console.log("📁 Loaded RSI divergence tracker from file");
      }
    } catch (error) {
      console.error("❌ Error loading RSI divergence tracker:", error);
      this.divergenceTracker = {};
    }
  }

  /**
   * Save divergence tracker to JSON file
   */
  private saveDivergenceTracker(): void {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.divergenceTrackerFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(
        this.divergenceTrackerFile,
        JSON.stringify(this.divergenceTracker, null, 2)
      );
    } catch (error) {
      console.error("❌ Error saving RSI divergence tracker:", error);
    }
  }

  /**
   * Initialize tracker for a symbol-timeframe combination
   */
  private initializeTracker(symbol: string, timeframe: string): void {
    if (!this.divergenceTracker[symbol]) {
      this.divergenceTracker[symbol] = {};
    }
    if (!this.divergenceTracker[symbol][timeframe]) {
      this.divergenceTracker[symbol][timeframe] = {
        rsiData: [],
      };
    }
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(klineData: KlineData[], period: number = 14): number[] {
    if (klineData.length < period + 1) {
      return [];
    }

    const closes = klineData.map((candle) => parseFloat(candle.close));
    const rsiValues: number[] = [];

    for (let i = period; i < closes.length; i++) {
      const recentCloses = closes.slice(i - period, i + 1);
      const gains: number[] = [];
      const losses: number[] = [];

      for (let j = 1; j < recentCloses.length; j++) {
        const current = recentCloses[j];
        const previous = recentCloses[j - 1];
        if (current === undefined || previous === undefined) continue;

        const change = current - previous;
        if (change > 0) {
          gains.push(change);
          losses.push(0);
        } else {
          gains.push(0);
          losses.push(Math.abs(change));
        }
      }

      const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
      const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;

      if (avgLoss === 0) {
        rsiValues.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);
        rsiValues.push(rsi);
      }
    }

    return rsiValues;
  }

  /**
   * Find peaks and troughs in RSI data
   */
  private findRSIPeaksAndTroughs(
    rsiData: Array<{
      openTime: number;
      close: number;
      rsi: number;
      isClosed: boolean;
    }>,
    lookback: number = 5
  ): {
    peaks: Array<{ index: number; rsi: number; price: number; time: number }>;
    troughs: Array<{ index: number; rsi: number; price: number; time: number }>;
  } {
    const peaks: Array<{
      index: number;
      rsi: number;
      price: number;
      time: number;
    }> = [];
    const troughs: Array<{
      index: number;
      rsi: number;
      price: number;
      time: number;
    }> = [];

    for (let i = lookback; i < rsiData.length - lookback; i++) {
      const current = rsiData[i];
      if (!current) continue;

      let isPeak = true;
      let isTrough = true;

      // Check if current point is a peak
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j === i) continue;
        const compare = rsiData[j];
        if (!compare) continue;

        if (current.rsi <= compare.rsi) {
          isPeak = false;
        }
        if (current.rsi >= compare.rsi) {
          isTrough = false;
        }
      }

      if (isPeak) {
        peaks.push({
          index: i,
          rsi: current.rsi,
          price: current.close,
          time: current.openTime,
        });
      }

      if (isTrough) {
        troughs.push({
          index: i,
          rsi: current.rsi,
          price: current.close,
          time: current.openTime,
        });
      }
    }

    return { peaks, troughs };
  }

  /**
   * Detect RSI divergence
   */
  detectRSIDivergence(
    symbol: string,
    timeframe: string,
    klineData: KlineData[],
    currentPrice: number
  ): RSIAlert | null {
    if (
      klineData.length <
      this.config.rsiPeriod + this.config.rsiDivergenceLookback
    ) {
      return null;
    }

    this.initializeTracker(symbol, timeframe);
    const tracker = this.divergenceTracker[symbol]?.[timeframe];
    if (!tracker) return null;

    // Calculate RSI values
    const rsiValues = this.calculateRSI(klineData, this.config.rsiPeriod);
    if (rsiValues.length === 0) return null;

    // Update tracker with RSI data
    this.updateTrackerWithRSIData(symbol, timeframe, klineData, rsiValues);

    // Get recent RSI data for divergence analysis
    const recentRSIData = tracker.rsiData.slice(
      -this.config.rsiDivergenceLookback
    );
    if (recentRSIData.length < this.config.rsiDivergenceLookback) return null;

    // Find peaks and troughs
    const { peaks, troughs } = this.findRSIPeaksAndTroughs(recentRSIData);

    // Check for divergence patterns
    const divergence = this.checkRSIDivergencePattern(peaks, troughs);
    if (!divergence) return null;

    // Check if we already sent an alert for this pattern recently (within 2 hours)
    const now = Date.now();
    const lastAlertTime = tracker.lastAlertTime || 0;
    const twoHours = 2 * 60 * 60 * 1000;

    if (now - lastAlertTime < twoHours) {
      return null; // Skip duplicate alert
    }

    // Update last alert time
    tracker.lastAlertTime = now;
    this.saveDivergenceTracker();

    const currentRSI = rsiValues[rsiValues.length - 1];
    if (currentRSI === undefined) return null;

    return {
      type: "rsi_divergence",
      symbol,
      timeframe,
      timestamp: now,
      currentPrice,
      rsiValue: currentRSI,
      divergenceType: divergence.type,
      divergenceData: {
        priceHigh: divergence.priceHigh,
        priceLow: divergence.priceLow,
        rsiHigh: divergence.rsiHigh,
        rsiLow: divergence.rsiLow,
        priceChange: divergence.priceChange,
        rsiChange: divergence.rsiChange,
        lookbackPeriod: this.config.rsiDivergenceLookback,
      },
    };
  }

  /**
   * Check for RSI divergence patterns
   */
  private checkRSIDivergencePattern(
    peaks: Array<{ index: number; rsi: number; price: number; time: number }>,
    troughs: Array<{ index: number; rsi: number; price: number; time: number }>
  ): {
    type: "bullish" | "bearish";
    priceHigh: number;
    priceLow: number;
    rsiHigh: number;
    rsiLow: number;
    priceChange: number;
    rsiChange: number;
  } | null {
    // Check for bearish divergence (price makes higher high, RSI makes lower high)
    if (peaks.length >= 2) {
      const latestPeak = peaks[peaks.length - 1];
      const previousPeak = peaks[peaks.length - 2];

      if (
        latestPeak &&
        previousPeak &&
        latestPeak.price > previousPeak.price &&
        latestPeak.rsi < previousPeak.rsi
      ) {
        const priceChange =
          ((latestPeak.price - previousPeak.price) / previousPeak.price) * 100;
        const rsiChange =
          ((latestPeak.rsi - previousPeak.rsi) / previousPeak.rsi) * 100;

        return {
          type: "bearish",
          priceHigh: latestPeak.price,
          priceLow: previousPeak.price,
          rsiHigh: previousPeak.rsi,
          rsiLow: latestPeak.rsi,
          priceChange,
          rsiChange,
        };
      }
    }

    // Check for bullish divergence (price makes lower low, RSI makes higher low)
    if (troughs.length >= 2) {
      const latestTrough = troughs[troughs.length - 1];
      const previousTrough = troughs[troughs.length - 2];

      if (
        latestTrough &&
        previousTrough &&
        latestTrough.price < previousTrough.price &&
        latestTrough.rsi > previousTrough.rsi
      ) {
        const priceChange =
          ((latestTrough.price - previousTrough.price) / previousTrough.price) *
          100;
        const rsiChange =
          ((latestTrough.rsi - previousTrough.rsi) / previousTrough.rsi) * 100;

        return {
          type: "bullish",
          priceHigh: previousTrough.price,
          priceLow: latestTrough.price,
          rsiHigh: latestTrough.rsi,
          rsiLow: previousTrough.rsi,
          priceChange,
          rsiChange,
        };
      }
    }

    return null;
  }

  /**
   * Update tracker with RSI data
   */
  private updateTrackerWithRSIData(
    symbol: string,
    timeframe: string,
    klineData: KlineData[],
    rsiValues: number[]
  ): void {
    const tracker = this.divergenceTracker[symbol]?.[timeframe];
    if (!tracker) return;

    // Calculate the offset for RSI values (since RSI calculation starts after period)
    const rsiOffset = this.config.rsiPeriod;

    // Update RSI data
    for (let i = 0; i < rsiValues.length; i++) {
      const candleIndex = i + rsiOffset;
      const candle = klineData[candleIndex];
      if (!candle) continue;

      const existingIndex = tracker.rsiData.findIndex(
        (r) => r.openTime === candle.openTime
      );

      if (existingIndex === -1) {
        // Add new RSI data point
        const rsiValue = rsiValues[i];
        if (rsiValue !== undefined) {
          tracker.rsiData.push({
            openTime: candle.openTime,
            close: parseFloat(candle.close),
            rsi: rsiValue,
            isClosed: true,
          });
        }
      } else {
        // Update existing RSI data point
        const rsiValue = rsiValues[i];
        if (rsiValue !== undefined) {
          tracker.rsiData[existingIndex] = {
            openTime: candle.openTime,
            close: parseFloat(candle.close),
            rsi: rsiValue,
            isClosed: true,
          };
        }
      }
    }

    // Keep only recent RSI data (last 50 to avoid memory issues)
    if (tracker.rsiData.length > 50) {
      tracker.rsiData = tracker.rsiData.slice(-50);
    }
  }

  /**
   * Get divergence tracker status
   */
  getDivergenceTrackerStatus(): RSIDivergenceTracker {
    return JSON.parse(JSON.stringify(this.divergenceTracker));
  }

  /**
   * Clear divergence tracker
   */
  clearDivergenceTracker(): void {
    this.divergenceTracker = {};
    this.saveDivergenceTracker();
    console.log("🗑️ RSI divergence tracker cleared");
  }
}
