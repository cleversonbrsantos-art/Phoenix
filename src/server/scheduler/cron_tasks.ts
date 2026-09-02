import { blackboard } from "../core/blackboard";

export interface ScheduledTask {
  id: string;
  userId: string;
  triggerTime: number;
  action: string;
}

/**
 * Dynamic Scheduling (Cron Tasks)
 * Reads from memory or receives commands from Planning Agent to schedule triggers.
 */
export class CronTasks {
  private tasks: ScheduledTask[] = [];
  private timer: NodeJS.Timeout | null = null;

  public start() {
    console.log("[Scheduler] Active tasks module started.");
    this.timer = setInterval(() => this.tick(), 60000); // Tick every 1 min
  }

  public scheduleTask(userId: string, delayMs: number, action: string) {
    const task: ScheduledTask = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      triggerTime: Date.now() + delayMs,
      action
    };
    this.tasks.push(task);
    console.log(`[Scheduler] Task "${action}" scheduled for ${userId} in ${delayMs / 1000} seconds.`);
  }

  private tick() {
    const now = Date.now();
    const pending = this.tasks.filter(t => t.triggerTime <= now);
    this.tasks = this.tasks.filter(t => t.triggerTime > now);

    pending.forEach(task => {
      console.log(`[Scheduler] Firing event for ${task.userId}: ${task.action}`);
      // Future logic: Emit an event to the Frontend via WebSocket when a scheduled task expires.
    });
  }
}

export const cronTasks = new CronTasks();
