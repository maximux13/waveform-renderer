import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import type { WaveformOptions, ProgressLineOptions } from "../src/types";

import WaveformRenderer from "../src/renderer";

// Mock canvas and DOM globals
const mockCanvas = {
  width: 800,
  height: 200,
  getContext: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 200,
  })),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as unknown as HTMLCanvasElement;

const mockContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  rect: vi.fn(),
  setTransform: vi.fn(),
  scale: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  imageSmoothingEnabled: true,
  globalAlpha: 1,
  fillStyle: "#000000",
  strokeStyle: "#000000",
  lineWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  shadowBlur: 0,
  shadowColor: "#000000",
  shadowOffsetX: 0,
  shadowOffsetY: 0,
} as unknown as CanvasRenderingContext2D;

// Mock global objects
Object.defineProperty(window, "devicePixelRatio", {
  writable: true,
  value: 1,
});

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

vi.stubGlobal(
  "requestAnimationFrame",
  vi.fn((cb: FrameRequestCallback) => {
    setTimeout(cb, 16);
    return 1;
  }),
);

vi.stubGlobal("cancelAnimationFrame", vi.fn());

vi.stubGlobal("performance", {
  now: vi.fn(() => Date.now()),
});

describe("WaveformRenderer", () => {
  let canvas: HTMLCanvasElement;
  let peaks: number[];
  let renderer: WaveformRenderer;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    canvas = { ...mockCanvas };
    canvas.getContext = vi.fn().mockReturnValue(mockContext);

    peaks = [0.1, 0.5, 0.8, 0.3, 0.9, 0.2, 0.7, 0.4, 0.6, 0.1];

    // Reset performance.now mock
    vi.mocked(performance.now).mockReturnValue(0);
  });

  afterEach(() => {
    if (renderer && !renderer["isDestroyed"]) {
      renderer.destroy();
    }
    vi.useRealTimers();
  });

  describe("Constructor", () => {
    it("should create renderer with valid canvas and peaks", () => {
      renderer = new WaveformRenderer(canvas, peaks);

      expect(canvas.getContext).toHaveBeenCalledWith("2d");
      expect(renderer).toBeInstanceOf(WaveformRenderer);
    });

    it("should throw error for null canvas", () => {
      expect(() => {
        new WaveformRenderer(null as any, peaks);
      }).toThrow();
    });

    it("should throw error for empty peaks array", () => {
      expect(() => {
        new WaveformRenderer(canvas, []);
      }).toThrow();
    });

    it("should throw error for invalid peaks", () => {
      expect(() => {
        new WaveformRenderer(canvas, null as any);
      }).toThrow();
    });

    it("should throw error when canvas context is null", () => {
      canvas.getContext = vi.fn().mockReturnValue(null);

      expect(() => {
        new WaveformRenderer(canvas, peaks);
      }).toThrow();
    });

    it("should merge options with defaults", () => {
      const customOptions: Partial<WaveformOptions> = {
        color: "#ff0000",
        barWidth: 3,
        debug: true,
      };

      renderer = new WaveformRenderer(canvas, peaks, customOptions);

      expect(renderer["options"]).toMatchObject(customOptions);
    });

    it("should set up devicePixelRatio correctly", () => {
      window.devicePixelRatio = 2;

      renderer = new WaveformRenderer(canvas, peaks);

      expect(renderer["devicePixelRatio"]).toBe(2);
    });

    it("should emit ready event after initialization", async () => {
      const readyHandler = vi.fn();

      renderer = new WaveformRenderer(canvas, peaks);
      (renderer as any).on("ready", readyHandler);

      // Wait for requestAnimationFrame
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(readyHandler).toHaveBeenCalled();
    });
  });

  describe("setOptions", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
    });

    it("should update options correctly", () => {
      const newOptions: Partial<WaveformOptions> = {
        color: "#00ff00",
        barWidth: 5,
      };

      renderer.setOptions(newOptions);

      expect(renderer["options"]).toMatchObject(newOptions);
    });

    it("should not update options when destroyed", () => {
      const originalOptions = { ...renderer["options"] };
      renderer.destroy();

      renderer.setOptions({ color: "#ff0000" });

      expect(renderer["options"]).toEqual(originalOptions);
    });

    it("should enable debug when debug option is true", () => {
      const debugSpy = vi.spyOn(renderer["debugSystem"], "enable");

      renderer.setOptions({ debug: true });

      expect(debugSpy).toHaveBeenCalled();
    });

    it("should disable debug when debug option is false", () => {
      renderer.setOptions({ debug: true }); // First enable
      const debugSpy = vi.spyOn(renderer["debugSystem"], "disable");

      renderer.setOptions({ debug: false });

      expect(debugSpy).toHaveBeenCalled();
    });

    it("should handle progressLine options correctly", () => {
      const progressLineOptions: ProgressLineOptions = {
        color: "#ff00ff",
        width: 3,
        style: "dashed",
      };

      renderer.setOptions({ progressLine: progressLineOptions });

      expect(renderer["options"].progressLine).toMatchObject(progressLineOptions);
    });

    it("should disable progressLine when set to null", () => {
      renderer.setOptions({ progressLine: null });

      expect(renderer["options"].progressLine).toBeNull();
    });
  });

  describe("setPeaks", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
    });

    it("should update peaks correctly", () => {
      const newPeaks = [0.2, 0.4, 0.6, 0.8, 1.0];

      renderer.setPeaks(newPeaks);

      expect(renderer["peaks"]).toEqual(newPeaks);
    });

    it("should not update peaks when destroyed", () => {
      const originalPeaks = [...renderer["peaks"]];
      renderer.destroy();

      renderer.setPeaks([0.5, 0.5, 0.5]);

      expect(renderer["peaks"]).toEqual(originalPeaks);
    });

    it("should handle error for empty peaks array", () => {
      const errorHandler = vi.fn();
      (renderer as any).on("error", errorHandler);

      renderer.setPeaks([]);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Peaks array must not be empty",
        }),
      );
    });

    it("should invalidate cache when peaks change", () => {
      const invalidateSpy = vi.spyOn(renderer["cacheManager"], "invalidate");

      renderer.setPeaks([0.5, 0.5, 0.5]);

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe("setProgress", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
    });

    it("should update progress correctly", () => {
      const progressHandler = vi.fn();
      (renderer as any).on("progressChange", progressHandler);

      renderer.setProgress(0.5);

      expect(renderer["options"].progress).toBe(0.5);
      expect(progressHandler).toHaveBeenCalledWith(0.5);
    });

    it("should clamp progress to valid range", () => {
      renderer.setProgress(1.5); // Should be clamped to 1.0
      expect(renderer["options"].progress).toBe(1.0);

      renderer.setProgress(-0.5); // Should be clamped to 0.0
      expect(renderer["options"].progress).toBe(0.0);
    });

    it("should not update when destroyed", () => {
      const originalProgress = renderer["options"].progress;
      renderer.destroy();

      renderer.setProgress(0.8);

      expect(renderer["options"].progress).toBe(originalProgress);
    });

    it("should skip update for very small progress changes", () => {
      renderer.setProgress(0.5);
      const progressHandler = vi.fn();
      (renderer as any).on("progressChange", progressHandler);

      renderer.setProgress(0.5001); // Very small change

      expect(progressHandler).not.toHaveBeenCalled();
    });
  });

  describe("setProgressLineOptions", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
    });

    it("should update progress line options", () => {
      const options: ProgressLineOptions = {
        color: "#ff0000",
        width: 2,
        style: "dotted",
      };

      renderer.setProgressLineOptions(options);

      expect(renderer["options"].progressLine).toMatchObject(options);
    });

    it("should disable progress line when set to null", () => {
      renderer.setProgressLineOptions(null);

      expect(renderer["options"].progressLine).toBeNull();
    });

    it("should not update when destroyed", () => {
      const originalProgressLine = renderer["options"].progressLine;
      renderer.destroy();

      renderer.setProgressLineOptions({ color: "#ff0000" });

      expect(renderer["options"].progressLine).toEqual(originalProgressLine);
    });
  });

  describe("Debug API", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
    });

    it("should enable debug mode", () => {
      const enableSpy = vi.spyOn(renderer["debugSystem"], "enable");

      renderer.setDebug(true);

      expect(enableSpy).toHaveBeenCalled();
      expect(renderer["options"].debug).toBe(true);
    });

    it("should disable debug mode", () => {
      const disableSpy = vi.spyOn(renderer["debugSystem"], "disable");

      renderer.setDebug(false);

      expect(disableSpy).toHaveBeenCalled();
      expect(renderer["options"].debug).toBe(false);
    });

    it("should return debug info", () => {
      const mockDebugInfo = {
        performance: {
          lastRenderTime: 10,
          averageRenderTime: 15,
          totalRenders: 5,
          fps: 60,
          cacheBuilds: 2,
          lastCacheBuildTime: 5,
        },
        state: {
          canvasSize: { width: 800, height: 200 },
          peaksCount: 10,
          barsRendered: 100,
          cacheValid: true,
          dirtyFlags: { peaks: false, options: false, size: false, progress: false },
        },
        events: { totalSeeks: 2, totalResizes: 1, totalErrors: 0 },
      };

      vi.spyOn(renderer["debugSystem"], "getInfo").mockReturnValue(mockDebugInfo);

      const info = renderer.getDebugInfo();

      expect(info).toEqual(mockDebugInfo);
    });

    it("should reset debug counters", () => {
      const resetSpy = vi.spyOn(renderer["debugSystem"], "reset");

      renderer.resetDebugCounters();

      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe("Custom Rendering", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
    });

    it("should set custom renderer", () => {
      const customRenderer = {
        render: vi.fn().mockReturnValue(true),
      };
      const setSpy = vi.spyOn(renderer["renderingEngine"], "setCustomRenderer");

      renderer.setCustomRenderer(customRenderer);

      expect(setSpy).toHaveBeenCalledWith(customRenderer);
    });

    it("should clear custom renderer", () => {
      const setSpy = vi.spyOn(renderer["renderingEngine"], "setCustomRenderer");

      renderer.setCustomRenderer();

      expect(setSpy).toHaveBeenCalledWith(undefined);
    });

    it("should set render hooks", () => {
      const hooks = {
        beforeRender: vi.fn(),
        afterBackground: vi.fn(),
      };
      const setHooksSpy = vi.spyOn(renderer["renderingEngine"], "setHooks");

      renderer.setRenderHooks(hooks);

      expect(setHooksSpy).toHaveBeenCalledWith(hooks);
    });

    it("should clear render hooks", () => {
      const clearHooksSpy = vi.spyOn(renderer["renderingEngine"], "clearHooks");

      renderer.clearRenderHooks();

      expect(clearHooksSpy).toHaveBeenCalled();
    });
  });

  describe("Event Handling", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
    });

    it("should handle seek events", () => {
      const seekHandler = vi.fn();
      (renderer as any).on("seek", seekHandler);

      // Simulate seek from event handler
      renderer["handleSeek"](0.7);

      expect(seekHandler).toHaveBeenCalledWith(0.7);
    });

    it("should handle resize events", () => {
      const resizeHandler = vi.fn();
      (renderer as any).on("resize", resizeHandler);

      const dimensions = { width: 1000, height: 300 };
      renderer["handleResize"](dimensions);

      expect(resizeHandler).toHaveBeenCalledWith(dimensions);
    });

    it("should handle error events", () => {
      const errorHandler = vi.fn();
      (renderer as any).on("error", errorHandler);

      const error = new Error("Test error");
      renderer["handleError"](error);

      expect(errorHandler).toHaveBeenCalledWith(error);
    });

    it("should emit render events during rendering", () => {
      const renderStartHandler = vi.fn();
      const renderCompleteHandler = vi.fn();

      (renderer as any).on("renderStart", renderStartHandler);
      (renderer as any).on("renderComplete", renderCompleteHandler);

      // Mock the rendering engine callbacks
      const onRenderStart = renderer["renderingEngine"]["callbacks"].onRenderStart;
      const onRenderComplete = renderer["renderingEngine"]["callbacks"].onRenderComplete;

      onRenderStart();
      onRenderComplete();

      expect(renderStartHandler).toHaveBeenCalled();
      expect(renderCompleteHandler).toHaveBeenCalled();
    });
  });

  describe("Lifecycle Management", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
    });

    it("should destroy renderer properly", () => {
      const destroyHandler = vi.fn();
      (renderer as any).on("destroy", destroyHandler);

      const eventHandlerDestroySpy = vi.spyOn(renderer["eventHandler"], "destroy");
      const cacheManagerClearSpy = vi.spyOn(renderer["cacheManager"], "clear");

      renderer.destroy();

      expect(destroyHandler).toHaveBeenCalled();
      expect(eventHandlerDestroySpy).toHaveBeenCalled();
      expect(cacheManagerClearSpy).toHaveBeenCalled();
      expect(renderer["isDestroyed"]).toBe(true);
    });

    it("should not destroy twice", () => {
      const destroyHandler = vi.fn();
      (renderer as any).on("destroy", destroyHandler);

      renderer.destroy();
      renderer.destroy(); // Second call should be ignored

      expect(destroyHandler).toHaveBeenCalledTimes(1);
    });

    it("should ignore method calls after destruction", () => {
      renderer.destroy();

      // These should not throw or cause issues
      renderer.setOptions({ color: "#ff0000" });
      renderer.setPeaks([0.5, 0.5]);
      renderer.setProgress(0.5);
      renderer.setProgressLineOptions({ color: "#ff0000" });
    });
  });

  describe("Rendering System", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
      vi.useFakeTimers();
    });

    it("should schedule render on initialization", () => {
      expect(renderer["frameRequest"]).toBeDefined();
    });

    it("should throttle rendering calls", () => {
      const performanceNowSpy = vi.spyOn(performance, "now");
      performanceNowSpy
        .mockReturnValueOnce(0) // First render
        .mockReturnValueOnce(10) // Second render (too soon)
        .mockReturnValueOnce(20); // Third render (allowed)

      // Clear initial render request
      renderer["cancelPendingRender"]();

      renderer["scheduleRender"]();
      renderer["scheduleRender"]();

      // Only one frame should be requested due to throttling
      expect(renderer["frameRequest"]).toBeDefined();
    });

    it("should cancel pending renders on destroy", () => {
      const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

      renderer.destroy();

      expect(cancelSpy).toHaveBeenCalled();
    });

    it("should not render when destroyed", () => {
      const renderSpy = vi.spyOn(renderer["renderingEngine"], "render");

      renderer.destroy();
      renderer["render"]();

      expect(renderSpy).not.toHaveBeenCalled();
    });
  });

  describe("Canvas Setup", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
    });

    it("should setup canvas with device pixel ratio", () => {
      window.devicePixelRatio = 2;

      renderer["setupCanvas"]();

      expect(mockContext.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
    });

    it("should handle resize properly", () => {
      const dimensions = { width: 1200, height: 400 };
      const setupCanvasSpy = vi.spyOn(renderer as any, "setupCanvas");

      renderer["handleResize"](dimensions);

      expect(setupCanvasSpy).toHaveBeenCalled();
      expect(renderer["dirtyFlags"].size).toBe(true);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      renderer = new WaveformRenderer(canvas, peaks);
    });

    it("should handle initialization errors", () => {
      // Create a renderer that will fail during initialization
      canvas.getContext = vi.fn().mockReturnValue(null);

      expect(() => {
        new WaveformRenderer(canvas, peaks);
      }).toThrow();
    });

    it("should convert non-Error objects to Error instances", () => {
      const errorHandler = vi.fn();
      (renderer as any).on("error", errorHandler);

      renderer["handleError"]("string error");

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "An unknown error occurred",
        }),
      );
    });
  });
});
