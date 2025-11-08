"use client";

import { useEffect, useState } from "react";
import { FaArrowLeft, FaCog, FaEdit, FaMicrochip, FaSave, FaServer, FaTimes } from "react-icons/fa";
import { config } from "../config";

interface ModelSpecs {
  n_params: number;
  n_params_formatted: string;
  size: number;
  size_formatted: string;
  vocab_size: number;
  context_length: number;
  embedding_dim: number;
}

interface ModelInfoData {
  model_id: string;
  model_name: string;
  owned_by: string;
  created: number;
  specs: ModelSpecs;
}

interface BackendSettings {
  backend: {
    host: string;
    port: number;
  };
  llm: {
    base_url: string;
    model: string;
  };
  chromadb: {
    persist_dir: string;
    collection_name: string;
  };
  embeddings: {
    model: string;
    device: string;
  };
  rag: {
    top_k: number;
    similarity_threshold: number;
    chunk_size: number;
    chunk_overlap: number;
  };
  cors: {
    origins: string;
  };
}

interface AppInfoProps {
  onBack: () => void;
}

export function AppInfo({ onBack }: AppInfoProps) {
  const [activeTab, setActiveTab] = useState<"model" | "settings">("model");
  const [modelInfo, setModelInfo] = useState<ModelInfoData | null>(null);
  const [settings, setSettings] = useState<BackendSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingBackend, setIsEditingBackend] = useState(false);
  const [editedLlmUrl, setEditedLlmUrl] = useState("");
  const [editedBackendUrl, setEditedBackendUrl] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [backendSaveMessage, setBackendSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [modelResponse, settingsResponse] = await Promise.all([
        fetch(`${config.backendUrl}/api/llm-info`),
        fetch(`${config.backendUrl}/api/settings`),
      ]);

      if (!modelResponse.ok || !settingsResponse.ok) {
        throw new Error("情報の取得に失敗しました");
      }

      const modelData = await modelResponse.json();
      const settingsData = await settingsResponse.json();

      setModelInfo(modelData);
      setSettings(settingsData);
      setEditedLlmUrl(settingsData.llm.base_url);
      setEditedBackendUrl(config.backendUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSaveMessage(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedLlmUrl(settings?.llm.base_url || "");
    setSaveMessage(null);
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch(`${config.backendUrl}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm: {
            base_url: editedLlmUrl,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("設定の更新に失敗しました");
      }

      const result = await response.json();
      setSaveMessage(result.message || "設定を保存しました");
      setIsEditing(false);

      // Refresh settings
      await fetchData();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const handleEditBackendClick = () => {
    setIsEditingBackend(true);
    setBackendSaveMessage(null);
  };

  const handleCancelBackendEdit = () => {
    setIsEditingBackend(false);
    setEditedBackendUrl(config.backendUrl);
    setBackendSaveMessage(null);
  };

  const handleSaveBackendUrl = () => {
    try {
      // Save to localStorage
      localStorage.setItem("backendUrl", editedBackendUrl);
      setBackendSaveMessage("バックエンドURLを保存しました（ページをリロードしてください）");
      setIsEditingBackend(false);
    } catch (err) {
      setBackendSaveMessage(err instanceof Error ? err.message : "エラーが発生しました");
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

      {/* Header */}
      <header
        className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-b-4 border-gray-300 relative shadow-2xl"
        style={{ zIndex: 30 }}
      >
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-800 text-white flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105"
                aria-label="戻る"
              >
                <FaArrowLeft className="text-xl" />
              </button>

              <div className="w-4 h-4 bg-gray-600 rounded-full animate-pulse shadow-lg shadow-gray-600/50"></div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-black text-gray-900 leading-tight">アプリ情報</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-2 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("model")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "model"
                ? "bg-gray-700 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <FaMicrochip />
            LLMモデル
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "settings"
                ? "bg-gray-700 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <FaCog />
            アプリ設定
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <p className="font-medium">エラー</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* LLM Model Tab */}
              {activeTab === "model" && modelInfo && (
                <div className="space-y-6 animate-fade-in">
                  {/* Model Name */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border-2 border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FaServer className="text-gray-600" />
                      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        モデル名
                      </h3>
                    </div>
                    <p className="text-lg font-mono text-gray-900 break-all">
                      {modelInfo.model_name}
                    </p>
                  </div>

                  {/* Specifications */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FaMicrochip className="text-gray-700" />
                      スペック
                    </h3>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          パラメータ数
                        </p>
                        <p className="text-3xl font-bold text-gray-900">
                          {modelInfo.specs.n_params_formatted}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 font-mono">
                          {modelInfo.specs.n_params.toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          ファイルサイズ
                        </p>
                        <p className="text-3xl font-bold text-gray-900">
                          {modelInfo.specs.size_formatted}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 font-mono">
                          {modelInfo.specs.size.toLocaleString()} bytes
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          語彙サイズ
                        </p>
                        <p className="text-3xl font-bold text-gray-900">
                          {modelInfo.specs.vocab_size.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">トークン</p>
                      </div>

                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          コンテキスト長
                        </p>
                        <p className="text-3xl font-bold text-gray-900">
                          {modelInfo.specs.context_length.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">トークン</p>
                      </div>

                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          埋め込み次元
                        </p>
                        <p className="text-3xl font-bold text-gray-900">
                          {modelInfo.specs.embedding_dim.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">次元</p>
                      </div>
                    </div>
                  </div>

                  {/* Model Info */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          提供元
                        </p>
                        <p className="text-lg font-medium text-gray-900">{modelInfo.owned_by}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          作成日時
                        </p>
                        <p className="text-lg font-medium text-gray-900">
                          {new Date(modelInfo.created * 1000).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Model ID */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                      モデルID（フルパス）
                    </p>
                    <p className="text-xs font-mono text-gray-700 break-all leading-relaxed">
                      {modelInfo.model_id}
                    </p>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && settings && (
                <div className="space-y-6 animate-fade-in">
                  {/* Frontend Settings */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FaServer className="text-gray-700" />
                        フロントエンド設定
                      </h3>
                      {!isEditingBackend ? (
                        <button
                          type="button"
                          onClick={handleEditBackendClick}
                          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all flex items-center gap-2 text-sm font-semibold"
                        >
                          <FaEdit />
                          編集
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveBackendUrl}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 text-sm font-semibold"
                          >
                            <FaSave />
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelBackendEdit}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all flex items-center gap-2 text-sm font-semibold"
                          >
                            <FaTimes />
                            キャンセル
                          </button>
                        </div>
                      )}
                    </div>

                    {backendSaveMessage && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        {backendSaveMessage}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                          バックエンドURL
                        </p>
                        {isEditingBackend ? (
                          <input
                            type="text"
                            value={editedBackendUrl}
                            onChange={(e) => setEditedBackendUrl(e.target.value)}
                            className="w-full px-3 py-2 text-sm font-mono border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                            placeholder="http://localhost:8000"
                          />
                        ) : (
                          <p className="text-sm font-mono text-gray-900 break-all">
                            {config.backendUrl}
                          </p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          アプリケーション名
                        </p>
                        <p className="text-sm font-mono text-gray-900">{config.appName}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          バージョン
                        </p>
                        <p className="text-sm font-mono text-gray-900">{config.appVersion}</p>
                      </div>
                    </div>
                  </div>

                  {/* LLM Settings */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">LLMサーバー設定</h3>
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={handleEditClick}
                          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all flex items-center gap-2 text-sm font-semibold"
                        >
                          <FaEdit />
                          編集
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveSettings}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 text-sm font-semibold"
                          >
                            <FaSave />
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all flex items-center gap-2 text-sm font-semibold"
                          >
                            <FaTimes />
                            キャンセル
                          </button>
                        </div>
                      )}
                    </div>

                    {saveMessage && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        {saveMessage}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                          ベースURL
                        </p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedLlmUrl}
                            onChange={(e) => setEditedLlmUrl(e.target.value)}
                            className="w-full px-3 py-2 text-sm font-mono border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                            placeholder="http://localhost:8080/v1"
                          />
                        ) : (
                          <p className="text-sm font-mono text-gray-900">{settings.llm.base_url}</p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          モデルパス
                        </p>
                        <p className="text-xs font-mono text-gray-900 break-all leading-relaxed">
                          {settings.llm.model}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Embeddings Settings */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">埋め込みモデル設定</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          モデル
                        </p>
                        <p className="text-sm font-mono text-gray-900">{settings.embeddings.model}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          デバイス
                        </p>
                        <p className="text-sm font-mono text-gray-900">{settings.embeddings.device}</p>
                      </div>
                    </div>
                  </div>

                  {/* RAG Settings */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">RAG設定</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          Top K
                        </p>
                        <p className="text-sm font-mono text-gray-900">{settings.rag.top_k}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          類似度しきい値
                        </p>
                        <p className="text-sm font-mono text-gray-900">
                          {settings.rag.similarity_threshold}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          チャンクサイズ
                        </p>
                        <p className="text-sm font-mono text-gray-900">{settings.rag.chunk_size}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          チャンクオーバーラップ
                        </p>
                        <p className="text-sm font-mono text-gray-900">{settings.rag.chunk_overlap}</p>
                      </div>
                    </div>
                  </div>

                  {/* ChromaDB Settings */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">ChromaDB設定</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          永続化ディレクトリ
                        </p>
                        <p className="text-sm font-mono text-gray-900">
                          {settings.chromadb.persist_dir}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                          コレクション名
                        </p>
                        <p className="text-sm font-mono text-gray-900">
                          {settings.chromadb.collection_name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
