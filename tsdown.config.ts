import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  tsconfig: "./tsconfig.json",
  format: ["cjs", "iife", "es"],
  outputOptions: {
    name: "WaveformRenderer",
  },
  exports: true,
  dts: true,
});
