import { type WaveformOptions, WaveformRenderer, getPeaksFromAudioBuffer } from "../src/";

import { DEFAULT_OPTIONS } from "../src/constants/default";

import { buildControls } from "./controls";

interface PlayerUI {
    button: HTMLElement;
    playIcon: HTMLElement;
    pauseIcon: HTMLElement;
    duration: HTMLElement;
    remaining: HTMLElement;
}

interface PlayerConfig {
    dropzone: HTMLElement;
    canvas: HTMLCanvasElement;
    waveformOptions?: Partial<WaveformOptions>;
}

export class Player {
    private audio: HTMLAudioElement;
    private waveform: WaveformRenderer | null;
    private peaks: number[];
    private readonly UI: PlayerUI;
    private readonly allowedTypes: readonly string[];
    private readonly audioContext: AudioContext;

    constructor(private readonly config: PlayerConfig) {
        this.audio = new Audio();
        this.audio.src = "/audio.mp3";
        this.waveform = null;
        this.peaks = [];
        this.allowedTypes = ["audio/*"] as const;
        this.audioContext = new AudioContext();

        this.UI = this.initializeUI();

        this.initializeAudio();
        this.setupDropzone();
    }

    public getDuration(): string {
        return this.formatTime(this.audio.duration);
    }

    public getRemainingTime(): string {
        return `-${this.formatTime(this.audio.duration - this.audio.currentTime)}`;
    }

    private initializeUI(): PlayerUI {
        return {
            button: document.querySelector("#play")!,
            playIcon: document.querySelector("[data-icon=play]")!,
            pauseIcon: document.querySelector("[data-icon=pause]")!,
            duration: document.querySelector("#duration")!,
            remaining: document.querySelector("#remaining")!,
        };
    }

    private async initializeAudio(): Promise<void> {
        this.audio.addEventListener("loadeddata", async () => {
            const audioBuffer = await this.getAudioBuffer();
            this.peaks = getPeaksFromAudioBuffer(audioBuffer, 1200);

            this.initializeWaveform();
            this.setupAudioEventListeners();
            this.UI.duration.textContent = this.getDuration();
            this.UI.remaining.textContent = this.getRemainingTime();
        });
    }

    private initializeWaveform(): void {
        if (this.waveform) {
            this.waveform.setPeaks(this.peaks);
        } else {
            this.waveform = new WaveformRenderer(
                this.config.canvas,
                this.peaks,
                this.config.waveformOptions ?? DEFAULT_OPTIONS
            );
            this.setupWaveformListeners();
            this.setControls();
        }
    }

    private setupDropzone(): void {
        const { dropzone } = this.config;

        dropzone.addEventListener("dragover", this.handleDragOver);
        dropzone.addEventListener("dragenter", this.handleDragOver);
        dropzone.addEventListener("drop", this.handleDrop);
    }

    private setupAudioEventListeners(): void {
        this.audio.addEventListener("play", () => this.updatePlayPauseUI(true));
        this.audio.addEventListener("pause", () => this.updatePlayPauseUI(false));
        this.audio.addEventListener("timeupdate", () => this.handleTimeUpdate());
        this.audio.addEventListener("ended", () => (this.audio.currentTime = 0));
    }

    private setupWaveformListeners(): void {
        if (!this.waveform) return;

        this.UI.button.addEventListener("click", this.handlePlayPause);
        this.waveform.on("seek", this.handleSeek);
    }

    private handleDragOver = (event: DragEvent): void => {
        event.preventDefault();
    };

    private handleDrop = (event: DragEvent): void => {
        event.preventDefault();
        const file = event.dataTransfer?.files[0];

        if (file && this.isValidAudioFile(file)) {
            this.loadNewAudioFile(file);
        }
    };

    private handleTimeUpdate = (): void => {
        const progress = this.audio.currentTime / this.audio.duration;
        this.waveform?.setProgress(progress);
        this.UI.remaining.textContent = this.getRemainingTime();
    };

    private handlePlayPause = (): void => {
        if (this.audio.paused) {
            this.audio.play();
        } else {
            this.audio.pause();
        }
    };

    private handleSeek = (progress: number): void => {
        this.audio.currentTime = progress * this.audio.duration;
        if (this.audio.paused) this.audio.play();
    };

    private async getAudioBuffer(): Promise<AudioBuffer> {
        const response = await fetch(this.audio.src);
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    private isValidAudioFile(file: File): boolean {
        const isValid = this.allowedTypes.some(type => {
            if (type.endsWith("/*")) return file.type.startsWith(type.slice(0, -2));
            return file.type === type;
        });

        if (!isValid) {
            alert("Invalid file type, please upload an audio file");
        }

        return isValid;
    }

    private loadNewAudioFile(file: File): void {
        this.audio.pause();
        this.audio = new Audio(URL.createObjectURL(file));
        this.waveform?.setProgress(0);
        this.initializeAudio();
    }

    private updatePlayPauseUI(isPlaying: boolean): void {
        this.UI.playIcon.classList.toggle("hidden", isPlaying);
        this.UI.pauseIcon.classList.toggle("hidden", !isPlaying);
    }

    private formatTime(timeInSeconds: number): string {
        return new Date(timeInSeconds * 1000).toISOString().substr(14, 5);
    }

    private setControls(): void {
        if (!this.waveform) return;
        buildControls(this.waveform, this.config.waveformOptions ?? DEFAULT_OPTIONS);
    }
}
