export { default as WaveformRenderer } from "@/renderer";

export type {
  ProgressLineOptions,
  RenderMode,
  WaveformEvents,
  WaveformOptions,
  CustomRenderer,
  RenderHook,
  RenderCache,
  CachedBarData,
  DebugInfo,
} from "@/types";

export { getPeaksFromAudioBuffer } from "@/utils/peaks";

export { DEFAULT_OPTIONS } from "@/constants/default";
