import { describe, expect, it, vi, beforeEach } from "vitest";

import { CacheManager } from "../src/cache-manager";
import type { WaveformOptions, CachedBarData } from "../src/types";

// Mock Path2D for Node.js environment
class MockPath2D {
  rect = vi.fn();
  roundRect = vi.fn();
}

global.Path2D = MockPath2D as any;

describe("CacheManager", () => {
  let cacheManager: CacheManager;
  let mockCanvas: HTMLCanvasElement;
  let mockOptions: Required<WaveformOptions>;

  beforeEach(() => {
    cacheManager = new CacheManager();
    mockCanvas = {
      width: 800,
      height: 200,
      getContext: vi.fn(),
    } as unknown as HTMLCanvasElement;

    mockOptions = {
      amplitude: 0.8,
      backgroundColor: "#f0f0f0",
      barWidth: 2,
      borderColor: "#000",
      borderRadius: 2,
      borderWidth: 1,
      color: "#3b82f6",
      debug: false,
      gap: 1,
      minPixelRatio: 1,
      position: "bottom" as const,
      progress: 0,
      progressLine: null,
      smoothing: false,
    };
  });

  describe("constructor", () => {
    it("should initialize with null cache", () => {
      expect(cacheManager.isValid()).toBe(false);
    });
  });

  describe("clear", () => {
    it("should clear the cache", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);
      expect(cacheManager.isValid()).toBe(true);

      cacheManager.clear();
      expect(cacheManager.isValid()).toBe(false);
    });
  });

  describe("invalidate", () => {
    it("should invalidate staticWaveformPath when cache exists", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      // Create a static path
      const path = cacheManager.createStaticPath(cache, 2);
      expect(cache.staticWaveformPath).toBe(path);

      cacheManager.invalidate();
      expect(cache.staticWaveformPath).toBeUndefined();
    });

    it("should not throw when cache is null", () => {
      expect(() => cacheManager.invalidate()).not.toThrow();
    });
  });

  describe("isValid", () => {
    it("should return false when cache is null", () => {
      expect(cacheManager.isValid()).toBe(false);
    });

    it("should return true when cache exists", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);
      expect(cacheManager.isValid()).toBe(true);
    });
  });

  describe("getCache", () => {
    it("should create cache when none exists", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      expect(cache).toBeDefined();
      expect(cache.canvasWidth).toBe(800);
      expect(cache.canvasHeight).toBe(200);
      expect(cache.bars).toBeDefined();
      expect(cache.bars.length).toBeGreaterThan(0);
    });

    it("should return existing cache when valid", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache1 = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);
      const cache2 = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      expect(cache1).toBe(cache2);
    });

    it("should rebuild cache when canvas dimensions change", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache1 = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      mockCanvas.width = 1000;
      const cache2 = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      expect(cache1).not.toBe(cache2);
      expect(cache2.canvasWidth).toBe(1000);
    });

    it("should rebuild cache when options change", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache1 = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      const newOptions = { ...mockOptions, barWidth: 4 };
      const cache2 = cacheManager.getCache(mockCanvas, 1, peaks, newOptions);

      expect(cache1).not.toBe(cache2);
    });

    it("should rebuild cache when peaks change", () => {
      const peaks1 = [0.1, 0.5, 0.8, 0.3];
      const cache1 = cacheManager.getCache(mockCanvas, 1, peaks1, mockOptions);

      const peaks2 = [0.2, 0.6, 0.9, 0.4];
      const cache2 = cacheManager.getCache(mockCanvas, 1, peaks2, mockOptions);

      expect(cache1).not.toBe(cache2);
    });

    it("should handle high DPI correctly", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      mockCanvas.width = 1600; // 2x DPI
      const cache = cacheManager.getCache(mockCanvas, 2, peaks, mockOptions);

      expect(cache.canvasWidth).toBe(800); // Should be logical width
    });

    it("should calculate correct number of bars", () => {
      const peaks = Array.from({ length: 1000 }, (_, i) => i / 1000);
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      // With barWidth=2, borderWidth=1, gap=1, the singleUnitWidth should be 2+1*2+1=5
      // Available width = 800 - 1*2 = 798
      // Total bars = floor(798/5) = 159
      expect(cache.totalBars).toBe(159);
      expect(cache.bars).toHaveLength(159);
    });

    it("should handle empty peaks array", () => {
      const peaks: number[] = [];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      expect(cache.totalBars).toBeGreaterThan(0); // Should have at least 1 bar
      expect(cache.bars).toHaveLength(cache.totalBars);
    });

    it("should handle single peak", () => {
      const peaks = [0.5];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      expect(cache.bars).toHaveLength(cache.totalBars);
      expect(cache.bars[0].peakValue).toBe(0.5);
    });
  });

  describe("createStaticPath", () => {
    it("should create Path2D for cache bars", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      const path = cacheManager.createStaticPath(cache, 0);

      expect(path).toBeInstanceOf(Path2D);
      expect(cache.staticWaveformPath).toBe(path);
    });

    it("should return existing static path when available", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      const path1 = cacheManager.createStaticPath(cache, 0);
      const path2 = cacheManager.createStaticPath(cache, 0);

      expect(path1).toBe(path2);
    });

    it("should handle border radius when roundRect is available", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      // Mock roundRect method
      const mockPath = {
        rect: vi.fn(),
        roundRect: vi.fn(),
      } as unknown as Path2D;

      vi.spyOn(global, "Path2D").mockReturnValue(mockPath);

      cacheManager.createStaticPath(cache, 2);

      expect(mockPath.roundRect).toHaveBeenCalled();
      expect(mockPath.rect).not.toHaveBeenCalled();
    });

    it("should fall back to rect when roundRect is not available", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      // Mock Path2D without roundRect
      const mockPath = {
        rect: vi.fn(),
      } as unknown as Path2D;

      vi.spyOn(global, "Path2D").mockReturnValue(mockPath);

      cacheManager.createStaticPath(cache, 2);

      expect(mockPath.rect).toHaveBeenCalled();
    });

    it("should use rect when border radius is 0", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      const mockPath = {
        rect: vi.fn(),
        roundRect: vi.fn(),
      } as unknown as Path2D;

      vi.spyOn(global, "Path2D").mockReturnValue(mockPath);

      cacheManager.createStaticPath(cache, 0);

      expect(mockPath.rect).toHaveBeenCalled();
      expect(mockPath.roundRect).not.toHaveBeenCalled();
    });
  });

  describe("cache validation", () => {
    it("should create different hashes for different options", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache1 = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      const options2 = { ...mockOptions, amplitude: 0.5 };
      const cache2 = cacheManager.getCache(mockCanvas, 1, peaks, options2);

      expect(cache1.lastOptionsHash).not.toBe(cache2.lastOptionsHash);
    });

    it("should create different hashes for different peaks", () => {
      const peaks1 = [0.1, 0.5, 0.8, 0.3];
      const cache1 = cacheManager.getCache(mockCanvas, 1, peaks1, mockOptions);

      const peaks2 = [0.2, 0.6, 0.9, 0.4];
      const cache2 = cacheManager.getCache(mockCanvas, 1, peaks2, mockOptions);

      expect(cache1.lastPeaksHash).not.toBe(cache2.lastPeaksHash);
    });

    it("should create same hash for same peaks with different references", () => {
      const peaks1 = [0.1, 0.5, 0.8, 0.3];
      const peaks2 = [0.1, 0.5, 0.8, 0.3];

      const cache1 = cacheManager.getCache(mockCanvas, 1, peaks1, mockOptions);
      cacheManager.clear();
      const cache2 = cacheManager.getCache(mockCanvas, 1, peaks2, mockOptions);

      expect(cache1.lastPeaksHash).toBe(cache2.lastPeaksHash);
    });
  });

  describe("bar calculations", () => {
    it("should calculate correct bar positions", () => {
      const peaks = [0.1, 0.5, 0.8, 0.3];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      // First bar should start at borderWidth offset
      expect(cache.bars[0].x).toBe(1); // borderWidth
      expect(cache.bars[0].width).toBe(2); // barWidth

      // Second bar should be offset by singleUnitWidth
      if (cache.bars.length > 1) {
        expect(cache.bars[1].x).toBe(1 + cache.singleUnitWidth);
      }
    });

    it("should handle different bar widths", () => {
      const peaks = [0.5];
      const wideBarOptions = { ...mockOptions, barWidth: 10 };
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, wideBarOptions);

      expect(cache.bars[0].width).toBe(10);
    });

    it("should handle different gaps", () => {
      const peaks = [0.1, 0.5];
      const gapOptions = { ...mockOptions, gap: 5 };
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, gapOptions);

      // singleUnitWidth = barWidth + borderWidth*2 + gap = 2 + 1*2 + 5 = 9
      expect(cache.singleUnitWidth).toBe(9);
    });

    it("should handle zero gap", () => {
      const peaks = [0.1, 0.5];
      const noGapOptions = { ...mockOptions, gap: 0 };
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, noGapOptions);

      // singleUnitWidth = barWidth + borderWidth*2 + gap = 2 + 1*2 + 0 = 4
      expect(cache.singleUnitWidth).toBe(4);
    });
  });

  describe("edge cases", () => {
    it("should handle very small canvas", () => {
      const smallCanvas = { ...mockCanvas, width: 10, height: 10 };
      const peaks = [0.5];
      const cache = cacheManager.getCache(smallCanvas, 1, peaks, mockOptions);

      expect(cache.totalBars).toBeGreaterThan(0);
      expect(cache.bars).toHaveLength(cache.totalBars);
    });

    it("should handle very large canvas", () => {
      const largeCanvas = { ...mockCanvas, width: 10000, height: 1000 };
      const peaks = Array.from({ length: 1000 }, (_, i) => i / 1000);
      const cache = cacheManager.getCache(largeCanvas, 1, peaks, mockOptions);

      expect(cache.canvasWidth).toBe(10000);
      expect(cache.bars).toHaveLength(cache.totalBars);
    });

    it("should handle negative peaks", () => {
      const peaks = [-0.5, -0.8, -0.3];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      // Peaks should be processed as absolute values
      expect(cache.bars[0].peakValue).toBe(0.5);
    });

    it("should handle mixed positive and negative peaks", () => {
      const peaks = [-0.5, 0.8, -0.3, 0.6];
      const cache = cacheManager.getCache(mockCanvas, 1, peaks, mockOptions);

      // Note: The actual peak values depend on how the cache samples the peaks array
      // Since we have 4 peaks and the canvas width/bar calculations determine how many bars,
      // we need to check that absolute values are used correctly
      cache.bars.forEach((bar: CachedBarData) => {
        expect(bar.peakValue).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
