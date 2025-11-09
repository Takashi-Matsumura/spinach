"use client";

import { useState } from "react";
import type {
  HorensoTemplate,
  HorensoEntry,
  ReportData,
  InformationData,
  ConsultationData,
} from "../types";

interface HorensoFormProps {
  template: HorensoTemplate;
  onSubmit: (entry: HorensoEntry, promptForAI: string) => void;
  onBack: () => void;
}

export function HorensoForm({ template, onSubmit, onBack }: HorensoFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    template.fields.forEach((field) => {
      initial[field.key] = "";
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // フィールドの値を更新
  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // エラーをクリア
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // バリデーション
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    template.fields.forEach((field) => {
      if (field.required && !formData[field.key]?.trim()) {
        newErrors[field.key] = `${field.label}は必須項目です`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // AIプロンプトを生成
  const generateAIPrompt = (): string => {
    const sections = template.fields
      .map((field) => {
        const value = formData[field.key];
        if (!value) return null;
        return `【${field.label}】\n${value}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return `以下の${template.name}について、フィードバックやアドバイスをお願いします。\n\n${sections}`;
  };

  // フォーム送信
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // HorensoEntry を作成
    const entry: HorensoEntry = {
      id: crypto.randomUUID(),
      type: template.type,
      templateId: template.id,
      createdAt: new Date().toISOString(),
      data: formData as ReportData | InformationData | ConsultationData,
    };

    // AIプロンプトを生成
    const aiPrompt = generateAIPrompt();

    onSubmit(entry, aiPrompt);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{template.icon}</span>
              <h2 className="text-2xl font-bold text-gray-800">{template.name}</h2>
            </div>
            <p className="text-sm text-gray-600">{template.description}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {template.fields.map((field) => (
              <div key={field.key}>
                <label htmlFor={field.key} className="mb-2 block font-semibold text-gray-700">
                  {field.label}
                  {field.required && <span className="ml-1 text-red-500">*</span>}
                </label>

                {field.description && (
                  <p className="mb-2 text-sm text-gray-500">{field.description}</p>
                )}

                {field.type === "textarea" ? (
                  <textarea
                    id={field.key}
                    value={formData[field.key]}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={6}
                    className={`w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none focus:ring-2 ${
                      errors[field.key]
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                    }`}
                  />
                ) : (
                  <input
                    id={field.key}
                    type={field.type === "date" ? "date" : "text"}
                    value={formData[field.key]}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={`w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none focus:ring-2 ${
                      errors[field.key]
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                    }`}
                  />
                )}

                {errors[field.key] && (
                  <p className="mt-1 text-sm text-red-500">{errors[field.key]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <p className="text-sm text-gray-500">
              入力内容はAIに送信され、フィードバックを受けることができます
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="rounded-lg bg-gray-800 px-6 py-2 font-medium text-white hover:bg-gray-900"
              >
                AIに相談する
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
