import {
  MarketData,
  MACDDivergenceSignal,
  MACDData,
} from "../types/market.model";
import { detectMACDDivergence, getCurrentMACD } from "../utils/macd.utils";

export class MACDSignalService {
  private lastMACDSignal: MACDDivergenceSignal | null = null;
  private signalCooldown: number = 5 * 60 * 1000; // 5 minutes cooldown between signals
  private config: { pivotLength: number; tpPercent: number; slPercent: number };

  constructor(config?: {
    pivotLength?: number;
    tpPercent?: number;
    slPercent?: number;
  }) {
    this.config = {
      pivotLength: config?.pivotLength || 2,
      tpPercent: config?.tpPercent || 2.0,
      slPercent: config?.slPercent || 1.0,
    };
  }

  /**
   * Generate MACD signal from market data
   * @param marketData Current market data
   * @returns MACD signal data
   */
  generateMACDSignal(marketData: MarketData): {
    macd: MACDData | null;
    divergenceSignal: MACDDivergenceSignal | null;
  } {
    // Get current MACD data
    const macd = getCurrentMACD(marketData.klineData);

    // Check for divergence signals
    const divergenceSignal = this.checkForMACDDivergenceSignal(marketData);

    return {
      macd,
      divergenceSignal,
    };
  }

  /**
   * Check for new MACD divergence signals with cooldown
   * @param marketData Current market data
   * @returns MACD divergence signal if found and not in cooldown
   */
  private checkForMACDDivergenceSignal(
    marketData: MarketData
  ): MACDDivergenceSignal | null {
    // Check cooldown period
    if (this.lastMACDSignal) {
      const timeSinceLastSignal = Date.now() - this.lastMACDSignal.timestamp;
      if (timeSinceLastSignal < this.signalCooldown) {
        return null;
      }
    }

    // Detect MACD divergence
    const divergenceSignal = detectMACDDivergence(
      marketData.klineData,
      this.config
    );

    if (divergenceSignal) {
      // Check if this is a new signal (different type or significant price difference)
      if (
        !this.lastMACDSignal ||
        this.lastMACDSignal.type !== divergenceSignal.type ||
        Math.abs(this.lastMACDSignal.price - divergenceSignal.price) >
          divergenceSignal.price * 0.01 // 1% price difference
      ) {
        this.lastMACDSignal = divergenceSignal;
        return divergenceSignal;
      }
    }

    return null;
  }

  /**
   * Update MACD configuration
   * @param newConfig New configuration
   */
  updateConfig(
    newConfig: Partial<{
      pivotLength: number;
      tpPercent: number;
      slPercent: number;
    }>
  ): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get current MACD configuration
   * @returns Current configuration
   */
  getConfig(): { pivotLength: number; tpPercent: number; slPercent: number } {
    return { ...this.config };
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
   * Format MACD divergence signal for display
   * @param signal MACD divergence signal
   * @returns Formatted string
   */
  formatMACDSignal(signal: MACDDivergenceSignal): string {
    const strength = this.getSignalStrength(signal.confidence);
    const type = signal.type === "BULLISH" ? "🟢 BULLISH" : "🔴 BEARISH";

    return `${type} MACD DIVERGENCE ${strength}`;
  }

  /**
   * Check if signal is actionable (high confidence)
   * @param signal MACD divergence signal
   * @returns True if signal is actionable
   */
  isActionableSignal(signal: MACDDivergenceSignal): boolean {
    return signal.confidence >= 50;
  }

  /**
   * Get MACD trend direction
   * @param macd Current MACD data
   * @returns Trend direction
   */
  getMACDTrend(macd: MACDData): "BULLISH" | "BEARISH" | "NEUTRAL" {
    if (macd.macd > macd.signal && macd.histogram > 0) {
      return "BULLISH";
    } else if (macd.macd < macd.signal && macd.histogram < 0) {
      return "BEARISH";
    } else {
      return "NEUTRAL";
    }
  }

  /**
   * Reset signal history (useful for testing)
   */
  resetSignalHistory(): void {
    this.lastMACDSignal = null;
  }
}
