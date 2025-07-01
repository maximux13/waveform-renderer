# 🎵 Waveform Renderer

<p align="center">
  <img src="./.github/logo-dark.svg" alt="Waveform Renderer" width="200" />
</p>

![NPM Version](https://img.shields.io/npm/v/waveform-renderer)
[![npm downloads](https://img.shields.io/npm/dm/waveform-renderer.svg)](https://www.npmjs.com/package/waveform-renderer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-231%20tests-brightgreen)](https://github.com/maximux13/waveform-renderer/actions)

A high-performance, lightweight TypeScript library for rendering audio waveforms on HTML5 Canvas. Create beautiful, interactive audio visualizations with intelligent caching and advanced performance optimizations.

## 📝 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Configuration Options](#-configuration-options)
- [API Reference](#-api-reference)
- [Examples](#-examples)
- [Architecture](#-architecture)
- [Performance](#-performance)
- [Browser Support](#-browser-support)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- 🎨 **Highly customizable appearance** - Full control over colors, dimensions, and visual styling
- ⚡ **High performance** - Intelligent caching system with optimized rendering pipeline
- 📱 **Responsive and touch-friendly** - Automatic canvas resizing with HiDPI/Retina support
- 🔄 **Real-time progress updates** - Smooth animation and instant feedback
- 🎯 **Interactive seeking** - Built-in click-to-seek functionality
- 💪 **TypeScript-first** - Complete type safety with comprehensive interfaces
- 📦 **Zero dependencies** - Lightweight with no external dependencies
- 🧪 **Well tested** - 231 unit tests ensuring reliability and stability
- 🔧 **Debug system** - Built-in performance monitoring and logging
- 💾 **Smart caching** - Automatic render optimization with intelligent cache management
- 🏗️ **Modular architecture** - Clean separation of concerns for maintainability

## 🚀 Installation

```bash
# npm
npm install waveform-renderer

# pnpm
pnpm add waveform-renderer

# yarn
yarn add waveform-renderer
```

## 📖 Quick Start

```typescript
import { WaveformRenderer, getPeaksFromAudioBuffer } from 'waveform-renderer';

// Get your audio buffer (from Web Audio API)
const audioContext = new AudioContext();
const response = await fetch('path/to/audio.mp3');
const arrayBuffer = await response.arrayBuffer();
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

// Extract peaks from the audio buffer
const peaks = getPeaksFromAudioBuffer(audioBuffer, 1000); // 1000 samples

// Create the waveform renderer
const canvas = document.getElementById('waveform') as HTMLCanvasElement;
const waveform = new WaveformRenderer(canvas, peaks, {
  color: '#2196F3',
  backgroundColor: '#E3F2FD',
  progressLine: {
    color: '#1565C0'
  }
});

// Listen to events
waveform.on('seek', (progress) => {
  console.log(`Seeked to ${progress * 100}%`);
});
```

## ⚙️ Configuration Options

### WaveformOptions

| Option            | Type                            | Default       | Description                                 |
| ----------------- | ------------------------------- | ------------- | ------------------------------------------- |
| `amplitude`       | `number`                        | `1`           | Amplitude multiplier for the waveform       |
| `backgroundColor` | `string`                        | `"#CCCCCC"`   | Background color of the waveform            |
| `barWidth`        | `number`                        | `2`           | Width of each bar in pixels                 |
| `borderColor`     | `string`                        | `"#000000"`   | Border color of the bars                    |
| `borderRadius`    | `number`                        | `0`           | Border radius of the bars in pixels         |
| `borderWidth`     | `number`                        | `0`           | Border width of the bars in pixels          |
| `color`           | `string`                        | `"#000000"`   | Color of the waveform bars                  |
| `gap`             | `number`                        | `1`           | Gap between bars in pixels                  |
| `minPixelRatio`   | `number`                        | `1`           | Minimum pixel ratio for rendering           |
| `position`        | `"bottom" \| "center" \| "top"` | `"center"`    | Vertical positioning of the waveform        |
| `progress`        | `number`                        | `0`           | Initial progress (0-1)                      |
| `smoothing`       | `boolean`                       | `true`        | Whether to apply smoothing to the rendering |
| `progressLine`    | `ProgressLineOptions \| null`   | `{...}`       | Progress line configuration (see below)     |
| `debug`           | `boolean`                       | `false`       | Enable debug logging and performance stats  |

### ProgressLineOptions

| Option          | Type                              | Default       | Description                                      |
| --------------- | --------------------------------- | ------------- | ------------------------------------------------ |
| `color`         | `string`                          | `"#FF0000"`   | Color of the progress line                       |
| `heightPercent` | `number`                          | `1`           | Height of the line as percentage of total height |
| `position`      | `"bottom" \| "center" \| "top"`   | `"center"`    | Vertical position of the line                    |
| `style`         | `"solid" \| "dashed" \| "dotted"` | `"solid"`     | Style of the progress line                       |
| `width`         | `number`                          | `2`           | Width of the line in pixels                      |

## 📚 API Reference

### WaveformRenderer

#### Constructor
```typescript
new WaveformRenderer(
  canvas: HTMLCanvasElement,
  peaks: number[],
  options?: Partial<WaveformOptions>
)
```

#### Instance Methods

- `setOptions(options: Partial<WaveformOptions>)`: Updates the waveform options
- `setPeaks(peaks: number[])`: Updates the waveform peaks data
- `setProgress(progress: number)`: Updates the current progress (0-1)
- `setProgressLineOptions(options: Partial<ProgressLineOptions> | null)`: Updates progress line options
- `setDebug(enabled: boolean)`: Enable/disable debug mode
- `resetDebugCounters()`: Reset debug performance counters
- `setCustomRenderer(renderer?: CustomRenderer)`: Set a custom rendering function
- `setRenderHooks(hooks: RenderHook)`: Set custom render hooks for advanced customization
- `clearRenderHooks()`: Clear all custom render hooks
- `destroy()`: Cleans up and removes the instance

### 🎯 Events

The waveform renderer emits the following events:

| Event            | Payload                             | Description                                |
| ---------------- | ----------------------------------- | ------------------------------------------ |
| `renderStart`    | `void`                              | Emitted when rendering begins              |
| `renderComplete` | `void`                              | Emitted when rendering is complete         |
| `seek`           | `number`                            | Progress value between 0-1 when user seeks |
| `error`          | `Error`                             | Error object when an error occurs          |
| `destroy`        | `void`                              | Emitted when the instance is destroyed     |
| `ready`          | `void`                              | Emitted when the waveform is ready         |
| `resize`         | `{ width: number; height: number }` | New dimensions when canvas is resized      |
| `progressChange` | `number`                            | New progress value between 0-1             |

### 📦 Exports

```typescript
// Main Component
import { WaveformRenderer } from "waveform-renderer";

// Utility Functions
import { getPeaksFromAudioBuffer } from "waveform-renderer";

// TypeScript Types
import type {
  WaveformOptions,
  ProgressLineOptions,
  WaveformEvents,
  RenderMode,
  CustomRenderer,
  RenderHook
} from "waveform-renderer";

// Default Configuration
import { DEFAULT_OPTIONS } from "waveform-renderer";
```

## 💡 Examples

### Basic Usage
```typescript
import { WaveformRenderer } from 'waveform-renderer';

const canvas = document.getElementById('waveform') as HTMLCanvasElement;
const peaks = [0.1, 0.3, 0.8, 0.4, 0.6, 0.2, 0.9, 0.1]; // Your audio peaks
const waveform = new WaveformRenderer(canvas, peaks);
```

### Custom Styling
```typescript
const waveform = new WaveformRenderer(canvas, peaks, {
    color: "#2196F3",
    backgroundColor: "#E3F2FD",
    barWidth: 3,
    gap: 2,
    borderRadius: 2,
    progressLine: {
        color: "#1565C0",
        style: "dashed",
        width: 2,
    },
    debug: false
});
```

### Event Handling with Audio Element
```typescript
const audio = new Audio('path/to/audio.mp3');
const waveform = new WaveformRenderer(canvas, peaks);

// Sync progress with audio playback
audio.addEventListener('timeupdate', () => {
    const progress = audio.currentTime / audio.duration;
    waveform.setProgress(progress);
});

// Handle seek events
waveform.on('seek', (progress) => {
    audio.currentTime = progress * audio.duration;
    audio.play();
});

// Listen to other events
waveform.on("ready", () => {
    console.log("Waveform is ready!");
});

waveform.on("resize", ({ width, height }) => {
    console.log(`Canvas resized to ${width}x${height}`);
});
```

### Debug Mode and Performance Monitoring
```typescript
const waveform = new WaveformRenderer(canvas, peaks, {
    debug: true // Enable debug mode
});

// Enable/disable debug mode dynamically
waveform.setDebug(true);

// Reset performance counters
waveform.resetDebugCounters();

// Debug information is logged to console when debug mode is enabled
```

### Advanced Customization

#### Custom Renderer
```typescript
import type { CustomRenderer } from 'waveform-renderer';

const customRenderer: CustomRenderer = {
    render(ctx, cache, options, staticPath) {
        // Your custom rendering logic here
        // Return true if you handled the rendering, false to use default
        return false;
    }
};

waveform.setCustomRenderer(customRenderer);
```

#### Render Hooks
```typescript
import type { RenderHook } from 'waveform-renderer';

const hooks: RenderHook = {
    beforeRender: (ctx, cache, options) => {
        // Called before any rendering starts
    },
    afterBackground: (ctx, cache, options) => {
        // Called after background is drawn
    },
    afterProgress: (ctx, cache, options, progress) => {
        // Called after progress line is drawn
    },
    afterComplete: (ctx, cache, options) => {
        // Called when rendering is complete
    }
};

waveform.setRenderHooks(hooks);
```

### Working with Audio Buffers
```typescript
// Get an AudioBuffer from your audio source
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

// Calculate peaks with custom sample count
const peaks = getPeaksFromAudioBuffer(audioBuffer, 2000);

// Create waveform with calculated peaks
const waveform = new WaveformRenderer(canvas, peaks, {
    color: '#10b981',
    backgroundColor: '#1f2937',
    debug: false
});
```

## 🏗️ Architecture

The library follows a modular architecture with clean separation of concerns:

- **Renderer**: Main rendering logic and canvas management
- **RenderingEngine**: Core drawing operations and optimizations
- **CacheManager**: Intelligent caching system for performance
- **DebugSystem**: Performance monitoring and logging
- **EventHandler**: Event management and user interactions

This architecture ensures:
- **Maintainability**: Clear separation of responsibilities
- **Performance**: Optimized rendering with intelligent caching
- **Extensibility**: Easy to add new features and customizations
- **Testability**: Comprehensive unit test coverage (231 tests)

## ⚡ Performance

The library is designed for high performance with several optimizations:

- **Intelligent Caching**: Automatic render optimization that prevents unnecessary redraws
- **Efficient Peak Processing**: Optimized algorithms for handling large audio datasets
- **Canvas Optimization**: Smart canvas management with pixel ratio handling
- **Memory Management**: Proper cleanup and resource management
- **Event Debouncing**: Optimized event handling to prevent performance bottlenecks

Performance monitoring is available in debug mode to help optimize your implementation.

## 🌐 Browser Support

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

The library works in all modern browsers that support Canvas and ES6.

## 🔧 Development

```bash
# Install dependencies
pnpm install

# Run development server with demo
pnpm dev

# Build the library
pnpm build

# Build demo page
pnpm build:webpage

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Type check
pnpm type-check
```

## 💡 Motivation

While [wavesurfer.js](https://wavesurfer.xyz/) is an excellent library, we needed a more focused solution. Waveform Renderer was created to be a lightweight alternative that concentrates solely on waveform visualization, eliminating additional features like playback, regions, or spectrograms. This results in:

- 🎯 **Focused scope**: Just waveform rendering and interaction
- 📦 **Smaller bundle size**: No unnecessary features or dependencies
- 💪 **TypeScript-first development**: Built from the ground up with TypeScript
- ⚡ **Optimized performance**: Intelligent caching and rendering optimizations
- 🏗️ **Modern architecture**: Clean, testable, and maintainable codebase

Choose Waveform Renderer when you need efficient waveform visualization without the overhead of a full-featured audio library.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see the [LICENSE](LICENSE.md) file for details.

## 🔗 Links

- [Demo](https://waveform-renderer.vercel.app) - Live interactive demo
- [NPM Package](https://www.npmjs.com/package/waveform-renderer)
- [GitHub Repository](https://github.com/maximux13/waveform-renderer)
- [Issues](https://github.com/maximux13/waveform-renderer/issues)

## 🙏 Acknowledgements

- Inspired by [wavesurfer.js](https://wavesurfer.xyz/)
- Co-created with the help of [Claude](https://www.anthropic.com/index/introducing-claude)

---

Made with ❤️ by [Andres Alarcon](https://github.com/maximux13)
