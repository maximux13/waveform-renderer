import { useReducer } from "preact/hooks";

type PlayerState = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioFile: File | null;
  audioUrl: string;
  error: string;
  isLoading: boolean;
};

type PlayerAction =
  | { type: "SET_PLAYING"; payload: boolean }
  | { type: "SET_CURRENT_TIME"; payload: number }
  | { type: "SET_DURATION"; payload: number }
  | { type: "SET_AUDIO_FILE"; payload: File | null }
  | { type: "SET_AUDIO_URL"; payload: string }
  | { type: "SET_ERROR"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "RESET_PLAYER"; payload?: never };

const initialPlayerState: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  audioFile: null,
  audioUrl: "",
  error: "",
  isLoading: false,
};

export const usePlayer = () => {
  const [state, setState] = useReducer<PlayerState, PlayerAction>((state, action) => {
    switch (action.type) {
      case "SET_PLAYING":
        return { ...state, isPlaying: action.payload };
      case "SET_CURRENT_TIME":
        return { ...state, currentTime: action.payload };
      case "SET_DURATION":
        return { ...state, duration: action.payload };
      case "SET_AUDIO_FILE":
        return { ...state, audioFile: action.payload };
      case "SET_AUDIO_URL":
        return { ...state, audioUrl: action.payload };
      case "SET_ERROR":
        return { ...state, error: action.payload };
      case "SET_LOADING":
        return { ...state, isLoading: action.payload };
      case "RESET_PLAYER":
        return initialPlayerState;
      default:
        return state;
    }
  }, initialPlayerState);

  return {
    state,
    play: () => setState({ type: "SET_PLAYING", payload: true }),
    pause: () => setState({ type: "SET_PLAYING", payload: false }),
    setCurrentTime: (time: number) => setState({ type: "SET_CURRENT_TIME", payload: time }),
    setDuration: (duration: number) => setState({ type: "SET_DURATION", payload: duration }),
    setAudioFile: (file: File | null) => setState({ type: "SET_AUDIO_FILE", payload: file }),
    setAudioUrl: (url: string) => setState({ type: "SET_AUDIO_URL", payload: url }),
    setError: (error: string) => setState({ type: "SET_ERROR", payload: error }),
    setLoading: (loading: boolean) => setState({ type: "SET_LOADING", payload: loading }),
    resetPlayer: () => setState({ type: "RESET_PLAYER" }),
  };
};
