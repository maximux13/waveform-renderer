import type { ProgressLineOptions, RenderMode } from "../types";

/**
 * Calculates the vertical position and height for a bar based on the render mode
 */
export function calculateBarDimensions(
    peak: number,
    canvasHeight: number,
    amplitude: number,
    position: RenderMode
): { height: number; y: number } {
    const height = peak * canvasHeight * amplitude;

    switch (position) {
        case "bottom":
            return { height, y: canvasHeight - height };
        case "top":
            return { height, y: 0 };
        case "center":
        default:
            return { height, y: (canvasHeight - height) / 2 };
    }
}

/**
 * Calculates the vertical position for a progress line based on the render mode
 */
export function calculateLineDimensions(
    lineHeight: number,
    canvasHeight: number,
    position: RenderMode
): { endY: number; startY: number } {
    switch (position) {
        case "bottom":
            return { endY: canvasHeight, startY: canvasHeight - lineHeight };
        case "top":
            return { endY: lineHeight, startY: 0 };
        case "center":
        default:
            return { endY: (canvasHeight + lineHeight) / 2, startY: (canvasHeight - lineHeight) / 2 };
    }
}

/**
 * Draws a progress line on the canvas
 */
export function drawProgressLine(
    ctx: CanvasRenderingContext2D,
    x: number,
    canvasHeight: number,
    options: Required<ProgressLineOptions>
): void {
    const { color, heightPercent, position, style, width } = options;
    const lineHeight = canvasHeight * heightPercent;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";

    const { endY, startY } = calculateLineDimensions(lineHeight, canvasHeight, position);

    if (style !== "solid") {
        const [dashSize, gapSize] = style === "dashed" ? [8, 4] : [2, 2];
        ctx.setLineDash([dashSize, gapSize]);
    }

    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
    ctx.restore();
}

/**
 * Resizes the canvas accounting for device pixel ratio
 */
export function resizeCanvas(canvas: HTMLCanvasElement, devicePixelRatio: number): { height: number; width: number } {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width * devicePixelRatio;
    const height = rect.height * devicePixelRatio;

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    return { height: rect.height, width: rect.width };
}

/**
 * Configures the canvas context with the specified settings
 */
export function setupCanvasContext(ctx: CanvasRenderingContext2D, smoothing: boolean = true): void {
    ctx.imageSmoothingEnabled = smoothing;
    if (smoothing) {
        ctx.imageSmoothingQuality = "high";
    }
}
