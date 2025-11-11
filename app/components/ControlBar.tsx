import { type FormEvent, forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface ControlBarProps {
  input: string;
  isLoading: boolean;
  isRecording: boolean;
  isSpeechSupported: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClear: () => void;
}

export interface ControlBarHandle {
  focusInput: () => void;
}

export const ControlBar = forwardRef<ControlBarHandle, ControlBarProps>(function ControlBar(
  {
    input,
    isLoading,
    isRecording,
    isSpeechSupported,
    onInputChange,
    onSubmit,
    onStartRecording,
    onStopRecording,
    onClear: _onClear,
  },
  ref
) {
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 親コンポーネントからフォーカスを制御できるようにする
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    const element = micButtonRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      onStartRecording();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      onStopRecording();
    };

    const handleTouchCancel = (e: TouchEvent) => {
      e.preventDefault();
      onStopRecording();
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: false });
    element.addEventListener("touchcancel", handleTouchCancel, { passive: false });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [onStartRecording, onStopRecording]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <div
      className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-t-4 border-gray-300 px-4 py-5 pb-8 relative shadow-2xl"
      style={{ zIndex: 30 }}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <button
          ref={micButtonRef}
          type="button"
          onClick={onStartRecording}
          disabled={!isSpeechSupported}
          className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 touch-none shadow-xl border-2 ${
            isRecording
              ? "bg-red-500 text-white border-red-400 scale-110 animate-pulse"
              : isSpeechSupported
                ? "bg-gray-100 text-gray-700 border-gray-300 hover:scale-105 hover:bg-gray-200"
                : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed opacity-50"
          }`}
          aria-label="音声入力"
          style={{
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
          }}
        >
          <svg
            className="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 20 20"
            role="img"
            aria-label="マイクアイコン"
          >
            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
            <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 px-6 py-4 rounded-full bg-gray-50 text-gray-900 text-lg placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-gray-300 shadow-inner border-2 border-gray-300 transition-all duration-300 font-medium"
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 w-16 h-16 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 shadow-xl border-2 border-gray-600"
          aria-label="送信"
        >
          <svg
            className="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 20 20"
            role="img"
            aria-label="送信アイコン"
          >
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  );
});
