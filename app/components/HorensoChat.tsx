"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { HorensoTemplate, HorensoEntry, ReportData, InformationData, ConsultationData, Message } from "../types";
import { ChatMessage, LoadingIndicator } from "./ChatMessage";
import { ControlBar, type ControlBarHandle } from "./ControlBar";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { config } from "../config";
import { FaCalendarAlt, FaUser, FaBars, FaTimes, FaFileAlt, FaTrash } from "react-icons/fa";

interface DailyReportUser {
  id: string;
  name: string;
  department: string;
}

interface SavedDailyReport {
  id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  reportDate: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  extractedData: Record<string, string> | null;
}

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

  // 日本時間の今日の日付を取得する関数
  const getTodayInJST = () => {
    const now = new Date();
    // 日本時間で日付を取得
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';

    return `${year}-${month}-${day}`;
  };

  // 日報ユーザー関連のstate
  const [dailyReportUsers, setDailyReportUsers] = useState<DailyReportUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [reportDate, setReportDate] = useState<string>(getTodayInJST());

  // 日報履歴関連のstate
  const [savedReports, setSavedReports] = useState<SavedDailyReport[]>([]);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 日報ユーザーを読み込む
  useEffect(() => {
    const loadDailyReportUsers = () => {
      const stored = localStorage.getItem("daily-report-users");
      if (stored) {
        try {
          const users = JSON.parse(stored);
          setDailyReportUsers(users);
          // 自動選択はしない - ユーザーが明示的に選択する必要がある
        } catch (error) {
          console.error("Failed to load daily report users:", error);
        }
      }
    };

    loadDailyReportUsers();
  }, []);

  // 日報履歴を読み込む
  useEffect(() => {
    const loadSavedReports = () => {
      const stored = localStorage.getItem("saved-daily-reports");
      if (stored) {
        try {
          const reports = JSON.parse(stored);
          setSavedReports(reports);
        } catch (error) {
          console.error("Failed to load saved reports:", error);
        }
      }
    };

    loadSavedReports();
  }, []);

  // 社員または日付が変更された時、既存の履歴があれば自動的に読み込む
  useEffect(() => {
    if (!selectedUserId || !reportDate || savedReports.length === 0) return;
    if (template.id !== "daily-report") return;

    // 該当する履歴を検索
    const existingReport = savedReports.find(
      (report) =>
        report.userId === selectedUserId &&
        report.reportDate === reportDate
    );

    if (existingReport && existingReport.id !== currentReportId) {
      // 既存の履歴を読み込む
      setMessages(existingReport.messages);
      setExtractedData(existingReport.extractedData);
      setCurrentReportId(existingReport.id);
      // 初回メッセージ送信をスキップ
      isInitialized.current = true;
    } else if (!existingReport && currentReportId && messages.length > 0) {
      // 履歴がない場合は新規作成モードにリセット
      setMessages([]);
      setExtractedData(null);
      setCurrentReportId(null);
      setInput("");
      isInitialized.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, reportDate, savedReports, template.id]);

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

        // 自動保存（日報の場合のみ）
        if (template.id === "daily-report" && selectedUserId && !isInit) {
          // 自動保存の処理をインラインで実行
          const selectedUser = dailyReportUsers.find((u) => u.id === selectedUserId);
          if (selectedUser) {
            const now = new Date().toISOString();
            const updatedMessages = [
              ...messages,
              {
                id: `${Date.now()}-assistant`,
                role: "assistant" as const,
                content: assistantContent,
              },
            ];

            // 既存の日報を更新するか、新規作成するかを判断
            const existingReportIndex = savedReports.findIndex(
              (report) =>
                report.userId === selectedUserId &&
                report.reportDate === reportDate &&
                report.id === currentReportId
            );

            let updatedReports: SavedDailyReport[];

            if (existingReportIndex >= 0) {
              // 既存の日報を更新
              updatedReports = [...savedReports];
              updatedReports[existingReportIndex] = {
                ...updatedReports[existingReportIndex],
                messages: updatedMessages,
                extractedData: jsonData || updatedReports[existingReportIndex].extractedData,
                updatedAt: now,
              };
            } else {
              // 新規日報を作成
              const newReportId = crypto.randomUUID();
              const newReport: SavedDailyReport = {
                id: newReportId,
                userId: selectedUserId,
                userName: selectedUser.name,
                userDepartment: selectedUser.department,
                reportDate: reportDate,
                createdAt: now,
                updatedAt: now,
                messages: updatedMessages,
                extractedData: jsonData,
              };
              updatedReports = [newReport, ...savedReports];
              setCurrentReportId(newReportId);
            }

            setSavedReports(updatedReports);
            localStorage.setItem("saved-daily-reports", JSON.stringify(updatedReports));
          }
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
    [isLoading, messages, template.systemPrompt, template.id, selectedUserId, dailyReportUsers, savedReports, reportDate, currentReportId]
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

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    // 自動選択を避けるため、localStorageには保存しない
  };

  const handleDateChange = (date: string) => {
    setReportDate(date);
  };

  const handleSaveReport = () => {
    if (!extractedData) return;

    const selectedUser = dailyReportUsers.find((u) => u.id === selectedUserId);

    const entry: HorensoEntry = {
      id: crypto.randomUUID(),
      type: template.type,
      templateId: template.id,
      createdAt: new Date().toISOString(),
      data: {
        ...extractedData,
        userName: selectedUser?.name || "",
        userDepartment: selectedUser?.department || "",
        reportDate: reportDate,
      } as ReportData | InformationData | ConsultationData,
    };

    onComplete(entry);
  };

  // 保存された日報を読み込む
  const handleLoadReport = useCallback(
    (report: SavedDailyReport) => {
      setMessages(report.messages);
      setExtractedData(report.extractedData);
      setCurrentReportId(report.id);
      setSelectedUserId(report.userId);
      setReportDate(report.reportDate);
    },
    []
  );

  // 新規日報を開始
  const handleNewReport = useCallback(() => {
    setMessages([]);
    setExtractedData(null);
    setCurrentReportId(null);
    setInput("");
    isInitialized.current = false;
    // 初回メッセージを再送信
    setTimeout(() => {
      isInitialized.current = true;
      sendMessage("start", true);
    }, 100);
  }, [sendMessage]);

  // 日報を削除
  const handleDeleteReport = useCallback(
    (reportId: string, event: React.MouseEvent) => {
      // イベントの伝播を停止（カード全体のクリックイベントを防ぐ）
      event.stopPropagation();

      // 確認ダイアログ
      if (!window.confirm("この日報を削除してもよろしいですか？")) {
        return;
      }

      // 削除処理
      const updatedReports = savedReports.filter((report) => report.id !== reportId);
      setSavedReports(updatedReports);
      localStorage.setItem("saved-daily-reports", JSON.stringify(updatedReports));

      // 削除した日報が現在開いているものだった場合、クリア
      if (currentReportId === reportId) {
        handleNewReport();
      }
    },
    [savedReports, currentReportId, handleNewReport]
  );

  const selectedUser = dailyReportUsers.find((u) => u.id === selectedUserId);

  // 選択されたユーザーの日報をフィルタリング（社員が選択されていない場合は空配列）
  const filteredReports = selectedUserId
    ? savedReports.filter((report) => report.userId === selectedUserId)
    : [];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 gradient-animate relative p-2.5">
      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col min-w-0">
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

            {/* 社員名と日付選択 */}
            {template.id === "daily-report" && (
              <div className="flex items-center gap-3">
                {/* 社員名選択 */}
                {dailyReportUsers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <FaUser className="text-gray-600" />
                    <select
                      value={selectedUserId}
                      onChange={(e) => handleUserChange(e.target.value)}
                      className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    >
                      <option value="">選択してください</option>
                      {dailyReportUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}（{user.department}）
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 日付選択 */}
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-gray-600" />
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                {/* サイドバートグルボタン */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                  title={isSidebarOpen ? "履歴を非表示" : "履歴を表示"}
                >
                  {isSidebarOpen ? <FaTimes className="text-lg" /> : <FaBars className="text-lg" />}
                </button>
              </div>
            )}
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

      {/* 右サイドバー（日報履歴） */}
      {template.id === "daily-report" && isSidebarOpen && (
        <div className="w-96 bg-white/95 backdrop-blur-sm border-l-4 border-gray-300 shadow-2xl flex flex-col relative" style={{ zIndex: 30 }}>
          {/* サイドバーヘッダー */}
          <div className="border-b-2 border-gray-300 px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FaFileAlt />
                日報履歴
              </h3>
              <button
                type="button"
                onClick={handleNewReport}
                className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors duration-200"
                style={{ backgroundColor: "#10b981" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#059669")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#10b981")}
              >
                新規作成
              </button>
            </div>
            {selectedUser && (
              <p className="text-sm text-gray-600">
                {selectedUser.name}（{selectedUser.department}）
              </p>
            )}
          </div>

          {/* 日報リスト */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {filteredReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>日報がまだありません</p>
                {!selectedUserId && (
                  <p className="text-xs mt-2">社員を選択してください</p>
                )}
              </div>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleLoadReport(report)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    currentReportId === report.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {report.reportDate}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(report.updatedAt).toLocaleString("ja-JP")}
                      </p>
                      {report.extractedData && (
                        <div className="mt-2 text-xs text-gray-600">
                          <p className="line-clamp-2">
                            {Object.values(report.extractedData).slice(0, 2).join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteReport(report.id, e)}
                      className="p-2 rounded-lg transition-colors duration-200 hover:bg-red-100"
                      style={{ color: "#ef4444" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#ef4444")}
                      title="削除"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
