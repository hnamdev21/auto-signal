import fs from "fs";
import path from "path";
import {
  ScalpingConfig,
  ScalpingAlert,
  ScalpingTracker,
  KlineData,
} from "../types/market.model";

export class ScalpingService {
  private config: ScalpingConfig;
  private tracker: ScalpingTracker = {};
  private readonly trackerFile: string;

  constructor(config: ScalpingConfig) {
    this.config = config;
    this.trackerFile = path.join(process.cwd(), "/data/scalping-tracker.json");
    this.loadTracker();
  }

  /**
   * Load tracker from JSON file
   */
  private loadTracker(): void {
    try {
      if (fs.existsSync(this.trackerFile)) {
        const data = fs.readFileSync(this.trackerFile, "utf8");
        this.tracker = JSON.parse(data);
        console.log("📁 Loaded scalping tracker from file");
      }
    } catch (error) {
      console.error("❌ Error loading scalping tracker:", error);
      this.tracker = {};
    }
  }

  /**
   * Save tracker to JSON file
   */
  private saveTracker(): void {
    try {
      const dataDir = path.dirname(this.trackerFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(this.trackerFile, JSON.stringify(this.tracker, null, 2));
    } catch (error) {
      console.error("❌ Error saving scalping tracker:", error);
    }
  }

  /**
   * Initialize tracker for a symbol-timeframe combination
   */
  private initializeTracker(symbol: string, timeframe: string): void {
    if (!this.tracker[symbol]) {
      this.tracker[symbol] = {};
    }
    if (!this.tracker[symbol][timeframe]) {
      this.tracker[symbol][timeframe] = {
        emaData: [],
        stochasticData: [],
        bollingerData: [],
      };
    }
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(prices: number[], period: number): number[] {
    if (prices.length < period) return [];

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      const price = prices[i];
      if (price !== undefined) {
        sum += price;
      }
    }
    ema[period - 1] = sum / period;

    // Calculate subsequent EMAs
    for (let i = period; i < prices.length; i++) {
      const currentPrice = prices[i];
      const previousEma = ema[i - 1];
      if (currentPrice !== undefined && previousEma !== undefined) {
        ema[i] = currentPrice * multiplier + previousEma * (1 - multiplier);
      }
    }

    return ema.slice(period - 1);
  }

  /**
   * Calculate Stochastic Oscillator
   */
  private calculateStochastic(
    klineData: KlineData[],
    kPeriod: number = 14,
    dPeriod: number = 3
  ): { k: number[]; d: number[] } {
    if (klineData.length < kPeriod) return { k: [], d: [] };

    const kValues: number[] = [];
    const dValues: number[] = [];

    for (let i = kPeriod - 1; i < klineData.length; i++) {
      const periodData = klineData.slice(i - kPeriod + 1, i + 1);

      let highestHigh = 0;
      let lowestLow = Infinity;
      const lastCandle = periodData[periodData.length - 1];
      if (!lastCandle) continue;
      const currentClose = parseFloat(lastCandle.close);

      periodData.forEach((candle) => {
        const high = parseFloat(candle.high);
        const low = parseFloat(candle.low);
        if (high > highestHigh) highestHigh = high;
        if (low < lowestLow) lowestLow = low;
      });

      if (highestHigh === lowestLow) {
        kValues.push(50); // Neutral value when no range
      } else {
        const k =
          ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
        kValues.push(k);
      }
    }

    // Calculate %D (SMA of %K)
    for (let i = dPeriod - 1; i < kValues.length; i++) {
      const dSum = kValues
        .slice(i - dPeriod + 1, i + 1)
        .reduce((sum, val) => sum + val, 0);
      dValues.push(dSum / dPeriod);
    }

    return { k: kValues, d: dValues };
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: number[]; middle: number[]; lower: number[] } {
    if (prices.length < period) return { upper: [], middle: [], lower: [] };

    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const periodPrices = prices.slice(i - period + 1, i + 1);

      // Calculate SMA (middle band)
      const sma = periodPrices.reduce((sum, price) => sum + price, 0) / period;
      middle.push(sma);

      // Calculate standard deviation
      const variance =
        periodPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) /
        period;
      const standardDeviation = Math.sqrt(variance);

      // Calculate upper and lower bands
      upper.push(sma + stdDev * standardDeviation);
      lower.push(sma - stdDev * standardDeviation);
    }

    return { upper, middle, lower };
  }

  /**
   * Calculate average volume
   */
  private calculateAverageVolume(
    klineData: KlineData[],
    period: number = 20
  ): number {
    if (klineData.length < period) return 0;

    const recentCandles = klineData.slice(-period);
    const totalVolume = recentCandles.reduce((sum, candle) => {
      return sum + parseFloat(candle.volume);
    }, 0);

    return totalVolume / period;
  }

  /**
   * Detect EMA Crossover signals
   */
  private detectEMACrossover(
    symbol: string,
    timeframe: string,
    klineData: KlineData[],
    currentPrice: number
  ): ScalpingAlert | null {
    if (klineData.length < this.config.emaSlowPeriod) return null;

    const closes = klineData.map((candle) => parseFloat(candle.close));
    const ema9 = this.calculateEMA(closes, this.config.emaFastPeriod);
    const ema21 = this.calculateEMA(closes, this.config.emaSlowPeriod);

    if (ema9.length < 2 || ema21.length < 2) return null;

    const currentEma9 = ema9[ema9.length - 1];
    const currentEma21 = ema21[ema21.length - 1];
    const previousEma9 = ema9[ema9.length - 2];
    const previousEma21 = ema21[ema21.length - 2];

    if (
      currentEma9 === undefined ||
      currentEma21 === undefined ||
      previousEma9 === undefined ||
      previousEma21 === undefined
    ) {
      return null;
    }

    let signal: "buy" | "sell" | null = null;
    let confidence = 0;

    // Bullish crossover: EMA 9 crosses above EMA 21
    if (previousEma9 <= previousEma21 && currentEma9 > currentEma21) {
      signal = "buy";
      confidence = Math.min(
        90,
        60 + ((currentEma9 - currentEma21) / currentEma21) * 1000
      );
    }
    // Bearish crossover: EMA 9 crosses below EMA 21
    else if (previousEma9 >= previousEma21 && currentEma9 < currentEma21) {
      signal = "sell";
      confidence = Math.min(
        90,
        60 + ((currentEma21 - currentEma9) / currentEma9) * 1000
      );
    }

    if (signal && confidence >= this.config.minConfidence) {
      return {
        type: "ema_crossover",
        symbol,
        timeframe,
        timestamp: Date.now(),
        currentPrice,
        signal,
        confidence,
        indicatorData: {
          ema9: currentEma9,
          ema21: currentEma21,
        },
      };
    }

    return null;
  }

  /**
   * Detect Stochastic signals
   */
  private detectStochasticSignal(
    symbol: string,
    timeframe: string,
    klineData: KlineData[],
    currentPrice: number
  ): ScalpingAlert | null {
    if (klineData.length < this.config.stochasticKPeriod) return null;

    const { k, d } = this.calculateStochastic(
      klineData,
      this.config.stochasticKPeriod,
      this.config.stochasticDPeriod
    );

    if (k.length < 2 || d.length < 2) return null;

    const currentK = k[k.length - 1];
    const currentD = d[d.length - 1];
    const previousK = k[k.length - 2];
    const previousD = d[d.length - 2];

    if (
      currentK === undefined ||
      currentD === undefined ||
      previousK === undefined ||
      previousD === undefined
    ) {
      return null;
    }

    let signal: "buy" | "sell" | null = null;
    let confidence = 0;

    // Bullish signal: K crosses above D from oversold
    if (
      previousK <= previousD &&
      currentK > currentD &&
      currentK < this.config.stochasticOversold + 10
    ) {
      signal = "buy";
      confidence = Math.min(
        85,
        50 + (this.config.stochasticOversold - currentK) * 0.5
      );
    }
    // Bearish signal: K crosses below D from overbought
    else if (
      previousK >= previousD &&
      currentK < currentD &&
      currentK > this.config.stochasticOverbought - 10
    ) {
      signal = "sell";
      confidence = Math.min(
        85,
        50 + (currentK - this.config.stochasticOverbought) * 0.5
      );
    }

    if (signal && confidence >= this.config.minConfidence) {
      return {
        type: "stochastic_signal",
        symbol,
        timeframe,
        timestamp: Date.now(),
        currentPrice,
        signal,
        confidence,
        indicatorData: {
          stochasticK: currentK,
          stochasticD: currentD,
        },
      };
    }

    return null;
  }

  /**
   * Detect Bollinger Bands squeeze and breakout
   */
  private detectBollingerSignal(
    symbol: string,
    timeframe: string,
    klineData: KlineData[],
    currentPrice: number
  ): ScalpingAlert | null {
    if (klineData.length < this.config.bollingerPeriod) return null;

    const closes = klineData.map((candle) => parseFloat(candle.close));
    const { upper, middle, lower } = this.calculateBollingerBands(
      closes,
      this.config.bollingerPeriod,
      this.config.bollingerStdDev
    );

    if (upper.length < 1) return null;

    const currentUpper = upper[upper.length - 1];
    const currentMiddle = middle[middle.length - 1];
    const currentLower = lower[lower.length - 1];

    if (
      currentUpper === undefined ||
      currentMiddle === undefined ||
      currentLower === undefined
    ) {
      return null;
    }

    let signal: "buy" | "sell" | null = null;
    let confidence = 0;

    // Price touches lower band (potential bounce)
    if (currentPrice <= currentLower * 1.001) {
      signal = "buy";
      confidence = 75;
    }
    // Price touches upper band (potential rejection)
    else if (currentPrice >= currentUpper * 0.999) {
      signal = "sell";
      confidence = 75;
    }
    // Price breaks above upper band (strong bullish momentum)
    else if (currentPrice > currentUpper) {
      signal = "buy";
      confidence = 80;
    }
    // Price breaks below lower band (strong bearish momentum)
    else if (currentPrice < currentLower) {
      signal = "sell";
      confidence = 80;
    }

    if (signal && confidence >= this.config.minConfidence) {
      return {
        type: "bollinger_squeeze",
        symbol,
        timeframe,
        timestamp: Date.now(),
        currentPrice,
        signal,
        confidence,
        indicatorData: {
          bollingerUpper: currentUpper,
          bollingerMiddle: currentMiddle,
          bollingerLower: currentLower,
        },
      };
    }

    return null;
  }

  /**
   * Detect volume spike for scalping
   */
  private detectVolumeSpike(
    symbol: string,
    timeframe: string,
    klineData: KlineData[],
    currentPrice: number
  ): ScalpingAlert | null {
    if (klineData.length < 2) return null;

    const latestCandle = klineData[klineData.length - 1];
    if (!latestCandle) return null;

    const currentVolume = parseFloat(latestCandle.volume);
    const averageVolume = this.calculateAverageVolume(
      klineData.slice(0, -1),
      this.config.volumePeriod
    );

    if (averageVolume === 0) return null;

    const spikeRatio = currentVolume / averageVolume;

    if (spikeRatio >= this.config.volumeSpikeThreshold) {
      return {
        type: "volume_spike",
        symbol,
        timeframe,
        timestamp: Date.now(),
        currentPrice,
        signal: "buy", // Volume spike often indicates momentum
        confidence: Math.min(90, 60 + (spikeRatio - 1) * 10),
        indicatorData: {
          volume: currentVolume,
          averageVolume,
        },
      };
    }

    return null;
  }

  /**
   * Check if alert should be sent (cooldown check)
   */
  private shouldSendAlert(symbol: string, timeframe: string): boolean {
    const tracker = this.tracker[symbol]?.[timeframe];
    if (!tracker) return true;

    const now = Date.now();
    const lastAlertTime = tracker.lastAlertTime || 0;

    return now - lastAlertTime >= this.config.alertCooldown;
  }

  /**
   * Update last alert time
   */
  private updateLastAlertTime(symbol: string, timeframe: string): void {
    this.initializeTracker(symbol, timeframe);
    const tracker = this.tracker[symbol]?.[timeframe];
    if (tracker) {
      tracker.lastAlertTime = Date.now();
      this.saveTracker();
    }
  }

  /**
   * Process market data for scalping signals
   */
  processMarketData(
    symbol: string,
    timeframe: string,
    klineData: KlineData[],
    currentPrice: number
  ): ScalpingAlert[] {
    const alerts: ScalpingAlert[] = [];

    // Check cooldown
    if (!this.shouldSendAlert(symbol, timeframe)) {
      return alerts;
    }

    // Detect EMA crossover
    const emaAlert = this.detectEMACrossover(
      symbol,
      timeframe,
      klineData,
      currentPrice
    );
    if (emaAlert) {
      alerts.push(emaAlert);
      this.updateLastAlertTime(symbol, timeframe);
    }

    // Detect Stochastic signals
    const stochasticAlert = this.detectStochasticSignal(
      symbol,
      timeframe,
      klineData,
      currentPrice
    );
    if (stochasticAlert) {
      alerts.push(stochasticAlert);
      this.updateLastAlertTime(symbol, timeframe);
    }

    // Detect Bollinger Bands signals
    const bollingerAlert = this.detectBollingerSignal(
      symbol,
      timeframe,
      klineData,
      currentPrice
    );
    if (bollingerAlert) {
      alerts.push(bollingerAlert);
      this.updateLastAlertTime(symbol, timeframe);
    }

    // Detect volume spike
    const volumeAlert = this.detectVolumeSpike(
      symbol,
      timeframe,
      klineData,
      currentPrice
    );
    if (volumeAlert) {
      alerts.push(volumeAlert);
      this.updateLastAlertTime(symbol, timeframe);
    }

    return alerts;
  }

  /**
   * Get current configuration
   */
  getConfig(): ScalpingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ScalpingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("📝 Scalping service config updated:", this.config);
  }

  /**
   * Get tracker status
   */
  getTrackerStatus(): ScalpingTracker {
    return JSON.parse(JSON.stringify(this.tracker));
  }

  /**
   * Clear tracker
   */
  clearTracker(): void {
    this.tracker = {};
    this.saveTracker();
    console.log("🗑️ Scalping tracker cleared");
  }
}
