import { sql } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { cleanupIdleSandboxes, reseedSampleStudio } from './demoProvisioningService.js';

export function getYangonDateTime(date: Date = new Date()) {
  const yangonMs = date.getTime() + (6 * 60 + 30) * 60 * 1000;
  const yangonDate = new Date(yangonMs);
  const dateStr = yangonDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const hours = yangonDate.getUTCHours();
  const minutes = yangonDate.getUTCMinutes();
  return { dateStr, hours, minutes };
}

export interface DemoSchedulerOptions {
  nowFn?: () => Date;
  intervalMs?: number;
  runCleanupFn?: () => Promise<any>;
  runReseedFn?: () => Promise<any>;
}

export class DemoScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private nowFn: () => Date;
  private intervalMs: number;
  private runCleanupFn: () => Promise<any>;
  private runReseedFn: () => Promise<any>;

  public lastCleanupDate: string | null = null;
  public lastReseedDate: string | null = null;
  private initializedFromDb = false;

  constructor(options?: DemoSchedulerOptions) {
    this.nowFn = options?.nowFn || (() => new Date());
    this.intervalMs = options?.intervalMs || 60000; // default 1 minute
    this.runCleanupFn = options?.runCleanupFn || (() => cleanupIdleSandboxes(7));
    this.runReseedFn = options?.runReseedFn || (() => reseedSampleStudio());
  }

  private async initDbState(): Promise<void> {
    if (this.initializedFromDb) return;
    this.initializedFromDb = true;

    const db = getDb();
    if (!db) return;

    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS demo.demo_cron_state (
          job_name TEXT PRIMARY KEY,
          last_run_date TEXT NOT NULL,
          last_run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);

      const rows = await db.execute(sql`SELECT job_name, last_run_date FROM demo.demo_cron_state;`);
      for (const r of rows as any[]) {
        if (r.job_name === 'cleanup') {
          this.lastCleanupDate = r.last_run_date;
        } else if (r.job_name === 'reseed') {
          this.lastReseedDate = r.last_run_date;
        }
      }
    } catch (err) {
      console.warn('[Demo Scheduler] Warning loading DB cron state:', err);
    }
  }

  private async persistRunDate(jobName: 'cleanup' | 'reseed', dateStr: string): Promise<void> {
    const db = getDb();
    if (!db) return;

    try {
      await db.execute(sql`
        INSERT INTO demo.demo_cron_state (job_name, last_run_date, last_run_at)
        VALUES (${jobName}, ${dateStr}, NOW())
        ON CONFLICT (job_name) DO UPDATE SET
          last_run_date = ${dateStr},
          last_run_at = NOW();
      `);
    } catch (err) {
      console.warn(`[Demo Scheduler] Warning saving run state for ${jobName}:`, err);
    }
  }

  public async tick(): Promise<{ ranCleanup: boolean; ranReseed: boolean }> {
    await this.initDbState();

    const now = this.nowFn();
    const { dateStr, hours } = getYangonDateTime(now);
    let ranCleanup = false;
    let ranReseed = false;

    // 1. Nightly cleanup of sandboxes idle > 7 days (runs once per day)
    if (this.lastCleanupDate !== dateStr) {
      try {
        console.log(`[Demo Scheduler] Running nightly idle sandbox cleanup for day: ${dateStr}...`);
        const result = await this.runCleanupFn();
        this.lastCleanupDate = dateStr;
        await this.persistRunDate('cleanup', dateStr);
        ranCleanup = true;
        console.log(`[Demo Scheduler] Cleanup completed for day ${dateStr}. Result:`, result);
      } catch (err) {
        console.error(`[Demo Scheduler] Cleanup failed for day ${dateStr}:`, err);
      }
    }

    // 2. Reseed sample-studio at 03:00 Asia/Yangon (UTC+06:30) (runs once per day when hours >= 3)
    if (hours >= 3 && this.lastReseedDate !== dateStr) {
      try {
        console.log(`[Demo Scheduler] Running 03:00 Asia/Yangon sample-studio reseed for day: ${dateStr}...`);
        await this.runReseedFn();
        this.lastReseedDate = dateStr;
        await this.persistRunDate('reseed', dateStr);
        ranReseed = true;
        console.log(`[Demo Scheduler] Reseed of sample-studio completed for day ${dateStr}.`);
      } catch (err) {
        console.error(`[Demo Scheduler] Reseed failed for day ${dateStr}:`, err);
      }
    }

    return { ranCleanup, ranReseed };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run first tick immediately
    this.tick().catch((err) => console.error('[Demo Scheduler] Error on initial tick:', err));

    this.timer = setInterval(() => {
      this.tick().catch((err) => console.error('[Demo Scheduler] Error on scheduled tick:', err));
    }, this.intervalMs);

    console.log(`[Demo Scheduler] In-process scheduler started (interval: ${this.intervalMs}ms).`);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[Demo Scheduler] In-process scheduler stopped.');
  }
}
