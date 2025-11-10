"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import type { Message } from "../types";

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export function SessionSidebar({
  isOpen,
  onClose,
  currentSessionId,
  onSessionSelect,
  onNewSession,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    try {
      const response = await fetch("/api/chat-sessions");
      if (response.ok) {
        const sessions = await response.json();
        setSessions(sessions);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("このセッションを削除してもよろしいですか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/chat-sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("セッションの削除に失敗しました");
      }

      // Reload sessions
      await loadSessions();

      // If deleted current session, create new one
      if (sessionId === currentSessionId) {
        onNewSession();
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert(error instanceof Error ? error.message : "セッションの削除に失敗しました");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">チャット履歴</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <FaTimes className="text-gray-600" />
          </button>
        </div>

        {/* New Session Button */}
        <div className="p-4 border-b">
          <button
            type="button"
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors font-medium"
          >
            <FaPlus />
            新しいチャット
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4">
          {sessions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">履歴がありません</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    onSessionSelect(session.id);
                    onClose();
                  }}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                    session.id === currentSessionId
                      ? "bg-gray-700 text-white"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{session.title}</h3>
                      <p
                        className={`text-sm ${
                          session.id === currentSessionId ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        {session.messages.length}件のメッセージ
                      </p>
                      <p
                        className={`text-xs ${
                          session.id === currentSessionId ? "text-gray-400" : "text-gray-400"
                        }`}
                      >
                        {new Date(session.updatedAt).toLocaleString("ja-JP")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className={`p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                        session.id === currentSessionId ? "hover:bg-gray-600" : "hover:bg-gray-200"
                      }`}
                      aria-label="削除"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
