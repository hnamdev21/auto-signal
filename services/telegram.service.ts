import TelegramBot from "node-telegram-bot-api";
import { VolumeAlert } from "../types/market.model";

export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;

  constructor(botToken: string, chatId: string) {
    this.bot = new TelegramBot(botToken, { polling: false });
    this.chatId = chatId;
  }

  /**
   * Send a simple text message
   */
  async sendMessage(message: string): Promise<void> {
    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error("Error sending Telegram message:", error);
      throw error;
    }
  }

  /**
   * Send bot startup notification
   */
  async sendStartupMessage(timeframe: string = "5m"): Promise<void> {
    const message = `
🚀 <b>Bot Trading Đa Tín Hiệu với Cảnh Báo Volume Đã Khởi Động</b>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Bot khởi động lúc: ${new Date().toISOString()}</i>
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send error notification
   */
  async sendErrorMessage(error: string, context?: string): Promise<void> {
    const message = `
❌ <b>Bot Error</b>

${context ? `<b>Context:</b> ${context}\n` : ""}
<b>Error:</b> ${error}
🕐 <b>Time:</b> ${new Date().toISOString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Please check the bot logs for more details</i>
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send health check message
   */
  async sendHealthCheck(): Promise<void> {
    const message = `
💚 <b>Bot Health Check</b>

✅ Bot is running normally
🕐 Last check: ${new Date().toISOString()}
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send volume spike alert
   */
  async sendVolumeSpikeAlert(alert: VolumeAlert): Promise<void> {
    const message = `
🚨 <b>VOLUME SPIKE DETECTED</b>

📊 <b>Symbol:</b> ${alert.symbol}
⏰ <b>Timeframe:</b> ${alert.timeframe}
💰 <b>Price:</b> $${alert.currentPrice.toFixed(2)}
📈 <b>Volume:</b> ${alert.volume.toFixed(2)}
📊 <b>Average Volume:</b> ${alert.averageVolume.toFixed(2)}
🔥 <b>Spike Ratio:</b> ${alert.spikeRatio?.toFixed(2)}x

🕐 <b>Time:</b> ${new Date(alert.timestamp).toISOString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Volume spike detected - trading activity increased significantly</i>
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send volume divergence alert
   */
  async sendVolumeDivergenceAlert(alert: VolumeAlert): Promise<void> {
    if (!alert.divergenceData) return;

    const { candleCount, priceChange, volumeChange, candles } =
      alert.divergenceData;

    const message = `
⚠️ <b>VOLUME DIVERGENCE DETECTED</b>

📊 <b>Symbol:</b> ${alert.symbol}
⏰ <b>Timeframe:</b> ${alert.timeframe}
💰 <b>Current Price:</b> $${alert.currentPrice.toFixed(2)}
🕯️ <b>Candles Analyzed:</b> ${candleCount}

📈 <b>Price Change:</b> ${priceChange > 0 ? "+" : ""}${priceChange.toFixed(2)}%
📉 <b>Volume Change:</b> ${volumeChange.toFixed(2)}%

<b>Recent Candles:</b>
${candles
  .map(
    (candle, index) =>
      `${index + 1}. Price: $${candle.close.toFixed(
        2
      )} | Volume: ${candle.volume.toFixed(2)}`
  )
  .join("\n")}

🕐 <b>Time:</b> ${new Date(alert.timestamp).toISOString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>⚠️ Warning: Price rising but volume declining - potential weakness</i>
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send multiple alerts
   */
  async sendVolumeAlerts(alerts: VolumeAlert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        if (alert.type === "spike") {
          await this.sendVolumeSpikeAlert(alert);
        } else if (alert.type === "divergence") {
          await this.sendVolumeDivergenceAlert(alert);
        }

        // Small delay between alerts to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(
          `❌ Error sending alert for ${alert.symbol} ${alert.timeframe}:`,
          error
        );
      }
    }
  }

  /**
   * Test if the bot can send messages
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.sendMessage("🧪 Bot connection test successful!");
      return true;
    } catch (error) {
      console.error("Telegram connection test failed:", error);
      return false;
    }
  }
}
