import { OKXService } from "./okx.service";
import { OKXConfig, OKXBalanceAlert } from "../types/market.model";

export class OKXBalanceAlertService {
  private okxService: OKXService;
  private config: OKXConfig;
  private balanceAlertInterval: NodeJS.Timeout | null = null;
  private lastBalanceData: Map<string, number> = new Map();
  private isRunning: boolean = false;

  constructor(config: OKXConfig) {
    this.config = config;
    this.okxService = new OKXService(
      config.apiKey,
      config.apiSecret,
      config.passphrase
    );
  }

  /**
   * Start the balance alert service
   */
  start(): void {
    if (!this.config.balanceAlertsEnabled) {
      console.log("📊 OKX balance alerts are disabled");
      return;
    }

    if (this.isRunning) {
      console.log("📊 OKX balance alert service is already running");
      return;
    }

    if (!this.config.apiKey || !this.config.apiSecret) {
      console.warn(
        "⚠️ OKX API credentials not configured, skipping balance alerts"
      );
      return;
    }

    console.log(
      `📊 Starting OKX balance alerts every ${this.config.balanceAlertInterval} minutes`
    );

    // Run immediately on start
    this.checkAndAlertBalance();

    // Set up interval
    this.balanceAlertInterval = setInterval(
      () => this.checkAndAlertBalance(),
      this.config.balanceAlertInterval * 60 * 1000 // Convert minutes to milliseconds
    );

    this.isRunning = true;
  }

  /**
   * Stop the balance alert service
   */
  stop(): void {
    if (this.balanceAlertInterval) {
      clearInterval(this.balanceAlertInterval);
      this.balanceAlertInterval = null;
    }
    this.isRunning = false;
    console.log("📊 OKX balance alert service stopped");
  }

  /**
   * Check balance and generate alerts
   */
  private async checkAndAlertBalance(): Promise<OKXBalanceAlert | null> {
    try {
      console.log("📊 Checking OKX futures balance...");

      const balances = await this.okxService.getFuturesBalance();

      if (!balances || balances.length === 0) {
        console.log("📊 No futures balance data available");
        return null;
      }

      // Filter balances above threshold
      const significantBalances = balances.filter(
        (balance) => balance.available >= this.config.minBalanceThreshold
      );

      if (significantBalances.length === 0) {
        console.log("📊 No significant balances found");
        return null;
      }

      // Calculate total portfolio value (simplified - would need price data for accurate calculation)
      const totalPortfolioValue = significantBalances.reduce(
        (total, balance) => total + balance.available + balance.locked,
        0
      );

      // Determine alert type based on balance changes
      const alertType = this.determineAlertType(significantBalances);

      const balanceAlert: OKXBalanceAlert = {
        type: "okx_balance",
        timestamp: Date.now(),
        balances: significantBalances.map((balance) => ({
          asset: balance.asset,
          available: balance.available,
          locked: balance.locked,
          ...(balance.marginBalance !== undefined && {
            marginBalance: balance.marginBalance,
          }),
          totalValue: balance.available + balance.locked,
        })),
        totalPortfolioValue,
        alertType,
      };

      // Update last balance data for comparison
      this.updateLastBalanceData(significantBalances);

      console.log(`📊 OKX balance alert generated: ${alertType}`);
      return balanceAlert;
    } catch (error) {
      console.error("❌ Error checking OKX balance:", error);
      return null;
    }
  }

  /**
   * Determine the type of alert based on balance changes
   */
  private determineAlertType(
    balances: any[]
  ): "balance_update" | "low_balance_warning" | "balance_threshold_breach" {
    // Check for significant changes in balances
    let hasSignificantChange = false;
    let hasLowBalance = false;

    for (const balance of balances) {
      const lastBalance = this.lastBalanceData.get(balance.asset) || 0;
      const currentBalance = balance.available + balance.locked;

      // Check for significant change (more than 10%)
      if (lastBalance > 0) {
        const changePercent =
          Math.abs(currentBalance - lastBalance) / lastBalance;
        if (changePercent > 0.1) {
          hasSignificantChange = true;
        }
      }

      // Check for low balance warning
      if (currentBalance < this.config.minBalanceThreshold * 10) {
        hasLowBalance = true;
      }
    }

    if (hasLowBalance) {
      return "low_balance_warning";
    } else if (hasSignificantChange) {
      return "balance_threshold_breach";
    } else {
      return "balance_update";
    }
  }

  /**
   * Update the last balance data for comparison
   */
  private updateLastBalanceData(balances: any[]): void {
    for (const balance of balances) {
      this.lastBalanceData.set(
        balance.asset,
        balance.available + balance.locked
      );
    }
  }

  /**
   * Get current service status
   */
  getStatus(): {
    isRunning: boolean;
    config: OKXConfig;
    lastBalanceCount: number;
  } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
      lastBalanceCount: this.lastBalanceData.size,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OKXConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    // Recreate OKX service with new credentials if they changed
    if (newConfig.apiKey || newConfig.apiSecret) {
      this.okxService = new OKXService(
        this.config.apiKey,
        this.config.apiSecret,
        this.config.passphrase
      );
    }

    if (wasRunning && this.config.balanceAlertsEnabled) {
      this.start();
    }

    console.log("📝 OKX balance alert service config updated");
  }

  /**
   * Test OKX connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.config.apiKey || !this.config.apiSecret) {
        console.log("⚠️ OKX API credentials not configured");
        return false;
      }

      await this.okxService.getFuturesBalance();
      console.log("✅ OKX connection test successful");
      return true;
    } catch (error) {
      console.error("❌ OKX connection test failed:", error);
      return false;
    }
  }

  /**
   * Get a one-time balance alert (for manual testing)
   */
  async getBalanceAlert(): Promise<OKXBalanceAlert | null> {
    return this.checkAndAlertBalance();
  }
}
