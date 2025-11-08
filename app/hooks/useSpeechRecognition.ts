import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechRecognitionType } from "../types";

interface UseSpeechRecognitionProps {
  onTranscript: (text: string) => void;
  onEnd: (finalTranscript: string) => void;
}

export function useSpeechRecognition({ onTranscript, onEnd }: UseSpeechRecognitionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    interface ExtendedWindow extends Window {
      SpeechRecognition?: new () => SpeechRecognitionType;
      webkitSpeechRecognition?: new () => SpeechRecognitionType;
    }

    const SpeechRecognitionAPI =
      (window as ExtendedWindow).SpeechRecognition ||
      (window as ExtendedWindow).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = "ja-JP";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: unknown) => {
        const results = (
          event as { results: { length: number; [key: number]: { 0: { transcript: string } } } }
        ).results;
        let transcript = "";

        for (let i = 0; i < results.length; i++) {
          transcript += results[i][0].transcript;
        }

        transcriptRef.current = transcript;
        onTranscript(transcript);
      };

      recognition.onerror = (event: unknown) => {
        console.error("Speech recognition error:", (event as { error: string }).error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        const finalTranscript = transcriptRef.current.trim();
        transcriptRef.current = "";

        if (finalTranscript) {
          setTimeout(() => onEnd(finalTranscript), 100);
        }
      };

      recognitionRef.current = recognition;
      setIsSupported(true);
    }
  }, [onTranscript, onEnd]);

  const start = useCallback(() => {
    if (!recognitionRef.current || isRecording) return;

    try {
      transcriptRef.current = "";
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setIsRecording(false);
    }
  }, [isRecording]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  }, []);

  return {
    isRecording,
    isSupported,
    start,
    stop,
  };
}
