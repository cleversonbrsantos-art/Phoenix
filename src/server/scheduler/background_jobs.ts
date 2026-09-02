import { consolidation } from "../core/consolidation";

/**
 * Background Jobs
 * Executes nightly or periodic maintenance that does not depend on the current interaction.
 */
export class BackgroundJobs {
  private timer: NodeJS.Timeout | null = null;

  public start() {
    console.log("[BackgroundJobs] Neural maintenance deep-sleep services enabled.");

    // Simulates the execution of "batch jobs" every 60 minutes.
    // In practice, can be scheduled for 03:00 AM.
    this.timer = setInterval(() => {
      console.log("[BackgroundJobs] Running deep consolidation window (Batch)...");
      consolidation.runConsolidation("admin_1");
    }, 3600000);
  }
}

export const backgroundJobs = new BackgroundJobs();
