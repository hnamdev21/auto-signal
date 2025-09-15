/**
 * Utility functions for scheduling tasks at specific UTC times
 */

export class UTCScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Schedule a function to run every minute at the start of the minute (UTC)
   * @param callback Function to execute every minute
   */
  startMinuteScheduler(callback: () => void | Promise<void>): void {
    if (this.isRunning) {
      console.warn("Scheduler is already running");
      return;
    }

    this.isRunning = true;
    console.log("🕐 Starting UTC minute scheduler...");

    // Calculate milliseconds until next minute
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setUTCSeconds(0, 0);
    nextMinute.setUTCMinutes(nextMinute.getUTCMinutes() + 1);

    const msUntilNextMinute = nextMinute.getTime() - now.getTime();

    // Wait until the next minute, then start the interval
    setTimeout(() => {
      // Execute immediately at the start of the minute
      this.executeCallback(callback);

      // Then set up the interval for every minute
      this.intervalId = setInterval(() => {
        this.executeCallback(callback);
      }, 60000); // 60 seconds = 1 minute

      console.log("✅ UTC minute scheduler started successfully");
    }, msUntilNextMinute);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("⏹️ UTC scheduler stopped");
  }

  /**
   * Execute callback with error handling
   */
  private async executeCallback(
    callback: () => void | Promise<void>
  ): Promise<void> {
    try {
      const now = new Date();
      console.log(`🔄 Executing scheduled task at ${now.toISOString()}`);
      await callback();
    } catch (error) {
      console.error("❌ Error in scheduled task:", error);
    }
  }

  /**
   * Get current UTC time in a readable format
   */
  getCurrentUTCTime(): string {
    return new Date().toISOString();
  }

  /**
   * Get seconds until next minute
   */
  getSecondsUntilNextMinute(): number {
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setUTCSeconds(0, 0);
    nextMinute.setUTCMinutes(nextMinute.getUTCMinutes() + 1);

    return Math.floor((nextMinute.getTime() - now.getTime()) / 1000);
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}
