import { describe, expect, it, vi } from "vitest";

import { getPeaksFromAudioBuffer, normalizePeaks, normalizeProgress } from "../../src/utils/peaks";

describe("peaks utilities", () => {
  describe("getPeaksFromAudioBuffer", () => {
    function createMockAudioBuffer(channelData: Float32Array): AudioBuffer {
      const mockBuffer = {
        getChannelData: vi.fn().mockReturnValue(channelData),
        length: channelData.length,
        numberOfChannels: 1,
        sampleRate: 44100,
        duration: channelData.length / 44100,
      } as unknown as AudioBuffer;

      return mockBuffer;
    }

    it("should extract peaks from audio buffer", () => {
      const channelData = new Float32Array([0.1, 0.8, 0.3, 0.6, 0.2, 0.9, 0.4, 0.7]);
      const mockBuffer = createMockAudioBuffer(channelData);

      const peaks = getPeaksFromAudioBuffer(mockBuffer, 4);

      expect(peaks).toHaveLength(4);
      expect(mockBuffer.getChannelData).toHaveBeenCalledWith(0);
    });

    it("should handle single peak extraction", () => {
      const channelData = new Float32Array([0.1, 0.8, 0.3, 0.6]);
      const mockBuffer = createMockAudioBuffer(channelData);

      const peaks = getPeaksFromAudioBuffer(mockBuffer, 1);

      expect(peaks).toHaveLength(1);
    });

    it("should find maximum values in each segment", () => {
      const channelData = new Float32Array([0.1, 0.8, 0.3, 0.6]);
      const mockBuffer = createMockAudioBuffer(channelData);

      const peaks = getPeaksFromAudioBuffer(mockBuffer, 2);

      expect(peaks).toHaveLength(2);
    });

    it("should handle negative values correctly", () => {
      const channelData = new Float32Array([-0.5, -0.8, 0.3, -0.9]);
      const mockBuffer = createMockAudioBuffer(channelData);

      const peaks = getPeaksFromAudioBuffer(mockBuffer, 2);

      expect(peaks).toHaveLength(2);
      expect(peaks.every(peak => peak >= 0 && peak <= 1)).toBe(true);
    });

    it("should handle empty audio buffer", () => {
      const channelData = new Float32Array([]);
      const mockBuffer = createMockAudioBuffer(channelData);

      const peaks = getPeaksFromAudioBuffer(mockBuffer, 0);

      expect(peaks).toHaveLength(0);
    });

    it("should handle audio buffer with zeros", () => {
      const channelData = new Float32Array([0, 0, 0, 0]);
      const mockBuffer = createMockAudioBuffer(channelData);

      const peaks = getPeaksFromAudioBuffer(mockBuffer, 2);

      expect(peaks).toHaveLength(2);
      expect(peaks.every(peak => peak === 0)).toBe(true);
    });
  });

  describe("normalizePeaks", () => {
    it("should normalize peaks to range 0-1", () => {
      const peaks = [0.5, 1.0, 0.25, 0.75];
      const normalized = normalizePeaks(peaks);

      expect(normalized).toEqual([0.5, 1.0, 0.25, 0.75]);
    });

    it("should scale down peaks when max > 1", () => {
      const peaks = [1.0, 2.0, 0.5, 1.5];
      const normalized = normalizePeaks(peaks);

      expect(normalized).toEqual([0.5, 1.0, 0.25, 0.75]);
    });

    it("should handle negative values", () => {
      const peaks = [-1.0, 2.0, -0.5, 1.5];
      const normalized = normalizePeaks(peaks);

      expect(normalized).toEqual([-0.5, 1.0, -0.25, 0.75]);
    });

    it("should handle array with all zeros", () => {
      const peaks = [0, 0, 0, 0];
      const normalized = normalizePeaks(peaks);

      expect(normalized).toEqual([0, 0, 0, 0]);
    });

    it("should handle single element array", () => {
      const peaks = [2.0];
      const normalized = normalizePeaks(peaks);

      expect(normalized).toEqual([1.0]);
    });

    it("should handle empty array", () => {
      const peaks: number[] = [];
      const normalized = normalizePeaks(peaks);

      expect(normalized).toEqual([]);
    });

    it("should not modify already normalized peaks", () => {
      const peaks = [0.1, 0.8, 0.3, 0.6];
      const originalPeaks = [...peaks];
      const normalized = normalizePeaks(peaks);

      expect(normalized).toEqual(originalPeaks);
    });

    it("should handle very small values", () => {
      const peaks = [0.001, 0.002, 0.0005, 0.0015];
      const normalized = normalizePeaks(peaks);

      // Since all values are < 1, they remain unchanged
      expect(normalized).toEqual([0.001, 0.002, 0.0005, 0.0015]);
    });

    it("should handle very large peaks correctly", () => {
      const peaks = [1000, 2000, 3000, 4000];
      const normalized = normalizePeaks(peaks);

      // Normalize to range 0-1
      expect(normalized).toEqual([0.25, 0.5, 0.75, 1.0]);
    });

    it("should handle mixed positive and negative values", () => {
      const peaks = [-1, 0, 1, 2];
      const normalized = normalizePeaks(peaks);

      // Normalize to range -0.5 to 1.0
      expect(normalized).toEqual([-0.5, 0, 0.5, 1.0]);
    });

    it("should handle large data sets efficiently", () => {
      const peaks = Array.from({ length: 150000 }, (_, i) => i % 1000);
      const normalized = normalizePeaks(peaks);

      expect(normalized).toHaveLength(150000);
      expect(normalized[0]).toBe(0);
      expect(normalized[999]).toBe(1);
      expect(normalized[1000]).toBe(0);
      expect(normalized[149999]).toBe(1);
    });
  });

  describe("normalizeProgress", () => {
    it("should clamp progress to 0-1 range", () => {
      expect(normalizeProgress(0.5)).toBe(0.5);
      expect(normalizeProgress(0)).toBe(0);
      expect(normalizeProgress(1)).toBe(1);
    });

    it("should clamp negative values to 0", () => {
      expect(normalizeProgress(-0.5)).toBe(0);
      expect(normalizeProgress(-1)).toBe(0);
      expect(normalizeProgress(-10)).toBe(0);
    });

    it("should clamp values > 1 to 1", () => {
      expect(normalizeProgress(1.5)).toBe(1);
      expect(normalizeProgress(2)).toBe(1);
      expect(normalizeProgress(10)).toBe(1);
    });

    it("should handle edge cases", () => {
      expect(normalizeProgress(Number.POSITIVE_INFINITY)).toBe(1);
      expect(normalizeProgress(Number.NEGATIVE_INFINITY)).toBe(0);
    });

    it("should handle NaN", () => {
      // Math.max/min with NaN returns NaN
      expect(normalizeProgress(NaN)).toBeNaN();
    });

    it("should handle very small positive numbers", () => {
      expect(normalizeProgress(0.0001)).toBe(0.0001);
      expect(normalizeProgress(Number.MIN_VALUE)).toBe(Number.MIN_VALUE);
    });

    it("should handle numbers very close to 1", () => {
      expect(normalizeProgress(0.9999)).toBe(0.9999);
      expect(normalizeProgress(1 - Number.EPSILON)).toBe(1 - Number.EPSILON);
    });
  });
});
