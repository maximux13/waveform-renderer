import type { ProgressLineOptions, WaveformEvents, WaveformOptions } from "@/types";

import { DEFAULT_OPTIONS } from "@/constants";
import { EventEmitter } from "@/events";
import {
    calculateBarDimensions,
    drawProgressLine,
    normalizePeaks,
    normalizeProgress,
    resizeCanvas,
    setupCanvasContext,
} from "@/utils";

export default class WaveformRenderer extends EventEmitter<WaveformEvents> {
    private readonly canvas!: HTMLCanvasElement;
    private readonly ctx!: CanvasRenderingContext2D;
    private devicePixelRatio!: number;

    private frameRequest?: number;
    private isDestroyed: boolean = false;
    private options!: Required<WaveformOptions>;
    private peaks!: number[];
    private readonly resizeObserver!: ResizeObserver;

    constructor(canvas: HTMLCanvasElement, peaks: number[], options: Partial<WaveformOptions> = {}) {
        super();

        try {
            if (!canvas) {
                throw new Error("Canvas element is required");
            }

            if (!Array.isArray(peaks) || peaks.length === 0) {
                throw new Error("Peaks array is required and must not be empty");
            }

            this.canvas = canvas;
            const context = this.canvas.getContext("2d");

            if (!context) {
                throw new Error("Could not get 2D context from canvas");
            }

            this.ctx = context;
            this.peaks = normalizePeaks(peaks);
            this.options = {
                ...DEFAULT_OPTIONS,
                ...options,
                progressLine: options.progressLine
                    ? {
                          ...DEFAULT_OPTIONS.progressLine,
                          ...options.progressLine,
                      }
                    : null,
            };

            this.devicePixelRatio = Math.max(window.devicePixelRatio || 1, this.options.minPixelRatio);

            this.setupContext();

            this.resizeObserver = new ResizeObserver(this.handleResize);
            this.resizeObserver.observe(this.canvas);

            this.canvas.addEventListener("click", this.handleClick);
            this.canvas.addEventListener("touchstart", this.handleTouch);

            this.resizeCanvas();
            this.scheduleRender();

            requestAnimationFrame(() => this.emit("ready", undefined));
        } catch (e) {
            this.handleError(e);
        }
    }

    public destroy(): void {
        if (this.isDestroyed) return;

        this.emit("destroy", undefined);
        this.isDestroyed = true;
        this.resizeObserver.disconnect();
        this.canvas.removeEventListener("click", this.handleClick);
        this.canvas.removeEventListener("touchend", this.handleTouch);

        if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    }

    public setOptions(options: Partial<WaveformOptions>): void {
        if (this.isDestroyed) return;

        this.options = {
            ...this.options,
            ...options,
        };

        this.setupContext();
        this.scheduleRender();
    }

    public setPeaks(peaks: number[]): void {
        if (this.isDestroyed) return;

        try {
            if (!Array.isArray(peaks) || peaks.length === 0) {
                throw new Error("Peaks array must not be empty");
            }

            this.peaks = normalizePeaks(peaks);
            this.scheduleRender();
        } catch (e) {
            this.handleError(e);
        }
    }

    public setProgress(progress: number): void {
        if (this.isDestroyed) return;

        try {
            const normalizedProgress = normalizeProgress(progress);
            this.options.progress = normalizedProgress;
            this.emit("progressChange", normalizedProgress);
            this.scheduleRender();
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

            this.scheduleRender();
        } catch (e) {
            this.handleError(e);
        }
    }

    private calculateProgressFromEvent(event: MouseEvent): number {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        return normalizeProgress(x / rect.width);
    }

    private calculateProgressFromTouch(touch: Touch): number {
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        return normalizeProgress(x / rect.width);
    }

    private drawWaveform(): void {
        if (this.isDestroyed) return;

        this.emit("renderStart", undefined);

        try {
            const { backgroundColor, color, progress } = this.options;
            const canvasWidth = this.canvas.width / this.devicePixelRatio;
            const canvasHeight = this.canvas.height / this.devicePixelRatio;

            this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            this.drawWaveformWithColor(backgroundColor);

            if (progress > 0) {
                this.ctx.save();
                const progressWidth = canvasWidth * progress;
                this.ctx.beginPath();
                this.ctx.rect(0, 0, progressWidth, canvasHeight);
                this.ctx.clip();
                this.drawWaveformWithColor(color);
                this.ctx.restore();
            }

            if (this.options.progressLine && progress > 0) {
                const x = canvasWidth * progress;
                drawProgressLine(this.ctx, x, canvasHeight, this.options.progressLine as Required<ProgressLineOptions>);
            }

            this.emit("renderComplete", undefined);
        } catch (e) {
            this.handleError(e);
        }
    }

    private drawWaveformWithColor(color: string): void {
        const { amplitude = 1, barWidth, borderColor, borderRadius, borderWidth = 0, gap = 0, position } = this.options;

        const canvasWidth = this.canvas.width / this.devicePixelRatio;
        const canvasHeight = this.canvas.height / this.devicePixelRatio;

        const initialOffset = borderWidth;
        const availableWidth = canvasWidth - borderWidth * 2 * initialOffset;
        const singleUnitWidth = barWidth + borderWidth * 2 + gap;
        const totalBars = Math.floor(availableWidth / singleUnitWidth);
        const finalTotalBars = Math.max(1, totalBars);

        const step = this.peaks.length / finalTotalBars;

        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = borderWidth;

        for (let i = 0; i < finalTotalBars; i++) {
            const peakIndex = Math.floor(i * step);
            const peak = Math.abs(this.peaks[peakIndex] || 0);

            const x = initialOffset + i * singleUnitWidth;
            const { height, y } = calculateBarDimensions(peak, canvasHeight, amplitude, position);

            this.ctx.beginPath();

            if (borderRadius > 0) {
                this.ctx.roundRect(x, y, barWidth, height, borderRadius);
            } else {
                this.ctx.rect(x, y, barWidth, height);
            }

            this.ctx.fill();

            if (borderWidth > 0) {
                this.ctx.stroke();
            }
        }
    }

    private handleClick = (event: MouseEvent): void => {
        event.preventDefault();
        if (this.isDestroyed) return;

        try {
            const progress = this.calculateProgressFromEvent(event);
            this.emit("seek", progress);
        } catch (e) {
            this.handleError(e);
        }
    };

    private handleError = (e: unknown): void => {
        console.error(e);
        this.emit("error", e instanceof Error ? e : new Error("An unknown error occurred"));
    };

    private handleResize = (): void => {
        if (this.isDestroyed) return;

        try {
            const rect = this.canvas.getBoundingClientRect();
            this.emit("resize", {
                height: rect.height,
                width: rect.width,
            });

            this.resizeCanvas();
            this.scheduleRender();
        } catch (e) {
            this.handleError(e);
        }
    };

    private handleTouch = (event: TouchEvent): void => {
        event.preventDefault();
        if (this.isDestroyed || !event.changedTouches[0]) return;

        try {
            const progress = this.calculateProgressFromTouch(event.changedTouches[0]);
            this.emit("seek", progress);
        } catch (e) {
            this.handleError(e);
        }
    };

    private resizeCanvas(): void {
        resizeCanvas(this.canvas, this.devicePixelRatio);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
        this.setupContext();
    }

    private scheduleRender(): void {
        if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
        this.frameRequest = requestAnimationFrame(() => this.drawWaveform());
    }

    private setupContext(): void {
        setupCanvasContext(this.ctx, this.options.smoothing);
    }
}
