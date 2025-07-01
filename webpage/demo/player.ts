import { getPeaksFromAudioBuffer, type WaveformOptions, WaveformRenderer, DEFAULT_OPTIONS } from "../../dist/";
import { buildControls } from "./controls";

interface PlayerConfig {
    canvas: HTMLCanvasElement;
    dropzone: HTMLElement;
    waveformOptions?: Partial<WaveformOptions>;
}

interface PlayerUI {
    button: HTMLElement;
    duration: HTMLElement;
    pauseIcon: HTMLElement;
    playIcon: HTMLElement;
    remaining: HTMLElement;
}

export class Player {
    private readonly allowedTypes: readonly string[];
    private audio: HTMLAudioElement;
    private readonly audioContext: AudioContext;
    private peaks: number[];
    private readonly UI: PlayerUI;
    private waveform: null | WaveformRenderer;

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

    private formatTime(timeInSeconds: number): string {
        return new Date(timeInSeconds * 1000).toISOString().substr(14, 5);
    }

    private async getAudioBuffer(): Promise<AudioBuffer> {
        const response = await fetch(this.audio.src);
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
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

    private handleTimeUpdate = (): void => {
        const progress = this.audio.currentTime / this.audio.duration;
        this.waveform?.setProgress(progress);
        this.UI.remaining.textContent = this.getRemainingTime();
    };

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

    private initializeUI(): PlayerUI {
        return {
            button: document.querySelector("#play")!,
            duration: document.querySelector("#duration")!,
            pauseIcon: document.querySelector("[data-icon=pause]")!,
            playIcon: document.querySelector("[data-icon=play]")!,
            remaining: document.querySelector("#remaining")!,
        };
    }

    private initializeWaveform(): void {
        if (this.waveform) {
            this.waveform.setPeaks(this.peaks);
        } else {
            this.waveform = new WaveformRenderer(
                this.config.canvas,
                this.peaks,
                this.config.waveformOptions ?? DEFAULT_OPTIONS,
            );
            this.setupWaveformListeners();
            this.setControls();
        }
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

    private setControls(): void {
        if (!this.waveform) return;
        buildControls(this.waveform, this.config.waveformOptions ?? DEFAULT_OPTIONS);
    }

    private setupAudioEventListeners(): void {
        this.audio.addEventListener("play", () => this.updatePlayPauseUI(true));
        this.audio.addEventListener("pause", () => this.updatePlayPauseUI(false));
        this.audio.addEventListener("timeupdate", () => this.handleTimeUpdate());
        this.audio.addEventListener("ended", () => (this.audio.currentTime = 0));
    }

    private setupDropzone(): void {
        const { dropzone } = this.config;

        dropzone.addEventListener("dragover", this.handleDragOver);
        dropzone.addEventListener("dragenter", this.handleDragOver);
        dropzone.addEventListener("drop", this.handleDrop);
    }

    private setupWaveformListeners(): void {
        if (!this.waveform) return;

        this.UI.button.addEventListener("click", this.handlePlayPause);
        this.waveform.on("seek", this.handleSeek);
    }

    private updatePlayPauseUI(isPlaying: boolean): void {
        this.UI.playIcon.classList.toggle("hidden", isPlaying);
        this.UI.pauseIcon.classList.toggle("hidden", !isPlaying);
    }
}
