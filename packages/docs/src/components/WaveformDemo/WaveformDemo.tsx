import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import {
  getPeaksFromAudioBuffer,
  WaveformRenderer,
  type WaveformOptions,
  type ProgressLineOptions,
} from "waveform-renderer";

import {
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconSettingsFilled,
  IconChevronDown,
  IconMusicUp,
  IconVolume,
  IconSquareRoundedXFilled,
  IconWaveSine,
} from "@tabler/icons-preact";

import { usePlayer } from "./usePlayer";

import { CheckboxInput, ColorInput, RangeInput, SelectInput, RadioInput } from "./forms";

import { ConnectedWaveRenderer } from "./renderers/ConnectedRenderer";
import { ReflectionRenderer } from "./renderers/ReflectionRenderer";

export default function WaveformPreviewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<WaveformRenderer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio state
  const {
    state,
    setError,
    setAudioFile,
    pause,
    play,
    setAudioUrl,
    setCurrentTime,
    setDuration,
    setLoading,
    resetPlayer,
  } = usePlayer();

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Custom renderer state
  const [selectedRenderer, setSelectedRenderer] = useState<"none" | "connected" | "reflection">("none");

  // Separate display options from actual waveform options
  const [displayOptions, setDisplayOptions] = useState<WaveformOptions>({
    amplitude: 1,
    backgroundColor: "#f7f337",
    barWidth: 3,
    borderColor: "#000000",
    borderRadius: 2,
    borderWidth: 0,
    color: "#84cc16",
    gap: 1,
    position: "center",
    progress: 0,
    smoothing: true,
    progressLine: {
      color: "#84cc16",
      heightPercent: 1,
      position: "center",
      style: "solid",
      width: 2,
    },
  });

  // Keep a stable reference to initial options for waveform creation
  const initialOptionsRef = useRef<WaveformOptions>(displayOptions);

  // Handle file upload
  const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      setError("Please select a valid audio file");
      return;
    }

    setError("");
    setLoading(true);
    setAudioFile(file);

    try {
      // Create object URL for audio element
      const objectUrl = URL.createObjectURL(file);
      setAudioUrl(objectUrl);

      // Process audio for waveform
      await initializeWaveformFromFile(file);
    } catch (error) {
      console.error("Error processing audio file:", error);
      setError("Error processing audio file. Please try another file.");
    } finally {
      setLoading(false);
    }
  };

  // Initialize waveform from file
  const initializeWaveformFromFile = async (file: File) => {
    if (!canvasRef.current) return;

    try {
      // Create audio context and load audio
      const audioContext = new AudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Generate peaks using the library utility
      const peaks = getPeaksFromAudioBuffer(audioBuffer, 1000);

      // Create waveform renderer
      if (waveformRef.current) {
        waveformRef.current.destroy();
      }

      waveformRef.current = new WaveformRenderer(canvasRef.current!, peaks, {
        ...initialOptionsRef.current,
        progress: 0, // Always start at 0 progress
      });

      // Listen to seek events
      waveformRef.current.on("seek", (progress: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = progress * audioRef.current.duration;
        }
      });
    } catch (error) {
      console.error("Error initializing waveform:", error);
      throw error;
    }
  };

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (state.audioUrl && state.audioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(state.audioUrl);
      }
    };
  }, [state.audioUrl]);

  // Helper functions to update waveform options directly
  const updateWaveformOption = useCallback((key: keyof WaveformOptions, value: any) => {
    if (!waveformRef.current) return;

    setDisplayOptions(prev => ({
      ...prev,
      [key]: value,
    }));

    waveformRef.current.setOptions({ [key]: value });
  }, []);

  const updateProgressLineOption = useCallback((key: keyof ProgressLineOptions, value: any) => {
    if (!waveformRef.current) return;

    setDisplayOptions(prev => {
      const newProgressLine = prev.progressLine
        ? { ...prev.progressLine, [key]: value }
        : {
            color: "#84cc16",
            heightPercent: 1,
            position: "center" as const,
            style: "solid" as const,
            width: 2,
            [key]: value,
          };

      // Apply to waveform immediately
      waveformRef.current?.setProgressLineOptions(newProgressLine);

      return { ...prev, progressLine: newProgressLine };
    });
  }, []);

  // Custom renderer handlers
  const applyCustomRenderer = useCallback((rendererType: "none" | "connected" | "reflection") => {
    if (!waveformRef.current) return;

    setSelectedRenderer(rendererType);

    switch (rendererType) {
      case "connected":
        const connectedRenderer = new ConnectedWaveRenderer();
        waveformRef.current.setCustomRenderer(connectedRenderer);
        updateWaveformOption("gap", 5);
        updateWaveformOption("barWidth", 1);
        updateWaveformOption("position", "center");
        break;
      case "reflection":
        const reflectionRenderer = new ReflectionRenderer();
        waveformRef.current.setCustomRenderer(reflectionRenderer);
        updateWaveformOption("gap", 2);
        updateWaveformOption("barWidth", 2);
        updateWaveformOption("position", "bottom");
        break;
      case "none":
      default:
        waveformRef.current.setCustomRenderer();
        break;
    }
  }, []);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      if (waveformRef.current && audio.duration > 0) {
        const progress = audio.currentTime / audio.duration;
        waveformRef.current.setProgress(progress);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handlePlay = () => play();
    const handlePause = () => pause();
    const handleEnded = () => pause();

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const rewindTo = (advance: number) => {
    if (!audioRef.current || state.duration <= 0) return;

    const newTime = Math.max(0, Math.min(audioRef.current.currentTime + advance, state.duration));
    audioRef.current.currentTime = newTime;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className="p-6 flex items-center justify-center not-content">
      <div className="w-full max-w-4xl">
        {/* Main Player Card */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 mb-6">
          {/* File Upload Section */}
          <div className="mb-6">
            <span className="block text-gray-700 dark:text-gray-300 font-medium mb-3">Audio File:</span>

            {!state.audioFile ? (
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer py-4">
                  <div className="text-center">
                    <IconMusicUp class="size-14 text-gray-400 dark:text-gray-500 stroke-1" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Click to upload an audio file</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      Supports MP3, WAV, OGG, and other audio formats
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-lime-50 dark:bg-lime-900/30 border border-lime-200 dark:border-lime-700 rounded-xl">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-lime-500 dark:bg-lime-600 rounded-lg flex items-center justify-center mr-3">
                    <IconVolume class="size-6 text-white stroke-1.5" />
                  </div>
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{state.audioFile.name}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {(state.audioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    resetPlayer();

                    if (waveformRef.current) {
                      waveformRef.current.destroy();
                      waveformRef.current = null;
                    }
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="grid place-items-center appearance-none border-0 bg-transparent cursor-pointer text-lime-500 dark:text-lime-400 hover:text-lime-600 dark:hover:text-lime-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconSquareRoundedXFilled class="size-6 stroke-1" />
                </button>
              </div>
            )}

            {/* Error Message */}
            {state.error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">{state.error}</p>
              </div>
            )}

            {/* Loading State */}
            {state.isLoading && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-2"></div>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Processing audio file...</p>
                </div>
              </div>
            )}
          </div>

          {/* Waveform Canvas */}
          <div className="mb-6 relative">
            <canvas ref={canvasRef} className="w-full h-40 rounded-2xl border border-gray-300 dark:border-gray-600" />
            {!state.audioFile && !state.isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <IconWaveSine class="size-12 mx-auto mb-2 stroke-1" />
                  <p>Upload an audio file to see the waveform</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 text-sm mb-2">
              <span>{formatTime(state.currentTime)}</span>
              <span>{formatTime(state.duration)}</span>
            </div>
            <div className="relative">
              <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-lime-400 to-lime-500 dark:from-lime-500 dark:to-lime-600 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div
                className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-lime-500 dark:bg-lime-400 rounded-full shadow-lg transition-all duration-300 ease-out"
                style={{ left: `calc(${progressPercent}% - 8px)` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-6 mb-6">
            <button
              className="flex items-center justify-center size-12 cursor-pointer rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => rewindTo(-10)}
              disabled={!state.audioFile || state.isLoading}
            >
              <IconPlayerTrackPrev class="size-6" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!state.audioFile || state.isLoading}
              className="flex items-center justify-center size-16 bg-gradient-to-r from-lime-400 to-lime-500 dark:from-lime-500 dark:to-lime-600 p-4 rounded-full text-white hover:from-lime-500 hover:to-lime-600 dark:hover:from-lime-600 dark:hover:to-lime-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {state.isPlaying ? <IconPlayerPauseFilled class="size-8" /> : <IconPlayerPlayFilled class="size-12" />}
            </button>

            <button
              className="flex items-center justify-center cursor-pointer size-12 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => rewindTo(10)}
              disabled={!state.audioFile || state.isLoading}
            >
              <IconPlayerTrackNext class="size-6" />
            </button>
          </div>

          <audio ref={audioRef} src={state.audioUrl} preload="metadata" />
        </div>

        {/* Settings Card */}
        <div className="bg-white dark:bg-gray-900 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className="w-full p-6 text-left bg-gray-50/50 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center">
              <div className="flex items-center text-white bg-gradient-to-r from-lime-500 to-lime-600 dark:from-lime-600 dark:to-lime-700 p-3 rounded-xl mr-4 shrink-0 aspect-square size-10">
                <IconSettingsFilled class="size-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Customization Options</h3>
                <p className="text-gray-600 dark:text-gray-400">Configure waveform appearance</p>
              </div>
            </div>
            <div className={`transition ${isOptionsOpen ? "rotate-180" : ""}`}>
              <IconChevronDown class="align-middle" />
            </div>
          </button>

          <div
            className={`mt-0 transition-all duration-500 ease-in-out ${
              isOptionsOpen ? "opacity-100" : "h-0 opacity-0"
            } overflow-hidden`}
          >
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Waveform Options */}
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                    <div className="w-2 h-6 bg-gradient-to-b from-lime-500 to-lime-600 dark:from-lime-600 dark:to-lime-700 rounded-full mr-3"></div>
                    Waveform Settings
                  </h4>

                  <div className="space-y-4">
                    <ColorInput
                      label="Color"
                      value={displayOptions.color}
                      onChange={color => updateWaveformOption("color", color)}
                    />
                    <ColorInput
                      label="Background Color"
                      value={displayOptions.backgroundColor}
                      onChange={color => updateWaveformOption("backgroundColor", color)}
                    />
                    <RangeInput
                      label="Amplitude"
                      min={0.1}
                      max={2}
                      step={0.1}
                      value={displayOptions.amplitude}
                      onChange={value => updateWaveformOption("amplitude", value)}
                    />

                    <RangeInput
                      label="Bar Width"
                      min={1}
                      max={10}
                      step={1}
                      value={displayOptions.barWidth}
                      onChange={value => updateWaveformOption("barWidth", value)}
                    />

                    <RangeInput
                      label="Gap"
                      min={0}
                      max={5}
                      step={1}
                      value={displayOptions.gap}
                      onChange={value => updateWaveformOption("gap", value)}
                    />

                    <RangeInput
                      label="Border Radius"
                      min={0}
                      max={10}
                      step={1}
                      value={displayOptions.borderRadius}
                      onChange={value => updateWaveformOption("borderRadius", value)}
                    />

                    <SelectInput
                      label="Position"
                      value={displayOptions.position}
                      options={[
                        { value: "center", label: "Center" },
                        { value: "top", label: "Top" },
                        { value: "bottom", label: "Bottom" },
                      ]}
                      onChange={value => updateWaveformOption("position", value)}
                    />
                  </div>
                </div>

                {/* Custom Renderer Options */}
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                    <div className="w-2 h-6 bg-gradient-to-b from-purple-500 to-pink-400 dark:from-purple-400 dark:to-pink-300 rounded-full mr-3"></div>
                    Custom Renderers
                  </h4>

                  <div className="space-y-4">
                    <RadioInput
                      label="Renderer Type"
                      name="renderer"
                      value={selectedRenderer}
                      onChange={value => applyCustomRenderer(value as "none" | "connected" | "reflection")}
                      options={[
                        {
                          value: "none",
                          label: "Default",
                          description: "Standard waveform rendering",
                        },
                        {
                          value: "connected",
                          label: "Connected Wave",
                          description: "Alternating curved wave pattern",
                        },
                        {
                          value: "reflection",
                          label: "Reflection",
                          description: "Waveform with reflection effect",
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Progress Line Options */}
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                    <div className="w-2 h-6 bg-gradient-to-b from-blue-500 to-cyan-400 dark:from-blue-400 dark:to-cyan-300 rounded-full mr-3"></div>
                    Progress Line
                  </h4>

                  <div className="space-y-4">
                    <CheckboxInput
                      label="Enable Progress Line"
                      checked={!!displayOptions.progressLine}
                      onChange={checked =>
                        updateWaveformOption("progressLine", checked ? initialOptionsRef.current.progressLine : null)
                      }
                    />

                    {displayOptions.progressLine && (
                      <>
                        <ColorInput
                          label="Color"
                          value={displayOptions.progressLine.color}
                          onChange={color => updateProgressLineOption("color", color)}
                        />

                        <RangeInput
                          label="Height"
                          min={0.1}
                          max={1}
                          step={0.1}
                          value={displayOptions.progressLine.heightPercent}
                          onChange={value => updateProgressLineOption("heightPercent", value)}
                        />
                        <SelectInput
                          label="Style"
                          value={displayOptions.progressLine.style}
                          options={[
                            { value: "solid", label: "Solid" },
                            { value: "dashed", label: "Dashed" },
                            { value: "dotted", label: "Dotted" },
                          ]}
                          onChange={value => updateProgressLineOption("style", value)}
                        />

                        <SelectInput
                          label="Position"
                          value={displayOptions.progressLine.position}
                          options={[
                            { value: "center", label: "Center" },
                            { value: "top", label: "Top" },
                            { value: "bottom", label: "Bottom" },
                          ]}
                          onChange={value => updateProgressLineOption("position", value)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
