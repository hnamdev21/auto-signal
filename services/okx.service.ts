enum OrderAction {
  Open = "open",
  Close = "close",
}

enum PositionType {
  Long = "long",
  Short = "short",
}

interface FuturesOrder {
  orderId: string;
  symbol: string;
  action: OrderAction;
  position: PositionType;
  quantity: number;
  price?: number;
  status: "open" | "filled" | "canceled";
  leverage: number;
  timestamp: number;
}

interface Balance {
  asset: string;
  available: number;
  locked: number;
  marginBalance?: number;
}

interface OrderResponse {
  success: boolean;
  orderId?: string;
  message?: string;
}

export class OKXService {
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;
  private baseUrl: string = "https://www.okx.com/api/v5";

  constructor(apiKey: string, apiSecret: string, passphrase: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }

  private mapActionToSide(
    action: OrderAction,
    position: PositionType
  ): { side: "buy" | "sell"; posSide: "long" | "short" } {
    if (action === OrderAction.Open) {
      return {
        side: position === PositionType.Long ? "buy" : "sell",
        posSide: position,
      };
    } else {
      return {
        side: position === PositionType.Long ? "sell" : "buy",
        posSide: position,
      };
    }
  }

  async getActiveFuturesOrders(symbol?: string): Promise<FuturesOrder[]> {
    try {
      const queryParams = symbol ? `?instId=${symbol}` : "";
      const response = await this.makeRequest(
        "GET",
        `/trade/orders-pending${queryParams}`,
        { instType: "FUTURES" }
      );

      return response.data.map((order: any) => ({
        orderId: order.ordId,
        symbol: order.instId,
        action:
          order.side === "buy" && order.posSide === "long"
            ? OrderAction.Open
            : order.side === "sell" && order.posSide === "short"
            ? OrderAction.Open
            : OrderAction.Close,
        position: order.posSide,
        quantity: parseFloat(order.sz),
        price: order.px ? parseFloat(order.px) : undefined,
        status: order.state,
        leverage: parseFloat(order.lever),
        timestamp: parseInt(order.cTime),
      }));
    } catch (error: any) {
      throw new Error(
        `Failed to fetch active futures orders: ${error.message}`
      );
    }
  }

  async placeFuturesOrder(
    symbol: string,
    action: OrderAction,
    position: PositionType,
    quantity: number,
    price?: number,
    orderType: "limit" | "market" = "limit",
    leverage: number = 20
  ): Promise<OrderResponse> {
    try {
      const { side, posSide } = this.mapActionToSide(action, position);

      if (quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }
      if (orderType === "limit" && !price) {
        throw new Error("Price is required for limit order");
      }

      const payload = {
        instId: symbol,
        tdMode: "cross",
        side,
        posSide,
        ordType: orderType,
        sz: quantity.toString(),
        lever: leverage.toString(),
        ...(price && orderType === "limit" ? { px: price.toString() } : {}),
      };

      const response = await this.makeRequest("POST", "/trade/order", payload);

      return {
        success: response.code === "0",
        orderId: response.data[0]?.ordId,
        message: response.msg,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to place futures order: ${error.message}`,
      };
    }
  }

  async closeFuturesOrder(
    orderId: string,
    symbol: string
  ): Promise<OrderResponse> {
    try {
      const payload = {
        instId: symbol,
        ordId: orderId,
      };

      const response = await this.makeRequest(
        "POST",
        "/trade/cancel-order",
        payload
      );

      return {
        success: response.code === "0",
        orderId,
        message: response.msg,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to cancel futures order: ${error.message}`,
      };
    }
  }

  async getFuturesBalance(asset?: string): Promise<Balance[]> {
    try {
      const response = await this.makeRequest("GET", "/account/balance", {
        instType: "FUTURES",
      });

      return response.data[0].details
        .map((bal: any) => ({
          asset: bal.ccy,
          available: parseFloat(bal.availBal),
          locked: parseFloat(bal.frozenBal),
          marginBalance: parseFloat(bal.marginBal),
        }))
        .filter((bal: Balance) => !asset || bal.asset === asset);
    } catch (error: any) {
      throw new Error(`Failed to fetch futures balance: ${error.message}`);
    }
  }

  private async makeRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5${endpoint}`;
    const queryString =
      method === "GET" && body
        ? `?${new URLSearchParams(body).toString()}`
        : "";
    const bodyString = method === "POST" && body ? JSON.stringify(body) : "";

    const signature = this.createSignature(
      timestamp,
      method,
      requestPath + queryString,
      bodyString
    );

    const headers = {
      "OK-ACCESS-KEY": this.apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": this.passphrase,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
      body: bodyString || null,
    };

    const response = await fetch(
      `${this.baseUrl}${endpoint}${queryString}`,
      options
    );
    const data = await response.json();

    if (data.code !== "0") {
      throw new Error(data.msg || "API request failed");
    }

    return data;
  }

  private createSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string
  ): string {
    const crypto = require("crypto");
    const message = timestamp + method + requestPath + body;
    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(message)
      .digest("base64");
  }
}

export { OrderAction, PositionType };
