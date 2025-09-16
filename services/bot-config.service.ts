import { BotConfig, AlertConfig, OKXConfig } from "../types/market.model";

export class BotConfigService {
  private botConfig: BotConfig;
  private alertConfig: AlertConfig;
  private okxConfig: OKXConfig;

  constructor() {
    this.botConfig = this.loadBotConfig();
    this.alertConfig = this.loadAlertConfig();
    this.okxConfig = this.loadOKXConfig();
  }

  /**
   * Load bot configuration from environment variables
   */
  private loadBotConfig(): BotConfig {
    return {
      symbol: process.env.SYMBOL || "BTCUSDT",
      interval: process.env.INTERVAL || "5m",
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
      telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
    };
  }

  /**
   * Load alert system configuration from environment variables
   */
  private loadAlertConfig(): AlertConfig {
    return {
      pairs: process.env.PAIRS
        ? process.env.PAIRS.split(",")
        : ["BTCUSDT", "ETHUSDT"],
      timeframes: process.env.TIMEFRAMES
        ? process.env.TIMEFRAMES.split(",")
        : ["5m", "15m"],
      volumeSpikeThreshold: parseFloat(
        process.env.VOLUME_SPIKE_THRESHOLD || "1.5"
      ),
      divergenceCandleCount: parseInt(
        process.env.DIVERGENCE_CANDLE_COUNT || "3"
      ),
      rsiPeriod: parseInt(process.env.RSI_PERIOD || "14"),
      rsiOverbought: parseFloat(process.env.RSI_OVERBOUGHT || "70"),
      rsiOversold: parseFloat(process.env.RSI_OVERSOLD || "30"),
      rsiDivergenceLookback: parseInt(
        process.env.RSI_DIVERGENCE_LOOKBACK || "20"
      ),
    };
  }

  /**
   * Load OKX configuration from environment variables
   */
  private loadOKXConfig(): OKXConfig {
    return {
      apiKey: process.env.OKX_API_KEY || "",
      apiSecret: process.env.OKX_API_SECRET || "",
      passphrase: process.env.OKX_PASSPHRASE || "",
      balanceAlertsEnabled: process.env.OKX_BALANCE_ALERTS_ENABLED === "true",
      balanceAlertInterval: parseInt(
        process.env.OKX_BALANCE_ALERT_INTERVAL || "5"
      ),
      minBalanceThreshold: parseFloat(
        process.env.OKX_MIN_BALANCE_THRESHOLD || "0.001"
      ),
    };
  }

  /**
   * Get bot configuration
   */
  getBotConfig(): BotConfig {
    return { ...this.botConfig };
  }

  /**
   * Get alert configuration
   */
  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  /**
   * Get OKX configuration
   */
  getOKXConfig(): OKXConfig {
    return { ...this.okxConfig };
  }

  /**
   * Get the smallest timeframe for candle synchronization
   */
  getSmallestTimeframe(): string {
    return this.alertConfig.timeframes.reduce((smallest, current) => {
      const smallestMs = this.convertTimeframeToMs(smallest);
      const currentMs = this.convertTimeframeToMs(current);
      return currentMs < smallestMs ? current : smallest;
    }, this.alertConfig.timeframes[0] || "5m");
  }

  /**
   * Convert timeframe string to milliseconds
   */
  private convertTimeframeToMs(timeframe: string): number {
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
   * Validate configuration
   */
  validateConfig(): void {
    if (!this.botConfig.telegramBotToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is required");
    }
    if (!this.botConfig.telegramChatId) {
      throw new Error("TELEGRAM_CHAT_ID is required");
    }
  }

  /**
   * Update bot configuration
   */
  updateBotConfig(newConfig: Partial<BotConfig>): void {
    this.botConfig = { ...this.botConfig, ...newConfig };
    console.log("📝 Bot config updated:", this.botConfig);
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(newConfig: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...newConfig };
    console.log("📝 Alert config updated:", this.alertConfig);
  }

  /**
   * Update OKX configuration
   */
  updateOKXConfig(newConfig: Partial<OKXConfig>): void {
    this.okxConfig = { ...this.okxConfig, ...newConfig };
    console.log("📝 OKX config updated:", this.okxConfig);
  }

  /**
   * Get configuration summary
   */
  getConfigSummary(): {
    bot: BotConfig;
    alert: AlertConfig;
    okx: OKXConfig;
    smallestTimeframe: string;
  } {
    return {
      bot: this.getBotConfig(),
      alert: this.getAlertConfig(),
      okx: this.getOKXConfig(),
      smallestTimeframe: this.getSmallestTimeframe(),
    };
  }
}
