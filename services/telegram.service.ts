import TelegramBot from "node-telegram-bot-api";
import {
  AlertData,
  TradingSignal,
  MultiSignalAlert,
  VolumeAlert,
  VolumeDivergenceSignal,
} from "../types/market.model";
import { getRSISignal } from "../utils/rsi.utils";

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
   * Send price and RSI alert
   */
  async sendPriceAlert(alertData: AlertData): Promise<void> {
    const { symbol, currentPrice, rsi, timestamp, timeframe } = alertData;
    const rsiSignal = getRSISignal(rsi);
    const time = new Date(timestamp).toISOString();

    const message = `
📊 <b>Cảnh Báo Giá - ${symbol}</b>

💰 <b>Giá Hiện Tại:</b> ${currentPrice.toLocaleString()} USDT
📈 <b>RSI (${timeframe}):</b> ${rsi} ${rsiSignal}
🕐 <b>Thời Gian:</b> ${time}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Cảnh báo được tạo bởi Signals Bot</i>
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send bot startup notification
   */
  async sendStartupMessage(): Promise<void> {
    const message = `
🚀 <b>Bot Trading Đa Tín Hiệu với Cảnh Báo Volume Đã Khởi Động</b>

✅ Bot đang theo dõi dữ liệu thị trường
⏰ Thực thi mỗi phút (UTC)
🎯 <b>Phát Hiện Phân Kỳ RSI: BẬT</b>
📊 <b>Phát Hiện Phân Kỳ MACD: BẬT</b>
🏗️ <b>Phát Hiện Cấu Trúc Thị Trường: BẬT</b>
📈 <b>Phát Hiện Volume Spike: BẬT</b>
📊 <b>Phát Hiện Phân Kỳ Volume: BẬT</b>
🔄 Dữ liệu thời gian thực từ Binance API
📱 <b>Cảnh báo: Đa xác nhận + Volume spikes + Phân kỳ volume</b>
🔥 <b>Setup Xác Suất Cao</b>
📊 <b>Theo Dõi Volume: Cảnh báo độc lập</b>

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
   * Send trading signal with divergence detection
   */
  async sendTradingSignal(signal: TradingSignal): Promise<void> {
    const {
      symbol,
      currentPrice,
      rsi,
      divergenceSignal,
      timestamp,
      timeframe,
    } = signal;
    const rsiSignal = getRSISignal(rsi);
    const time = new Date(timestamp).toISOString();

    let message = `
📊 <b>Tín Hiệu Trading - ${symbol}</b>

💰 <b>Giá Hiện Tại:</b> ${currentPrice.toLocaleString()} USDT
📈 <b>RSI (${timeframe}):</b> ${rsi} ${rsiSignal}
🕐 <b>Thời Gian:</b> ${time}
    `;

    // Add divergence signal if present
    if (divergenceSignal) {
      const signalType =
        divergenceSignal.type === "BULLISH" ? "🟢 TĂNG GIÁ" : "🔴 GIẢM GIÁ";
      const strength =
        divergenceSignal.confidence >= 80
          ? "🔥 MẠNH"
          : divergenceSignal.confidence >= 60
          ? "⚡ TRUNG BÌNH"
          : divergenceSignal.confidence >= 40
          ? "💡 YẾU"
          : "❓ RẤT YẾU";

      message += `

🎯 <b>PHÁT HIỆN TÍN HIỆU PHÂN KỲ!</b>
${signalType} PHÂN KỲ ${strength}

📊 <b>Giá Vào Lệnh:</b> ${divergenceSignal.price.toLocaleString()} USDT
📈 <b>RSI Tại Tín Hiệu:</b> ${divergenceSignal.rsi.toFixed(2)}
🎯 <b>Chốt Lời:</b> ${divergenceSignal.takeProfit.toLocaleString()} USDT
🛡️ <b>Cắt Lỗ:</b> ${divergenceSignal.stopLoss.toLocaleString()} USDT
📊 <b>Độ Tin Cậy:</b> ${divergenceSignal.confidence.toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>⚠️ Đây không phải lời khuyên tài chính. Giao dịch có rủi ro.</i>
      `;
    } else {
      message += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Cảnh báo được tạo bởi Signals Bot</i>
      `;
    }

    await this.sendMessage(message.trim());
  }

  /**
   * Send multi-signal alert with RSI, MACD, and Market Structure
   */
  async sendMultiSignalAlert(alert: MultiSignalAlert): Promise<void> {
    const {
      symbol,
      currentPrice,
      rsi,
      macd,
      timestamp,
      timeframe,
      rsiDivergence,
      macdDivergence,
      marketStructure,
    } = alert;
    const rsiSignal = getRSISignal(rsi);
    const time = new Date(timestamp).toISOString();

    let message = `
📊 <b>Cảnh Báo Đa Tín Hiệu - ${symbol}</b>

💰 <b>Giá Hiện Tại:</b> ${currentPrice.toLocaleString()} USDT
📈 <b>RSI (${timeframe}):</b> ${rsi} ${rsiSignal}
🕐 <b>Thời Gian:</b> ${time}
    `;

    // Add MACD data if available
    if (macd) {
      const macdTrend =
        macd.macd > macd.signal
          ? "🟢 TĂNG GIÁ"
          : macd.macd < macd.signal
          ? "🔴 GIẢM GIÁ"
          : "⚪ TRUNG TÍNH";
      message += `
📊 <b>MACD:</b> ${macd.macd.toFixed(6)} | Signal: ${macd.signal.toFixed(
        6
      )} ${macdTrend}
📊 <b>Histogram:</b> ${macd.histogram.toFixed(6)}
      `;
    }

    let signalCount = 0;

    // Add RSI Divergence signal if present
    if (rsiDivergence) {
      signalCount++;
      const signalType =
        rsiDivergence.type === "BULLISH" ? "🟢 TĂNG GIÁ" : "🔴 GIẢM GIÁ";
      const strength =
        rsiDivergence.confidence >= 80
          ? "🔥 MẠNH"
          : rsiDivergence.confidence >= 60
          ? "⚡ TRUNG BÌNH"
          : rsiDivergence.confidence >= 40
          ? "💡 YẾU"
          : "❓ RẤT YẾU";

      message += `

🎯 <b>PHÁT HIỆN PHÂN KỲ RSI!</b>
${signalType} PHÂN KỲ RSI ${strength}

📊 <b>Giá Vào Lệnh:</b> ${rsiDivergence.price.toLocaleString()} USDT
📈 <b>RSI Tại Tín Hiệu:</b> ${rsiDivergence.rsi.toFixed(2)}
🎯 <b>Chốt Lời:</b> ${rsiDivergence.takeProfit.toLocaleString()} USDT
🛡️ <b>Cắt Lỗ:</b> ${rsiDivergence.stopLoss.toLocaleString()} USDT
📊 <b>Độ Tin Cậy:</b> ${rsiDivergence.confidence.toFixed(1)}%
      `;
    }

    // Add MACD Divergence signal if present
    if (macdDivergence) {
      signalCount++;
      const signalType =
        macdDivergence.type === "BULLISH" ? "🟢 TĂNG GIÁ" : "🔴 GIẢM GIÁ";
      const strength =
        macdDivergence.confidence >= 80
          ? "🔥 MẠNH"
          : macdDivergence.confidence >= 60
          ? "⚡ TRUNG BÌNH"
          : macdDivergence.confidence >= 40
          ? "💡 YẾU"
          : "❓ RẤT YẾU";

      message += `

📊 <b>PHÁT HIỆN PHÂN KỲ MACD!</b>
${signalType} PHÂN KỲ MACD ${strength}

📊 <b>Giá Vào Lệnh:</b> ${macdDivergence.price.toLocaleString()} USDT
📈 <b>MACD Tại Tín Hiệu:</b> ${macdDivergence.macd.toFixed(6)}
🎯 <b>Chốt Lời:</b> ${macdDivergence.takeProfit.toLocaleString()} USDT
🛡️ <b>Cắt Lỗ:</b> ${macdDivergence.stopLoss.toLocaleString()} USDT
📊 <b>Độ Tin Cậy:</b> ${macdDivergence.confidence.toFixed(1)}%
      `;
    }

    // Add Market Structure signal if present
    if (marketStructure) {
      signalCount++;
      const signalType = marketStructure.type.includes("BULLISH")
        ? "🟢 TĂNG GIÁ"
        : "🔴 GIẢM GIÁ";
      const strength =
        marketStructure.confidence >= 80
          ? "🔥 MẠNH"
          : marketStructure.confidence >= 60
          ? "⚡ TRUNG BÌNH"
          : marketStructure.confidence >= 40
          ? "💡 YẾU"
          : "❓ RẤT YẾU";

      message += `

🏗️ <b>PHÁ VỠ CẤU TRÚC THỊ TRƯỜNG!</b>
${signalType} CẤU TRÚC ${marketStructure.structureType} ${strength}

📊 <b>Giá Vào Lệnh:</b> ${marketStructure.price.toLocaleString()} USDT
🏗️ <b>Loại Cấu Trúc:</b> ${marketStructure.structureType}
🎯 <b>Chốt Lời:</b> ${marketStructure.takeProfit.toLocaleString()} USDT
🛡️ <b>Cắt Lỗ:</b> ${marketStructure.stopLoss.toLocaleString()} USDT
📊 <b>Độ Tin Cậy:</b> ${marketStructure.confidence.toFixed(1)}%
      `;
    }

    // Add summary if multiple signals
    if (signalCount > 1) {
      message += `

🎯 <b>PHÁT HIỆN NHIỀU XÁC NHẬN!</b>
📊 <b>Tổng Số Tín Hiệu:</b> ${signalCount}
🔥 <b>Setup Xác Suất Cao</b>
      `;
    }

    message += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>⚠️ Đây không phải lời khuyên tài chính. Giao dịch có rủi ro.</i>
    `;

    await this.sendMessage(message.trim());
  }

  /**
   * Send volume spike alert
   */
  async sendVolumeAlert(alert: VolumeAlert): Promise<void> {
    const { symbol, currentPrice, volumeSpike, timestamp, timeframe } = alert;
    const time = new Date(timestamp).toISOString();

    if (!volumeSpike) {
      return; // No volume spike to report
    }

    const severityEmoji =
      volumeSpike.severity === "EXTREME"
        ? "🚨"
        : volumeSpike.severity === "HIGH"
        ? "🔥"
        : volumeSpike.severity === "MEDIUM"
        ? "⚡"
        : "📈";

    const severityText =
      volumeSpike.severity === "EXTREME"
        ? "CỰC MẠNH"
        : volumeSpike.severity === "HIGH"
        ? "CAO"
        : volumeSpike.severity === "MEDIUM"
        ? "TRUNG BÌNH"
        : "THẤP";

    const message = `
${severityEmoji} <b>Cảnh Báo Volume Spike - ${symbol}</b>

💰 <b>Giá Hiện Tại:</b> ${currentPrice.toLocaleString()} USDT
📊 <b>Volume Spike:</b> ${volumeSpike.volumeRatio.toFixed(1)}x volume trung bình
📈 <b>Volume Hiện Tại:</b> ${volumeSpike.currentVolume.toLocaleString()}
📊 <b>Volume Trung Bình:</b> ${volumeSpike.averageVolume.toLocaleString()}
🎯 <b>Mức Độ:</b> ${severityText}
🕐 <b>Thời Gian:</b> ${time}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>📊 Phát hiện volume spike - Theo dõi khả năng biến động giá</i>
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send volume divergence alert
   */
  async sendVolumeDivergenceAlert(
    symbol: string,
    currentPrice: number,
    volumeDivergence: VolumeDivergenceSignal,
    timestamp: number
  ): Promise<void> {
    const time = new Date(timestamp).toISOString();
    const typeEmoji =
      volumeDivergence.divergenceType === "BULLISH" ? "🟢" : "🔴";
    const probabilityEmoji =
      volumeDivergence.reversalProbability === "HIGH"
        ? "🔥"
        : volumeDivergence.reversalProbability === "MEDIUM"
        ? "⚡"
        : "📊";

    const message = `
${typeEmoji} <b>Cảnh Báo Phân Kỳ Volume - ${symbol}</b>

💰 <b>Giá Hiện Tại:</b> ${currentPrice.toLocaleString()} USDT
📊 <b>Loại Phân Kỳ:</b> ${
      volumeDivergence.divergenceType === "BULLISH" ? "TĂNG GIÁ" : "GIẢM GIÁ"
    }
📈 <b>Hướng Giá:</b> ${
      volumeDivergence.priceDirection === "INCREASING" ? "TĂNG" : "GIẢM"
    }
📊 <b>Hướng Volume:</b> ${
      volumeDivergence.volumeDirection === "INCREASING" ? "TĂNG" : "GIẢM"
    }
🎯 <b>Xác Suất Đảo Chiều:</b> ${probabilityEmoji} ${
      volumeDivergence.reversalProbability
    }
📊 <b>Độ Tin Cậy:</b> ${volumeDivergence.confidence.toFixed(1)}%
🕐 <b>Thời Gian:</b> ${time}

📝 <b>Mô Tả:</b> ${volumeDivergence.description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>📊 Phân kỳ volume phát hiện - Có thể sắp đảo chiều</i>
    `.trim();

    await this.sendMessage(message);
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
