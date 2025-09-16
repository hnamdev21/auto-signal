import TelegramBot from "node-telegram-bot-api";
import { OKXService } from "./okx.service";
import { BotActionService } from "./bot-action.service";
import { OKXBalanceAlertService } from "./okx-balance-alert.service";

export interface OrderFormData {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price?: number;
  orderType: "market" | "limit";
  leverage: number;
}

export class TelegramCommandService {
  private bot: TelegramBot;
  private chatId: string;
  private okxService: OKXService | null = null;
  private botActionService: BotActionService;
  private okxBalanceAlertService: OKXBalanceAlertService;
  private userStates: Map<number, { state: string; data?: any }> = new Map();

  constructor(
    bot: TelegramBot,
    chatId: string,
    botActionService: BotActionService,
    okxBalanceAlertService: OKXBalanceAlertService
  ) {
    this.bot = bot;
    this.chatId = chatId;
    this.botActionService = botActionService;
    this.okxBalanceAlertService = okxBalanceAlertService;
    this.setupCommands();
  }

  /**
   * Set OKX service for commands
   */
  setOKXService(okxService: OKXService): void {
    this.okxService = okxService;
  }

  /**
   * Setup command handlers
   */
  private setupCommands(): void {
    // Balance command
    this.bot.onText(/\/balance/, async (msg) => {
      await this.handleBalanceCommand(msg);
    });

    // Filled orders command
    this.bot.onText(/\/filled/, async (msg) => {
      await this.handleFilledOrdersCommand(msg);
    });

    // Order command
    this.bot.onText(/\/order/, async (msg) => {
      await this.handleOrderCommand(msg);
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      await this.handleHelpCommand(msg);
    });

    // Test command
    this.bot.onText(/\/test/, async (msg) => {
      await this.handleTestCommand(msg);
    });

    // Handle callback queries (for inline keyboards)
    this.bot.on("callback_query", async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    // Handle text messages for form input
    this.bot.on("message", async (msg) => {
      if (msg.text && !msg.text.startsWith("/")) {
        await this.handleFormInput(msg);
      }
    });
  }

  /**
   * Handle /balance command
   */
  private async handleBalanceCommand(msg: TelegramBot.Message): Promise<void> {
    try {
      if (!this.okxService) {
        await this.bot.sendMessage(
          msg.chat.id,
          "❌ OKX service chưa được cấu hình. Vui lòng kiểm tra OKX_API_KEY, OKX_API_SECRET, và OKX_PASSPHRASE trong file .env"
        );
        return;
      }

      await this.bot.sendMessage(msg.chat.id, "📊 Đang kiểm tra số dư...");

      const balances = await this.okxService.getFuturesBalance();

      if (!balances || balances.length === 0) {
        await this.bot.sendMessage(msg.chat.id, "📊 Không có dữ liệu số dư");
        return;
      }

      const significantBalances = balances.filter(
        (balance) => balance.available > 0 || balance.locked > 0
      );

      if (significantBalances.length === 0) {
        await this.bot.sendMessage(msg.chat.id, "📊 Không có số dư đáng kể");
        return;
      }

      const balanceDetails = significantBalances
        .map((balance) => {
          const total = balance.available + balance.locked;
          return `• <b>${balance.asset}:</b> ${total.toFixed(
            6
          )}\n  - Available: ${balance.available.toFixed(
            6
          )}\n  - Locked: ${balance.locked.toFixed(6)}`;
        })
        .join("\n\n");

      const totalValue = significantBalances.reduce(
        (total, balance) => total + balance.available + balance.locked,
        0
      );

      const message = `
<b>💰 SỐ DƯ OKX FUTURES</b>

${balanceDetails}

<b>Tổng giá trị:</b> ${totalValue.toFixed(6)}

<b>Thời gian:</b> ${new Date().toISOString()}
      `.trim();

      await this.bot.sendMessage(msg.chat.id, message, { parse_mode: "HTML" });
    } catch (error) {
      await this.bot.sendMessage(
        msg.chat.id,
        `❌ Lỗi khi kiểm tra số dư: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Handle /filled command
   */
  private async handleFilledOrdersCommand(
    msg: TelegramBot.Message
  ): Promise<void> {
    try {
      if (!this.okxService) {
        await this.bot.sendMessage(
          msg.chat.id,
          "❌ OKX service chưa được cấu hình. Vui lòng kiểm tra OKX_API_KEY, OKX_API_SECRET, và OKX_PASSPHRASE trong file .env"
        );
        return;
      }

      await this.bot.sendMessage(
        msg.chat.id,
        "📋 Đang kiểm tra lệnh đã khớp..."
      );

      const orders = await this.okxService.getActiveFuturesOrders();

      if (!orders || orders.length === 0) {
        await this.bot.sendMessage(
          msg.chat.id,
          "📋 Không có lệnh đang hoạt động"
        );
        return;
      }

      const filledOrders = orders.filter((order) => order.status === "filled");
      const activeOrders = orders.filter((order) => order.status === "open");

      let message = "<b>📋 TRẠNG THÁI LỆNH</b>\n\n";

      if (filledOrders.length > 0) {
        message += "<b>✅ Lệnh đã khớp:</b>\n";
        filledOrders.forEach((order, index) => {
          message += `${index + 1}. <b>${order.symbol}</b>\n`;
          message += `   - Action: ${order.action}\n`;
          message += `   - Position: ${order.position}\n`;
          message += `   - Quantity: ${order.quantity}\n`;
          message += `   - Price: ${order.price || "Market"}\n`;
          message += `   - Leverage: ${order.leverage}x\n`;
          message += `   - Time: ${new Date(
            order.timestamp
          ).toLocaleString()}\n\n`;
        });
      }

      if (activeOrders.length > 0) {
        message += "<b>⏳ Lệnh đang chờ:</b>\n";
        activeOrders.forEach((order, index) => {
          message += `${index + 1}. <b>${order.symbol}</b>\n`;
          message += `   - Action: ${order.action}\n`;
          message += `   - Position: ${order.position}\n`;
          message += `   - Quantity: ${order.quantity}\n`;
          message += `   - Price: ${order.price || "Market"}\n`;
          message += `   - Leverage: ${order.leverage}x\n\n`;
        });
      }

      await this.bot.sendMessage(msg.chat.id, message, { parse_mode: "HTML" });
    } catch (error) {
      await this.bot.sendMessage(
        msg.chat.id,
        `❌ Lỗi khi kiểm tra lệnh: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Handle /order command
   */
  private async handleOrderCommand(msg: TelegramBot.Message): Promise<void> {
    try {
      if (!this.okxService) {
        await this.bot.sendMessage(
          msg.chat.id,
          "❌ OKX service chưa được cấu hình. Vui lòng kiểm tra OKX_API_KEY, OKX_API_SECRET, và OKX_PASSPHRASE trong file .env"
        );
        return;
      }

      const userId = msg.from?.id;
      if (!userId) return;

      // Set user state to order form
      this.userStates.set(userId, { state: "order_form", data: {} });

      const keyboard = {
        inline_keyboard: [
          [{ text: "🟢 MUA (Long)", callback_data: "order_side_buy" }],
          [{ text: "🔴 BÁN (Short)", callback_data: "order_side_sell" }],
        ],
      };

      const message = `
<b>📝 ĐẶT LỆNH FUTURES</b>

<b>Bước 1:</b> Chọn loại lệnh (Mua hoặc Bán)
      `.trim();

      await this.bot.sendMessage(msg.chat.id, message, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (error) {
      await this.bot.sendMessage(
        msg.chat.id,
        `❌ Lỗi khi tạo form đặt lệnh: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Handle /test command
   */
  private async handleTestCommand(msg: TelegramBot.Message): Promise<void> {
    try {
      if (!this.okxService) {
        await this.bot.sendMessage(
          msg.chat.id,
          "❌ OKX service chưa được cấu hình. Vui lòng kiểm tra OKX_API_KEY, OKX_API_SECRET, và OKX_PASSPHRASE trong file .env"
        );
        return;
      }

      await this.bot.sendMessage(
        msg.chat.id,
        "🔍 Đang kiểm tra kết nối OKX..."
      );

      try {
        const balance = await this.okxService.getFuturesBalance();
        await this.bot.sendMessage(
          msg.chat.id,
          `✅ <b>Kết nối OKX thành công!</b>\n\nSố dư futures: ${
            balance.length
          } tài sản\n\nChi tiết:\n${balance
            .slice(0, 3)
            .map((b) => `• ${b.asset}: ${b.available + b.locked}`)
            .join("\n")}${balance.length > 3 ? "\n..." : ""}`
        );
      } catch (error) {
        await this.bot.sendMessage(
          msg.chat.id,
          `❌ <b>Lỗi kết nối OKX:</b>\n${
            error instanceof Error ? error.message : "Unknown error"
          }\n\nVui lòng kiểm tra:\n• API credentials\n• Quyền futures trading\n• Kết nối mạng`
        );
      }
    } catch (error) {
      console.error("Error in test command:", error);
      await this.bot.sendMessage(
        msg.chat.id,
        "❌ Có lỗi xảy ra khi test kết nối"
      );
    }
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(msg: TelegramBot.Message): Promise<void> {
    const message = `
<b>🤖 DANH SÁCH LỆNH BOT</b>

<b>📊 Thông tin tài khoản:</b>
/balance - Kiểm tra số dư OKX Futures
/filled - Kiểm tra lệnh đã khớp và đang chờ

<b>📝 Giao dịch:</b>
/order - Đặt lệnh futures mới

<b>🔧 Kiểm tra:</b>
/test - Test kết nối OKX API

<b>ℹ️ Hỗ trợ:</b>
/help - Hiển thị danh sách lệnh này

<b>📋 Cách sử dụng:</b>
1. Sử dụng /order để bắt đầu đặt lệnh
2. Làm theo hướng dẫn từng bước
3. Bot sẽ xác nhận trước khi thực hiện lệnh

<b>⚠️ Lưu ý:</b>
- Tất cả lệnh đều được thực hiện trên OKX Futures
- Vui lòng kiểm tra kỹ thông tin trước khi xác nhận
- Bot chỉ hỗ trợ các cặp tiền có sẵn trên OKX
    `.trim();

    await this.bot.sendMessage(msg.chat.id, message, { parse_mode: "HTML" });
  }

  /**
   * Handle callback queries from inline keyboards
   */
  private async handleCallbackQuery(
    callbackQuery: TelegramBot.CallbackQuery
  ): Promise<void> {
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;

    if (!data || !chatId) return;

    try {
      await this.bot.answerCallbackQuery(callbackQuery.id);

      if (data.startsWith("order_side_")) {
        await this.handleOrderSideSelection(userId, chatId, data);
      } else if (data.startsWith("order_type_")) {
        await this.handleOrderTypeSelection(userId, chatId, data);
      } else if (data === "confirm_order") {
        await this.handleOrderConfirmation(userId, chatId);
      } else if (data === "cancel_order") {
        await this.handleOrderCancellation(userId, chatId);
      }
    } catch (error) {
      await this.bot.sendMessage(
        chatId,
        `❌ Lỗi xử lý lệnh: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Handle order side selection
   */
  private async handleOrderSideSelection(
    userId: number,
    chatId: number,
    data: string
  ): Promise<void> {
    const side = data.split("_")[2]; // "buy" or "sell"
    const userState = this.userStates.get(userId);

    if (!userState) return;

    userState.data.side = side;
    this.userStates.set(userId, userState);

    const keyboard = {
      inline_keyboard: [
        [{ text: "📊 Market Order", callback_data: "order_type_market" }],
        [{ text: "🎯 Limit Order", callback_data: "order_type_limit" }],
      ],
    };

    const sideText = side === "buy" ? "🟢 MUA (Long)" : "🔴 BÁN (Short)";
    const message = `
<b>📝 ĐẶT LỆNH FUTURES</b>

✅ <b>Bước 1 hoàn thành:</b> ${sideText}

<b>Bước 2:</b> Chọn kiểu lệnh
    `.trim();

    await this.bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }

  /**
   * Handle order type selection
   */
  private async handleOrderTypeSelection(
    userId: number,
    chatId: number,
    data: string
  ): Promise<void> {
    const orderType = data.split("_")[2]; // "market" or "limit"
    const userState = this.userStates.get(userId);

    if (!userState) return;

    userState.data.orderType = orderType;
    this.userStates.set(userId, userState);

    const sideText =
      userState.data.side === "buy" ? "🟢 MUA (Long)" : "🔴 BÁN (Short)";
    const typeText =
      orderType === "market" ? "📊 Market Order" : "🎯 Limit Order";

    const message = `
<b>📝 ĐẶT LỆNH FUTURES</b>

✅ <b>Bước 2 hoàn thành:</b> ${typeText}

<b>Bước 3:</b> Nhập thông tin giao dịch

<b>1. Symbol (cặp tiền):</b>
<b>Ví dụ:</b> BTC-USDT, ETH-USDT, SOL-USDT
<b>Lưu ý:</b> Bot sẽ tự động thêm -SWAP cho futures

Nhập symbol:
    `.trim();

    await this.bot.sendMessage(chatId, message, { parse_mode: "HTML" });
  }

  /**
   * Handle form input
   */
  private async handleFormInput(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id;
    const text = msg.text?.trim();

    if (!userId || !text) return;

    const userState = this.userStates.get(userId);
    if (!userState || userState.state !== "order_form") return;

    const data = userState.data;

    try {
      if (!data.symbol) {
        // Validate symbol - accept both BTC-USDT and BTC-USDT-SWAP formats
        if (!text.match(/^[A-Z]+-[A-Z]+(-SWAP)?$/)) {
          await this.bot.sendMessage(
            msg.chat.id,
            "❌ Symbol không hợp lệ.\n\n<b>Định dạng chấp nhận:</b>\n• BTC-USDT\n• BTC-USDT-SWAP\n\n<b>Lưu ý:</b> Nếu bạn nhập BTC-USDT, bot sẽ tự động thêm -SWAP cho futures trading."
          );
          return;
        }

        // Auto-add -SWAP if not present for futures trading
        data.symbol = text.endsWith("-SWAP") ? text : `${text}-SWAP`;
        this.userStates.set(userId, userState);

        await this.bot.sendMessage(
          msg.chat.id,
          `✅ Symbol: ${data.symbol}\n\n<b>2. Quantity (số lượng):</b>\nNhập số lượng:`,
          { parse_mode: "HTML" }
        );
      } else if (!data.quantity) {
        // Validate quantity
        const quantity = parseFloat(text);
        if (isNaN(quantity) || quantity <= 0) {
          await this.bot.sendMessage(
            msg.chat.id,
            "❌ Số lượng không hợp lệ. Vui lòng nhập số dương."
          );
          return;
        }

        data.quantity = quantity;
        this.userStates.set(userId, userState);

        if (data.orderType === "limit") {
          await this.bot.sendMessage(
            msg.chat.id,
            `✅ Quantity: ${quantity}\n\n<b>3. Price (giá):</b>\nNhập giá:`
          );
        } else {
          data.price = undefined;
          await this.bot.sendMessage(
            msg.chat.id,
            `✅ Quantity: ${quantity}\n\n<b>3. Leverage (đòn bẩy):</b>\nNhập đòn bẩy (1-125):`
          );
        }
      } else if (!data.price && data.orderType === "limit") {
        // Validate price
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
          await this.bot.sendMessage(
            msg.chat.id,
            "❌ Giá không hợp lệ. Vui lòng nhập số dương."
          );
          return;
        }

        data.price = price;
        this.userStates.set(userId, userState);

        await this.bot.sendMessage(
          msg.chat.id,
          `✅ Price: ${price}\n\n<b>4. Leverage (đòn bẩy):</b>\nNhập đòn bẩy (1-125):`
        );
      } else if (!data.leverage) {
        // Validate leverage
        const leverage = parseInt(text);
        if (isNaN(leverage) || leverage < 1 || leverage > 125) {
          await this.bot.sendMessage(
            msg.chat.id,
            "❌ Đòn bẩy không hợp lệ. Vui lòng nhập từ 1-125."
          );
          return;
        }

        data.leverage = leverage;
        this.userStates.set(userId, userState);

        // Show confirmation
        await this.showOrderConfirmation(msg.chat.id, data);
      }
    } catch (error) {
      await this.bot.sendMessage(
        msg.chat.id,
        `❌ Lỗi xử lý dữ liệu: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Show order confirmation
   */
  private async showOrderConfirmation(
    chatId: number,
    data: OrderFormData
  ): Promise<void> {
    const sideText = data.side === "buy" ? "🟢 MUA (Long)" : "🔴 BÁN (Short)";
    const typeText =
      data.orderType === "market" ? "📊 Market Order" : "🎯 Limit Order";
    const priceText = data.price ? data.price.toString() : "Market Price";

    const message = `
<b>📋 XÁC NHẬN LỆNH</b>

<b>Symbol:</b> ${data.symbol}
<b>Loại:</b> ${sideText}
<b>Kiểu:</b> ${typeText}
<b>Số lượng:</b> ${data.quantity}
<b>Giá:</b> ${priceText}
<b>Đòn bẩy:</b> ${data.leverage}x

<b>⚠️ Xác nhận đặt lệnh này?</b>
    `.trim();

    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Xác nhận", callback_data: "confirm_order" },
          { text: "❌ Hủy", callback_data: "cancel_order" },
        ],
      ],
    };

    await this.bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }

  /**
   * Handle order confirmation
   */
  private async handleOrderConfirmation(
    userId: number,
    chatId: number
  ): Promise<void> {
    const userState = this.userStates.get(userId);
    if (!userState || !userState.data) return;

    const data = userState.data as OrderFormData;

    try {
      await this.bot.sendMessage(chatId, "⏳ Đang đặt lệnh...");

      // Test OKX connection first
      try {
        await this.okxService!.getFuturesBalance();
        console.log("✅ OKX connection test passed");
      } catch (error) {
        console.error("❌ OKX connection test failed:", error);
        await this.bot.sendMessage(
          chatId,
          `❌ <b>Lỗi kết nối OKX:</b>\n${
            error instanceof Error ? error.message : "Unknown error"
          }\n\nVui lòng kiểm tra:\n• API credentials\n• Quyền futures trading\n• Kết nối mạng`
        );
        return;
      }

      // Queue the action
      const actionId = this.botActionService.queueAction({
        type: data.side,
        symbol: data.symbol,
        parameters: {
          symbol: data.symbol,
          quantity: data.quantity,
          price: data.price,
          leverage: data.leverage,
        },
      });

      console.log(`📋 Queued action: ${actionId}`, {
        type: data.side,
        symbol: data.symbol,
        quantity: data.quantity,
        price: data.price,
        leverage: data.leverage,
      });

      // Execute pending actions
      const results = await this.botActionService.executePendingActions();
      const result = results.find((r) => r.actionId === actionId);

      console.log(`📊 Action execution result:`, result);

      if (result && result.success) {
        await this.bot.sendMessage(
          chatId,
          `✅ <b>Lệnh đã được đặt thành công!</b>\n\nOrder ID: ${
            result.result?.orderId || "N/A"
          }\nThời gian: ${new Date().toLocaleString()}`,
          { parse_mode: "HTML" }
        );
      } else {
        await this.bot.sendMessage(
          chatId,
          `❌ <b>Lệnh thất bại!</b>\n\nLỗi: ${
            result?.error || "Unknown error"
          }`,
          { parse_mode: "HTML" }
        );
      }

      // Clear user state
      this.userStates.delete(userId);
    } catch (error) {
      await this.bot.sendMessage(
        chatId,
        `❌ Lỗi khi đặt lệnh: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      this.userStates.delete(userId);
    }
  }

  /**
   * Handle order cancellation
   */
  private async handleOrderCancellation(
    userId: number,
    chatId: number
  ): Promise<void> {
    this.userStates.delete(userId);
    await this.bot.sendMessage(chatId, "❌ Đã hủy đặt lệnh.");
  }
}
