"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  FaChartBar,
  FaClipboardList,
  FaClock,
  FaDatabase,
  FaEdit,
  FaFolder,
  FaPen,
} from "react-icons/fa";
import { config } from "../config";

// RAGバックエンドのベースURL
const RAG_BACKEND_URL = `${config.backendUrl}/api`;

interface DocumentInfo {
  filename: string;
  chunk_count: number;
  file_type: string;
  upload_timestamp: string;
}

interface DocumentChunk {
  chunk_index: number;
  content: string;
  char_count: number;
}

interface DocumentContent {
  filename: string;
  total_chunks: number;
  chunks: DocumentChunk[];
}

interface Template {
  id: string;
  name: string;
  filename: string;
}

interface StatsInfo {
  unique_documents: number;
  total_chunks: number;
  embedding_dimension: number;
}

interface ModelStatus {
  status: "not_loaded" | "downloading" | "loading" | "ready" | "error";
  is_ready: boolean;
  model_name: string;
  error: string | null;
  elapsed_seconds: number | null;
}

interface DocumentManagerProps {
  onBack: () => void;
}

export function DocumentManager({ onBack }: DocumentManagerProps) {
  const instanceId = useId();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [stats, setStats] = useState<StatsInfo | null>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);

  // 経過時間をフォーマットする関数
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  // テキストエディタモード用の状態
  const [isTextMode, setIsTextMode] = useState(false);
  const [editorText, setEditorText] = useState("");
  const [editorFilename, setEditorFilename] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // 検索機能用の状態
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ドキュメント一覧を取得
  const fetchDocuments = useCallback(async () => {
    try {
      const url = `${RAG_BACKEND_URL}/documents/list`;

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        console.error("Documents fetch failed:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  }, []);

  // 統計情報を取得
  const fetchStats = useCallback(async () => {
    try {
      const url = `${RAG_BACKEND_URL}/rag/stats`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error("Stats fetch failed:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  // テンプレート一覧を取得
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${RAG_BACKEND_URL}/documents/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  }, []);

  // モデルステータスを取得
  const fetchModelStatus = useCallback(async () => {
    try {
      const response = await fetch(`${RAG_BACKEND_URL}/model-status`);
      if (response.ok) {
        const data = await response.json();
        setModelStatus(data);
      } else {
        console.error("Model status fetch failed:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch model status:", error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
    fetchTemplates();
    fetchModelStatus();
  }, [fetchDocuments, fetchStats, fetchTemplates, fetchModelStatus]);

  // モデルステータスのポーリング（準備中の場合のみ）
  useEffect(() => {
    if (!modelStatus) return;

    // モデルがまだ準備中の場合は2秒ごとにポーリング
    if (
      modelStatus.status === "downloading" ||
      modelStatus.status === "loading" ||
      modelStatus.status === "not_loaded"
    ) {
      const intervalId = setInterval(() => {
        fetchModelStatus();
      }, 2000);

      return () => clearInterval(intervalId);
    }
  }, [modelStatus, fetchModelStatus]);

  // ドキュメント内容を取得
  const fetchDocumentContent = async (filename: string) => {
    setIsLoadingContent(true);
    try {
      const response = await fetch(
        `${RAG_BACKEND_URL}/documents/content/${encodeURIComponent(filename)}`
      );
      if (response.ok) {
        const data = await response.json();
        setDocumentContent(data);
        setViewingDocument(filename);
      } else {
        setUploadStatus("❌ コンテンツの取得に失敗しました");
        setTimeout(() => setUploadStatus(""), 3000);
      }
    } catch (error) {
      console.error("Failed to fetch document content:", error);
      setUploadStatus("❌ コンテンツの取得に失敗しました");
      setTimeout(() => setUploadStatus(""), 3000);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // ドキュメントビューを閉じる
  const closeDocumentView = () => {
    setViewingDocument(null);
    setDocumentContent(null);
    setSearchQuery("");
  };

  // 検索キーワードをハイライト表示する関数（Reactエレメントを返す）
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={`${part}-${index}`} className="bg-yellow-300 px-1 rounded">
          {part}
        </mark>
      ) : (
        <span key={`text-${index}`}>{part}</span>
      )
    );
  };

  // チャンクが検索クエリにマッチするかチェック
  const chunkMatchesSearch = (chunk: DocumentChunk) => {
    if (!searchQuery.trim()) return true;
    return chunk.content.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // テンプレート選択時の処理
  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) {
      setEditorText("");
      setSelectedTemplate("");
      return;
    }

    try {
      const response = await fetch(`${RAG_BACKEND_URL}/documents/templates/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setEditorText(data.content);
        setSelectedTemplate(templateId);
        // テンプレートファイル名をデフォルトのファイル名として設定
        if (!editorFilename) {
          setEditorFilename(templateId);
        }
      }
    } catch (error) {
      console.error("Failed to load template:", error);
      setUploadStatus("❌ テンプレートの読み込みに失敗しました");
      setTimeout(() => setUploadStatus(""), 3000);
    }
  };

  // テキストをRAGに追加
  const handleTextUpload = async () => {
    if (!editorText.trim()) {
      setUploadStatus("❌ テキストを入力してください");
      setTimeout(() => setUploadStatus(""), 3000);
      return;
    }

    if (!editorFilename.trim()) {
      setUploadStatus("❌ ファイル名を入力してください");
      setTimeout(() => setUploadStatus(""), 3000);
      return;
    }

    setIsLoading(true);
    setUploadStatus("RAGに追加中...");

    try {
      const response = await fetch(`${RAG_BACKEND_URL}/documents/upload-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: editorText,
          filename: editorFilename,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUploadStatus(`✅ RAGに追加しました: ${data.chunk_count}チャンク作成`);
        // エディタをクリア
        setEditorText("");
        setEditorFilename("");
        setSelectedTemplate("");
        // ドキュメント一覧を更新
        fetchDocuments();
        fetchStats();
        // 一覧画面に戻る
        setTimeout(() => {
          setIsTextMode(false);
        }, 1500);
      } else {
        const error = await response.json();
        setUploadStatus(`❌ エラー: ${error.detail}`);
      }
    } catch (error) {
      setUploadStatus("❌ RAGへの追加に失敗しました");
      console.error("Text upload error:", error);
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadStatus(""), 3000);
    }
  };

  // ファイルアップロード
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadStatus("アップロード中...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${RAG_BACKEND_URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadStatus(`✅ アップロード成功: ${data.chunks_created}チャンク作成`);
        fetchDocuments();
        fetchStats();
      } else {
        const error = await response.json();
        setUploadStatus(`❌ エラー: ${error.detail}`);
      }
    } catch (error) {
      setUploadStatus("❌ アップロードに失敗しました");
      console.error("Upload error:", error);
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadStatus(""), 3000);
    }
  };

  // ドキュメント削除
  const handleDelete = async (filename: string) => {
    if (!confirm(`「${filename}」を削除しますか？`)) return;

    try {
      const response = await fetch(`${RAG_BACKEND_URL}/documents/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUploadStatus("✅ 削除しました");
        fetchDocuments();
        fetchStats();
      } else {
        setUploadStatus("❌ 削除に失敗しました");
      }
    } catch (error) {
      setUploadStatus("❌ 削除に失敗しました");
      console.error("Delete error:", error);
    } finally {
      setTimeout(() => setUploadStatus(""), 3000);
    }
  };

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

      {/* ヘッダー */}
      <header
        className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-b-4 border-gray-300 relative shadow-2xl"
        style={{ zIndex: 30 }}
      >
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* 戻るボタン */}
              <button
                type="button"
                onClick={onBack}
                className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-800 text-white flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105"
                aria-label="戻る"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="戻るアイコン"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="w-4 h-4 bg-gray-600 rounded-full animate-pulse shadow-lg shadow-gray-600/50"></div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-black text-gray-900 leading-tight flex items-center gap-2">
                  <FaDatabase />
                  RAG管理
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white/95 backdrop-blur-sm shadow-2xl" style={{ zIndex: 10 }}>

        {/* 統計情報とモード切り替えを横並びに（ドキュメント閲覧中は非表示） */}
        {!viewingDocument && (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-300 flex items-center justify-between gap-4">
              {/* 統計情報（コンパクト） */}
              {stats && (
                <div className="flex gap-6 text-base">
                  <div>
                    <span className="font-bold text-gray-700 text-lg">
                      {stats.unique_documents}
                    </span>
                    <span className="text-gray-600 ml-1">ドキュメント</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 text-lg">{stats.total_chunks}</span>
                    <span className="text-gray-600 ml-1">チャンク</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 text-lg">
                      {stats.embedding_dimension}
                    </span>
                    <span className="text-gray-600 ml-1">次元</span>
                  </div>
                </div>
              )}

              {/* モード切り替えボタン（コンパクト） */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTextMode(false)}
                  className={`py-2 px-6 rounded-lg font-medium transition-all text-base flex items-center gap-2 ${
                    !isTextMode
                      ? "bg-gray-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <FaFolder />
                  ファイル
                </button>
                <button
                  type="button"
                  onClick={() => setIsTextMode(true)}
                  className={`py-2 px-6 rounded-lg font-medium transition-all text-base flex items-center gap-2 ${
                    isTextMode
                      ? "bg-gray-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <FaPen />
                  テキスト
                </button>
              </div>
            </div>

            {/* モデルステータス表示 - downloading, loading, errorの時のみ表示 */}
            {modelStatus &&
              (modelStatus.status === "downloading" ||
                modelStatus.status === "loading" ||
                modelStatus.status === "error") && (
                <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-shrink-0">
                      {modelStatus.status === "error" ? (
                        <svg
                          className="w-5 h-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-500 border-t-transparent"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 flex items-center gap-2">
                        <span>
                          {modelStatus.status === "downloading" &&
                            "埋め込みモデルをダウンロード中..."}
                          {modelStatus.status === "loading" && "埋め込みモデルをロード中..."}
                          {modelStatus.status === "error" && "埋め込みモデルのロードエラー"}
                        </span>
                        {modelStatus.elapsed_seconds !== null &&
                          modelStatus.elapsed_seconds > 0 && (
                            <span className="text-gray-700 font-bold">
                              ({formatElapsedTime(modelStatus.elapsed_seconds)}経過)
                            </span>
                          )}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {modelStatus.model_name}
                        {modelStatus.status === "downloading" &&
                          " - 初回は5分以上かかる場合があります"}
                      </div>
                    </div>
                  </div>
                  {modelStatus.status !== "error" && (
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all duration-500 relative"
                        style={{
                          width:
                            modelStatus.elapsed_seconds !== null && modelStatus.elapsed_seconds > 0
                              ? `${Math.min(95, 10 + (modelStatus.elapsed_seconds / 300) * 85)}%`
                              : modelStatus.status === "downloading"
                                ? "50%"
                                : "75%",
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                      </div>
                    </div>
                  )}
                  {modelStatus.error && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                      エラー: {modelStatus.error}
                    </div>
                  )}
                </div>
              )}
          </>
        )}

        {/* アップロードセクション（コンパクト）（ドキュメント閲覧中は非表示） */}
        {!viewingDocument && (
          <div className={`px-4 py-3 border-b border-gray-200 ${isTextMode ? "" : "bg-gray-50"}`}>
            {!isTextMode ? (
              // ファイルアップロードモード
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-800 transition-all cursor-pointer shadow-md hover:shadow-lg">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="アップロードアイコン"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="font-bold text-base">ファイルをアップロード</span>
                <span className="text-sm opacity-80">(.txt, .md, .pdf)</span>
                <input
                  type="file"
                  accept=".txt,.md,.pdf"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="hidden"
                />
              </label>
            ) : (
              // テキストエディタモード - 横並びレイアウト
              <div className="flex gap-3 items-end">
                {/* テンプレート選択 */}
                <div className="flex-1">
                  <label
                    htmlFor={`template-select-${instanceId}`}
                    className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
                  >
                    <FaClipboardList />
                    テンプレート
                  </label>
                  <select
                    id={`template-select-${instanceId}`}
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                    disabled={isLoading}
                  >
                    <option value="">-- 空白から始める --</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ファイル名入力 */}
                <div className="flex-1">
                  <label
                    htmlFor={`filename-input-${instanceId}`}
                    className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
                  >
                    <FaEdit />
                    ファイル名
                  </label>
                  <input
                    id={`filename-input-${instanceId}`}
                    type="text"
                    value={editorFilename}
                    onChange={(e) => setEditorFilename(e.target.value)}
                    placeholder="例: booth_A01_info"
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {uploadStatus && (
              <div className="mt-3 text-center text-base font-medium">{uploadStatus}</div>
            )}
          </div>
        )}

        {/* ドキュメント一覧 or ドキュメント内容表示 or テキストエディタ */}
        <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col">
          {isTextMode ? (
            // テキストエディタ表示（大きく）
            <div className="h-full flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm text-gray-500 flex items-center gap-4">
                  <span>{editorText.length} 文字</span>
                  <span>Markdown形式で記述できます</span>
                </div>
                <button
                  type="button"
                  onClick={handleTextUpload}
                  disabled={isLoading || !editorText.trim() || !editorFilename.trim()}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-bold shadow-md hover:shadow-lg text-base"
                >
                  {isLoading ? "追加中..." : "RAGに追加"}
                </button>
              </div>
              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                placeholder="ここにテキストを入力するか、上のテンプレートを選択してください...&#10;&#10;展示会の他ブース情報などを追加して、来場者がAIチャットで質問できるようにしましょう！"
                className="flex-1 w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-transparent resize-none font-mono text-base leading-relaxed"
                disabled={isLoading}
                style={{ minHeight: "400px" }}
              />
            </div>
          ) : viewingDocument && documentContent ? (
            // ドキュメント内容表示
            <div className="h-full flex flex-col">
              {/* ヘッダー（固定） */}
              <div className="flex-shrink-0 pb-4 border-b border-gray-200">
                <button
                  type="button"
                  onClick={closeDocumentView}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium text-base"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="戻るアイコン"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  <span>一覧に戻る</span>
                </button>
                <h3 className="text-2xl font-bold text-gray-900 mt-4 flex items-center gap-2">
                  <svg
                    className="w-7 h-7 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="ドキュメントアイコン"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {documentContent.filename}
                </h3>
                <p className="text-base text-gray-600 mt-1">
                  総チャンク数: {documentContent.total_chunks}
                  {searchQuery &&
                    ` | マッチ: ${documentContent.chunks.filter(chunkMatchesSearch).length}件`}
                </p>

                {/* 検索ボックス */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-gray-300 focus-within:border-transparent">
                    <svg
                      className="w-4 h-4 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="検索アイコン"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="キーワードで検索..."
                      className="flex-1 outline-none text-base"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        type="button"
                        aria-label="検索クリア"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          role="img"
                          aria-label="クリアアイコン"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* チャンク一覧（スクロール可能） */}
              <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4">
                {documentContent.chunks.filter(chunkMatchesSearch).map((chunk) => (
                  <div
                    key={chunk.chunk_index}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-300">
                      <span className="bg-gray-500 text-white text-sm font-bold px-3 py-1 rounded">
                        チャンク {chunk.chunk_index + 1}
                      </span>
                      <span className="text-sm text-gray-500">{chunk.char_count} 文字</span>
                    </div>
                    <div className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {highlightText(chunk.content, searchQuery)}
                    </div>
                  </div>
                ))}
                {documentContent.chunks.filter(chunkMatchesSearch).length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="検索結果なしアイコン"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <p className="text-xl font-medium">検索結果なし</p>
                    <p className="text-base mt-2">
                      「{searchQuery}」に一致するチャンクが見つかりませんでした
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : isLoadingContent ? (
            // ローディング表示
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 text-base">読み込み中...</p>
            </div>
          ) : documents.length === 0 ? (
            // ドキュメントがない場合
            <div className="text-center py-12 text-gray-400">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="ドキュメントなしアイコン"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-xl font-medium">ドキュメントがありません</p>
              <p className="text-base mt-2">上のボタンからファイルをアップロードしてください</p>
            </div>
          ) : (
            // ドキュメント一覧
            <div className="space-y-3 overflow-y-auto h-full">
              {documents.map((doc) => (
                <div
                  key={doc.filename}
                  className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all border border-gray-200 cursor-pointer w-full"
                  onClick={() => fetchDocumentContent(doc.filename)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-6 h-6 text-gray-600 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          role="img"
                          aria-label="ドキュメントファイルアイコン"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <h3 className="font-bold text-gray-900 truncate text-base">
                          {doc.filename}
                        </h3>
                        <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                          {doc.file_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-base text-gray-600">
                        <span className="flex items-center gap-1">
                          <FaChartBar />
                          {doc.chunk_count} チャンク
                        </span>
                        <span className="flex items-center gap-1">
                          <FaClock />
                          {new Date(doc.upload_timestamp).toLocaleString("ja-JP")}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-700 font-medium">
                        クリックして内容を表示 →
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.filename);
                      }}
                      className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-all"
                      aria-label="削除"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        role="img"
                        aria-label="削除アイコン"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
