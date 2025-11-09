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

// 報連相（ほうれんそう）Types
export type HorensoType = "report" | "information" | "consultation";

// 報告データ
export interface ReportData {
  subject: string; // 件名
  progress: string; // 進捗状況
  achievements: string; // 成果
  issues: string; // 課題・問題
  nextActions: string; // 次のアクション
}

// 連絡データ
export interface InformationData {
  subject: string; // 件名
  content: string; // 連絡事項
  targets: string; // 対象者
  deadline?: string; // 期限（任意）
}

// 相談データ
export interface ConsultationData {
  subject: string; // 件名
  content: string; // 相談内容
  background: string; // 背景
  considerations: string; // 検討したこと
  requestedAdvice: string; // 求めるアドバイス
}

// テンプレート定義
export interface HorensoTemplate {
  id: string;
  type: HorensoType;
  name: string;
  description: string;
  icon: string;
  fields: TemplateField[];
  systemPrompt: string; // AIに渡すシステムプロンプト
}

// テンプレートフィールド定義
export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date";
  required: boolean;
  placeholder?: string;
  description?: string;
}

// 報連相エントリ
export interface HorensoEntry {
  id: string;
  type: HorensoType;
  templateId: string;
  createdAt: string;
  data: ReportData | InformationData | ConsultationData;
  tags?: string[];
  relatedDocuments?: string[];
  chatSessionId?: string; // 関連するチャットセッション
}
