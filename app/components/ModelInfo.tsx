"use client";

import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft, FaMicrochip, FaServer } from "react-icons/fa";
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

interface ModelInfoProps {
  onBack: () => void;
}

export function ModelInfo({ onBack }: ModelInfoProps) {
  const [modelInfo, setModelInfo] = useState<ModelInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModelInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${config.backendUrl}/api/llm-info`);
      if (!response.ok) {
        throw new Error("モデル情報の取得に失敗しました");
      }
      const data = await response.json();
      setModelInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModelInfo();
  }, [fetchModelInfo]);

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
                <h1 className="text-2xl font-black text-gray-900 leading-tight">LLMモデル情報</h1>
              </div>
            </div>
          </div>
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

          {modelInfo && !isLoading && !error && (
            <div className="space-y-6">
              {/* Model Name */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border-2 border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FaServer className="text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    モデル名
                  </h3>
                </div>
                <p className="text-lg font-mono text-gray-900 break-all">{modelInfo.model_name}</p>
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
        </div>
      </div>
    </div>
  );
}
