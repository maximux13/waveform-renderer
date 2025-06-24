// ====================================
// Core Configuration Types
// ====================================

export type RenderMode = "bottom" | "center" | "top";

export interface ProgressLineOptions {
    color?: string;
    heightPercent?: number;
    position?: RenderMode;
    style?: "dashed" | "dotted" | "solid";
    width?: number;
}

export interface WaveformOptions {
    amplitude?: number;
    backgroundColor?: string;
    barWidth?: number;
    borderColor?: string;
    borderRadius?: number;
    borderWidth?: number;
    color?: string;
    debug?: boolean;
    gap?: number;
    minPixelRatio?: number;
    position?: RenderMode;
    progress?: number;
    progressLine?: null | ProgressLineOptions;
    smoothing?: boolean;
}

// ====================================
// Event System Types
// ====================================

export interface WaveformEvents {
    destroy: void;
    error: Error;
    progressChange: number;
    ready: void;
    renderComplete: void;
    renderStart: void;
    resize: { height: number; width: number };
    seek: number;
}

export interface EventCallbacks {
    onSeek: (progress: number) => void;
    onResize: (dimensions: { width: number; height: number }) => void;
    onError: (error: Error) => void;
}

// ====================================
// Cache Management Types
// ====================================

export interface CachedBarData {
    x: number;
    y: number;
    width: number;
    height: number;
    peakValue: number;
}

export interface RenderCache {
    canvasWidth: number;
    canvasHeight: number;
    totalBars: number;
    step: number;
    singleUnitWidth: number;
    bars: CachedBarData[];
    staticWaveformPath?: Path2D;
    lastOptionsHash: string;
    lastPeaksHash: string;
}

// ====================================
// Debug System Types
// ====================================

export interface DirtyFlags {
    peaks: boolean;
    options: boolean;
    size: boolean;
    progress: boolean;
}

export interface DebugInfo {
    performance: {
        lastRenderTime: number;
        averageRenderTime: number;
        totalRenders: number;
        fps: number;
        cacheBuilds: number;
        lastCacheBuildTime: number;
    };
    state: {
        canvasSize: { width: number; height: number };
        peaksCount: number;
        barsRendered: number;
        cacheValid: boolean;
        dirtyFlags: DirtyFlags;
    };
    events: {
        totalSeeks: number;
        totalResizes: number;
        totalErrors: number;
    };
}

// ====================================
// Rendering Engine Types
// ====================================

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
    ): boolean;
}

export interface RenderHook {
    beforeRender?: (ctx: CanvasRenderingContext2D, cache: RenderCache, options: Required<WaveformOptions>) => void;
    afterBackground?: (ctx: CanvasRenderingContext2D, cache: RenderCache, options: Required<WaveformOptions>) => void;
    afterProgress?: (ctx: CanvasRenderingContext2D, cache: RenderCache, options: Required<WaveformOptions>, progress: number) => void;
    afterComplete?: (ctx: CanvasRenderingContext2D, cache: RenderCache, options: Required<WaveformOptions>) => void;
}
