import type { CustomRenderer, RenderCache, WaveformOptions, RenderMode } from "waveform-renderer";

interface ReflectionOptions {
  reflectionHeight?: number;
  reflectionOpacity?: number;
  reflectionGap?: number;
  gradientFade?: boolean;
  fadeStartPoint?: number; // 0-1, where gradient starts (0 = top/start)
  fadeEndPoint?: number; // 0-1, where gradient ends (1 = bottom/end)
}

export class ReflectionRenderer implements CustomRenderer {
  private reflectionOptions: Required<ReflectionOptions>;
  private lastProgress: number = 0;

  // Cache for dimensions
  private cachedDimensions?: any;
  private lastCanvasHeight?: number;
  private lastPosition?: RenderMode;
  private lastReflectionHash?: string;

  constructor(reflectionOptions: ReflectionOptions = {}) {
    this.reflectionOptions = {
      reflectionHeight: 0.4,
      reflectionOpacity: 0.3,
      reflectionGap: 2,
      gradientFade: true,
      fadeStartPoint: 0.5,
      fadeEndPoint: 0.9,
      ...reflectionOptions,
    };
  }

  public render(
    ctx: CanvasRenderingContext2D,
    cache: RenderCache,
    options: Required<WaveformOptions>,
    staticPath?: Path2D,
  ): boolean {
    // Preserve progress across option changes
    if (options.progress > 0) {
      this.lastProgress = options.progress;
    }

    // Use current options but with preserved progress
    const renderOptions = { ...options, progress: this.lastProgress };

    ctx.clearRect(0, 0, cache.canvasWidth, cache.canvasHeight);

    const dimensions = this.getCachedDimensions(cache.canvasHeight, renderOptions.position);

    // Render main waveform with current options
    this.renderWaveform(ctx, cache, renderOptions, staticPath, dimensions.main, false);

    // Render reflection with current options
    this.renderWaveform(ctx, cache, renderOptions, staticPath, dimensions.reflection, true);

    // Render progress if any
    if (this.lastProgress > 0) {
      this.renderProgress(ctx, cache, renderOptions, staticPath, dimensions);
    }

    // Draw progress line
    if (renderOptions.progressLine && this.lastProgress > 0) {
      this.drawProgressLine(ctx, cache, renderOptions, dimensions);
    }

    return true;
  }

  private calculateDimensionsForPosition(canvasHeight: number, position: RenderMode) {
    const { reflectionHeight: reflectionRatio, reflectionGap } = this.reflectionOptions;
    const totalContentHeight = canvasHeight - reflectionGap;
    const mainHeight = totalContentHeight / (1 + reflectionRatio);
    const reflectionHeight = mainHeight * reflectionRatio;

    switch (position) {
      case "top":
        return {
          main: { y: 0, height: mainHeight },
          reflection: {
            y: mainHeight + reflectionGap,
            height: reflectionHeight,
            flipDirection: "down" as const,
          },
        };

      case "bottom":
        return {
          main: { y: 0, height: mainHeight },
          reflection: {
            y: mainHeight + reflectionGap,
            height: reflectionHeight,
            flipDirection: "down" as const,
          },
        };

      case "center":
      default:
        const centerY = (canvasHeight - mainHeight) / 2;
        return {
          main: { y: centerY, height: mainHeight },
          reflection: {
            y: centerY + mainHeight + reflectionGap,
            height: reflectionHeight,
            flipDirection: "down" as const,
          },
        };
    }
  }

  private renderWaveform(
    ctx: CanvasRenderingContext2D,
    cache: RenderCache,
    options: Required<WaveformOptions>,
    staticPath: Path2D | undefined,
    section: { y: number; height: number; flipDirection?: "up" | "down" },
    isReflection: boolean,
  ): void {
    ctx.save();

    // Clip to section area
    ctx.beginPath();
    ctx.rect(0, section.y, cache.canvasWidth, section.height);
    ctx.clip();

    // Apply transformations for reflection
    if (isReflection) {
      if (section.flipDirection === "up") {
        ctx.translate(0, section.y);
        ctx.scale(1, -1);
      } else {
        ctx.translate(0, section.y + section.height);
        ctx.scale(1, -1);
      }

      // Apply base opacity for reflection
      ctx.globalAlpha = this.reflectionOptions.reflectionOpacity;
    } else {
      ctx.translate(0, section.y);
    }

    // Scale to fit section height
    const scaleY = section.height / cache.canvasHeight;
    ctx.scale(1, scaleY);

    // Render with current background color and border options
    if (staticPath && this.supportsPath2D(options)) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fill(staticPath);

      if (options.borderWidth > 0) {
        ctx.strokeStyle = options.borderColor;
        ctx.lineWidth = options.borderWidth;
        ctx.stroke(staticPath);
      }
    } else {
      this.renderBarsWithFallback(ctx, cache.bars, options.backgroundColor, options);
    }

    ctx.restore();

    // Apply gradient fade AFTER rendering and restoring context (for reflections only)
    if (isReflection && this.reflectionOptions.gradientFade) {
      this.applyGradientMask(ctx, cache.canvasWidth, section.height, section.flipDirection, section.y);
    }
  }

  private renderProgress(
    ctx: CanvasRenderingContext2D,
    cache: RenderCache,
    options: Required<WaveformOptions>,
    staticPath: Path2D | undefined,
    dimensions: any,
  ): void {
    const progressWidth = cache.canvasWidth * this.lastProgress;

    // Render progress on main waveform
    this.renderProgressSection(ctx, cache, options, staticPath, progressWidth, dimensions.main, false);

    // Render progress on reflection
    this.renderProgressSection(ctx, cache, options, staticPath, progressWidth, dimensions.reflection, true);
  }

  private renderProgressSection(
    ctx: CanvasRenderingContext2D,
    cache: RenderCache,
    options: Required<WaveformOptions>,
    staticPath: Path2D | undefined,
    progressWidth: number,
    section: { y: number; height: number; flipDirection?: "up" | "down" },
    isReflection: boolean,
  ): void {
    ctx.save();

    // Clip to progress area and section
    ctx.beginPath();
    ctx.rect(0, section.y, progressWidth, section.height);
    ctx.clip();

    if (isReflection) {
      if (section.flipDirection === "up") {
        ctx.translate(0, section.y);
        ctx.scale(1, -1);
      } else {
        ctx.translate(0, section.y + section.height);
        ctx.scale(1, -1);
      }

      // Apply base opacity for reflection
      ctx.globalAlpha = this.reflectionOptions.reflectionOpacity;
    } else {
      ctx.translate(0, section.y);
    }

    const scaleY = section.height / cache.canvasHeight;
    ctx.scale(1, scaleY);

    // Use current color and border options for progress
    if (staticPath && this.supportsPath2D(options)) {
      ctx.fillStyle = options.color;
      ctx.fill(staticPath);

      if (options.borderWidth > 0) {
        ctx.strokeStyle = options.borderColor;
        ctx.lineWidth = options.borderWidth;
        ctx.stroke(staticPath);
      }
    } else {
      this.renderBarsWithFallback(ctx, cache.bars, options.color, options);
    }

    ctx.restore();

    // Apply gradient fade AFTER rendering and restoring context (for reflections only)
    if (isReflection && this.reflectionOptions.gradientFade) {
      this.applyGradientMask(ctx, progressWidth, section.height, section.flipDirection, section.y);
    }
  }

  private applyGradientMask(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    direction?: "up" | "down",
    yOffset: number = 0,
  ): void {
    ctx.save();

    // Clip to the exact area where we want to apply the gradient
    ctx.beginPath();
    ctx.rect(0, yOffset, width, height);
    ctx.clip();

    // Calculate gradient positions based on configurable stops
    const { fadeStartPoint, fadeEndPoint } = this.reflectionOptions;
    const startY = yOffset + height * fadeStartPoint;
    const endY = yOffset + height * fadeEndPoint;

    // Create gradient with configurable stops
    const gradient = ctx.createLinearGradient(0, startY, 0, endY);

    if (direction === "up") {
      // For upward reflection, fade from transparent at start to opaque at end
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,1)");
    } else {
      // For downward reflection, fade from opaque at start to transparent at end
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
    }

    // Apply the gradient mask
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, yOffset, width, height);
    ctx.globalCompositeOperation = "source-over";

    ctx.restore();
  }

  private drawProgressLine(
    ctx: CanvasRenderingContext2D,
    cache: RenderCache,
    options: Required<WaveformOptions>,
    dimensions: any,
  ): void {
    const progressLine = options.progressLine;
    if (!progressLine) return;

    const x = cache.canvasWidth * this.lastProgress;
    const lineHeight = cache.canvasHeight * (progressLine.heightPercent || 1);
    const linePosition = progressLine.position || options.position;

    ctx.save();
    ctx.strokeStyle = progressLine.color || "#FF0000";
    ctx.lineWidth = progressLine.width || 2;
    ctx.lineCap = "round";

    // Apply line style
    const style = progressLine.style || "solid";
    if (style !== "solid") {
      const [dashSize, gapSize] = style === "dashed" ? [8, 4] : [2, 2];
      ctx.setLineDash([dashSize, gapSize]);
    }

    // Calculate line position based on progressLine.position
    let startY: number, endY: number;
    switch (linePosition) {
      case "bottom":
        startY = cache.canvasHeight - lineHeight;
        endY = cache.canvasHeight;
        break;
      case "top":
        startY = 0;
        endY = lineHeight;
        break;
      case "center":
      default:
        startY = (cache.canvasHeight - lineHeight) / 2;
        endY = (cache.canvasHeight + lineHeight) / 2;
        break;
    }

    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
    ctx.restore();
  }

  private supportsPath2D(options: Required<WaveformOptions>): boolean {
    return options.borderRadius === 0 || typeof (Path2D.prototype as any).roundRect === "function";
  }

  private renderBarsWithFallback(
    ctx: CanvasRenderingContext2D,
    bars: any[],
    color: string,
    options: Required<WaveformOptions>,
  ): void {
    const { borderColor, borderRadius, borderWidth = 0 } = options;

    ctx.fillStyle = color;
    if (borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
    }

    ctx.beginPath();

    for (const bar of bars) {
      if (borderRadius > 0 && typeof ctx.roundRect === "function") {
        ctx.roundRect(bar.x, bar.y, bar.width, bar.height, borderRadius);
      } else {
        ctx.rect(bar.x, bar.y, bar.width, bar.height);
      }
    }

    ctx.fill();

    if (borderWidth > 0) {
      ctx.stroke();
    }
  }

  public updateReflectionOptions(options: Partial<ReflectionOptions>): void {
    this.reflectionOptions = {
      ...this.reflectionOptions,
      ...options,
    };
    this.invalidateCache();
  }

  // Method to manually reset progress if needed
  public resetProgress(): void {
    this.lastProgress = 0;
  }

  private getCachedDimensions(canvasHeight: number, position: RenderMode) {
    const currentReflectionHash = this.createReflectionHash();

    // Check if cache is valid
    if (
      this.cachedDimensions &&
      this.lastCanvasHeight === canvasHeight &&
      this.lastPosition === position &&
      this.lastReflectionHash === currentReflectionHash
    ) {
      return this.cachedDimensions;
    }

    // Rebuild cache
    this.cachedDimensions = this.calculateDimensionsForPosition(canvasHeight, position);
    this.lastCanvasHeight = canvasHeight;
    this.lastPosition = position;
    this.lastReflectionHash = currentReflectionHash;

    return this.cachedDimensions;
  }

  private createReflectionHash(): string {
    const { reflectionHeight, reflectionOpacity, reflectionGap, gradientFade, fadeStartPoint, fadeEndPoint } =
      this.reflectionOptions;
    return `${reflectionHeight}-${reflectionOpacity}-${reflectionGap}-${gradientFade ? 1 : 0}-${fadeStartPoint}-${fadeEndPoint}`;
  }

  private invalidateCache(): void {
    this.cachedDimensions = undefined;
    this.lastCanvasHeight = undefined;
    this.lastPosition = undefined;
    this.lastReflectionHash = undefined;
  }
}
