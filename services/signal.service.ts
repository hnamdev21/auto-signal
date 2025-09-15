import {
  MarketData,
  TradingSignal,
  DivergenceConfig,
  DivergenceSignal,
} from "../types/market.model";
import { calculateRSI } from "../utils/rsi.utils";
import {
  detectRSIDivergence,
  getDefaultDivergenceConfig,
} from "../utils/divergence.utils";

export class SignalService {
  private divergenceConfig: DivergenceConfig;
  private lastDivergenceSignal: DivergenceSignal | null = null;
  private signalCooldown: number = 5 * 60 * 1000; // 5 minutes cooldown between signals

  constructor(divergenceConfig?: Partial<DivergenceConfig>) {
    this.divergenceConfig = {
      ...getDefaultDivergenceConfig(),
      ...divergenceConfig,
    };
  }

  /**
   * Generate trading signal from market data
   * @param marketData Current market data
   * @returns Trading signal with potential divergence
   */
  generateTradingSignal(marketData: MarketData): TradingSignal | null {
    // Calculate current RSI
    const rsiData = calculateRSI(marketData.klineData, 14);

    // Check for divergence signals
    const divergenceSignal = this.checkForDivergenceSignal(marketData);

    // Always return a signal, but only with divergence if detected
    return {
      symbol: marketData.symbol,
      currentPrice: marketData.currentPrice,
      rsi: rsiData.rsi,
      divergenceSignal,
      timestamp: Date.now(),
      timeframe: "1m",
    };
  }

  /**
   * Check for new divergence signals with cooldown
   * @param marketData Current market data
   * @returns Divergence signal if found and not in cooldown
   */
  private checkForDivergenceSignal(
    marketData: MarketData
  ): DivergenceSignal | null {
    // Check cooldown period
    if (this.lastDivergenceSignal) {
      const timeSinceLastSignal =
        Date.now() - this.lastDivergenceSignal.timestamp;
      if (timeSinceLastSignal < this.signalCooldown) {
        return null;
      }
    }

    // Detect divergence
    const divergenceSignal = detectRSIDivergence(
      marketData.klineData,
      this.divergenceConfig
    );

    if (divergenceSignal) {
      // Check if this is a new signal (different type or significant price difference)
      if (
        !this.lastDivergenceSignal ||
        this.lastDivergenceSignal.type !== divergenceSignal.type ||
        Math.abs(this.lastDivergenceSignal.price - divergenceSignal.price) >
          divergenceSignal.price * 0.01 // 1% price difference
      ) {
        this.lastDivergenceSignal = divergenceSignal;
        return divergenceSignal;
      }
    }

    return null;
  }

  /**
   * Update divergence configuration
   * @param newConfig New configuration
   */
  updateDivergenceConfig(newConfig: Partial<DivergenceConfig>): void {
    this.divergenceConfig = {
      ...this.divergenceConfig,
      ...newConfig,
    };
  }

  /**
   * Get current divergence configuration
   * @returns Current configuration
   */
  getDivergenceConfig(): DivergenceConfig {
    return { ...this.divergenceConfig };
  }

  /**
   * Set signal cooldown period
   * @param cooldownMs Cooldown in milliseconds
   */
  setSignalCooldown(cooldownMs: number): void {
    this.signalCooldown = cooldownMs;
  }

  /**
   * Get signal strength description
   * @param confidence Confidence score
   * @returns Strength description
   */
  getSignalStrength(confidence: number): string {
    if (confidence >= 80) return "🔥 STRONG";
    if (confidence >= 60) return "⚡ MEDIUM";
    if (confidence >= 40) return "💡 WEAK";
    return "❓ VERY WEAK";
  }

  /**
   * Format divergence signal for display
   * @param signal Divergence signal
   * @returns Formatted string
   */
  formatDivergenceSignal(signal: DivergenceSignal): string {
    const strength = this.getSignalStrength(signal.confidence);
    const type = signal.type === "BULLISH" ? "🟢 BULLISH" : "🔴 BEARISH";

    return `${type} DIVERGENCE ${strength}`;
  }

  /**
   * Check if signal is actionable (high confidence)
   * @param signal Divergence signal
   * @returns True if signal is actionable
   */
  isActionableSignal(signal: DivergenceSignal): boolean {
    return signal.confidence >= 50;
  }

  /**
   * Reset signal history (useful for testing)
   */
  resetSignalHistory(): void {
    this.lastDivergenceSignal = null;
  }
}
