import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { EventHandlerManager } from "../src/event-handler";
import type { EventCallbacks } from "../src/types";

// Mock ResizeObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockUnobserve = vi.fn();

class MockResizeObserver {
  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = mockUnobserve;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  callback: ResizeObserverCallback;

  // Helper method to trigger resize
  triggerResize(entries: ResizeObserverEntry[]) {
    this.callback(entries, this);
  }
}

global.ResizeObserver = MockResizeObserver as any;

// Mock setTimeout/clearTimeout
const mockSetTimeout = vi.spyOn(global, "setTimeout");
const mockClearTimeout = vi.spyOn(global, "clearTimeout");

describe("EventHandlerManager", () => {
  let eventHandler: EventHandlerManager;
  let mockCanvas: HTMLCanvasElement;
  let mockCallbacks: EventCallbacks;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    mockUnobserve.mockClear();

    // Mock canvas
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({
        left: 100,
        top: 50,
        width: 800,
        height: 200,
      }),
    } as unknown as HTMLCanvasElement;

    // Mock callbacks
    mockCallbacks = {
      onSeek: vi.fn(),
      onResize: vi.fn(),
      onError: vi.fn(),
    };

    // Reset timers
    mockSetTimeout.mockClear();
    mockClearTimeout.mockClear();
  });

  afterEach(() => {
    if (eventHandler) {
      eventHandler.destroy();
    }
    vi.clearAllTimers();
  });

  describe("constructor", () => {
    it("should initialize with canvas and callbacks", () => {
      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);

      expect(mockCanvas.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith("touchstart", expect.any(Function));
    });

    it("should create ResizeObserver and observe canvas", () => {
      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);

      expect(mockObserve).toHaveBeenCalledWith(mockCanvas);
    });

    it("should store canvas and callbacks references", () => {
      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);

      // Access private properties for testing
      expect((eventHandler as any).canvas).toBe(mockCanvas);
      expect((eventHandler as any).callbacks).toBe(mockCallbacks);
    });
  });

  describe("destroy", () => {
    beforeEach(() => {
      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);
    });

    it("should remove event listeners", () => {
      eventHandler.destroy();

      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith("click", expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith("touchstart", expect.any(Function));
    });

    it("should disconnect ResizeObserver", () => {
      eventHandler.destroy();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("should clear resize timeout if exists", () => {
      // Trigger a resize to create timeout
      const resizeObserver = (eventHandler as any).resizeObserver as MockResizeObserver;
      resizeObserver.triggerResize([]);

      expect(mockSetTimeout).toHaveBeenCalled();

      // Destroy should clear the timeout
      eventHandler.destroy();

      expect(mockClearTimeout).toHaveBeenCalled();
    });

    it("should not throw if no resize timeout exists", () => {
      expect(() => eventHandler.destroy()).not.toThrow();
    });
  });

  describe("click handling", () => {
    beforeEach(() => {
      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);
    });

    it("should handle click events and calculate progress", () => {
      const clickEvent = new MouseEvent("click", {
        clientX: 500, // 500 - 100 (left) = 400px from left edge
        clientY: 150,
      });

      // Get the click handler from addEventListener calls
      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      clickHandler(clickEvent);

      // Progress should be (500 - 100) / 800 = 0.5
      expect(mockCallbacks.onSeek).toHaveBeenCalledWith(0.5);
    });

    it("should prevent default on click events", () => {
      const clickEvent = new MouseEvent("click", {
        clientX: 300,
        clientY: 150,
      });
      const preventDefaultSpy = vi.spyOn(clickEvent, "preventDefault");

      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      clickHandler(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should handle clicks at canvas edges", () => {
      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      // Click at left edge
      const leftClickEvent = new MouseEvent("click", {
        clientX: 100, // exactly at left edge
        clientY: 150,
      });
      clickHandler(leftClickEvent);
      expect(mockCallbacks.onSeek).toHaveBeenCalledWith(0);

      // Click at right edge
      const rightClickEvent = new MouseEvent("click", {
        clientX: 900, // 100 + 800 = right edge
        clientY: 150,
      });
      clickHandler(rightClickEvent);
      expect(mockCallbacks.onSeek).toHaveBeenCalledWith(1);
    });

    it("should handle clicks outside canvas bounds", () => {
      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      // Click beyond right edge
      const farRightClickEvent = new MouseEvent("click", {
        clientX: 1000, // way beyond right edge
        clientY: 150,
      });
      clickHandler(farRightClickEvent);
      expect(mockCallbacks.onSeek).toHaveBeenCalledWith(1); // Should be clamped to 1

      // Click before left edge
      const farLeftClickEvent = new MouseEvent("click", {
        clientX: 50, // before left edge
        clientY: 150,
      });
      clickHandler(farLeftClickEvent);
      expect(mockCallbacks.onSeek).toHaveBeenCalledWith(0); // Should be clamped to 0
    });

    it("should handle errors in click handler", () => {
      // Mock getBoundingClientRect to throw
      mockCanvas.getBoundingClientRect = vi.fn().mockImplementation(() => {
        throw new Error("Canvas error");
      });

      const clickEvent = new MouseEvent("click", {
        clientX: 300,
        clientY: 150,
      });

      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      clickHandler(clickEvent);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Canvas error",
        }),
      );
    });
  });

  describe("touch handling", () => {
    beforeEach(() => {
      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);
    });

    it("should handle touch events and calculate progress", () => {
      const touchEvent = new TouchEvent("touchstart", {
        changedTouches: [
          {
            clientX: 400, // 400 - 100 = 300px from left
            clientY: 150,
          } as Touch,
        ],
      });

      const touchHandler = (mockCanvas.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === "touchstart",
      )[1];

      touchHandler(touchEvent);

      // Progress should be (400 - 100) / 800 = 0.375
      expect(mockCallbacks.onSeek).toHaveBeenCalledWith(0.375);
    });

    it("should prevent default on touch events", () => {
      const touchEvent = new TouchEvent("touchstart", {
        changedTouches: [
          {
            clientX: 300,
            clientY: 150,
          } as Touch,
        ],
      });
      const preventDefaultSpy = vi.spyOn(touchEvent, "preventDefault");

      const touchHandler = (mockCanvas.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === "touchstart",
      )[1];

      touchHandler(touchEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should handle touch events without changedTouches", () => {
      const touchEvent = new TouchEvent("touchstart", {
        changedTouches: [] as any,
      });

      const touchHandler = (mockCanvas.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === "touchstart",
      )[1];

      touchHandler(touchEvent);

      // Should not call onSeek when no changedTouches
      expect(mockCallbacks.onSeek).not.toHaveBeenCalled();
    });

    it("should handle touch events with null changedTouches", () => {
      const touchEvent = {
        preventDefault: vi.fn(),
        changedTouches: [null] as any,
      };

      const touchHandler = (mockCanvas.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === "touchstart",
      )[1];

      touchHandler(touchEvent);

      // Should not call onSeek when changedTouches[0] is null
      expect(mockCallbacks.onSeek).not.toHaveBeenCalled();
    });

    it("should handle errors in touch handler", () => {
      mockCanvas.getBoundingClientRect = vi.fn().mockImplementation(() => {
        throw new Error("Touch error");
      });

      const touchEvent = new TouchEvent("touchstart", {
        changedTouches: [
          {
            clientX: 300,
            clientY: 150,
          } as Touch,
        ],
      });

      const touchHandler = (mockCanvas.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === "touchstart",
      )[1];

      touchHandler(touchEvent);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Touch error",
        }),
      );
    });
  });

  describe("resize handling", () => {
    beforeEach(() => {
      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);
    });

    it("should debounce resize events", () => {
      const resizeObserver = (eventHandler as any).resizeObserver as MockResizeObserver;

      // Trigger multiple resize events quickly
      resizeObserver.triggerResize([]);
      resizeObserver.triggerResize([]);
      resizeObserver.triggerResize([]);

      // Should only set one timeout (debouncing)
      expect(mockSetTimeout).toHaveBeenCalledTimes(3);
      expect(mockClearTimeout).toHaveBeenCalledTimes(2); // Clear previous timeouts
    });

    it("should call onResize with canvas dimensions after debounce delay", () => {
      vi.useFakeTimers();

      const resizeObserver = (eventHandler as any).resizeObserver as MockResizeObserver;
      resizeObserver.triggerResize([]);

      // Should not call onResize immediately
      expect(mockCallbacks.onResize).not.toHaveBeenCalled();

      // Fast-forward time by debounce delay (150ms)
      vi.advanceTimersByTime(150);

      expect(mockCallbacks.onResize).toHaveBeenCalledWith({
        width: 800,
        height: 200,
      });

      vi.useRealTimers();
    });

    it("should use correct debounce delay", () => {
      const resizeObserver = (eventHandler as any).resizeObserver as MockResizeObserver;
      resizeObserver.triggerResize([]);

      expect(mockSetTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        150, // Expected debounce delay
      );
    });

    it("should handle errors in resize handler", () => {
      vi.useFakeTimers();

      mockCanvas.getBoundingClientRect = vi.fn().mockImplementation(() => {
        throw new Error("Resize error");
      });

      const resizeObserver = (eventHandler as any).resizeObserver as MockResizeObserver;
      resizeObserver.triggerResize([]);

      // Fast-forward time
      vi.advanceTimersByTime(150);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Resize error",
        }),
      );

      vi.useRealTimers();
    });

    it("should clear existing timeout when new resize occurs", () => {
      const resizeObserver = (eventHandler as any).resizeObserver as MockResizeObserver;

      // First resize
      resizeObserver.triggerResize([]);
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);

      // Second resize should clear the first timeout
      resizeObserver.triggerResize([]);
      expect(mockClearTimeout).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);
    });

    it("should convert unknown errors to Error objects", () => {
      mockCanvas.getBoundingClientRect = vi.fn().mockImplementation(() => {
        throw "string error";
      });

      const clickEvent = new MouseEvent("click", {
        clientX: 300,
        clientY: 150,
      });

      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      clickHandler(clickEvent);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "An unknown error occurred",
        }),
      );
    });

    it("should pass through Error objects unchanged", () => {
      const originalError = new Error("Original error message");
      mockCanvas.getBoundingClientRect = vi.fn().mockImplementation(() => {
        throw originalError;
      });

      const clickEvent = new MouseEvent("click", {
        clientX: 300,
        clientY: 150,
      });

      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      clickHandler(clickEvent);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(originalError);
    });
  });

  describe("progress calculation", () => {
    beforeEach(() => {
      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);
    });

    it("should handle different canvas positions", () => {
      // Change canvas position
      mockCanvas.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 200,
        top: 100,
        width: 600,
        height: 150,
      });

      const clickEvent = new MouseEvent("click", {
        clientX: 500, // 500 - 200 = 300px from left edge
        clientY: 150,
      });

      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      clickHandler(clickEvent);

      // Progress should be (500 - 200) / 600 = 0.5
      expect(mockCallbacks.onSeek).toHaveBeenCalledWith(0.5);
    });

    it("should handle zero width canvas", () => {
      mockCanvas.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 100,
        top: 50,
        width: 0,
        height: 200,
      });

      const clickEvent = new MouseEvent("click", {
        clientX: 150,
        clientY: 150,
      });

      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      clickHandler(clickEvent);

      // Should handle division by zero gracefully
      expect(mockCallbacks.onSeek).toHaveBeenCalledWith(expect.any(Number));
    });

    it("should handle fractional pixel positions", () => {
      const clickEvent = new MouseEvent("click", {
        clientX: 350.5, // Fractional position
        clientY: 150,
      });

      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      clickHandler(clickEvent);

      // Progress should be (350.5 - 100) / 800 = 0.313125
      expect(mockCallbacks.onSeek).toHaveBeenCalledWith(0.313125);
    });
  });

  describe("edge cases", () => {
    it("should handle multiple destroy calls", () => {
      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);

      eventHandler.destroy();
      eventHandler.destroy(); // Second call should not throw

      // removeEventListener called 2 times per destroy (click + touchstart) = 4 total
      expect(mockCanvas.removeEventListener).toHaveBeenCalledTimes(4);
      expect(mockDisconnect).toHaveBeenCalledTimes(2);
    });

    it("should handle canvas without getBoundingClientRect", () => {
      const brokenCanvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: undefined,
      } as unknown as HTMLCanvasElement;

      eventHandler = new EventHandlerManager(brokenCanvas, mockCallbacks);

      const clickEvent = new MouseEvent("click", {
        clientX: 300,
        clientY: 150,
      });

      const clickHandler = (brokenCanvas.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === "click",
      )[1];

      expect(() => clickHandler(clickEvent)).not.toThrow();
      expect(mockCallbacks.onError).toHaveBeenCalled();
    });

    it("should handle callbacks that throw errors", () => {
      mockCallbacks.onSeek = vi.fn().mockImplementation(() => {
        throw new Error("Callback error");
      });

      eventHandler = new EventHandlerManager(mockCanvas, mockCallbacks);

      const clickEvent = new MouseEvent("click", {
        clientX: 300,
        clientY: 150,
      });

      const clickHandler = (mockCanvas.addEventListener as any).mock.calls.find((call: any) => call[0] === "click")[1];

      expect(() => clickHandler(clickEvent)).not.toThrow();
      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Callback error",
        }),
      );
    });
  });
});
