import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { DebugSystem } from "../src/debug-system";
import type { DirtyFlags } from "../src/types";

// Mock performance.now
const mockPerformanceNow = vi.fn();
global.performance = { ...global.performance, now: mockPerformanceNow };

// Mock console.log
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

describe("DebugSystem", () => {
  let debugSystem: DebugSystem;
  let mockCanvas: HTMLCanvasElement;
  let mockDirtyFlags: DirtyFlags;

  beforeEach(() => {
    debugSystem = new DebugSystem();
    mockCanvas = {
      getBoundingClientRect: vi.fn().mockReturnValue({
        width: 800,
        height: 200,
      }),
    } as unknown as HTMLCanvasElement;

    mockDirtyFlags = {
      peaks: false,
      options: false,
      size: false,
      progress: true,
    };

    // Reset performance.now mock
    mockPerformanceNow.mockReturnValue(1000);
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with debug disabled", () => {
      expect(debugSystem.isEnabled()).toBe(false);
    });

    it("should create initial debug info", () => {
      const info = debugSystem.getInfo();
      expect(info.performance.totalRenders).toBe(0);
      expect(info.performance.averageRenderTime).toBe(0);
      expect(info.performance.fps).toBe(0);
      expect(info.state.canvasSize).toEqual({ width: 0, height: 0 });
      expect(info.events.totalSeeks).toBe(0);
    });
  });

  describe("enable/disable", () => {
    it("should enable debug mode", () => {
      debugSystem.enable();
      expect(debugSystem.isEnabled()).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("[WaveformRenderer Debug"),
        "Debug mode enabled",
      );
    });

    it("should disable debug mode", () => {
      debugSystem.enable();
      debugSystem.disable();
      expect(debugSystem.isEnabled()).toBe(false);
    });
  });

  describe("log", () => {
    it("should not log when disabled", () => {
      debugSystem.log("test message");
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should log message when enabled", () => {
      debugSystem.enable();
      mockConsoleLog.mockClear();

      debugSystem.log("test message");

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("[WaveformRenderer Debug"), "test message");
    });

    it("should log message with data when enabled", () => {
      debugSystem.enable();
      mockConsoleLog.mockClear();

      const testData = { key: "value" };
      debugSystem.log("test message", testData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("[WaveformRenderer Debug"),
        "test message",
        testData,
      );
    });

    it("should include timestamp in log message", () => {
      mockPerformanceNow.mockReturnValue(1234.567);
      debugSystem.enable();
      mockConsoleLog.mockClear();

      debugSystem.log("test");

      expect(mockConsoleLog).toHaveBeenCalledWith("[WaveformRenderer Debug 1234.57ms]", "test");
    });
  });

  describe("updateRenderMetrics", () => {
    it("should not update metrics when disabled", () => {
      debugSystem.updateRenderMetrics(10);
      const info = debugSystem.getInfo();
      expect(info.performance.totalRenders).toBe(0);
    });

    it("should update render metrics when enabled", () => {
      debugSystem.enable();
      debugSystem.updateRenderMetrics(15.5);

      const info = debugSystem.getInfo();
      expect(info.performance.totalRenders).toBe(1);
      expect(info.performance.lastRenderTime).toBe(15.5);
      expect(info.performance.averageRenderTime).toBe(15.5);
    });

    it("should calculate average render time correctly", () => {
      debugSystem.enable();

      debugSystem.updateRenderMetrics(10);
      debugSystem.updateRenderMetrics(20);
      debugSystem.updateRenderMetrics(30);

      const info = debugSystem.getInfo();
      expect(info.performance.totalRenders).toBe(3);
      expect(info.performance.averageRenderTime).toBe(20);
    });

    it("should limit render times to last 60 entries", () => {
      debugSystem.enable();

      // Add 65 render times
      for (let i = 1; i <= 65; i++) {
        debugSystem.updateRenderMetrics(i);
      }

      const info = debugSystem.getInfo();
      expect(info.performance.totalRenders).toBe(65);
      // Average should be of last 60 entries: (6+7+...+65) = 60 entries from 6 to 65
      // Sum = 60 * (6 + 65) / 2 = 60 * 35.5 = 2130, Average = 2130 / 60 = 35.5
      expect(info.performance.averageRenderTime).toBe(35.5);
    });

    it("should calculate FPS based on frame time", () => {
      debugSystem.enable();

      mockPerformanceNow.mockReturnValueOnce(1000); // First call
      debugSystem.updateRenderMetrics(10);

      mockPerformanceNow.mockReturnValueOnce(1016.667); // Second call (16.667ms later ≈ 60fps)
      debugSystem.updateRenderMetrics(10);

      const info = debugSystem.getInfo();
      expect(info.performance.fps).toBe(60);
    });

    it("should not calculate FPS on first render", () => {
      debugSystem.enable();

      debugSystem.updateRenderMetrics(10);

      const info = debugSystem.getInfo();
      expect(info.performance.fps).toBe(0);
    });
  });

  describe("updateCacheMetrics", () => {
    it("should not update cache metrics when disabled", () => {
      debugSystem.updateCacheMetrics(5);
      const info = debugSystem.getInfo();
      expect(info.performance.cacheBuilds).toBe(0);
    });

    it("should update cache metrics when enabled", () => {
      debugSystem.enable();
      debugSystem.updateCacheMetrics(8.5);

      const info = debugSystem.getInfo();
      expect(info.performance.cacheBuilds).toBe(1);
      expect(info.performance.lastCacheBuildTime).toBe(8.5);
    });

    it("should increment cache builds counter", () => {
      debugSystem.enable();

      debugSystem.updateCacheMetrics(5);
      debugSystem.updateCacheMetrics(10);
      debugSystem.updateCacheMetrics(15);

      const info = debugSystem.getInfo();
      expect(info.performance.cacheBuilds).toBe(3);
      expect(info.performance.lastCacheBuildTime).toBe(15);
    });
  });

  describe("updateState", () => {
    it("should not update state when disabled", () => {
      debugSystem.updateState(mockCanvas, 100, 50, true, mockDirtyFlags);
      const info = debugSystem.getInfo();
      expect(info.state.peaksCount).toBe(0);
    });

    it("should update state when enabled", () => {
      debugSystem.enable();
      debugSystem.updateState(mockCanvas, 200, 75, true, mockDirtyFlags);

      const info = debugSystem.getInfo();
      expect(info.state.canvasSize).toEqual({ width: 800, height: 200 });
      expect(info.state.peaksCount).toBe(200);
      expect(info.state.barsRendered).toBe(75);
      expect(info.state.cacheValid).toBe(true);
      expect(info.state.dirtyFlags).toEqual(mockDirtyFlags);
    });

    it("should get canvas size from getBoundingClientRect", () => {
      debugSystem.enable();

      mockCanvas.getBoundingClientRect = vi.fn().mockReturnValue({
        width: 1200,
        height: 300,
      });

      debugSystem.updateState(mockCanvas, 100, 50, false, mockDirtyFlags);

      const info = debugSystem.getInfo();
      expect(info.state.canvasSize).toEqual({ width: 1200, height: 300 });
      expect(mockCanvas.getBoundingClientRect).toHaveBeenCalled();
    });

    it("should create deep copy of dirty flags", () => {
      debugSystem.enable();
      debugSystem.updateState(mockCanvas, 100, 50, true, mockDirtyFlags);

      const info = debugSystem.getInfo();
      expect(info.state.dirtyFlags).toEqual(mockDirtyFlags);
      expect(info.state.dirtyFlags).not.toBe(mockDirtyFlags); // Different reference
    });
  });

  describe("event counters", () => {
    it("should increment seeks counter", () => {
      debugSystem.incrementSeeks();
      debugSystem.incrementSeeks();

      const info = debugSystem.getInfo();
      expect(info.events.totalSeeks).toBe(2);
    });

    it("should increment resizes counter", () => {
      debugSystem.incrementResizes();
      debugSystem.incrementResizes();
      debugSystem.incrementResizes();

      const info = debugSystem.getInfo();
      expect(info.events.totalResizes).toBe(3);
    });

    it("should increment errors counter", () => {
      debugSystem.incrementErrors();

      const info = debugSystem.getInfo();
      expect(info.events.totalErrors).toBe(1);
    });
  });

  describe("getInfo", () => {
    it("should return deep copy of debug info", () => {
      debugSystem.enable();
      debugSystem.updateRenderMetrics(10);

      const info1 = debugSystem.getInfo();
      const info2 = debugSystem.getInfo();

      expect(info1).toEqual(info2);
      expect(info1).not.toBe(info2); // Different references
      expect(info1.performance).not.toBe(info2.performance);
    });

    it("should not affect internal state when modifying returned info", () => {
      debugSystem.enable();
      debugSystem.incrementSeeks();

      const info = debugSystem.getInfo();
      info.events.totalSeeks = 999;

      const newInfo = debugSystem.getInfo();
      expect(newInfo.events.totalSeeks).toBe(1);
    });
  });

  describe("reset", () => {
    it("should reset all counters and metrics", () => {
      debugSystem.enable();

      // Add some data
      debugSystem.updateRenderMetrics(10);
      debugSystem.updateRenderMetrics(20);
      debugSystem.updateCacheMetrics(5);
      debugSystem.incrementSeeks();
      debugSystem.incrementResizes();
      debugSystem.incrementErrors();

      mockConsoleLog.mockClear();
      debugSystem.reset();

      const info = debugSystem.getInfo();
      expect(info.performance.totalRenders).toBe(0);
      expect(info.performance.averageRenderTime).toBe(0);
      expect(info.performance.cacheBuilds).toBe(0);
      expect(info.events.totalSeeks).toBe(0);
      expect(info.events.totalResizes).toBe(0);
      expect(info.events.totalErrors).toBe(0);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("[WaveformRenderer Debug"),
        "Debug counters reset",
      );
    });

    it("should clear render times array", () => {
      debugSystem.enable();

      // Add render times
      debugSystem.updateRenderMetrics(10);
      debugSystem.updateRenderMetrics(20);
      debugSystem.updateRenderMetrics(30);

      debugSystem.reset();

      // Add new render time
      debugSystem.updateRenderMetrics(100);

      const info = debugSystem.getInfo();
      expect(info.performance.averageRenderTime).toBe(100); // Should be 100, not average of previous
    });
  });

  describe("logPerformanceSummary", () => {
    it("should not log when disabled", () => {
      // Simulate 60 renders
      for (let i = 0; i < 60; i++) {
        debugSystem.updateRenderMetrics(10);
      }

      mockConsoleLog.mockClear();
      debugSystem.logPerformanceSummary();

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should not log if totalRenders is not multiple of 60", () => {
      debugSystem.enable();

      // Simulate 59 renders
      for (let i = 0; i < 59; i++) {
        debugSystem.updateRenderMetrics(10);
      }

      mockConsoleLog.mockClear();
      debugSystem.logPerformanceSummary();

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should log performance summary every 60 renders", () => {
      debugSystem.enable();

      // Simulate 60 renders
      for (let i = 0; i < 60; i++) {
        debugSystem.updateRenderMetrics(15);
      }
      debugSystem.updateCacheMetrics(5);

      mockConsoleLog.mockClear();
      debugSystem.logPerformanceSummary();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("[WaveformRenderer Debug"),
        "Performance summary",
        expect.objectContaining({
          totalRenders: 60,
          averageRenderTime: expect.stringContaining("ms"),
          fps: expect.any(Number),
          cacheBuilds: 1,
        }),
      );
    });

    it("should format average render time with 2 decimals", () => {
      debugSystem.enable();

      debugSystem.updateRenderMetrics(12.3456);

      // Manually set totalRenders to 60 to trigger summary
      for (let i = 0; i < 59; i++) {
        debugSystem.updateRenderMetrics(10);
      }

      mockConsoleLog.mockClear();
      debugSystem.logPerformanceSummary();

      const lastCall = mockConsoleLog.mock.calls[mockConsoleLog.mock.calls.length - 1];
      const summary = lastCall[2];
      expect(summary.averageRenderTime).toMatch(/^\d+\.\d{2}ms$/);
    });

    it("should log summary every 60 renders multiple times", () => {
      debugSystem.enable();

      // First 60 renders
      for (let i = 0; i < 60; i++) {
        debugSystem.updateRenderMetrics(10);
      }

      mockConsoleLog.mockClear();
      debugSystem.logPerformanceSummary();
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);

      // Second 60 renders (total 120)
      for (let i = 0; i < 60; i++) {
        debugSystem.updateRenderMetrics(20);
      }

      mockConsoleLog.mockClear();
      debugSystem.logPerformanceSummary();
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("should handle zero render time", () => {
      debugSystem.enable();
      debugSystem.updateRenderMetrics(0);

      const info = debugSystem.getInfo();
      expect(info.performance.lastRenderTime).toBe(0);
      expect(info.performance.averageRenderTime).toBe(0);
    });

    it("should handle negative render time", () => {
      debugSystem.enable();
      debugSystem.updateRenderMetrics(-5);

      const info = debugSystem.getInfo();
      expect(info.performance.lastRenderTime).toBe(-5);
      expect(info.performance.averageRenderTime).toBe(-5);
    });

    it("should handle very large render times", () => {
      debugSystem.enable();
      debugSystem.updateRenderMetrics(1000000);

      const info = debugSystem.getInfo();
      expect(info.performance.lastRenderTime).toBe(1000000);
      expect(info.performance.averageRenderTime).toBe(1000000);
    });

    it("should handle canvas with zero dimensions", () => {
      debugSystem.enable();

      mockCanvas.getBoundingClientRect = vi.fn().mockReturnValue({
        width: 0,
        height: 0,
      });

      debugSystem.updateState(mockCanvas, 0, 0, false, mockDirtyFlags);

      const info = debugSystem.getInfo();
      expect(info.state.canvasSize).toEqual({ width: 0, height: 0 });
    });

    it("should handle multiple enable/disable cycles", () => {
      debugSystem.enable();
      debugSystem.updateRenderMetrics(10);
      debugSystem.disable();
      debugSystem.updateRenderMetrics(20); // Should not be recorded
      debugSystem.enable();
      debugSystem.updateRenderMetrics(30);

      const info = debugSystem.getInfo();
      expect(info.performance.totalRenders).toBe(2); // Only first and third
    });
  });
});
