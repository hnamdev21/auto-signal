import { OKXService, OrderAction, PositionType } from "./okx.service";

export interface BotAction {
  id: string;
  type: "buy" | "sell" | "close_position" | "adjust_leverage" | "custom";
  symbol: string;
  parameters: Record<string, any>;
  timestamp: number;
  status: "pending" | "executing" | "completed" | "failed";
  result?: any;
  error?: string;
}

export interface ActionExecutor {
  canExecute(action: BotAction): boolean;
  execute(action: BotAction): Promise<BotActionResult>;
}

export interface BotActionResult {
  success: boolean;
  actionId: string;
  result?: any;
  error?: string;
  timestamp: number;
}

export class OKXActionExecutor implements ActionExecutor {
  private okxService: OKXService;

  constructor(okxService: OKXService) {
    this.okxService = okxService;
  }

  canExecute(action: BotAction): boolean {
    return ["buy", "sell", "close_position", "adjust_leverage"].includes(
      action.type
    );
  }

  async execute(action: BotAction): Promise<BotActionResult> {
    try {
      let result: any;

      switch (action.type) {
        case "buy":
          result = await this.executeBuyAction(action);
          break;
        case "sell":
          result = await this.executeSellAction(action);
          break;
        case "close_position":
          result = await this.executeClosePositionAction(action);
          break;
        case "adjust_leverage":
          result = await this.executeAdjustLeverageAction(action);
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      return {
        success: true,
        actionId: action.id,
        result,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        actionId: action.id,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      };
    }
  }

  private async executeBuyAction(action: BotAction): Promise<any> {
    const { symbol, quantity, price, leverage = 20 } = action.parameters;

    if (!symbol || !quantity) {
      throw new Error("Symbol and quantity are required for buy action");
    }

    return await this.okxService.placeFuturesOrder(
      symbol,
      OrderAction.Open,
      PositionType.Long,
      quantity,
      price,
      price ? "limit" : "market",
      leverage
    );
  }

  private async executeSellAction(action: BotAction): Promise<any> {
    const { symbol, quantity, price, leverage = 20 } = action.parameters;

    if (!symbol || !quantity) {
      throw new Error("Symbol and quantity are required for sell action");
    }

    return await this.okxService.placeFuturesOrder(
      symbol,
      OrderAction.Open,
      PositionType.Short,
      quantity,
      price,
      price ? "limit" : "market",
      leverage
    );
  }

  private async executeClosePositionAction(action: BotAction): Promise<any> {
    const { symbol, orderId } = action.parameters;

    if (!symbol || !orderId) {
      throw new Error(
        "Symbol and orderId are required for close position action"
      );
    }

    return await this.okxService.closeFuturesOrder(orderId, symbol);
  }

  private async executeAdjustLeverageAction(action: BotAction): Promise<any> {
    // This would require additional OKX API methods for leverage adjustment
    // For now, we'll return a placeholder
    throw new Error("Leverage adjustment not yet implemented");
  }
}

export class BotActionService {
  private actionExecutors: ActionExecutor[] = [];
  private pendingActions: Map<string, BotAction> = new Map();
  private actionHistory: BotAction[] = [];
  private isProcessing: boolean = false;

  constructor() {
    // Initialize with default executors
  }

  /**
   * Add an action executor
   */
  addExecutor(executor: ActionExecutor): void {
    this.actionExecutors.push(executor);
  }

  /**
   * Queue an action for execution
   */
  queueAction(action: Omit<BotAction, "id" | "timestamp" | "status">): string {
    const actionId = `action_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const fullAction: BotAction = {
      ...action,
      id: actionId,
      timestamp: Date.now(),
      status: "pending",
    };

    this.pendingActions.set(actionId, fullAction);
    console.log(`📋 Action queued: ${actionId} (${action.type})`);

    return actionId;
  }

  /**
   * Execute all pending actions
   */
  async executePendingActions(): Promise<BotActionResult[]> {
    if (this.isProcessing) {
      console.log("⏳ Action processing already in progress");
      return [];
    }

    this.isProcessing = true;
    const results: BotActionResult[] = [];

    try {
      const actions = Array.from(this.pendingActions.values());

      for (const action of actions) {
        try {
          action.status = "executing";

          const executor = this.findExecutor(action);
          if (!executor) {
            throw new Error(
              `No executor found for action type: ${action.type}`
            );
          }

          const result = await executor.execute(action);
          results.push(result);

          if (result.success) {
            action.status = "completed";
            action.result = result.result;
          } else {
            action.status = "failed";
            action.error = result.error || "";
          }

          // Remove from pending and add to history
          this.pendingActions.delete(action.id);
          this.actionHistory.push(action);

          console.log(
            `✅ Action executed: ${action.id} - ${
              result.success ? "SUCCESS" : "FAILED"
            }`
          );
        } catch (error) {
          action.status = "failed";
          action.error =
            error instanceof Error ? error.message : "Unknown error";

          this.pendingActions.delete(action.id);
          this.actionHistory.push(action);

          results.push({
            success: false,
            actionId: action.id,
            error: action.error,
            timestamp: Date.now(),
          });

          console.error(`❌ Action failed: ${action.id}`, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Find an executor for the given action
   */
  private findExecutor(action: BotAction): ActionExecutor | null {
    return (
      this.actionExecutors.find((executor) => executor.canExecute(action)) ||
      null
    );
  }

  /**
   * Get action status
   */
  getActionStatus(actionId: string): BotAction | null {
    return (
      this.pendingActions.get(actionId) ||
      this.actionHistory.find((action) => action.id === actionId) ||
      null
    );
  }

  /**
   * Get all pending actions
   */
  getPendingActions(): BotAction[] {
    return Array.from(this.pendingActions.values());
  }

  /**
   * Get action history
   */
  getActionHistory(limit: number = 50): BotAction[] {
    return this.actionHistory.slice(-limit);
  }

  /**
   * Cancel a pending action
   */
  cancelAction(actionId: string): boolean {
    const action = this.pendingActions.get(actionId);
    if (action && action.status === "pending") {
      action.status = "failed";
      action.error = "Cancelled by user";

      this.pendingActions.delete(actionId);
      this.actionHistory.push(action);

      console.log(`🚫 Action cancelled: ${actionId}`);
      return true;
    }
    return false;
  }

  /**
   * Get service status
   */
  getStatus(): {
    isProcessing: boolean;
    pendingCount: number;
    historyCount: number;
    executorCount: number;
  } {
    return {
      isProcessing: this.isProcessing,
      pendingCount: this.pendingActions.size,
      historyCount: this.actionHistory.length,
      executorCount: this.actionExecutors.length,
    };
  }

  /**
   * Clear action history
   */
  clearHistory(): void {
    this.actionHistory = [];
    console.log("🗑️ Action history cleared");
  }
}
