import TelegramBot from "node-telegram-bot-api";
import { VolumeAlert, RSIAlert } from "../types/market.model";

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
<b>BOT CẢNH BÁO VOLUME ĐÃ KHỞI ĐỘNG</b>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Khởi động lúc: ${new Date().toISOString()}</i>
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send error notification
   */
  async sendErrorMessage(error: string, context?: string): Promise<void> {
    const message = `
<b>LỖI BOT</b>

${context ? `<b>Ngữ cảnh:</b> ${context}\n` : ""}
<b>Lỗi:</b> ${error}
<b>Thời gian:</b> ${new Date().toISOString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Kiểm tra log bot để biết thêm chi tiết</i>
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send health check message
   */
  async sendHealthCheck(): Promise<void> {
    const message = `
<b>KIỂM TRA SỨC KHỎE BOT</b>

Bot đang hoạt động bình thường
Lần kiểm tra cuối: ${new Date().toISOString()}
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send volume spike alert
   */
  async sendVolumeSpikeAlert(alert: VolumeAlert): Promise<void> {
    const message = `
<b>PHÁT HIỆN VOLUME TĂNG ĐỘT BIẾN</b>

<b>${alert.symbol}</b> | <b>${alert.timeframe}</b>
<b>Giá:</b> $${alert.currentPrice.toFixed(2)}
<b>Volume:</b> ${alert.volume.toFixed(2)}
<b>Trung bình:</b> ${alert.averageVolume.toFixed(2)}
<b>Tăng:</b> <b>${alert.spikeRatio?.toFixed(2)}x</b>

<b>Thời gian:</b> ${new Date(alert.timestamp).toISOString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Hoạt động giao dịch tăng đáng kể</i>
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
<b>PHÁT HIỆN PHÂN KỲ VOLUME</b>

<b>${alert.symbol}</b> | <b>${alert.timeframe}</b>
<b>Giá:</b> $${alert.currentPrice.toFixed(2)}
<b>Số nến:</b> ${candleCount}

<b>Thay đổi giá:</b> <b>${priceChange > 0 ? "+" : ""}${priceChange.toFixed(
      2
    )}%</b>
<b>Thay đổi volume:</b> <b>${volumeChange.toFixed(2)}%</b>

<b>Nến gần đây:</b>
${candles
  .map(
    (candle, index) =>
      `${index + 1}. $${candle.close.toFixed(2)} | Vol: ${candle.volume.toFixed(
        2
      )}`
  )
  .join("\n")}

<b>Thời gian:</b> ${new Date(alert.timestamp).toISOString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Cảnh báo: Giá tăng nhưng volume giảm - dấu hiệu yếu</i>
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send RSI divergence alert
   */
  async sendRSIDivergenceAlert(alert: RSIAlert): Promise<void> {
    const { divergenceType, rsiValue, divergenceData } = alert;
    const { priceHigh, priceLow, rsiHigh, rsiLow, priceChange, rsiChange } =
      divergenceData;

    const message = `
<b>PHÁT HIỆN PHÂN KỲ RSI</b>

<b>${alert.symbol}</b> | <b>${alert.timeframe}</b>
<b>Giá hiện tại:</b> $${alert.currentPrice.toFixed(2)}
<b>RSI hiện tại:</b> ${rsiValue.toFixed(2)}

<b>Loại phân kỳ:</b> <b>${
      divergenceType === "bullish" ? "TÍCH CỰC" : "TIÊU CỰC"
    }</b>

<b>Chi tiết phân kỳ:</b>
• Giá cao: $${priceHigh.toFixed(2)}
• Giá thấp: $${priceLow.toFixed(2)}
• RSI cao: ${rsiHigh.toFixed(2)}
• RSI thấp: ${rsiLow.toFixed(2)}

<b>Thay đổi:</b>
• Giá: <b>${priceChange > 0 ? "+" : ""}${priceChange.toFixed(2)}%</b>
• RSI: <b>${rsiChange > 0 ? "+" : ""}${rsiChange.toFixed(2)}%</b>

<b>Thời gian:</b> ${new Date(alert.timestamp).toISOString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>${
      divergenceType === "bullish"
        ? "Tín hiệu mua: Giá giảm nhưng RSI tăng"
        : "Tín hiệu bán: Giá tăng nhưng RSI giảm"
    }</i>
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send multiple alerts
   */
  async sendAlerts(alerts: (VolumeAlert | RSIAlert)[]): Promise<void> {
    for (const alert of alerts) {
      try {
        if (alert.type === "spike") {
          await this.sendVolumeSpikeAlert(alert as VolumeAlert);
        } else if (alert.type === "divergence") {
          await this.sendVolumeDivergenceAlert(alert as VolumeAlert);
        } else if (alert.type === "rsi_divergence") {
          await this.sendRSIDivergenceAlert(alert as RSIAlert);
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
