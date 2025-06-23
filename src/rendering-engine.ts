import { drawProgressLine } from "@/utils";

import type { CachedBarData, ProgressLineOptions, RenderCache, WaveformOptions } from "@/types";

export interface RenderingCallbacks {
    onRenderStart: () => void;
    onRenderComplete: () => void;
}

export interface CustomRenderer {
    render(
        ctx: CanvasRenderingContext2D,
        cache: RenderCache,
        options: Required<WaveformOptions>,
        staticPath?: Path2D
    ): boolean; // Return true if custom rendering handled everything
}

export interface RenderHook {
    beforeRender?: (ctx: CanvasRenderingContext2D, cache: RenderCache, options: Required<WaveformOptions>) => void;
    afterBackground?: (ctx: CanvasRenderingContext2D, cache: RenderCache, options: Required<WaveformOptions>) => void;
    afterProgress?: (ctx: CanvasRenderingContext2D, cache: RenderCache, options: Required<WaveformOptions>, progress: number) => void;
    afterComplete?: (ctx: CanvasRenderingContext2D, cache: RenderCache, options: Required<WaveformOptions>) => void;
}

export class RenderingEngine {
    private ctx: CanvasRenderingContext2D;
    private callbacks: RenderingCallbacks;
    private customRenderer?: CustomRenderer;
    private hooks: RenderHook = {};

    constructor(ctx: CanvasRenderingContext2D, callbacks: RenderingCallbacks) {
        this.ctx = ctx;
        this.callbacks = callbacks;
    }

    public setCustomRenderer(renderer?: CustomRenderer): void {
        this.customRenderer = renderer;
    }

    public setHooks(hooks: RenderHook): void {
        this.hooks = { ...hooks };
    }

    public clearHooks(): void {
        this.hooks = {};
    }

    public render(
        cache: RenderCache,
        options: Required<WaveformOptions>,
        staticPath?: Path2D
    ): void {
        this.callbacks.onRenderStart();

        try {
            // Hook: before render
            this.hooks.beforeRender?.(this.ctx, cache, options);

            // Check if custom renderer handles everything
            if (this.customRenderer?.render(this.ctx, cache, options, staticPath)) {
                this.callbacks.onRenderComplete();
                return;
            }

            const { backgroundColor, color, progress } = options;

            // Clear canvas
            this.ctx.clearRect(0, 0, cache.canvasWidth, cache.canvasHeight);

            if (this.shouldUseFallbackRendering(options, staticPath)) {
                this.renderWithFallback(cache, backgroundColor, options);
            } else {
                this.renderWithPath(staticPath!, backgroundColor, options);
            }

            // Hook: after background
            this.hooks.afterBackground?.(this.ctx, cache, options);

            // Render progress
            if (progress > 0) {
                if (this.shouldUseFallbackRendering(options, staticPath)) {
                    this.renderProgressWithFallback(cache, color, progress, options);
                } else {
                    this.renderProgressWithPath(staticPath!, color, progress, cache.canvasWidth, options);
                }

                // Hook: after progress
                this.hooks.afterProgress?.(this.ctx, cache, options, progress);
            }

            // Draw progress line
            if (options.progressLine && progress > 0) {
                const x = cache.canvasWidth * progress;
                drawProgressLine(this.ctx, x, cache.canvasHeight, options.progressLine as Required<ProgressLineOptions>);
            }

            // Hook: after complete
            this.hooks.afterComplete?.(this.ctx, cache, options);

            this.callbacks.onRenderComplete();
        } catch (error) {
            throw error; // Let the caller handle the error
        }
    }

    private shouldUseFallbackRendering(options: Required<WaveformOptions>, staticPath?: Path2D): boolean {
        return options.borderRadius > 0 &&
               (!staticPath || typeof (Path2D.prototype as any).roundRect !== 'function');
    }

    private renderWithPath(path: Path2D, backgroundColor: string, options: Required<WaveformOptions>): void {
        // Draw background waveform
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fill(path);

        if (options.borderWidth > 0) {
            this.ctx.strokeStyle = options.borderColor;
            this.ctx.lineWidth = options.borderWidth;
            this.ctx.stroke(path);
        }
    }

    private renderProgressWithPath(
        path: Path2D,
        color: string,
        progress: number,
        canvasWidth: number,
        options: Required<WaveformOptions>
    ): void {
        this.ctx.save();
        const progressWidth = canvasWidth * progress;
        this.ctx.beginPath();
        this.ctx.rect(0, 0, progressWidth, canvasWidth);
        this.ctx.clip();

        this.ctx.fillStyle = color;
        this.ctx.fill(path);

        if (options.borderWidth > 0) {
            this.ctx.strokeStyle = options.borderColor;
            this.ctx.stroke(path);
        }

        this.ctx.restore();
    }

    private renderWithFallback(
        cache: RenderCache,
        color: string,
        options: Required<WaveformOptions>
    ): void {
        this.renderBarsWithFallback(cache.bars, color, options);
    }

    private renderProgressWithFallback(
        cache: RenderCache,
        color: string,
        progress: number,
        options: Required<WaveformOptions>
    ): void {
        this.ctx.save();
        const progressWidth = cache.canvasWidth * progress;
        this.ctx.beginPath();
        this.ctx.rect(0, 0, progressWidth, cache.canvasHeight);
        this.ctx.clip();
        this.renderBarsWithFallback(cache.bars, color, options);
        this.ctx.restore();
    }

    private renderBarsWithFallback(
        bars: CachedBarData[],
        color: string,
        options: Required<WaveformOptions>
    ): void {
        const { borderColor, borderRadius, borderWidth = 0 } = options;

        this.ctx.fillStyle = color;
        if (borderWidth > 0) {
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = borderWidth;
        }

        // Batch rendering operations
        this.ctx.beginPath();

        for (const bar of bars) {
            if (borderRadius > 0 && typeof this.ctx.roundRect === 'function') {
                this.ctx.roundRect(bar.x, bar.y, bar.width, bar.height, borderRadius);
            } else {
                this.ctx.rect(bar.x, bar.y, bar.width, bar.height);
            }
        }

        this.ctx.fill();

        if (borderWidth > 0) {
            this.ctx.stroke();
        }
    }
}
