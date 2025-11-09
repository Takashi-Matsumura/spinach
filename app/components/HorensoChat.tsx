"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { HorensoTemplate, HorensoEntry, ReportData, InformationData, ConsultationData, Message } from "../types";
import { ChatMessage, LoadingIndicator } from "./ChatMessage";
import { ControlBar, type ControlBarHandle } from "./ControlBar";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { config } from "../config";

interface HorensoChatProps {
  template: HorensoTemplate;
  onComplete: (entry: HorensoEntry) => void;
  onBack: () => void;
}

export function HorensoChat({ template, onComplete, onBack }: HorensoChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, string> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const controlBarRef = useRef<ControlBarHandle>(null);

  // 初回メッセージを送信
  useEffect(() => {
    const initChat = async () => {
      if (isInitialized.current) {
        return;
      }
      isInitialized.current = true;
      // システムプロンプトを設定して最初のメッセージを取得
      await sendMessage("start", true);
    };
    initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // JSONを検出してパース
  const tryExtractJSON = (text: string): Record<string, string> | null => {
    const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        return data;
      } catch (e) {
        console.error("Failed to parse JSON:", e);
      }
    }
    return null;
  };

  const sendMessage = useCallback(
    async (userInput: string, isInit: boolean = false) => {
      if (!userInput.trim() && !isInit) return;
      if (isLoading) return;

      setIsLoading(true);

      // ユーザーメッセージを追加（初回は追加しない）
      if (!isInit) {
        const userMessage: Message = {
          id: `${Date.now()}-user`,
          role: "user",
          content: userInput,
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
      }

      try {
        const endpoint = `${config.backendUrl}/api/chat/completions`;

        // メッセージリストを構築
        const messageList = isInit
          ? [
              { id: "system", role: "system" as const, content: template.systemPrompt },
              { id: `${Date.now()}-init`, role: "user" as const, content: userInput }
            ]
          : [
              { id: "system", role: "system" as const, content: template.systemPrompt },
              ...messages,
              { id: `${Date.now()}-user`, role: "user" as const, content: userInput }
            ];

        const requestBody = {
          messages: messageList.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          stream: true,
          use_rag: false,
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("Response body is not readable");
        }

        let assistantContent = "";
        const assistantMessageId = `${Date.now()}-assistant`;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || "";
                assistantContent += content;

                setMessages((prev) => {
                  const existing = prev.find((m) => m.id === assistantMessageId);
                  if (existing) {
                    return prev.map((m) =>
                      m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                    );
                  }
                  return [
                    ...prev,
                    {
                      id: assistantMessageId,
                      role: "assistant",
                      content: assistantContent,
                    },
                  ];
                });
              } catch (e) {
                console.error("Failed to parse chunk:", e);
              }
            }
          }
        }

        // JSONが含まれているかチェック
        const jsonData = tryExtractJSON(assistantContent);
        if (jsonData) {
          setExtractedData(jsonData);
        }
      } catch (error) {
        console.error("Chat error:", error);
        const errorMessage = error instanceof Error ? error.message : "エラーが発生しました";
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-error`,
            role: "assistant",
            content: `申し訳ございません。エラーが発生しました: ${errorMessage}`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, template.systemPrompt]
  );

  const handleTranscript = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handleRecognitionEnd = useCallback(
    (finalTranscript: string) => {
      if (finalTranscript) {
        sendMessage(finalTranscript);
        setInput("");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const {
    isRecording,
    isSupported: isSpeechSupported,
    start: startRecording,
    stop: stopRecording,
  } = useSpeechRecognition({
    onTranscript: handleTranscript,
    onEnd: handleRecognitionEnd,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleRecordingStart = () => {
    startRecording();
  };

  const handleSaveReport = () => {
    if (!extractedData) return;

    const entry: HorensoEntry = {
      id: crypto.randomUUID(),
      type: template.type,
      templateId: template.id,
      createdAt: new Date().toISOString(),
      data: extractedData as ReportData | InformationData | ConsultationData,
    };

    onComplete(entry);
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 gradient-animate relative p-2.5">
      {/* Decorative elements */}
      <div
        className="fixed top-0 left-0 w-96 h-96 bg-gray-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      <div
        className="fixed bottom-0 right-0 w-96 h-96 bg-gray-300/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Header */}
      <header className="flex-shrink-0 border-b-4 border-gray-300 bg-white/95 shadow-2xl backdrop-blur-sm relative" style={{ zIndex: 30 }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{template.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{template.name}</h2>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-6 chat-scroll relative"
        style={{ zIndex: 10 }}
      >
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} showRepeat={false} onRepeat={() => {}} />
        ))}
        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area or Save Button */}
      {extractedData ? (
        <div className="flex-shrink-0 relative" style={{ zIndex: 20 }}>
          <div className="bg-white/95 backdrop-blur-sm border-t-4 border-gray-300 shadow-2xl">
            <div className="px-4 py-4">
              <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  日報が作成されました。内容を確認して保存してください。
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setExtractedData(null)}
                    className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    修正する
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReport}
                    className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700"
                  >
                    保存する
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ControlBar
          ref={controlBarRef}
          input={input}
          isLoading={isLoading}
          isRecording={isRecording}
          isSpeechSupported={isSpeechSupported}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onStartRecording={handleRecordingStart}
          onStopRecording={stopRecording}
          onClear={() => {}}
        />
      )}
    </div>
  );
}
