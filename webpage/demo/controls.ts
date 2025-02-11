import { Pane } from "tweakpane";

import type WaveformRenderer from "../../src/renderer";
import type { WaveformOptions } from "../../src/types";

const positions = { bottom: "bottom", center: "center", top: "top" };
const styles = { dashed: "dashed", dotted: "dotted", solid: "solid" };

export const buildControls = (waveform: WaveformRenderer, config: WaveformOptions) => {
    const pane = new Pane({
        container: document.querySelector("#controls") as HTMLElement,
        expanded: true,
        title: "Parameters",
    });

    const f1 = pane.addFolder({
        title: "Waveform",
    });

    const f2 = pane.addFolder({
        title: "Peaks",
    });

    const f3 = pane.addFolder({
        expanded: false,
        title: "Progress Line",
    });

    f1.addBinding(config, "amplitude", { max: 1, min: 0, step: 0.1 }).on("change", ev => {
        waveform.setOptions({ amplitude: ev.value });
    });

    f1.addBinding(config, "color").on("change", ev => {
        waveform.setOptions({ color: ev.value });
    });

    f1.addBinding(config, "backgroundColor").on("change", ev => {
        waveform.setOptions({ backgroundColor: ev.value });
    });

    f1.addBinding(config, "progress", { interval: 1000, max: 1, min: 0, step: 0.01 }).on("change", ev => {
        waveform.setProgress(ev.value);
    });

    f1.addBinding(config, "position", { options: positions }).on("change", ev => {
        return waveform.setOptions({ position: ev.value });
    });

    f2.addBinding(config, "barWidth", { max: 10, min: 1, step: 1 }).on("change", ev => {
        waveform.setOptions({ barWidth: ev.value });
    });

    f2.addBinding(config, "gap", { max: 10, min: 0, step: 1 }).on("change", ev => {
        waveform.setOptions({ gap: ev.value });
    });

    f2.addBinding(config, "borderColor").on("change", ev => {
        waveform.setOptions({ borderColor: ev.value });
    });

    f2.addBinding(config, "borderRadius", { max: 10, min: 0, step: 0.1 }).on("change", ev => {
        waveform.setOptions({ borderRadius: ev.value });
    });

    f2.addBinding(config, "borderWidth", { max: 10, min: 0, step: 0.1 }).on("change", ev => {
        waveform.setOptions({ borderWidth: ev.value });
    });

    f3.addBinding(config.progressLine, "color").on("change", ev => {
        waveform.setProgressLineOptions({ color: ev.value });
    });

    f3.addBinding(config.progressLine, "heightPercent", { max: 1, min: 0, step: 0.1 }).on("change", ev => {
        waveform.setProgressLineOptions({ heightPercent: ev.value });
    });

    f3.addBinding(config.progressLine, "position", { options: positions }).on("change", ev => {
        waveform.setProgressLineOptions({ position: ev.value });
    });

    f3.addBinding(config.progressLine, "style", { options: styles }).on("change", ev => {
        waveform.setProgressLineOptions({ style: ev.value });
    });

    f3.addBinding(config.progressLine, "width", { max: 10, min: 1, step: 0.1 }).on("change", ev => {
        waveform.setProgressLineOptions({ width: ev.value });
    });
};
