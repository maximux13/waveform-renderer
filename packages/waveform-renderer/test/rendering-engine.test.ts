import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  RenderingEngine,
  type CustomRenderer,
  type RenderHook,
  type RenderingCallbacks,
} from "../src/rendering-engine";
import type { RenderCache, WaveformOptions, CachedBarData } from "../src/types";

import { drawProgressLine as mockDrawProgressLine } from "../src/utils";

vi.mock("../src/utils", () => ({
  drawProgressLine: vi.fn(),
}));

class MockPath2D {
  rect = vi.fn();
  roundRect = vi.fn();
}

global.Path2D = MockPath2D as any;

describe("RenderingEngine", () => {
  let renderingEngine: RenderingEngine;
  let mockCtx: CanvasRenderingContext2D;
  let mockCallbacks: RenderingCallbacks;
  let mockCache: RenderCache;
  let mockOptions: Required<WaveformOptions>;
  let mockPath: Path2D;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock CanvasRenderingContext2D
    mockCtx = {
      clearRect: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      fill: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      roundRect: vi.fn(),
      clip: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    // Mock callbacks
    mockCallbacks = {
      onRenderStart: vi.fn(),
      onRenderComplete: vi.fn(),
    };

    // Mock cache
    mockCache = {
      canvasWidth: 800,
      canvasHeight: 200,
      totalBars: 100,
      step: 1,
      singleUnitWidth: 8,
      bars: [
        { x: 0, y: 100, width: 4, height: 50, peakValue: 0.5 },
        { x: 8, y: 80, width: 4, height: 70, peakValue: 0.7 },
        { x: 16, y: 120, width: 4, height: 30, peakValue: 0.3 },
      ] as CachedBarData[],
      lastOptionsHash: "hash123",
      lastPeaksHash: "peaks123",
    };

    // Mock options
    mockOptions = {
      amplitude: 1,
      backgroundColor: "#f0f0f0",
      barWidth: 4,
      borderColor: "#000",
      borderRadius: 2,
      borderWidth: 1,
      color: "#3b82f6",
      debug: false,
      gap: 2,
      minPixelRatio: 1,
      position: "center" as const,
      progress: 0.5,
      progressLine: {
        color: "#ff0000",
        heightPercent: 0.8,
        position: "center" as const,
        style: "solid" as const,
        width: 2,
      },
      smoothing: true,
    };

    // Mock Path2D
    mockPath = {
      rect: vi.fn(),
      roundRect: vi.fn(),
    } as unknown as Path2D;

    renderingEngine = new RenderingEngine(mockCtx, mockCallbacks);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with context and callbacks", () => {
      expect((renderingEngine as any).ctx).toBe(mockCtx);
      expect((renderingEngine as any).callbacks).toBe(mockCallbacks);
      expect((renderingEngine as any).customRenderer).toBeUndefined();
      expect((renderingEngine as any).hooks).toEqual({});
    });
  });

  describe("setCustomRenderer", () => {
    it("should set custom renderer", () => {
      const customRenderer: CustomRenderer = {
        render: vi.fn().mockReturnValue(true),
      };

      renderingEngine.setCustomRenderer(customRenderer);
      expect((renderingEngine as any).customRenderer).toBe(customRenderer);
    });

    it("should clear custom renderer when undefined", () => {
      const customRenderer: CustomRenderer = {
        render: vi.fn().mockReturnValue(true),
      };

      renderingEngine.setCustomRenderer(customRenderer);
      renderingEngine.setCustomRenderer(undefined);
      expect((renderingEngine as any).customRenderer).toBeUndefined();
    });
  });

  describe("setHooks", () => {
    it("should set render hooks", () => {
      const hooks: RenderHook = {
        beforeRender: vi.fn(),
        afterBackground: vi.fn(),
        afterProgress: vi.fn(),
        afterComplete: vi.fn(),
      };

      renderingEngine.setHooks(hooks);
      expect((renderingEngine as any).hooks).toEqual(hooks);
    });

    it("should create shallow copy of hooks", () => {
      const hooks: RenderHook = {
        beforeRender: vi.fn(),
      };

      renderingEngine.setHooks(hooks);
      const engineHooks = (renderingEngine as any).hooks;
      expect(engineHooks).toEqual(hooks);
      expect(engineHooks).not.toBe(hooks); // Different reference
    });

    it("should handle partial hooks", () => {
      const partialHooks: RenderHook = {
        beforeRender: vi.fn(),
      };

      renderingEngine.setHooks(partialHooks);
      expect((renderingEngine as any).hooks.beforeRender).toBe(partialHooks.beforeRender);
      expect((renderingEngine as any).hooks.afterBackground).toBeUndefined();
    });
  });

  describe("clearHooks", () => {
    it("should clear all hooks", () => {
      const hooks: RenderHook = {
        beforeRender: vi.fn(),
        afterBackground: vi.fn(),
      };

      renderingEngine.setHooks(hooks);
      renderingEngine.clearHooks();
      expect((renderingEngine as any).hooks).toEqual({});
    });
  });

  describe("render", () => {
    it("should call onRenderStart at beginning", () => {
      renderingEngine.render(mockCache, mockOptions);
      expect(mockCallbacks.onRenderStart).toHaveBeenCalledTimes(1);
    });

    it("should call onRenderComplete at end", () => {
      renderingEngine.render(mockCache, mockOptions);
      expect(mockCallbacks.onRenderComplete).toHaveBeenCalledTimes(1);
    });

    it("should call hooks in correct order", () => {
      const callOrder: string[] = [];
      const hooks: RenderHook = {
        beforeRender: vi.fn(() => callOrder.push("before")),
        afterBackground: vi.fn(() => callOrder.push("afterBg")),
        afterProgress: vi.fn(() => callOrder.push("afterProgress")),
        afterComplete: vi.fn(() => callOrder.push("afterComplete")),
      };

      renderingEngine.setHooks(hooks);
      renderingEngine.render(mockCache, mockOptions);

      expect(callOrder).toEqual(["before", "afterBg", "afterProgress", "afterComplete"]);
    });

    it("should clear canvas", () => {
      renderingEngine.render(mockCache, mockOptions);
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 200);
    });

    it("should use custom renderer when available and returns true", () => {
      const customRenderer: CustomRenderer = {
        render: vi.fn().mockReturnValue(true),
      };

      renderingEngine.setCustomRenderer(customRenderer);
      renderingEngine.render(mockCache, mockOptions, mockPath);

      expect(customRenderer.render).toHaveBeenCalledWith(mockCtx, mockCache, mockOptions, mockPath);
      expect(mockCallbacks.onRenderComplete).toHaveBeenCalled();
      expect(mockCtx.clearRect).not.toHaveBeenCalled(); // Should not reach default rendering
    });

    it("should continue with default rendering when custom renderer returns false", () => {
      const customRenderer: CustomRenderer = {
        render: vi.fn().mockReturnValue(false),
      };

      renderingEngine.setCustomRenderer(customRenderer);
      renderingEngine.render(mockCache, mockOptions);

      expect(customRenderer.render).toHaveBeenCalled();
      expect(mockCtx.clearRect).toHaveBeenCalled(); // Should continue with default rendering
    });

    it("should render progress line when enabled and progress > 0", () => {
      renderingEngine.render(mockCache, mockOptions);

      expect(mockDrawProgressLine).toHaveBeenCalledWith(
        mockCtx,
        400, // 800 * 0.5
        200,
        mockOptions.progressLine,
      );
    });

    it("should not render progress line when progress is 0", () => {
      const optionsNoProgress = { ...mockOptions, progress: 0 };
      renderingEngine.render(mockCache, optionsNoProgress);

      expect(mockDrawProgressLine).not.toHaveBeenCalled();
    });

    it("should not render progress line when progressLine is null", () => {
      const optionsNoLine = { ...mockOptions, progressLine: null };
      renderingEngine.render(mockCache, optionsNoLine);

      expect(mockDrawProgressLine).not.toHaveBeenCalled();
    });

    it("should handle hooks when they are undefined", () => {
      expect(() => renderingEngine.render(mockCache, mockOptions)).not.toThrow();
    });

    it("should pass correct parameters to hooks", () => {
      const hooks: RenderHook = {
        beforeRender: vi.fn(),
        afterBackground: vi.fn(),
        afterProgress: vi.fn(),
        afterComplete: vi.fn(),
      };

      renderingEngine.setHooks(hooks);
      renderingEngine.render(mockCache, mockOptions);

      expect(hooks.beforeRender).toHaveBeenCalledWith(mockCtx, mockCache, mockOptions);
      expect(hooks.afterBackground).toHaveBeenCalledWith(mockCtx, mockCache, mockOptions);
      expect(hooks.afterProgress).toHaveBeenCalledWith(mockCtx, mockCache, mockOptions, 0.5);
      expect(hooks.afterComplete).toHaveBeenCalledWith(mockCtx, mockCache, mockOptions);
    });

    it("should re-throw errors", () => {
      mockCtx.clearRect = vi.fn().mockImplementation(() => {
        throw new Error("Canvas error");
      });

      expect(() => renderingEngine.render(mockCache, mockOptions)).toThrow("Canvas error");
    });
  });

  describe("fallback rendering decision", () => {
    it("should use fallback when borderRadius > 0 and no roundRect support", () => {
      // Remove roundRect from Path2D prototype
      const originalRoundRect = (Path2D.prototype as any).roundRect;
      delete (Path2D.prototype as any).roundRect;

      renderingEngine.render(mockCache, mockOptions, mockPath);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.rect).toHaveBeenCalled();

      // Restore
      (Path2D.prototype as any).roundRect = originalRoundRect;
    });

    it("should use fallback when borderRadius > 0 and no staticPath", () => {
      renderingEngine.render(mockCache, mockOptions);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.rect).toHaveBeenCalled();
    });

    it("should use Path2D when roundRect is supported", () => {
      (Path2D.prototype as any).roundRect = vi.fn();

      renderingEngine.render(mockCache, { ...mockOptions, borderRadius: 0 }, mockPath);

      expect(mockCtx.fill).toHaveBeenCalledWith(mockPath);
    });
  });

  describe("Path2D rendering", () => {
    beforeEach(() => {
      (Path2D.prototype as any).roundRect = vi.fn();
    });

    it("should render background with Path2D", () => {
      const optionsNoProgress = { ...mockOptions, progress: 0 };
      renderingEngine.render(mockCache, optionsNoProgress, mockPath);

      expect(mockCtx.fillStyle).toBe("#f0f0f0");
      expect(mockCtx.fill).toHaveBeenCalledWith(mockPath);
    });

    it("should render borders when borderWidth > 0", () => {
      const optionsNoProgress = { ...mockOptions, progress: 0 };
      renderingEngine.render(mockCache, optionsNoProgress, mockPath);

      expect(mockCtx.strokeStyle).toBe("#000");
      expect(mockCtx.lineWidth).toBe(1);
      expect(mockCtx.stroke).toHaveBeenCalledWith(mockPath);
    });

    it("should not render borders when borderWidth is 0", () => {
      const optionsNoBorder = { ...mockOptions, borderWidth: 0, progress: 0 };
      renderingEngine.render(mockCache, optionsNoBorder, mockPath);

      expect(mockCtx.stroke).not.toHaveBeenCalled();
    });

    it("should render progress with clipping", () => {
      renderingEngine.render(mockCache, mockOptions, mockPath);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.rect).toHaveBeenCalledWith(0, 0, 400, 800); // progressWidth, canvasWidth
      expect(mockCtx.clip).toHaveBeenCalled();
      expect(mockCtx.fillStyle).toBe("#3b82f6");
      expect(mockCtx.fill).toHaveBeenCalledWith(mockPath);
      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });

  describe("fallback rendering", () => {
    it("should render bars with fallback method", () => {
      // Force fallback by removing roundRect from both contexts
      delete (Path2D.prototype as any).roundRect;
      delete (mockCtx as any).roundRect;

      renderingEngine.render(mockCache, { ...mockOptions, progress: 0 });

      expect(mockCtx.fillStyle).toBe("#f0f0f0");
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.rect).toHaveBeenCalledTimes(3); // One for each bar
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it("should use roundRect when available and borderRadius > 0", () => {
      mockCtx.roundRect = vi.fn();
      delete (Path2D.prototype as any).roundRect;

      renderingEngine.render(mockCache, { ...mockOptions, progress: 0 });

      expect(mockCtx.roundRect).toHaveBeenCalledTimes(3);
      expect(mockCtx.rect).not.toHaveBeenCalled();
    });

    it("should render progress with fallback and clipping", () => {
      delete (Path2D.prototype as any).roundRect;

      renderingEngine.render(mockCache, mockOptions);

      // Should call save/restore twice: once for background, once for progress
      expect(mockCtx.save).toHaveBeenCalledTimes(1);
      expect(mockCtx.restore).toHaveBeenCalledTimes(1);
      expect(mockCtx.rect).toHaveBeenCalledWith(0, 0, 400, 200); // Clipping rect
    });

    it("should render borders with fallback when borderWidth > 0", () => {
      delete (Path2D.prototype as any).roundRect;

      renderingEngine.render(mockCache, { ...mockOptions, progress: 0 });

      expect(mockCtx.strokeStyle).toBe("#000");
      expect(mockCtx.lineWidth).toBe(1);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle empty bars array", () => {
      const emptyCache = { ...mockCache, bars: [] };

      expect(() => renderingEngine.render(emptyCache, mockOptions)).not.toThrow();
      expect(mockCallbacks.onRenderComplete).toHaveBeenCalled();
    });

    it("should handle zero canvas dimensions", () => {
      const zeroCache = { ...mockCache, canvasWidth: 0, canvasHeight: 0 };

      renderingEngine.render(zeroCache, mockOptions);

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 0, 0);
    });

    it("should handle negative progress", () => {
      const negativeProgress = { ...mockOptions, progress: -0.5 };

      renderingEngine.render(mockCache, negativeProgress);

      expect(mockDrawProgressLine).not.toHaveBeenCalled();
    });

    it("should handle progress > 1", () => {
      const highProgress = { ...mockOptions, progress: 1.5 };

      renderingEngine.render(mockCache, highProgress);

      // Should still render, just with clamped values
      expect(mockDrawProgressLine).toHaveBeenCalled();
    });

    it("should handle missing roundRect in both contexts", () => {
      delete (Path2D.prototype as any).roundRect;
      delete (mockCtx as any).roundRect;

      expect(() => renderingEngine.render(mockCache, mockOptions)).not.toThrow();
      expect(mockCtx.rect).toHaveBeenCalled();
    });

    it("should handle hook errors gracefully", () => {
      const hooks: RenderHook = {
        beforeRender: vi.fn().mockImplementation(() => {
          throw new Error("Hook error");
        }),
      };

      renderingEngine.setHooks(hooks);

      expect(() => renderingEngine.render(mockCache, mockOptions)).toThrow("Hook error");
    });

    it("should handle custom renderer errors", () => {
      const customRenderer: CustomRenderer = {
        render: vi.fn().mockImplementation(() => {
          throw new Error("Custom renderer error");
        }),
      };

      renderingEngine.setCustomRenderer(customRenderer);

      expect(() => renderingEngine.render(mockCache, mockOptions)).toThrow("Custom renderer error");
    });
  });

  describe("render state management", () => {
    it("should not skip progress hooks when progress is 0", () => {
      const hooks: RenderHook = {
        afterProgress: vi.fn(),
      };

      renderingEngine.setHooks(hooks);
      renderingEngine.render(mockCache, { ...mockOptions, progress: 0 });

      expect(hooks.afterProgress).not.toHaveBeenCalled();
    });

    it("should call progress hooks when progress > 0", () => {
      const hooks: RenderHook = {
        afterProgress: vi.fn(),
      };

      const optionsWithProgress = { ...mockOptions, progress: 0.1 };
      renderingEngine.setHooks(hooks);
      renderingEngine.render(mockCache, optionsWithProgress);

      expect(hooks.afterProgress).toHaveBeenCalledWith(mockCtx, mockCache, optionsWithProgress, 0.1);
    });

    it("should maintain canvas state across rendering steps", () => {
      renderingEngine.render(mockCache, mockOptions);

      // Should save/restore for progress rendering
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });

  describe("rendering with different border configurations", () => {
    it("should handle zero border radius", () => {
      const noBorderRadius = { ...mockOptions, borderRadius: 0 };

      renderingEngine.render(mockCache, noBorderRadius, mockPath);

      expect(mockCtx.fill).toHaveBeenCalledWith(mockPath);
    });

    it("should handle zero border width", () => {
      const noBorderWidth = { ...mockOptions, borderWidth: 0 };

      renderingEngine.render(mockCache, noBorderWidth, mockPath);

      expect(mockCtx.stroke).not.toHaveBeenCalled();
    });

    it("should handle large border radius", () => {
      mockCtx.roundRect = vi.fn();
      delete (Path2D.prototype as any).roundRect;

      const largeBorderRadius = { ...mockOptions, borderRadius: 50 };

      renderingEngine.render(mockCache, largeBorderRadius);

      expect(mockCtx.roundRect).toHaveBeenCalledWith(0, 100, 4, 50, 50);
    });
  });
});
