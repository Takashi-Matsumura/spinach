"use client";

import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
}

let isInitialized = false;

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    // Mermaidを初期化（一度だけ）
    if (!isInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "sans-serif",
        logLevel: "error",
      });
      isInitialized = true;
    }

    if (ref.current && chart) {
      const renderChart = async () => {
        try {
          setError(null);

          // チャートをクリーンアップ（余分な空白を削除）
          let cleanedChart = chart.trim();

          // Mermaid構文の修正: subgraphのラベルを引用符で囲む
          cleanedChart = cleanedChart.replace(/subgraph\s+([^"\n][^\n]*)/g, (match, label) => {
            const trimmedLabel = label.trim();
            // すでに引用符で囲まれている場合はスキップ
            if (trimmedLabel.startsWith('"') || trimmedLabel.startsWith("'")) {
              return match;
            }
            // ラベルを引用符で囲む
            return `subgraph "${trimmedLabel}"`;
          });

          console.log("Original Mermaid chart:", chart);
          console.log("Cleaned Mermaid chart:", cleanedChart);

          // ユニークなIDを生成
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Mermaidで図を生成
          const { svg } = await mermaid.render(id, cleanedChart);

          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (error: unknown) {
          console.error("Mermaid rendering error:", error);
          console.error("Failed chart source:", chart);
          setError(error instanceof Error ? error.message : "図の生成に失敗しました");
        }
      };

      renderChart();
    }
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="text-sm text-red-600 mb-2">
          <div className="font-semibold mb-1">⚠️ Mermaid図の生成エラー</div>
          <div className="text-xs mb-3">{error}</div>
        </div>
        <button
          onClick={() => setShowSource(!showSource)}
          className="text-xs text-red-700 hover:text-red-900 underline mb-2"
        >
          {showSource ? "ソースを非表示" : "ソースを表示"}
        </button>
        {showSource && (
          <pre className="mt-2 p-3 bg-gray-800 text-white text-xs rounded overflow-x-auto">
            <code>{chart}</code>
          </pre>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="mermaid-diagram my-4 p-4 bg-gray-50 rounded-lg overflow-auto border border-gray-200"
      style={{ maxWidth: "100%" }}
    />
  );
}
