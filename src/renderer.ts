import type { DirtyFlags, ProgressLineOptions, WaveformEvents, WaveformOptions } from "@/types";

import { DEFAULT_OPTIONS } from "@/constants";
import { EventEmitter } from "@/events";
import { normalizePeaks, normalizeProgress, resizeCanvas, setupCanvasContext } from "@/utils";

import { CacheManager } from "./cache-manager";
import { DebugSystem } from "./debug-system";
import { EventHandlerManager } from "./event-handler";
import { RenderingEngine, type CustomRenderer, type RenderHook } from "./rendering-engine";

export default class WaveformRenderer extends EventEmitter<WaveformEvents> {
    private readonly canvas!: HTMLCanvasElement;
    private readonly ctx!: CanvasRenderingContext2D;
    private readonly devicePixelRatio!: number;

    // Core modules
    private readonly cacheManager!: CacheManager;
    private readonly debugSystem!: DebugSystem;
    private readonly eventHandler!: EventHandlerManager;
    private readonly renderingEngine!: RenderingEngine;

    // State
    private isDestroyed: boolean = false;
    private options!: Required<WaveformOptions>;
    private peaks: number[] = [];
    private dirtyFlags: DirtyFlags = {
        peaks: true,
        options: true,
        size: true,
        progress: true,
    };

    // Render throttling
    private frameRequest?: number;
    private lastRenderTime = 0;
    private readonly minRenderInterval = 16; // ~60fps max

    constructor(canvas: HTMLCanvasElement, peaks: number[], options: Partial<WaveformOptions> = {}) {
        super();

        const startTime = performance.now();

        try {
            this.validateInputs(canvas, peaks);

            this.canvas = canvas;
            this.ctx = this.getCanvasContext(canvas);
            this.peaks = normalizePeaks(peaks);
            this.options = this.mergeOptions(options);
            this.devicePixelRatio = Math.max(window.devicePixelRatio || 1, this.options.minPixelRatio);

            // Initialize modules
            this.cacheManager = new CacheManager();
            this.debugSystem = new DebugSystem();
            this.renderingEngine = new RenderingEngine(this.ctx, {
                onRenderStart: () => this.emit("renderStart", undefined),
                onRenderComplete: () => this.emit("renderComplete", undefined),
            });
            this.eventHandler = new EventHandlerManager(this.canvas, {
                onSeek: progress => this.handleSeek(progress),
                onResize: dimensions => this.handleResize(dimensions),
                onError: error => this.handleError(error),
            });

            if (this.options.debug) {
                this.debugSystem.enable();
            }

            this.setupCanvas();
            this.scheduleRender();

            const initTime = performance.now() - startTime;
            this.debugSystem.log(`Initialized in ${initTime.toFixed(2)}ms`);

            requestAnimationFrame(() => this.emit("ready", undefined));
        } catch (e) {
            this.handleError(e);
        }
    }

    public destroy(): void {
        if (this.isDestroyed) return;

        this.debugSystem.log("Destroying renderer");
        this.emit("destroy", undefined);
        this.isDestroyed = true;

        this.eventHandler.destroy();
        this.cancelPendingRender();
        this.cacheManager.clear();
    }

    public setOptions(options: Partial<WaveformOptions>): void {
        if (this.isDestroyed) return;

        const startTime = performance.now();
        const oldOptions = this.options;

        this.options = this.mergeOptions(options, this.options);

        if (options.debug !== undefined) {
            if (options.debug) {
                this.debugSystem.enable();
            } else {
                this.debugSystem.disable();
            }
        }

        this.updateDirtyFlags(oldOptions, this.options);
        this.setupContext();
        this.scheduleRender();

        const setOptionsTime = performance.now() - startTime;
        this.debugSystem.log(`setOptions completed in ${setOptionsTime.toFixed(2)}ms`);
    }

    public setPeaks(peaks: number[]): void {
        if (this.isDestroyed) return;

        const startTime = performance.now();

        try {
            if (!Array.isArray(peaks) || peaks.length === 0) {
                throw new Error("Peaks array must not be empty");
            }

            this.peaks = normalizePeaks([...peaks]);
            this.dirtyFlags.peaks = true;
            this.cacheManager.invalidate();
            this.scheduleRender();

            const setPeaksTime = performance.now() - startTime;
            this.debugSystem.log(`setPeaks completed in ${setPeaksTime.toFixed(2)}ms, ${peaks.length} peaks`);
        } catch (e) {
            this.handleError(e);
        }
    }

    public setProgress(progress: number): void {
        if (this.isDestroyed) return;

        try {
            const normalizedProgress = normalizeProgress(progress);

            // Avoid unnecessary updates
            if (Math.abs(this.options.progress - normalizedProgress) < 0.001) {
                return;
            }

            this.options.progress = normalizedProgress;
            this.dirtyFlags.progress = true;
            this.emit("progressChange", normalizedProgress);
            this.scheduleRender();

            this.debugSystem.log(`Progress set to ${(normalizedProgress * 100).toFixed(1)}%`);
        } catch (e) {
            this.handleError(e);
        }
    }

    public setProgressLineOptions(options: null | Partial<ProgressLineOptions>): void {
        if (this.isDestroyed) return;

        try {
            if (options) {
                this.options.progressLine = {
                    ...DEFAULT_OPTIONS.progressLine,
                    ...this.options.progressLine,
                    ...options,
                };
            } else {
                this.options.progressLine = null;
            }

            this.dirtyFlags.options = true;
            this.scheduleRender();

            this.debugSystem.log(`Progress line options ${options ? "updated" : "disabled"}`);
        } catch (e) {
            this.handleError(e);
        }
    }

    // Debug API
    public setDebug(enabled: boolean): void {
        if (enabled) {
            this.debugSystem.enable();
        } else {
            this.debugSystem.disable();
        }
        this.options.debug = enabled;
    }

    public getDebugInfo() {
        return this.debugSystem.getInfo();
    }

    public resetDebugCounters(): void {
        this.debugSystem.reset();
    }

    // Rendering customization API
    public setCustomRenderer(renderer?: CustomRenderer): void {
        this.renderingEngine.setCustomRenderer(renderer);
        this.debugSystem.log(`Custom renderer ${renderer ? "set" : "cleared"}`);
    }

    public setRenderHooks(hooks: RenderHook): void {
        this.renderingEngine.setHooks(hooks);
        this.debugSystem.log("Render hooks configured");
    }

    public clearRenderHooks(): void {
        this.renderingEngine.clearHooks();
        this.debugSystem.log("Render hooks cleared");
    }

    private validateInputs(canvas: HTMLCanvasElement, peaks: number[]): void {
        if (!canvas) {
            throw new Error("Canvas element is required");
        }

        if (!Array.isArray(peaks) || peaks.length === 0) {
            throw new Error("Peaks array is required and must not be empty");
        }
    }

    private getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Could not get 2D context from canvas");
        }
        return context;
    }

    private mergeOptions(
        newOptions: Partial<WaveformOptions>,
        baseOptions?: Required<WaveformOptions>
    ): Required<WaveformOptions> {
        const base = baseOptions || DEFAULT_OPTIONS;

        return {
            ...base,
            ...newOptions,
            progressLine:
                newOptions.progressLine !== undefined
                    ? newOptions.progressLine
                        ? {
                              ...DEFAULT_OPTIONS.progressLine,
                              ...base.progressLine,
                              ...newOptions.progressLine,
                          }
                        : null
                    : base.progressLine,
        };
    }

    private updateDirtyFlags(oldOptions: Required<WaveformOptions>, newOptions: Required<WaveformOptions>): void {
        const layoutKeys: (keyof WaveformOptions)[] = [
            "amplitude",
            "backgroundColor",
            "barWidth",
            "borderColor",
            "borderRadius",
            "borderWidth",
            "color",
            "gap",
            "position",
        ];

        const hasLayoutChanges = layoutKeys.some(key => oldOptions[key] !== newOptions[key]);

        if (hasLayoutChanges) {
            this.dirtyFlags.options = true;
            this.cacheManager.invalidate();
            this.debugSystem.log("Layout-affecting options changed, invalidating cache");
        }

        const progressChanged = oldOptions.progress !== newOptions.progress;
        if (progressChanged && !hasLayoutChanges) {
            this.dirtyFlags.progress = true;
            this.debugSystem.log("Progress changed");
        }
    }

    private setupCanvas(): void {
        resizeCanvas(this.canvas, this.devicePixelRatio);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
        this.setupContext();
    }

    private setupContext(): void {
        setupCanvasContext(this.ctx, this.options.smoothing);
    }

    private scheduleRender(): void {
        if (this.frameRequest) {
            return; // Already scheduled
        }

        this.frameRequest = requestAnimationFrame(() => {
            this.frameRequest = undefined;
            this.render();
        });
    }

    private cancelPendingRender(): void {
        if (this.frameRequest) {
            cancelAnimationFrame(this.frameRequest);
            this.frameRequest = undefined;
        }
    }

    private render(): void {
        if (this.isDestroyed) return;

        // Throttle rendering to avoid excessive redraws
        const now = performance.now();
        if (now - this.lastRenderTime < this.minRenderInterval) {
            this.scheduleRender();
            return;
        }
        this.lastRenderTime = now;

        const renderStartTime = performance.now();

        try {
            const cache = this.cacheManager.getCache(this.canvas, this.devicePixelRatio, this.peaks, this.options);
            const staticPath = this.cacheManager.createStaticPath(cache, this.options.borderRadius);

            this.renderingEngine.render(cache, this.options, staticPath);

            // Reset dirty flags
            this.dirtyFlags = {
                peaks: false,
                options: false,
                size: false,
                progress: false,
            };

            const renderTime = performance.now() - renderStartTime;
            this.debugSystem.updateRenderMetrics(renderTime);
            this.debugSystem.updateState(
                this.canvas,
                this.peaks.length,
                cache.totalBars,
                this.cacheManager.isValid(),
                this.dirtyFlags
            );
            this.debugSystem.logPerformanceSummary();
        } catch (e) {
            this.handleError(e);
        }
    }

    private handleSeek(progress: number): void {
        this.debugSystem.incrementSeeks();
        this.debugSystem.log(`Seek to ${(progress * 100).toFixed(1)}%`);
        this.emit("seek", progress);
    }

    private handleResize(dimensions: { width: number; height: number }): void {
        this.debugSystem.incrementResizes();
        this.debugSystem.log(`Canvas resized to ${dimensions.width}x${dimensions.height}`);

        this.emit("resize", dimensions);
        this.dirtyFlags.size = true;
        this.cacheManager.invalidate();
        this.setupCanvas();
        this.scheduleRender();
    }

    private handleError(e: unknown): void {
        this.debugSystem.incrementErrors();
        const error = e instanceof Error ? e : new Error("An unknown error occurred");
        this.debugSystem.log("Error occurred", error.message);
        console.error("WaveformRenderer error:", e);
        this.emit("error", error);
    }
}
