export interface ProgressLineOptions {
    color?: string;
    heightPercent?: number;
    position?: RenderMode;
    style?: "dashed" | "dotted" | "solid";
    width?: number;
}

export type RenderMode = "bottom" | "center" | "top";

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

export interface WaveformOptions {
    amplitude?: number;
    backgroundColor?: string;
    barWidth?: number;
    borderColor?: string;
    borderRadius?: number;
    borderWidth?: number;
    color?: string;
    gap?: number;
    minPixelRatio?: number;
    position?: RenderMode;
    progress?: number;
    progressLine?: null | ProgressLineOptions;
    smoothing?: boolean;
}
