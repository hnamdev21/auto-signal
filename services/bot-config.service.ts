import { BotConfig, AlertConfig } from "../types/market.model";

export class BotConfigService {
  private botConfig: BotConfig;
  private alertConfig: AlertConfig;

  constructor() {
    this.botConfig = this.loadBotConfig();
    this.alertConfig = this.loadAlertConfig();
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
   * Get the smallest timeframe for candle synchronization
   */
  getSmallestTimeframe(): string {
    return this.alertConfig.timeframes.reduce((smallest, current) => {
      const smallestMs = parseInt(smallest.replace("m", "")) * 60 * 1000;
      const currentMs = parseInt(current.replace("m", "")) * 60 * 1000;
      return currentMs < smallestMs ? current : smallest;
    }, this.alertConfig.timeframes[0] || "5m");
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
   * Get configuration summary
   */
  getConfigSummary(): {
    bot: BotConfig;
    alert: AlertConfig;
    smallestTimeframe: string;
  } {
    return {
      bot: this.getBotConfig(),
      alert: this.getAlertConfig(),
      smallestTimeframe: this.getSmallestTimeframe(),
    };
  }
}
