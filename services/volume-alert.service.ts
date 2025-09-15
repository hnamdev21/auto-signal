import {
  MarketData,
  VolumeSpikeSignal,
  VolumeAlert,
  VolumeData,
} from "../types/market.model";
import {
  calculateVolumeData,
  detectVolumeSpike,
  getVolumeTrend,
  calculateVWAP,
  getVolumeProfile,
} from "../utils/volume.utils";

export class VolumeAlertService {
  private lastVolumeSignal: VolumeSpikeSignal | null = null;
  private signalCooldown: number = 2 * 60 * 1000; // 2 minutes cooldown between volume alerts
  private config: {
    volumePeriod: number;
    lowThreshold: number;
    mediumThreshold: number;
    highThreshold: number;
    extremeThreshold: number;
  };

  constructor(config?: {
    volumePeriod?: number;
    lowThreshold?: number;
    mediumThreshold?: number;
    highThreshold?: number;
    extremeThreshold?: number;
  }) {
    this.config = {
      volumePeriod: config?.volumePeriod || 20,
      lowThreshold: config?.lowThreshold || 1.5,
      mediumThreshold: config?.mediumThreshold || 2.0,
      highThreshold: config?.highThreshold || 3.0,
      extremeThreshold: config?.extremeThreshold || 5.0,
    };
  }

  /**
   * Generate volume alert from market data
   * @param marketData Current market data
   * @returns Volume alert data
   */
  generateVolumeAlert(marketData: MarketData): VolumeAlert {
    // Calculate volume data
    const volumeData = calculateVolumeData(
      marketData.klineData,
      this.config.volumePeriod
    );

    // Check for volume spike
    const volumeSpike = this.checkForVolumeSpike(marketData, volumeData);

    return {
      symbol: marketData.symbol,
      currentPrice: marketData.currentPrice,
      volumeSpike,
      timestamp: Date.now(),
      timeframe: "1m",
    };
  }

  /**
   * Check for new volume spike signals with cooldown
   * @param marketData Current market data
   * @param volumeData Volume data
   * @returns Volume spike signal if found and not in cooldown
   */
  private checkForVolumeSpike(
    marketData: MarketData,
    volumeData: VolumeData | null
  ): VolumeSpikeSignal | null {
    if (!volumeData) {
      return null;
    }

    // Check cooldown period
    if (this.lastVolumeSignal) {
      const timeSinceLastSignal = Date.now() - this.lastVolumeSignal.timestamp;
      if (timeSinceLastSignal < this.signalCooldown) {
        return null;
      }
    }

    // Detect volume spike
    const volumeSpike = detectVolumeSpike(volumeData, marketData.currentPrice, {
      low: this.config.lowThreshold,
      medium: this.config.mediumThreshold,
      high: this.config.highThreshold,
      extreme: this.config.extremeThreshold,
    });

    if (volumeSpike) {
      // Check if this is a new signal (different severity or significant volume difference)
      if (
        !this.lastVolumeSignal ||
        this.lastVolumeSignal.severity !== volumeSpike.severity ||
        Math.abs(this.lastVolumeSignal.volumeRatio - volumeSpike.volumeRatio) >
          0.5 // 0.5x difference
      ) {
        this.lastVolumeSignal = volumeSpike;
        return volumeSpike;
      }
    }

    return null;
  }

  /**
   * Get comprehensive volume analysis
   * @param marketData Current market data
   * @returns Volume analysis data
   */
  getVolumeAnalysis(marketData: MarketData): {
    volumeData: VolumeData | null;
    volumeTrend: "INCREASING" | "DECREASING" | "STABLE";
    vwap: number | null;
    volumeProfile: {
      totalVolume: number;
      averageVolume: number;
      maxVolume: number;
      minVolume: number;
      volumeVolatility: number;
    };
    isAboveVWAP: boolean;
  } {
    const volumeData = calculateVolumeData(
      marketData.klineData,
      this.config.volumePeriod
    );
    const volumeTrend = getVolumeTrend(marketData.klineData, 5);
    const vwap = calculateVWAP(marketData.klineData, this.config.volumePeriod);
    const volumeProfile = getVolumeProfile(marketData.klineData);
    const isAboveVWAP = vwap ? marketData.currentPrice > vwap : false;

    return {
      volumeData,
      volumeTrend,
      vwap,
      volumeProfile,
      isAboveVWAP,
    };
  }

  /**
   * Update volume configuration
   * @param newConfig New configuration
   */
  updateConfig(
    newConfig: Partial<{
      volumePeriod: number;
      lowThreshold: number;
      mediumThreshold: number;
      highThreshold: number;
      extremeThreshold: number;
    }>
  ): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get current volume configuration
   * @returns Current configuration
   */
  getConfig(): {
    volumePeriod: number;
    lowThreshold: number;
    mediumThreshold: number;
    highThreshold: number;
    extremeThreshold: number;
  } {
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
   * Get volume spike severity emoji
   * @param severity Severity level
   * @returns Emoji representation
   */
  getSeverityEmoji(severity: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"): string {
    switch (severity) {
      case "LOW":
        return "📈";
      case "MEDIUM":
        return "⚡";
      case "HIGH":
        return "🔥";
      case "EXTREME":
        return "🚨";
      default:
        return "📊";
    }
  }

  /**
   * Format volume spike signal for display
   * @param signal Volume spike signal
   * @returns Formatted string
   */
  formatVolumeSpikeSignal(signal: VolumeSpikeSignal): string {
    const emoji = this.getSeverityEmoji(signal.severity);
    return `${emoji} ${signal.description}`;
  }

  /**
   * Check if volume spike is actionable
   * @param signal Volume spike signal
   * @returns True if signal is actionable
   */
  isActionableVolumeSpike(signal: VolumeSpikeSignal): boolean {
    return signal.severity === "HIGH" || signal.severity === "EXTREME";
  }

  /**
   * Get volume spike priority
   * @param signal Volume spike signal
   * @returns Priority level
   */
  getVolumeSpikePriority(
    signal: VolumeSpikeSignal
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    switch (signal.severity) {
      case "LOW":
        return "LOW";
      case "MEDIUM":
        return "MEDIUM";
      case "HIGH":
        return "HIGH";
      case "EXTREME":
        return "CRITICAL";
      default:
        return "LOW";
    }
  }

  /**
   * Get volume context information
   * @param marketData Current market data
   * @returns Volume context
   */
  getVolumeContext(marketData: MarketData): string {
    const analysis = this.getVolumeAnalysis(marketData);

    if (!analysis.volumeData) {
      return "📊 Volume data unavailable";
    }

    const { volumeData, volumeTrend, vwap, isAboveVWAP } = analysis;
    const trendEmoji =
      volumeTrend === "INCREASING"
        ? "📈"
        : volumeTrend === "DECREASING"
        ? "📉"
        : "➡️";
    const vwapEmoji = isAboveVWAP ? "🟢" : "🔴";

    return `📊 Volume: ${volumeData.volumeRatio.toFixed(
      1
    )}x avg | ${trendEmoji} ${volumeTrend} | VWAP: ${vwapEmoji} ${
      isAboveVWAP ? "Above" : "Below"
    }`;
  }

  /**
   * Reset signal history (useful for testing)
   */
  resetSignalHistory(): void {
    this.lastVolumeSignal = null;
  }
}
