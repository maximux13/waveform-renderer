# Waveform Renderer

<p align="center">
  <img src="./.github/logo-dark.svg" alt="Waveform Renderer" width="200" />
</img>

[![npm version](https://img.shields.io/npm/v/waveform-renderer)](#)
[![license](https://img.shields.io/npm/l/waveform-renderer)](#)
[![build status](https://img.shields.io/github/workflow/status/maximux13/waveform-renderer/CI)](#)
[![downloads](https://img.shields.io/npm/dm/waveform-renderer)](#)

A lightweight and customizable TypeScript library for rendering audio waveforms on HTML canvas. Create beautiful, interactive audio visualizations with ease.

## 📝 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
    - [Configuration Options](#configuration-options)
    - [Events](#events)
    - [Exports](#exports)
    - [Methods](#methods)
- [Examples](#examples)
- [Browser Support](#browser-support)
- [Motivation](#motivation)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## ✨ Features

- 🎨 Highly customizable appearance
- ⚡ Performant canvas-based rendering
- 📱 Responsive and touch-friendly
- 🔄 Real-time progress updates
- 🎯 Interactive seeking
- 💪 Written in TypeScript with full type support
- 📏 Resolution independent with HiDPI/Retina support

## 🚀 Installation

```bash
npm install waveform-renderer
# or
yarn add waveform-renderer
```

## 📖 Quick Start

```typescript
import { WaveformRenderer } from 'waveform-renderer';

// Get your canvas element
const canvas = document.getElementById('waveform') as HTMLCanvasElement;

// Prepare your audio peaks data
const peaks = [...]; // Array of numbers

// Create waveform instance
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

## 🛠 API

### Configuration Options

#### WaveformOptions

| Option            | Type                            | Default     | Description                                 |
| ----------------- | ------------------------------- | ----------- | ------------------------------------------- |
| `amplitude`       | `number`                        | `1`         | Amplitude multiplier for the waveform       |
| `backgroundColor` | `string`                        | `"#CCCCCC"` | Background color of the waveform            |
| `barWidth`        | `number`                        | `2`         | Width of each bar in pixels                 |
| `borderColor`     | `string`                        | `"#000000"` | Border color of the bars                    |
| `borderRadius`    | `number`                        | `0`         | Border radius of the bars in pixels         |
| `borderWidth`     | `number`                        | `0`         | Border width of the bars in pixels          |
| `color`           | `string`                        | `"#000000"` | Color of the waveform bars                  |
| `gap`             | `number`                        | `1`         | Gap between bars in pixels                  |
| `minPixelRatio`   | `number`                        | `1`         | Minimum pixel ratio for rendering           |
| `position`        | `"bottom" \| "center" \| "top"` | `"center"`  | Vertical positioning of the waveform        |
| `progress`        | `number`                        | `0`         | Initial progress (0-1)                      |
| `smoothing`       | `boolean`                       | `true`      | Whether to apply smoothing to the rendering |
| `progressLine`    | `ProgressLineOptions`           | `null`      | Progress line options                       |

#### ProgressLineOptions

| Option          | Type                              | Default     | Description                                      |
| --------------- | --------------------------------- | ----------- | ------------------------------------------------ |
| `color`         | `string`                          | `"#FF0000"` | Color of the progress line                       |
| `heightPercent` | `number`                          | `1`         | Height of the line as percentage of total height |
| `position`      | `"bottom" \| "center" \| "top"`   | `"center"`  | Vertical position of the line                    |
| `style`         | `"solid" \| "dashed" \| "dotted"` | `"solid"`   | Style of the progress line                       |
| `width`         | `number`                          | `2`         | Width of the line in pixels                      |

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

Example of type-safe event handling:

```typescript
waveform.on("resize", ({ width, height }) => {
    console.log(`Canvas resized to ${width}x${height}`);
});

waveform.on("seek", progress => {
    // progress is a number between 0-1
    audioElement.currentTime = audioElement.duration * progress;
});
```

## 📦 Exports

The library provides the following exports:

### Main Component

```typescript
import { WaveformRenderer } from "waveform-renderer";
```

### Utility Functions

```typescript
import { getPeaksFromAudioBuffer } from "waveform-renderer";
```

This utility helps you calculate peaks from an AudioBuffer, useful when you need to generate waveform data from raw audio.

### TypeScript Types

```typescript
import type { WaveformOptions, ProgressLineOptions, WaveformEvents, RenderMode } from "waveform-renderer";
```

Example of using the utility function:

```typescript
// Get an AudioBuffer from your audio source
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

// Calculate peaks
const peaks = getPeaksFromAudioBuffer(audioBuffer);

// Create waveform with calculated peaks
const waveform = new WaveformRenderer(canvas, peaks, options);
```

### 🔧 Methods

#### Constructor

```typescript
constructor(
  canvas: HTMLCanvasElement,
  peaks: number[],
  options?: Partial<WaveformOptions>
)
```

#### Instance Methods

- `setOptions(options: Partial<WaveformOptions>)`: Updates the waveform options
- `setPeaks(peaks: number[])`: Updates the waveform peaks data
- `setProgress(progress: number)`: Updates the current progress (0-1)
- `destroy()`: Cleans up and removes the instance

## 💡 Examples

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
});
```

### Event Handling

```typescript
const waveform = new WaveformRenderer(canvas, peaks);

waveform.on("ready", () => {
    console.log("Waveform is ready!");
});

waveform.on("seek", progress => {
    audioElement.currentTime = audioElement.duration * progress;
});

// Cleanup
waveform.off("seek", seekHandler);
// or remove all listeners
waveform.removeAllListeners();
```

## 🌐 Browser Support

The library works in all modern browsers that support Canvas and ES6.

## 💡 Motivation

While [wavesurfer.js](https://wavesurfer.xyz/) is an excellent library, we needed a more focused solution. Waveform Renderer was created to be a lightweight alternative that concentrates solely on waveform visualization, eliminating additional features like playback, regions, or spectrograms. This results in:

- 🎯 Focused scope: just waveform rendering
- 📦 Smaller bundle size
- 💪 TypeScript-first development
- ⚡ Optimized performance for waveform rendering

Choose Waveform Renderer when you need efficient waveform visualization without the overhead of a full-featured audio library.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License

## 🙏 Acknowledgements

- Inspired by [wavesurfer.js](https://wavesurfer.xyz/)
- Co-created with the help of [Claude](https://www.anthropic.com/index/introducing-claude)
