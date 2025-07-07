import type { DebugInfo, DirtyFlags } from "@/types";

export class DebugSystem {
  private enabled: boolean = false;
  private debugInfo: DebugInfo;
  private renderTimes: number[] = [];
  private lastFrameTime: number = 0;

  constructor() {
    this.debugInfo = this.createInitialDebugInfo();
  }

  public enable(): void {
    this.enabled = true;
    this.log("Debug mode enabled");
  }

  public disable(): void {
    this.enabled = false;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public log(message: string, data?: any): void {
    if (!this.enabled) return;

    const timestamp = performance.now().toFixed(2);
    const prefix = `[WaveformRenderer Debug ${timestamp}ms]`;

    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  public updateRenderMetrics(renderTime: number): void {
    if (!this.enabled) return;

    this.debugInfo.performance.totalRenders++;
    this.debugInfo.performance.lastRenderTime = renderTime;

    // Keep last 60 render times for averaging
    this.renderTimes.push(renderTime);
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }

    this.debugInfo.performance.averageRenderTime =
      this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;

    // Calculate FPS
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const deltaTime = now - this.lastFrameTime;
      this.debugInfo.performance.fps = Math.round(1000 / deltaTime);
    }
    this.lastFrameTime = now;
  }

  public updateCacheMetrics(buildTime: number): void {
    if (!this.enabled) return;

    this.debugInfo.performance.cacheBuilds++;
    this.debugInfo.performance.lastCacheBuildTime = buildTime;
  }

  public updateState(
    canvas: HTMLCanvasElement,
    peaksCount: number,
    barsRendered: number,
    cacheValid: boolean,
    dirtyFlags: DirtyFlags,
  ): void {
    if (!this.enabled) return;

    const rect = canvas.getBoundingClientRect();
    this.debugInfo.state = {
      canvasSize: { width: rect.width, height: rect.height },
      peaksCount,
      barsRendered,
      cacheValid,
      dirtyFlags: { ...dirtyFlags },
    };
  }

  public incrementSeeks(): void {
    this.debugInfo.events.totalSeeks++;
  }

  public incrementResizes(): void {
    this.debugInfo.events.totalResizes++;
  }

  public incrementErrors(): void {
    this.debugInfo.events.totalErrors++;
  }

  public getInfo(): DebugInfo {
    return JSON.parse(JSON.stringify(this.debugInfo)); // Deep copy
  }

  public reset(): void {
    this.debugInfo.performance.totalRenders = 0;
    this.debugInfo.performance.averageRenderTime = 0;
    this.debugInfo.performance.cacheBuilds = 0;
    this.debugInfo.events.totalSeeks = 0;
    this.debugInfo.events.totalResizes = 0;
    this.debugInfo.events.totalErrors = 0;
    this.renderTimes = [];
    this.log("Debug counters reset");
  }

  public logPerformanceSummary(): void {
    if (!this.enabled || this.debugInfo.performance.totalRenders % 60 !== 0) return;

    this.log("Performance summary", {
      totalRenders: this.debugInfo.performance.totalRenders,
      averageRenderTime: this.debugInfo.performance.averageRenderTime.toFixed(2) + "ms",
      fps: this.debugInfo.performance.fps,
      cacheBuilds: this.debugInfo.performance.cacheBuilds,
    });
  }

  private createInitialDebugInfo(): DebugInfo {
    return {
      performance: {
        lastRenderTime: 0,
        averageRenderTime: 0,
        totalRenders: 0,
        fps: 0,
        cacheBuilds: 0,
        lastCacheBuildTime: 0,
      },
      state: {
        canvasSize: { width: 0, height: 0 },
        peaksCount: 0,
        barsRendered: 0,
        cacheValid: false,
        dirtyFlags: { peaks: true, options: true, size: true, progress: true },
      },
      events: {
        totalSeeks: 0,
        totalResizes: 0,
        totalErrors: 0,
      },
    };
  }
}
