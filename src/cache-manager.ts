import { calculateBarDimensions } from "@/utils";

import type { CachedBarData, RenderCache, WaveformOptions } from "@/types";

export class CacheManager {
    private cache: RenderCache | null = null;

    public invalidate(): void {
        if (this.cache) {
            this.cache.staticWaveformPath = undefined;
        }
    }

    public clear(): void {
        this.cache = null;
    }

    public getCache(
        canvas: HTMLCanvasElement,
        devicePixelRatio: number,
        peaks: number[],
        options: Required<WaveformOptions>
    ): RenderCache {
        const currentCanvasWidth = canvas.width / devicePixelRatio;
        const currentCanvasHeight = canvas.height / devicePixelRatio;
        const currentOptionsHash = this.createOptionsHash(options);
        const currentPeaksHash = this.createPeaksHash(peaks);

        // Check if cache is valid
        if (this.isCacheValid(currentCanvasWidth, currentCanvasHeight, currentOptionsHash, currentPeaksHash)) {
            return this.cache!;
        }

        // Rebuild cache
        this.cache = this.buildCache(currentCanvasWidth, currentCanvasHeight, peaks, options, currentOptionsHash, currentPeaksHash);
        return this.cache;
    }

    public createStaticPath(cache: RenderCache, borderRadius: number): Path2D {
        if (cache.staticWaveformPath) {
            return cache.staticWaveformPath;
        }

        const path = new Path2D();

        for (const bar of cache.bars) {
            if (borderRadius > 0 && typeof (path as any).roundRect === 'function') {
                (path as any).roundRect(bar.x, bar.y, bar.width, bar.height, borderRadius);
            } else {
                path.rect(bar.x, bar.y, bar.width, bar.height);
            }
        }

        cache.staticWaveformPath = path;
        return path;
    }

    public isValid(): boolean {
        return this.cache !== null;
    }

    private isCacheValid(
        canvasWidth: number,
        canvasHeight: number,
        optionsHash: string,
        peaksHash: string
    ): boolean {
        return this.cache !== null &&
            this.cache.canvasWidth === canvasWidth &&
            this.cache.canvasHeight === canvasHeight &&
            this.cache.lastOptionsHash === optionsHash &&
            this.cache.lastPeaksHash === peaksHash;
    }

    private buildCache(
        canvasWidth: number,
        canvasHeight: number,
        peaks: number[],
        options: Required<WaveformOptions>,
        optionsHash: string,
        peaksHash: string
    ): RenderCache {
        const { amplitude = 1, barWidth, borderWidth = 0, gap = 0, position } = options;

        const initialOffset = borderWidth;
        const availableWidth = canvasWidth - borderWidth * 2 * initialOffset;
        const singleUnitWidth = barWidth + borderWidth * 2 + gap;
        const totalBars = Math.max(1, Math.floor(availableWidth / singleUnitWidth));
        const step = peaks.length / totalBars;

        // Pre-calculate all bar positions and dimensions
        const bars: CachedBarData[] = Array.from({ length: totalBars });

        for (let i = 0; i < totalBars; i++) {
            const peakIndex = Math.floor(i * step);
            const peakValue = Math.abs(peaks[peakIndex] || 0);
            const x = initialOffset + i * singleUnitWidth;
            const { height, y } = calculateBarDimensions(peakValue, canvasHeight, amplitude, position);

            bars[i] = {
                x,
                y,
                width: barWidth,
                height,
                peakValue,
            };
        }

        return {
            canvasWidth,
            canvasHeight,
            totalBars,
            step,
            singleUnitWidth,
            bars,
            lastOptionsHash: optionsHash,
            lastPeaksHash: peaksHash,
        };
    }

    private createOptionsHash(options: Required<WaveformOptions>): string {
        const { amplitude, barWidth, borderWidth, gap, position, borderRadius } = options;
        return `${amplitude}-${barWidth}-${borderWidth}-${gap}-${position}-${borderRadius}`;
    }

    private createPeaksHash(peaks: number[]): string {
        return `${peaks.length}-${peaks[0] || 0}-${peaks[peaks.length - 1] || 0}`;
    }
}
