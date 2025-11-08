import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types";
import { MermaidDiagram } from "./MermaidDiagram";

interface ChatMessageProps {
  message: Message;
  onRepeat?: () => void;
  showRepeat?: boolean;
}

export function ChatMessage({ message, onRepeat, showRepeat }: ChatMessageProps) {
  return (
    <div
      data-message-id={message.id}
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} gap-3 animate-fade-in`}
    >
      <div
        className={`max-w-[85%] px-6 py-4 rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl ${
          message.role === "user"
            ? "bg-gradient-to-br from-gray-700 to-gray-800 text-white border-2 border-gray-600"
            : "bg-white/95 backdrop-blur-sm text-gray-900 border-2 border-white/50"
        }`}
      >
        {message.role === "user" ? (
          <p className="text-xl whitespace-pre-wrap break-words font-bold leading-relaxed">
            {message.content}
          </p>
        ) : (
          <div className="text-lg prose prose-lg max-w-none prose-p:my-3 prose-ul:my-3 prose-li:my-1 prose-strong:font-bold prose-strong:text-gray-900 prose-headings:text-gray-900 prose-headings:font-bold prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-white leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : "";
                  const codeContent = String(children).replace(/\n$/, "");
                  const inline = !className;

                  // Mermaidコードブロックの場合
                  if (language === "mermaid") {
                    return <MermaidDiagram chart={codeContent} />;
                  }

                  // 通常のコードブロック
                  if (!inline && match) {
                    return (
                      <pre className={className}>
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  }

                  // インラインコード
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {showRepeat && message.role === "assistant" && message.content && (
        <button
          type="button"
          onClick={onRepeat}
          className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 hover:scale-110 transition-all duration-300 flex items-center justify-center self-end shadow-2xl border-2 border-white/50"
          aria-label="音声読み上げ"
          title="音声読み上げ"
        >
          <svg
            className="w-7 h-7"
            fill="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="音声読み上げアイコン"
          >
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
            <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function LoadingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-white/95 backdrop-blur-sm px-7 py-5 rounded-2xl shadow-2xl border-2 border-white/50">
        <div className="flex space-x-3">
          <div
            className="w-4 h-4 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full animate-bounce shadow-lg"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-4 h-4 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full animate-bounce shadow-lg"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-4 h-4 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full animate-bounce shadow-lg"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>
    </div>
  );
}
