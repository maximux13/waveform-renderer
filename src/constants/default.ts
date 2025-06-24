import type { WaveformOptions } from "@/types";

export const DEFAULT_OPTIONS: Required<WaveformOptions> = {
    amplitude: 1,
    backgroundColor: "#CCCCCC",
    barWidth: 2,
    borderColor: "#000000",
    borderRadius: 0,
    borderWidth: 0,
    color: "#000000",
    gap: 1,
    minPixelRatio: 1,
    position: "center",
    progress: 0,
    debug: false,
    smoothing: true,
    progressLine: {
        color: "#FF0000",
        heightPercent: 1,
        position: "center",
        style: "solid",
        width: 2,
    },
};
