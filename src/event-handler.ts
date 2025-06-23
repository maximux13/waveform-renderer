import { normalizeProgress } from "@/utils";

import type { EventCallbacks } from "@/types";


export class EventHandlerManager {
    private canvas: HTMLCanvasElement;
    private resizeObserver: ResizeObserver;
    private callbacks: EventCallbacks;
    private resizeTimeout?: number;
    private readonly resizeDebounceDelay = 150; // ms

    constructor(canvas: HTMLCanvasElement, callbacks: EventCallbacks) {
        this.canvas = canvas;
        this.callbacks = callbacks;

        this.resizeObserver = new ResizeObserver(this.handleResize);
        this.resizeObserver.observe(this.canvas);

        this.attachEventListeners();
    }

    public destroy(): void {
        this.detachEventListeners();
        this.resizeObserver.disconnect();

        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
    }

    private attachEventListeners(): void {
        this.canvas.addEventListener("click", this.handleClick);
        this.canvas.addEventListener("touchstart", this.handleTouch);
    }

    private detachEventListeners(): void {
        this.canvas.removeEventListener("click", this.handleClick);
        this.canvas.removeEventListener("touchstart", this.handleTouch);
    }

    private handleClick = (event: MouseEvent): void => {
        event.preventDefault();

        try {
            const progress = this.calculateProgressFromEvent(event);
            this.callbacks.onSeek(progress);
        } catch (e) {
            this.handleError(e);
        }
    };

    private handleTouch = (event: TouchEvent): void => {
        event.preventDefault();

        if (!event.changedTouches[0]) return;

        try {
            const progress = this.calculateProgressFromTouch(event.changedTouches[0]);
            this.callbacks.onSeek(progress);
        } catch (e) {
            this.handleError(e);
        }
    };

    private handleResize = (): void => {
        // Clear any pending resize timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        // Debounce resize handling to avoid excessive re-renders
        this.resizeTimeout = window.setTimeout(() => {
            try {
                const rect = this.canvas.getBoundingClientRect();
                this.callbacks.onResize({
                    height: rect.height,
                    width: rect.width,
                });
            } catch (e) {
                this.handleError(e);
            }
        }, this.resizeDebounceDelay);
    };

    private calculateProgressFromEvent(event: MouseEvent): number {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        return normalizeProgress(x / rect.width);
    }

    private calculateProgressFromTouch(touch: Touch): number {
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        return normalizeProgress(x / rect.width);
    }

    private handleError(e: unknown): void {
        const error = e instanceof Error ? e : new Error("An unknown error occurred");
        this.callbacks.onError(error);
    }
}
