"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaDatabase, FaHistory, FaInfoCircle, FaPlus, FaClipboardList } from "react-icons/fa";
import { ChatMessage, LoadingIndicator } from "./components/ChatMessage";
import { ControlBar, type ControlBarHandle } from "./components/ControlBar";
import { DocumentManager } from "./components/DocumentManager";
import { AppInfo } from "./components/AppInfo";
import { SessionSidebar } from "./components/SessionSidebar";
import { HorensoTemplateSelector } from "./components/HorensoTemplateSelector";
import { HorensoForm } from "./components/HorensoForm";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import type { Message, HorensoTemplate, HorensoEntry } from "./types";
import { config } from "./config";
import { saveEntry } from "./horenso/storage";
import { getTemplateById } from "./horenso/templates";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRagEnabled, setIsRagEnabled] = useState(true);
  const [isDocManagerOpen, setIsDocManagerOpen] = useState(false);
  const [isSessionSidebarOpen, setIsSessionSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"chat" | "app-info" | "horenso-selector" | "horenso-form">("chat");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // 報連相関連のstate
  const [selectedTemplate, setSelectedTemplate] = useState<HorensoTemplate | null>(null);
  const [currentHorensoEntry, setCurrentHorensoEntry] = useState<HorensoEntry | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const ragLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlBarRef = useRef<ControlBarHandle>(null);

  const handleTranscript = useCallback((text: string) => {
    setInput(text);
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
    if (isLoading && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isLoading, scrollToBottom]);

  // Save session to localStorage
  const saveSession = useCallback((sessionId: string, msgs: Message[]) => {
    try {
      // Save messages
      localStorage.setItem(`chatSession_${sessionId}`, JSON.stringify(msgs));

      // Update session metadata
      const savedSessions = localStorage.getItem("chatSessions");
      const sessions = savedSessions ? JSON.parse(savedSessions) : [];

      const existingIndex = sessions.findIndex((s: { id: string }) => s.id === sessionId);
      const sessionData = {
        id: sessionId,
        title: msgs.length > 0 ? msgs[0].content.substring(0, 50) : "新しいチャット",
        timestamp: Date.now(),
        messageCount: msgs.length,
      };

      if (existingIndex >= 0) {
        sessions[existingIndex] = sessionData;
      } else {
        sessions.push(sessionData);
      }

      localStorage.setItem("chatSessions", JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  }, []);

  // Load session from localStorage
  const loadSession = useCallback((sessionId: string) => {
    try {
      const savedMessages = localStorage.getItem(`chatSession_${sessionId}`);
      if (savedMessages) {
        const msgs = JSON.parse(savedMessages);
        setMessages(msgs);
        setCurrentSessionId(sessionId);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  }, []);

  // Create new session
  const createNewSession = useCallback(() => {
    const newSessionId = `session_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setInput("");
  }, []);

  // Initialize or load session on mount
  useEffect(() => {
    const lastSessionId = localStorage.getItem("lastSessionId");
    if (lastSessionId) {
      loadSession(lastSessionId);
    } else {
      createNewSession();
    }
  }, [loadSession, createNewSession]);

  // Save current session when messages change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      saveSession(currentSessionId, messages);
      localStorage.setItem("lastSessionId", currentSessionId);
    }
  }, [currentSessionId, messages, saveSession]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
      };

      const updatedMessages = [...messages, userMessage];

      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      try {
        const endpoint = `${config.backendUrl}/api/chat/completions`;

        const requestBody = {
          messages: updatedMessages,
          use_rag: isRagEnabled,
          stream: true,
          model:
            "/Users/matsbaccano/Library/Caches/llama.cpp/bartowski_google_gemma-3n-E4B-it-GGUF_google_gemma-3n-E4B-it-Q6_K.gguf",
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) throw new Error("API request failed");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";

        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-assistant`, role: "assistant", content: "" },
        ]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter((line) => line.trim());

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.choices && parsed.choices[0]) {
                    const content = parsed.choices[0]?.delta?.content || "";
                    if (content) {
                      assistantMessage += content;

                      setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1].content = assistantMessage;
                        return updated;
                      });
                    }
                  }
                } catch (e) {
                  console.error("Parse error:", e);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error:", error);
        const errorMessage = "エラーが発生しました。もう一度お試しください。";
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-error`, role: "assistant", content: errorMessage },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          controlBarRef.current?.focusInput();
        }, 300);
      }
    },
    [isLoading, messages, isRagEnabled]
  );

  const handleRecognitionEnd = useCallback(
    (finalTranscript: string) => {
      if (finalTranscript) {
        sendMessage(finalTranscript);
        setInput("");
      }
    },
    [sendMessage]
  );

  // 報連相テンプレート選択ハンドラー
  const handleTemplateSelect = useCallback((template: HorensoTemplate) => {
    setSelectedTemplate(template);
    setViewMode("horenso-form");
  }, []);

  // 報連相フォーム送信ハンドラー
  const handleHorensoSubmit = useCallback(
    async (entry: HorensoEntry, promptForAI: string) => {
      try {
        // エントリをセッションIDと紐付けて保存
        const entryWithSession = {
          ...entry,
          chatSessionId: currentSessionId || undefined,
        };
        saveEntry(entryWithSession);
        setCurrentHorensoEntry(entryWithSession);

        // チャット画面に戻る
        setViewMode("chat");

        // テンプレートのシステムプロンプトとユーザープロンプトを組み合わせてAIに送信
        if (selectedTemplate) {
          // システムメッセージを追加
          const systemMessage: Message = {
            id: `${Date.now()}-system`,
            role: "user",
            content: selectedTemplate.systemPrompt,
          };

          // ユーザーの報連相内容を送信
          const userMessage: Message = {
            id: `${Date.now()}-user`,
            role: "user",
            content: promptForAI,
          };

          setMessages((prev) => [...prev, userMessage]);

          // AIにリクエスト送信
          await sendMessage(promptForAI);
        }
      } catch (error) {
        console.error("Failed to submit horenso:", error);
      }
    },
    [currentSessionId, selectedTemplate, sendMessage]
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

  const handleClear = () => {
    createNewSession();
  };

  const handleRecordingStart = () => {
    startRecording();
  };

  const isLongPress = useRef(false);

  const handleRagMouseDown = () => {
    isLongPress.current = false;
    ragLongPressTimerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setIsDocManagerOpen(true);
    }, 500);
  };

  const handleRagMouseUp = () => {
    if (ragLongPressTimerRef.current) {
      clearTimeout(ragLongPressTimerRef.current);
      ragLongPressTimerRef.current = null;
    }

    if (!isLongPress.current) {
      setIsRagEnabled((prev) => !prev);
    }

    isLongPress.current = false;
  };

  const handleRagMouseLeave = () => {
    if (ragLongPressTimerRef.current) {
      clearTimeout(ragLongPressTimerRef.current);
      ragLongPressTimerRef.current = null;
    }
    isLongPress.current = false;
  };

  useEffect(() => {
    return () => {
      if (ragLongPressTimerRef.current) {
        clearTimeout(ragLongPressTimerRef.current);
      }
    };
  }, []);

  // Show app info screen
  if (viewMode === "app-info") {
    return <AppInfo onBack={() => setViewMode("chat")} />;
  }

  // Show horenso template selector
  if (viewMode === "horenso-selector") {
    return (
      <HorensoTemplateSelector
        onSelectTemplate={handleTemplateSelect}
        onClose={() => setViewMode("chat")}
      />
    );
  }

  // Show horenso form
  if (viewMode === "horenso-form" && selectedTemplate) {
    return (
      <div className="h-screen overflow-hidden bg-white">
        <HorensoForm
          template={selectedTemplate}
          onSubmit={handleHorensoSubmit}
          onBack={() => setViewMode("horenso-selector")}
        />
      </div>
    );
  }

  // Show chat screen
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 gradient-animate relative p-2.5">
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
      <header
        className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-b-4 border-gray-300 relative shadow-2xl"
        style={{ zIndex: 30 }}
      >
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Session history button */}
              <button
                type="button"
                onClick={() => setIsSessionSidebarOpen(true)}
                className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-800 text-white flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105"
                aria-label="チャット履歴"
              >
                <FaHistory className="text-xl" />
              </button>

              <div className="w-4 h-4 bg-gray-600 rounded-full animate-pulse shadow-lg shadow-gray-600/50"></div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-black text-gray-900 leading-tight">Spinach</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 報連相ボタン */}
              <button
                type="button"
                onClick={() => setViewMode("horenso-selector")}
                className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105"
                aria-label="報連相"
                title="報連相テンプレート"
              >
                <FaClipboardList className="text-xl" />
              </button>

              {/* App Info button */}
              <button
                type="button"
                onClick={() => setViewMode("app-info")}
                className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-800 text-white flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105"
                aria-label="アプリ情報"
              >
                <FaInfoCircle className="text-xl" />
              </button>

              {/* RAG toggle button */}
              <button
                type="button"
                onMouseDown={handleRagMouseDown}
                onMouseUp={handleRagMouseUp}
                onMouseLeave={handleRagMouseLeave}
                onTouchStart={handleRagMouseDown}
                onTouchEnd={handleRagMouseUp}
                className={`w-12 h-12 rounded-full backdrop-blur-sm shadow-lg hover:scale-105 transition-all duration-300 hover:shadow-xl flex items-center justify-center border-2 ${
                  isRagEnabled
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-gray-300 border-gray-400 text-gray-600"
                }`}
                aria-label="RAG機能切替（長押しでRAG管理）"
              >
                <FaDatabase className="text-xl" />
              </button>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-800 text-white flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105"
                  aria-label="チャットをクリア"
                >
                  <FaPlus className="text-xl" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Chat Window */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 chat-scroll relative"
        style={{ zIndex: 10 }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-start pt-8 space-y-8 px-4">
            {/* Hero Message */}
            <div className="text-center space-y-6 animate-fade-in">
              <h2 className="text-5xl md:text-6xl font-black text-gray-800 leading-tight px-4">
                Spinach
              </h2>

              <p className="text-xl md:text-2xl font-medium text-gray-600 leading-relaxed max-w-2xl mx-auto px-4">
                AIチャット + RAG アプリケーション
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} showRepeat={false} onRepeat={() => {}} />
            ))}
            {isLoading && <LoadingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Control Bar */}
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
        onClear={handleClear}
      />

      {/* Document Manager Modal */}
      <DocumentManager isOpen={isDocManagerOpen} onClose={() => setIsDocManagerOpen(false)} />

      {/* Session Sidebar */}
      <SessionSidebar
        isOpen={isSessionSidebarOpen}
        onClose={() => setIsSessionSidebarOpen(false)}
        currentSessionId={currentSessionId}
        onSessionSelect={loadSession}
        onNewSession={createNewSession}
      />
    </div>
  );
}
