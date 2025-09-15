import * as fs from "fs";
import * as path from "path";
import {
  SignalRecord,
  SignalStatistics,
  SignalTrackingConfig,
  DivergenceSignal,
  MACDDivergenceSignal,
  MarketStructureSignal,
  VolumeSpikeSignal,
  VolumeDivergenceSignal,
} from "../types/market.model";

export class SignalTrackerService {
  private config: SignalTrackingConfig;
  private signals: SignalRecord[] = [];
  private lastStatisticsUpdate: number = 0;

  constructor(config?: Partial<SignalTrackingConfig>) {
    this.config = {
      dataFilePath: config?.dataFilePath || "./data/signals.json",
      maxActiveSignals: config?.maxActiveSignals || 50,
      signalExpiryHours: config?.signalExpiryHours || 24,
      statisticsUpdateInterval: config?.statisticsUpdateInterval || 60,
    };

    this.ensureDataDirectory();
    this.loadSignals();
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    const dir = path.dirname(this.config.dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Load signals from JSON file
   */
  private loadSignals(): void {
    try {
      if (fs.existsSync(this.config.dataFilePath)) {
        const data = fs.readFileSync(this.config.dataFilePath, "utf8");
        this.signals = JSON.parse(data);
        console.log(`📊 Loaded ${this.signals.length} signals from file`);
      }
    } catch (error) {
      console.error("Error loading signals:", error);
      this.signals = [];
    }
  }

  /**
   * Save signals to JSON file
   */
  private saveSignals(): void {
    try {
      fs.writeFileSync(
        this.config.dataFilePath,
        JSON.stringify(this.signals, null, 2)
      );
    } catch (error) {
      console.error("Error saving signals:", error);
    }
  }

  /**
   * Generate unique signal ID
   */
  private generateSignalId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `SIG_${timestamp}_${random}`;
  }

  /**
   * Record RSI Divergence signal
   */
  recordRSIDivergence(
    symbol: string,
    signal: DivergenceSignal,
    currentPrice: number
  ): string {
    const signalId = this.generateSignalId();
    const entryReason = `RSI ${
      signal.type
    } Divergence - RSI: ${signal.rsi.toFixed(
      2
    )}, Confidence: ${signal.confidence.toFixed(1)}%`;

    const record: SignalRecord = {
      id: signalId,
      symbol,
      signalType: "RSI_DIVERGENCE",
      signalSubType: signal.type,
      entryPrice: currentPrice,
      takeProfit: signal.takeProfit,
      stopLoss: signal.stopLoss,
      entryTime: Date.now(),
      entryReason,
      confidence: signal.confidence,
      status: "ACTIVE",
      riskRewardRatio:
        Math.abs(signal.takeProfit - currentPrice) /
        Math.abs(currentPrice - signal.stopLoss),
      metadata: {
        rsi: signal.rsi,
        divergenceType: signal.type,
      },
    };

    this.signals.push(record);
    this.saveSignals();
    console.log(`📊 Recorded RSI Divergence signal: ${signalId}`);
    return signalId;
  }

  /**
   * Record MACD Divergence signal
   */
  recordMACDDivergence(
    symbol: string,
    signal: MACDDivergenceSignal,
    currentPrice: number
  ): string {
    const signalId = this.generateSignalId();
    const entryReason = `MACD ${
      signal.type
    } Divergence - MACD: ${signal.macd.toFixed(
      6
    )}, Confidence: ${signal.confidence.toFixed(1)}%`;

    const record: SignalRecord = {
      id: signalId,
      symbol,
      signalType: "MACD_DIVERGENCE",
      signalSubType: signal.type,
      entryPrice: currentPrice,
      takeProfit: signal.takeProfit,
      stopLoss: signal.stopLoss,
      entryTime: Date.now(),
      entryReason,
      confidence: signal.confidence,
      status: "ACTIVE",
      riskRewardRatio:
        Math.abs(signal.takeProfit - currentPrice) /
        Math.abs(currentPrice - signal.stopLoss),
      metadata: {
        macd: signal.macd,
        divergenceType: signal.type,
      },
    };

    this.signals.push(record);
    this.saveSignals();
    console.log(`📊 Recorded MACD Divergence signal: ${signalId}`);
    return signalId;
  }

  /**
   * Record Market Structure signal
   */
  recordMarketStructure(
    symbol: string,
    signal: MarketStructureSignal,
    currentPrice: number
  ): string {
    const signalId = this.generateSignalId();
    const entryReason = `Market Structure ${signal.structureType} - ${
      signal.type
    }, Confidence: ${signal.confidence.toFixed(1)}%`;

    const record: SignalRecord = {
      id: signalId,
      symbol,
      signalType: "MARKET_STRUCTURE",
      signalSubType: signal.structureType,
      entryPrice: currentPrice,
      takeProfit: signal.takeProfit,
      stopLoss: signal.stopLoss,
      entryTime: Date.now(),
      entryReason,
      confidence: signal.confidence,
      status: "ACTIVE",
      riskRewardRatio:
        Math.abs(signal.takeProfit - currentPrice) /
        Math.abs(currentPrice - signal.stopLoss),
      metadata: {
        structureType: signal.structureType,
        structureBreakType: signal.type,
      },
    };

    this.signals.push(record);
    this.saveSignals();
    console.log(`📊 Recorded Market Structure signal: ${signalId}`);
    return signalId;
  }

  /**
   * Record Volume Spike signal
   */
  recordVolumeSpike(
    symbol: string,
    signal: VolumeSpikeSignal,
    currentPrice: number
  ): string {
    const signalId = this.generateSignalId();
    const entryReason = `Volume Spike ${
      signal.severity
    } - ${signal.volumeRatio.toFixed(1)}x average volume`;

    // For volume spikes, we'll use a simple TP/SL based on volatility
    const volatility =
      signal.volumeRatio > 3 ? 0.02 : signal.volumeRatio > 2 ? 0.015 : 0.01;
    const takeProfit = currentPrice * (1 + volatility);
    const stopLoss = currentPrice * (1 - volatility * 0.5);

    const record: SignalRecord = {
      id: signalId,
      symbol,
      signalType: "VOLUME_SPIKE",
      signalSubType: signal.severity,
      entryPrice: currentPrice,
      takeProfit,
      stopLoss,
      entryTime: Date.now(),
      entryReason,
      confidence:
        signal.severity === "EXTREME"
          ? 80
          : signal.severity === "HIGH"
          ? 60
          : 40,
      status: "ACTIVE",
      riskRewardRatio: volatility / (volatility * 0.5),
      metadata: {
        volumeRatio: signal.volumeRatio,
        severity: signal.severity,
        currentVolume: signal.currentVolume,
        averageVolume: signal.averageVolume,
      },
    };

    this.signals.push(record);
    this.saveSignals();
    console.log(`📊 Recorded Volume Spike signal: ${signalId}`);
    return signalId;
  }

  /**
   * Record Volume Divergence signal
   */
  recordVolumeDivergence(
    symbol: string,
    signal: VolumeDivergenceSignal,
    currentPrice: number
  ): string {
    const signalId = this.generateSignalId();
    const entryReason = `Volume ${signal.divergenceType} Divergence - ${
      signal.reversalProbability
    } reversal probability, Confidence: ${signal.confidence.toFixed(1)}%`;

    const record: SignalRecord = {
      id: signalId,
      symbol,
      signalType: "VOLUME_DIVERGENCE",
      signalSubType: signal.divergenceType,
      entryPrice: currentPrice,
      takeProfit: signal.takeProfit,
      stopLoss: signal.stopLoss,
      entryTime: Date.now(),
      entryReason,
      confidence: signal.confidence,
      status: "ACTIVE",
      riskRewardRatio:
        Math.abs(signal.takeProfit - currentPrice) /
        Math.abs(currentPrice - signal.stopLoss),
      metadata: {
        volumeRatio: signal.volumeRatio,
        reversalProbability: signal.reversalProbability,
        priceDirection: signal.priceDirection,
        volumeDirection: signal.volumeDirection,
      },
    };

    this.signals.push(record);
    this.saveSignals();
    console.log(`📊 Recorded Volume Divergence signal: ${signalId}`);
    return signalId;
  }

  /**
   * Update signal status based on current price
   */
  updateSignalStatus(currentPrice: number): {
    updated: number;
    tpHit: number;
    slHit: number;
    expired: number;
  } {
    let updated = 0;
    let tpHit = 0;
    let slHit = 0;
    let expired = 0;

    const now = Date.now();
    const expiryTime = this.config.signalExpiryHours * 60 * 60 * 1000;

    for (const signal of this.signals) {
      if (signal.status !== "ACTIVE") continue;

      // Check for expiry
      if (now - signal.entryTime > expiryTime) {
        signal.status = "EXPIRED";
        signal.exitPrice = currentPrice;
        signal.exitTime = now;
        signal.duration = Math.round((now - signal.entryTime) / (1000 * 60));
        signal.pnl = currentPrice - signal.entryPrice;
        signal.pnlPercent = (signal.pnl / signal.entryPrice) * 100;
        expired++;
        updated++;
        continue;
      }

      // Check for TP/SL
      const isBullish =
        signal.signalSubType === "BULLISH" ||
        signal.signalSubType === "HH" ||
        signal.signalSubType === "HL";

      if (isBullish) {
        if (currentPrice >= signal.takeProfit) {
          signal.status = "TP_HIT";
          signal.exitPrice = signal.takeProfit;
          signal.exitTime = now;
          signal.duration = Math.round((now - signal.entryTime) / (1000 * 60));
          signal.pnl = signal.takeProfit - signal.entryPrice;
          signal.pnlPercent = (signal.pnl / signal.entryPrice) * 100;
          tpHit++;
          updated++;
        } else if (currentPrice <= signal.stopLoss) {
          signal.status = "SL_HIT";
          signal.exitPrice = signal.stopLoss;
          signal.exitTime = now;
          signal.duration = Math.round((now - signal.entryTime) / (1000 * 60));
          signal.pnl = signal.stopLoss - signal.entryPrice;
          signal.pnlPercent = (signal.pnl / signal.entryPrice) * 100;
          slHit++;
          updated++;
        }
      } else {
        if (currentPrice <= signal.takeProfit) {
          signal.status = "TP_HIT";
          signal.exitPrice = signal.takeProfit;
          signal.exitTime = now;
          signal.duration = Math.round((now - signal.entryTime) / (1000 * 60));
          signal.pnl = signal.entryPrice - signal.takeProfit;
          signal.pnlPercent = (signal.pnl / signal.entryPrice) * 100;
          tpHit++;
          updated++;
        } else if (currentPrice >= signal.stopLoss) {
          signal.status = "SL_HIT";
          signal.exitPrice = signal.stopLoss;
          signal.exitTime = now;
          signal.duration = Math.round((now - signal.entryTime) / (1000 * 60));
          signal.pnl = signal.entryPrice - signal.stopLoss;
          signal.pnlPercent = (signal.pnl / signal.entryPrice) * 100;
          slHit++;
          updated++;
        }
      }
    }

    if (updated > 0) {
      this.saveSignals();
      console.log(
        `📊 Updated ${updated} signals: ${tpHit} TP, ${slHit} SL, ${expired} expired`
      );
    }

    return { updated, tpHit, slHit, expired };
  }

  /**
   * Get signal statistics
   */
  getStatistics(): SignalStatistics {
    const completedSignals = this.signals.filter((s) => s.status !== "ACTIVE");
    const activeSignals = this.signals.filter((s) => s.status === "ACTIVE");
    const tpHit = this.signals.filter((s) => s.status === "TP_HIT");
    const slHit = this.signals.filter((s) => s.status === "SL_HIT");
    const expired = this.signals.filter((s) => s.status === "EXPIRED");

    const totalPnl = completedSignals.reduce((sum, s) => sum + (s.pnl || 0), 0);
    const totalPnlPercent = completedSignals.reduce(
      (sum, s) => sum + (s.pnlPercent || 0),
      0
    );
    const averagePnl =
      completedSignals.length > 0 ? totalPnl / completedSignals.length : 0;
    const averagePnlPercent =
      completedSignals.length > 0
        ? totalPnlPercent / completedSignals.length
        : 0;
    const averageDuration =
      completedSignals.length > 0
        ? completedSignals.reduce((sum, s) => sum + (s.duration || 0), 0) /
          completedSignals.length
        : 0;

    const winRate =
      completedSignals.length > 0
        ? (tpHit.length / completedSignals.length) * 100
        : 0;

    const bestTrade =
      completedSignals.length > 0
        ? completedSignals.reduce((best, current) =>
            (current.pnl || 0) > (best.pnl || 0) ? current : best
          )
        : null;

    const worstTrade =
      completedSignals.length > 0
        ? completedSignals.reduce((worst, current) =>
            (current.pnl || 0) < (worst.pnl || 0) ? current : worst
          )
        : null;

    // Signal type statistics
    const signalTypeStats: { [key: string]: any } = {};
    const signalTypes = [
      "RSI_DIVERGENCE",
      "MACD_DIVERGENCE",
      "MARKET_STRUCTURE",
      "VOLUME_SPIKE",
      "VOLUME_DIVERGENCE",
    ];

    for (const type of signalTypes) {
      const typeSignals = this.signals.filter((s) => s.signalType === type);
      const typeCompleted = typeSignals.filter((s) => s.status !== "ACTIVE");
      const typeTpHit = typeSignals.filter((s) => s.status === "TP_HIT");
      const typePnl = typeCompleted.reduce((sum, s) => sum + (s.pnl || 0), 0);

      signalTypeStats[type] = {
        count: typeSignals.length,
        winRate:
          typeCompleted.length > 0
            ? (typeTpHit.length / typeCompleted.length) * 100
            : 0,
        totalPnl: typePnl,
        averagePnl:
          typeCompleted.length > 0 ? typePnl / typeCompleted.length : 0,
      };
    }

    // Time statistics
    const hourly: { [key: string]: number } = {};
    const daily: { [key: string]: number } = {};

    for (const signal of this.signals) {
      const date = new Date(signal.entryTime);
      const hour = date.getHours().toString();
      const day = date.toISOString().split("T")[0];

      hourly[hour] = (hourly[hour] || 0) + 1;

      if (!day) {
        continue;
      }

      daily[day] = (daily[day] || 0) + 1;
    }

    return {
      totalSignals: this.signals.length,
      activeSignals: activeSignals.length,
      completedSignals: completedSignals.length,
      tpHit: tpHit.length,
      slHit: slHit.length,
      expired: expired.length,
      winRate,
      totalPnl,
      totalPnlPercent,
      averagePnl,
      averagePnlPercent,
      averageDuration,
      bestTrade,
      worstTrade,
      signalTypeStats,
      timeStats: { hourly, daily },
    };
  }

  /**
   * Get active signals
   */
  getActiveSignals(): SignalRecord[] {
    return this.signals.filter((s) => s.status === "ACTIVE");
  }

  /**
   * Get recent signals
   */
  getRecentSignals(limit: number = 10): SignalRecord[] {
    return this.signals
      .sort((a, b) => b.entryTime - a.entryTime)
      .slice(0, limit);
  }

  /**
   * Clean up old signals
   */
  cleanupOldSignals(daysToKeep: number = 30): number {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    const initialCount = this.signals.length;

    this.signals = this.signals.filter((s) => s.entryTime > cutoffTime);

    const removed = initialCount - this.signals.length;
    if (removed > 0) {
      this.saveSignals();
      console.log(`📊 Cleaned up ${removed} old signals`);
    }

    return removed;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SignalTrackingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): SignalTrackingConfig {
    return { ...this.config };
  }
}
