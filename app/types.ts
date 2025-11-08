export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export interface SpeechRecognitionType {
  start: () => void;
  stop: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}
