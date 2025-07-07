import type { CustomRenderer, RenderCache, WaveformOptions, RenderMode } from "waveform-renderer";

interface ConnectedWaveOptions {
  startWithUp?: boolean; // Whether first bar goes up (true) or down (false)
}

export class ConnectedWaveRenderer implements CustomRenderer {
  private connectedOptions: Required<ConnectedWaveOptions>;

  constructor(customOptions: ConnectedWaveOptions = {}) {
    this.connectedOptions = {
      startWithUp: true,
      ...customOptions,
    };
  }

  public updateOptions(options: Partial<ConnectedWaveOptions>): void {
    this.connectedOptions = { ...this.connectedOptions, ...options };
  }

  public render(
    ctx: CanvasRenderingContext2D,
    cache: RenderCache,
    options: Required<WaveformOptions>,
    staticPath?: Path2D,
  ): boolean {
    ctx.save();

    try {
      // Clear canvas
      ctx.clearRect(0, 0, cache.canvasWidth, cache.canvasHeight);

      // Setup coordinate system based on position
      this.setupCoordinateSystem(ctx, cache, options);

      // Render background (skeleton)
      this.renderWaveform(ctx, cache, options, options.backgroundColor, false);

      // Render progress
      if (options.progress > 0) {
        this.renderProgress(ctx, cache, options);
      }

      // Reset coordinate system for progress line
      ctx.restore();
      ctx.save();

      // Draw progress line (in original coordinate system)
      if (options.progressLine && options.progress > 0) {
        this.drawProgressLine(ctx, cache, options);
      }
    } finally {
      ctx.restore();
    }

    return true;
  }

  private setupCoordinateSystem(
    ctx: CanvasRenderingContext2D,
    cache: RenderCache,
    options: Required<WaveformOptions>,
  ): void {
    switch (options.position) {
      case "center":
        // Y = 0 at center of canvas
        ctx.translate(0, cache.canvasHeight / 2);
        break;
      case "top":
        // Y = 0 at top, but we want the effect to be like "center" pushed to top
        ctx.translate(0, cache.canvasHeight / 4);
        break;
      case "bottom":
        // Y = 0 at bottom, but we want the effect to be like "center" pushed to bottom
        ctx.translate(0, (cache.canvasHeight * 3) / 4);
        break;
    }
  }

  private renderWaveform(
    ctx: CanvasRenderingContext2D,
    cache: RenderCache,
    options: Required<WaveformOptions>,
    strokeColor: string,
    isProgress: boolean = false,
  ): void {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = options.barWidth; // barWidth now controls line thickness
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // gap now controls segment width
    const segmentWidth = cache.singleUnitWidth;

    for (let i = 0; i < cache.totalBars; i++) {
      const bar = cache.bars[i];
      const x = bar.x + (cache.singleUnitWidth - segmentWidth) / 2; // Center the segment
      let height = this.calculateHeight(bar.height / 2, cache.canvasHeight, options.position);

      // Determine direction - alternate between up and down
      const isEven = this.connectedOptions.startWithUp ? i % 2 === 0 : i % 2 === 1;

      this.drawLineSegment(ctx, x, height, segmentWidth, isEven, options, isProgress);
    }
  }

  private calculateHeight(barHeight: number, canvasHeight: number, position: RenderMode): number {
    switch (position) {
      case "top":
      case "bottom":
        // For top and bottom, use a portion of the available space
        return Math.min(barHeight, canvasHeight / 3);
      default:
        return Math.min(barHeight, canvasHeight / 2);
    }
  }

  private drawLineSegment(
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number,
    width: number,
    isEven: boolean,
    options: Required<WaveformOptions>,
    isProgress: boolean,
  ): void {
    ctx.beginPath();

    // Adjust height direction based on even/odd
    const y = isEven ? height : -height;

    // Start at left edge, center line (y = 0)
    ctx.moveTo(x, 0);

    // Draw vertical line to peak
    ctx.lineTo(x, y);

    // Draw semicircle arc
    // Arc center is at (x + width/2, y)
    // Radius is width/2
    // From Math.PI (left) to 0 (right)
    // Direction depends on isEven
    ctx.arc(x + width / 2, y, width / 2, Math.PI, 0, isEven);

    // Draw line back to center at right edge
    ctx.lineTo(x + width, 0);

    ctx.stroke();

    // Draw border if specified and borderWidth > 0
    if (options.borderWidth > 0) {
      ctx.save();
      ctx.strokeStyle = options.borderColor;
      ctx.lineWidth = options.borderWidth;

      // Redraw the same path for border
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, y);
      ctx.arc(x + width / 2, y, width / 2, Math.PI, 0, isEven);
      ctx.lineTo(x + width, 0);
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderProgress(ctx: CanvasRenderingContext2D, cache: RenderCache, options: Required<WaveformOptions>): void {
    ctx.save();

    // Create clipping area for progress
    const progressWidth = cache.canvasWidth * options.progress;

    ctx.beginPath();
    // Clip to progress area (adjust for coordinate system)
    switch (options.position) {
      case "center":
        ctx.rect(0, -cache.canvasHeight / 2, progressWidth, cache.canvasHeight);
        break;
      case "top":
        ctx.rect(0, -cache.canvasHeight / 4, progressWidth, cache.canvasHeight);
        break;
      case "bottom":
        ctx.rect(0, (-cache.canvasHeight * 3) / 4, progressWidth, cache.canvasHeight);
        break;
    }
    ctx.clip();

    // Render progress waveform with progress color
    this.renderWaveform(ctx, cache, options, options.color, true);

    ctx.restore();
  }

  private drawProgressLine(
    ctx: CanvasRenderingContext2D,
    cache: RenderCache,
    options: Required<WaveformOptions>,
  ): void {
    if (!options.progressLine) return;

    const { color, heightPercent, position, style, width } = options.progressLine;
    const x = cache.canvasWidth * options.progress;
    const lineHeight = cache.canvasHeight * (heightPercent || 1);

    ctx.save();
    ctx.strokeStyle = color || "#FF0000";
    ctx.lineWidth = width || 2;
    ctx.lineCap = "round";

    // Calculate line start and end positions based on progressLine position
    let startY: number;
    let endY: number;

    switch (position || "center") {
      case "bottom":
        startY = cache.canvasHeight;
        endY = cache.canvasHeight - lineHeight;
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

    // Set line style
    if (style && style !== "solid") {
      const [dashSize, gapSize] = style === "dashed" ? [8, 4] : [2, 2];
      ctx.setLineDash([dashSize, gapSize]);
    }

    // Draw the progress line
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();

    ctx.restore();
  }
}
