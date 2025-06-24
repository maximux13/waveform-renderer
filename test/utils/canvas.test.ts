import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    calculateBarDimensions,
    calculateLineDimensions,
    drawProgressLine,
    resizeCanvas,
    setupCanvasContext,
} from "../../src/utils/canvas";

import type { ProgressLineOptions, RenderMode } from "../../src/types";

describe("canvas utilities", () => {
    describe("calculateBarDimensions", () => {
        it("should calculate dimensions for bottom render mode", () => {
            const result = calculateBarDimensions(0.5, 100, 1, "bottom");
            expect(result).toEqual({ height: 50, y: 50 });
        });

        it("should calculate dimensions for top render mode", () => {
            const result = calculateBarDimensions(0.5, 100, 1, "top");
            expect(result).toEqual({ height: 50, y: 0 });
        });

        it("should calculate dimensions for center render mode", () => {
            const result = calculateBarDimensions(0.5, 100, 1, "center");
            expect(result).toEqual({ height: 50, y: 25 });
        });

        it("should apply amplitude scaling", () => {
            const result = calculateBarDimensions(0.5, 100, 0.8, "center");
            expect(result).toEqual({ height: 40, y: 30 });
        });

        it("should handle edge cases with zero values", () => {
            const result = calculateBarDimensions(0, 100, 1, "center");
            expect(result).toEqual({ height: 0, y: 50 });
        });
    });

    describe("calculateLineDimensions", () => {
        it("should calculate line dimensions for bottom render mode", () => {
            const result = calculateLineDimensions(20, 100, "bottom");
            expect(result).toEqual({ startY: 80, endY: 100 });
        });

        it("should calculate line dimensions for top render mode", () => {
            const result = calculateLineDimensions(20, 100, "top");
            expect(result).toEqual({ startY: 0, endY: 20 });
        });

        it("should calculate line dimensions for center render mode", () => {
            const result = calculateLineDimensions(20, 100, "center");
            expect(result).toEqual({ startY: 40, endY: 60 });
        });
    });

    describe("drawProgressLine", () => {
        let canvas: HTMLCanvasElement;
        let ctx: CanvasRenderingContext2D;
        let mockCtx: any;

        beforeEach(() => {
            canvas = document.createElement("canvas");
            canvas.width = 200;
            canvas.height = 100;

            mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                stroke: vi.fn(),
                setLineDash: vi.fn(),
                strokeStyle: "",
                lineWidth: 0,
                lineCap: "",
            };

            vi.spyOn(canvas, "getContext").mockReturnValue(mockCtx);
            ctx = canvas.getContext("2d")!;
        });

        it("should draw a solid progress line", () => {
            const options: Required<ProgressLineOptions> = {
                color: "#ff0000",
                heightPercent: 0.8,
                position: "center" as RenderMode,
                style: "solid",
                width: 2,
            };

            drawProgressLine(ctx, 50, 100, options);

            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.strokeStyle).toBe("#ff0000");
            expect(mockCtx.lineWidth).toBe(2);
            expect(mockCtx.lineCap).toBe("round");
            expect(mockCtx.beginPath).toHaveBeenCalled();
            expect(mockCtx.moveTo).toHaveBeenCalledWith(50, 10);
            expect(mockCtx.lineTo).toHaveBeenCalledWith(50, 90);
            expect(mockCtx.stroke).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
            expect(mockCtx.setLineDash).not.toHaveBeenCalled();
        });

        it("should draw a dashed progress line", () => {
            const options: Required<ProgressLineOptions> = {
                color: "#00ff00",
                heightPercent: 1,
                position: "center" as RenderMode,
                style: "dashed",
                width: 1,
            };

            drawProgressLine(ctx, 75, 100, options);

            expect(mockCtx.setLineDash).toHaveBeenCalledWith([8, 4]);
        });

        it("should draw a dotted progress line", () => {
            const options: Required<ProgressLineOptions> = {
                color: "#0000ff",
                heightPercent: 0.5,
                position: "bottom" as RenderMode,
                style: "dotted",
                width: 3,
            };

            drawProgressLine(ctx, 25, 100, options);

            expect(mockCtx.setLineDash).toHaveBeenCalledWith([2, 2]);
        });
    });

    describe("resizeCanvas", () => {
        let canvas: HTMLCanvasElement;

        beforeEach(() => {
            canvas = document.createElement("canvas");
            vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
                width: 200,
                height: 100,
                top: 0,
                left: 0,
                bottom: 100,
                right: 200,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            });
        });

        it("should resize canvas with device pixel ratio", () => {
            const result = resizeCanvas(canvas, 2);

            expect(canvas.width).toBe(400);
            expect(canvas.height).toBe(200);
            expect(result).toEqual({ width: 200, height: 100 });
        });

        it("should not resize if dimensions are already correct", () => {
            canvas.width = 400;
            canvas.height = 200;

            const initialWidth = canvas.width;
            const initialHeight = canvas.height;

            resizeCanvas(canvas, 2);

            expect(canvas.width).toBe(initialWidth);
            expect(canvas.height).toBe(initialHeight);
        });

        it("should handle device pixel ratio of 1", () => {
            const result = resizeCanvas(canvas, 1);

            expect(canvas.width).toBe(200);
            expect(canvas.height).toBe(100);
            expect(result).toEqual({ width: 200, height: 100 });
        });
    });

    describe("setupCanvasContext", () => {
        let mockCtx: any;

        beforeEach(() => {
            mockCtx = {
                imageSmoothingEnabled: false,
                imageSmoothingQuality: "",
            };
        });

        it("should enable smoothing by default", () => {
            setupCanvasContext(mockCtx);

            expect(mockCtx.imageSmoothingEnabled).toBe(true);
            expect(mockCtx.imageSmoothingQuality).toBe("high");
        });

        it("should disable smoothing when specified", () => {
            setupCanvasContext(mockCtx, false);

            expect(mockCtx.imageSmoothingEnabled).toBe(false);
        });

        it("should enable smoothing when explicitly specified", () => {
            setupCanvasContext(mockCtx, true);

            expect(mockCtx.imageSmoothingEnabled).toBe(true);
            expect(mockCtx.imageSmoothingQuality).toBe("high");
        });
    });
});
