import TelegramBot from "node-telegram-bot-api";

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
