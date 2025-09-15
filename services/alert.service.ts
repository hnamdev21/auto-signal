import fs from "fs";
import path from "path";
import {
  AlertConfig,
  VolumeAlert,
  DivergenceTracker,
  MultiPairMarketData,
  KlineData,
} from "../types/market.model";

export class AlertService {
  private config: AlertConfig;
  private divergenceTracker: DivergenceTracker = {};
  private readonly divergenceTrackerFile: string;

  constructor(config: AlertConfig) {
    this.config = config;
    this.divergenceTrackerFile = path.join(
      process.cwd(),
      "divergence-tracker.json"
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
        console.log("📁 Loaded divergence tracker from file");
      }
    } catch (error) {
      console.error("❌ Error loading divergence tracker:", error);
      this.divergenceTracker = {};
    }
  }

  /**
   * Save divergence tracker to JSON file
   */
  private saveDivergenceTracker(): void {
    try {
      fs.writeFileSync(
        this.divergenceTrackerFile,
        JSON.stringify(this.divergenceTracker, null, 2)
      );
    } catch (error) {
      console.error("❌ Error saving divergence tracker:", error);
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
        candles: [],
      };
    }
  }

  /**
   * Calculate average volume from recent candles
   */
  private calculateAverageVolume(
    klineData: KlineData[],
    period: number = 20
  ): number {
    if (klineData.length < period) {
      return 0;
    }

    const recentCandles = klineData.slice(-period);
    const totalVolume = recentCandles.reduce((sum, candle) => {
      return sum + parseFloat(candle.volume);
    }, 0);

    return totalVolume / period;
  }

  /**
   * Detect volume spike (1.5x average volume)
   */
  detectVolumeSpike(
    symbol: string,
    timeframe: string,
    klineData: KlineData[],
    currentPrice: number
  ): VolumeAlert | null {
    if (klineData.length < 2) return null;

    const latestCandle = klineData[klineData.length - 1];
    if (!latestCandle) return null;

    const currentVolume = parseFloat(latestCandle.volume);
    const averageVolume = this.calculateAverageVolume(klineData.slice(0, -1)); // Exclude current candle

    if (averageVolume === 0) return null;

    const spikeRatio = currentVolume / averageVolume;

    if (spikeRatio >= this.config.volumeSpikeThreshold) {
      return {
        type: "spike",
        symbol,
        timeframe,
        timestamp: Date.now(),
        currentPrice,
        volume: currentVolume,
        averageVolume,
        spikeRatio,
      };
    }

    return null;
  }

  /**
   * Detect volume divergence (price up, volume down for 3+ consecutive candles)
   */
  detectVolumeDivergence(
    symbol: string,
    timeframe: string,
    klineData: KlineData[],
    currentPrice: number
  ): VolumeAlert | null {
    if (klineData.length < this.config.divergenceCandleCount) return null;

    this.initializeTracker(symbol, timeframe);
    const tracker = this.divergenceTracker[symbol]?.[timeframe];
    if (!tracker) return null;

    // Get the last few closed candles (exclude the current one)
    const closedCandles = klineData.slice(
      -this.config.divergenceCandleCount - 1,
      -1
    );

    if (closedCandles.length < this.config.divergenceCandleCount) return null;

    // Update tracker with latest closed candles
    this.updateTrackerWithClosedCandles(symbol, timeframe, closedCandles);

    // Check for divergence pattern
    const divergenceCandles = tracker.candles.slice(
      -this.config.divergenceCandleCount
    );

    if (divergenceCandles.length < this.config.divergenceCandleCount)
      return null;

    // Check if all candles are closed
    const allClosed = divergenceCandles.every((candle) => candle.isClosed);
    if (!allClosed) return null;

    // Check for divergence pattern: price increasing, volume decreasing
    const isDivergence = this.checkDivergencePattern(divergenceCandles);

    if (isDivergence) {
      // Check if we already sent an alert for this pattern recently (within 1 hour)
      const now = Date.now();
      const lastAlertTime = tracker.lastAlertTime || 0;
      const oneHour = 60 * 60 * 1000;

      if (now - lastAlertTime < oneHour) {
        return null; // Skip duplicate alert
      }

      // Update last alert time
      tracker.lastAlertTime = now;
      this.saveDivergenceTracker();

      const firstCandle = divergenceCandles[0];
      const lastCandle = divergenceCandles[divergenceCandles.length - 1];

      if (!firstCandle || !lastCandle) return null;

      const priceChange =
        ((lastCandle.close - firstCandle.close) / firstCandle.close) * 100;
      const volumeChange =
        ((lastCandle.volume - firstCandle.volume) / firstCandle.volume) * 100;

      return {
        type: "divergence",
        symbol,
        timeframe,
        timestamp: now,
        currentPrice,
        volume: lastCandle.volume,
        averageVolume: this.calculateAverageVolume(klineData.slice(0, -1)),
        divergenceData: {
          candleCount: divergenceCandles.length,
          priceChange,
          volumeChange,
          candles: divergenceCandles.map((candle) => ({
            openTime: candle.openTime,
            close: candle.close,
            volume: candle.volume,
          })),
        },
      };
    }

    return null;
  }

  /**
   * Update tracker with closed candles
   */
  private updateTrackerWithClosedCandles(
    symbol: string,
    timeframe: string,
    closedCandles: KlineData[]
  ): void {
    const tracker = this.divergenceTracker[symbol]?.[timeframe];
    if (!tracker) return;

    // Add new closed candles to tracker
    closedCandles.forEach((candle) => {
      const existingIndex = tracker.candles.findIndex(
        (c) => c.openTime === candle.openTime
      );

      if (existingIndex === -1) {
        // Add new candle
        tracker.candles.push({
          openTime: candle.openTime,
          close: parseFloat(candle.close),
          volume: parseFloat(candle.volume),
          isClosed: true,
        });
      } else {
        // Update existing candle
        tracker.candles[existingIndex] = {
          openTime: candle.openTime,
          close: parseFloat(candle.close),
          volume: parseFloat(candle.volume),
          isClosed: true,
        };
      }
    });

    // Keep only recent candles (last 10 to avoid memory issues)
    if (tracker.candles.length > 10) {
      tracker.candles = tracker.candles.slice(-10);
    }
  }

  /**
   * Check if candles show divergence pattern
   */
  private checkDivergencePattern(
    candles: Array<{
      openTime: number;
      close: number;
      volume: number;
      isClosed: boolean;
    }>
  ): boolean {
    if (candles.length < 3) return false;

    // Check if price is generally increasing
    let priceIncreasing = true;
    for (let i = 1; i < candles.length; i++) {
      const currentCandle = candles[i];
      const previousCandle = candles[i - 1];
      if (!currentCandle || !previousCandle) {
        priceIncreasing = false;
        break;
      }
      if (currentCandle.close <= previousCandle.close) {
        priceIncreasing = false;
        break;
      }
    }

    // Check if volume is generally decreasing
    let volumeDecreasing = true;
    for (let i = 1; i < candles.length; i++) {
      const currentCandle = candles[i];
      const previousCandle = candles[i - 1];
      if (!currentCandle || !previousCandle) {
        volumeDecreasing = false;
        break;
      }
      if (currentCandle.volume >= previousCandle.volume) {
        volumeDecreasing = false;
        break;
      }
    }

    return priceIncreasing && volumeDecreasing;
  }

  /**
   * Process market data for all pairs and timeframes
   */
  processMarketData(marketData: MultiPairMarketData): VolumeAlert[] {
    const alerts: VolumeAlert[] = [];

    for (const symbol of this.config.pairs) {
      for (const timeframe of this.config.timeframes) {
        const data = marketData[symbol]?.[timeframe];
        if (!data || !data.klineData.length) continue;

        // Check for volume spike
        const spikeAlert = this.detectVolumeSpike(
          symbol,
          timeframe,
          data.klineData,
          data.currentPrice
        );
        if (spikeAlert) {
          alerts.push(spikeAlert);
        }

        // Check for volume divergence
        const divergenceAlert = this.detectVolumeDivergence(
          symbol,
          timeframe,
          data.klineData,
          data.currentPrice
        );
        if (divergenceAlert) {
          alerts.push(divergenceAlert);
        }
      }
    }

    return alerts;
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("📝 Alert service config updated:", this.config);
  }

  /**
   * Get divergence tracker status
   */
  getDivergenceTrackerStatus(): DivergenceTracker {
    return JSON.parse(JSON.stringify(this.divergenceTracker));
  }

  /**
   * Clear divergence tracker
   */
  clearDivergenceTracker(): void {
    this.divergenceTracker = {};
    this.saveDivergenceTracker();
    console.log("🗑️ Divergence tracker cleared");
  }
}
