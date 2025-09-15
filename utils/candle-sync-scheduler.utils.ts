/**
 * Candle Synchronized Scheduler
 * Executes callback at the exact moment when a new candle opens
 * based on the specified timeframe
 */

export interface CandleSyncConfig {
  timeframe: string; // e.g., "1m", "5m", "15m", "1h", "4h", "1d"
  timezone?: string; // Default: "UTC"
}

export class CandleSyncScheduler {
  private config: CandleSyncConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private callback: (() => Promise<void>) | null = null;
  private isRunning: boolean = false;

  constructor(config: CandleSyncConfig) {
    this.config = {
      timezone: "UTC",
      ...config,
    };
  }

  /**
   * Start the candle-synchronized scheduler
   */
  start(callback: () => Promise<void>): void {
    if (this.isRunning) {
      console.log("⚠️ CandleSyncScheduler is already running");
      return;
    }

    this.callback = callback;
    this.isRunning = true;

    console.log(
      `🕐 Starting CandleSyncScheduler for ${this.config.timeframe} candles`
    );

    // Calculate next candle open time
    const nextCandleTime = this.getNextCandleOpenTime();
    const delay = nextCandleTime.getTime() - Date.now();

    console.log(`⏰ Next candle opens at: ${nextCandleTime.toISOString()}`);
    console.log(`⏱️ Waiting ${Math.round(delay / 1000)} seconds...`);

    // Set timeout for next candle
    this.intervalId = setTimeout(() => {
      this.executeAndScheduleNext();
    }, delay);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.callback = null;
    console.log("🛑 CandleSyncScheduler stopped");
  }

  /**
   * Execute callback and schedule next execution
   */
  private async executeAndScheduleNext(): Promise<void> {
    if (!this.callback) return;

    try {
      console.log(`🕐 Executing at candle open: ${new Date().toISOString()}`);
      await this.callback();
    } catch (error) {
      console.error("❌ Error in candle sync execution:", error);
    }

    // Schedule next execution
    if (this.isRunning) {
      const nextCandleTime = this.getNextCandleOpenTime();
      const delay = nextCandleTime.getTime() - Date.now();

      console.log(`⏰ Next candle opens at: ${nextCandleTime.toISOString()}`);
      console.log(`⏱️ Waiting ${Math.round(delay / 1000)} seconds...`);

      this.intervalId = setTimeout(() => {
        this.executeAndScheduleNext();
      }, delay);
    }
  }

  /**
   * Get the next candle open time based on timeframe
   */
  private getNextCandleOpenTime(): Date {
    const now = new Date();
    const timeframeMs = this.getTimeframeMs(this.config.timeframe);

    // Calculate the start of the current candle
    const currentCandleStart = this.getCandleStartTime(now, timeframeMs);

    // Next candle starts after current candle ends
    return new Date(currentCandleStart.getTime() + timeframeMs);
  }

  /**
   * Get the start time of the current candle
   */
  private getCandleStartTime(date: Date, timeframeMs: number): Date {
    const timestamp = date.getTime();

    if (timeframeMs >= 24 * 60 * 60 * 1000) {
      // Daily candles - start at 00:00 UTC
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      return dayStart;
    } else if (timeframeMs >= 60 * 60 * 1000) {
      // Hourly candles - start at the hour
      const hourStart = new Date(date);
      hourStart.setUTCMinutes(0, 0, 0);
      return hourStart;
    } else {
      // Minute candles - start at the minute
      const minuteStart = new Date(date);
      minuteStart.setUTCSeconds(0, 0);
      return minuteStart;
    }
  }

  /**
   * Convert timeframe string to milliseconds
   */
  private getTimeframeMs(timeframe: string): number {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe.slice(0, -1));

    switch (unit) {
      case "m": // minutes
        return value * 60 * 1000;
      case "h": // hours
        return value * 60 * 60 * 1000;
      case "d": // days
        return value * 24 * 60 * 60 * 1000;
      case "w": // weeks
        return value * 7 * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unsupported timeframe: ${timeframe}`);
    }
  }

  /**
   * Get seconds until next candle opens
   */
  getSecondsUntilNextCandle(): number {
    const nextCandleTime = this.getNextCandleOpenTime();
    const delay = nextCandleTime.getTime() - Date.now();
    return Math.max(0, Math.round(delay / 1000));
  }

  /**
   * Get current candle information
   */
  getCurrentCandleInfo(): {
    currentCandleStart: Date;
    currentCandleEnd: Date;
    nextCandleStart: Date;
    progressPercent: number;
  } {
    const now = new Date();
    const timeframeMs = this.getTimeframeMs(this.config.timeframe);

    const currentCandleStart = this.getCandleStartTime(now, timeframeMs);
    const currentCandleEnd = new Date(
      currentCandleStart.getTime() + timeframeMs
    );
    const nextCandleStart = new Date(currentCandleEnd.getTime());

    const progress =
      (now.getTime() - currentCandleStart.getTime()) / timeframeMs;
    const progressPercent = Math.min(100, Math.max(0, progress * 100));

    return {
      currentCandleStart,
      currentCandleEnd,
      nextCandleStart,
      progressPercent,
    };
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get configuration
   */
  getConfig(): CandleSyncConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (requires restart)
   */
  updateConfig(newConfig: Partial<CandleSyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`📝 CandleSyncScheduler config updated:`, this.config);
  }
}

/**
 * Utility function to get timeframe info
 */
export function getTimeframeInfo(timeframe: string): {
  milliseconds: number;
  description: string;
  isSupported: boolean;
} {
  const unit = timeframe.slice(-1);
  const value = parseInt(timeframe.slice(0, -1));

  const timeframes: { [key: string]: { ms: number; desc: string } } = {
    "1m": { ms: 60 * 1000, desc: "1 minute" },
    "3m": { ms: 3 * 60 * 1000, desc: "3 minutes" },
    "5m": { ms: 5 * 60 * 1000, desc: "5 minutes" },
    "15m": { ms: 15 * 60 * 1000, desc: "15 minutes" },
    "30m": { ms: 30 * 60 * 1000, desc: "30 minutes" },
    "1h": { ms: 60 * 60 * 1000, desc: "1 hour" },
    "2h": { ms: 2 * 60 * 60 * 1000, desc: "2 hours" },
    "4h": { ms: 4 * 60 * 60 * 1000, desc: "4 hours" },
    "6h": { ms: 6 * 60 * 60 * 1000, desc: "6 hours" },
    "8h": { ms: 8 * 60 * 60 * 1000, desc: "8 hours" },
    "12h": { ms: 12 * 60 * 60 * 1000, desc: "12 hours" },
    "1d": { ms: 24 * 60 * 60 * 1000, desc: "1 day" },
    "3d": { ms: 3 * 24 * 60 * 60 * 1000, desc: "3 days" },
    "1w": { ms: 7 * 24 * 60 * 60 * 1000, desc: "1 week" },
  };

  const info = timeframes[timeframe];

  return {
    milliseconds: info?.ms || 0,
    description: info?.desc || "Unknown",
    isSupported: !!info,
  };
}
