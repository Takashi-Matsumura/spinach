"use client";

import { useState } from "react";
import type { HorensoTemplate, HorensoType } from "../types";
import { getAllTemplates, getTemplatesByType } from "../horenso/templates";

interface HorensoTemplateSelectorProps {
  onSelectTemplate: (template: HorensoTemplate) => void;
  onClose: () => void;
}

const typeLabels: Record<HorensoType, string> = {
  report: "報告",
  information: "連絡",
  consultation: "相談",
};

const typeColors: Record<
  HorensoType,
  { bg: string; hover: string; border: string; text: string }
> = {
  report: {
    bg: "bg-blue-50",
    hover: "hover:bg-blue-100",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  information: {
    bg: "bg-green-50",
    hover: "hover:bg-green-100",
    border: "border-green-200",
    text: "text-green-700",
  },
  consultation: {
    bg: "bg-purple-50",
    hover: "hover:bg-purple-100",
    border: "border-purple-200",
    text: "text-purple-700",
  },
};

export function HorensoTemplateSelector({
  onSelectTemplate,
  onClose,
}: HorensoTemplateSelectorProps) {
  const [selectedType, setSelectedType] = useState<HorensoType | "all">("all");

  const allTemplates = getAllTemplates();
  const displayTemplates =
    selectedType === "all" ? allTemplates : getTemplatesByType(selectedType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-800">報連相テンプレート</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Type Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200 px-6 py-3">
          <button
            type="button"
            onClick={() => setSelectedType("all")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedType === "all"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            すべて
          </button>
          {(Object.keys(typeLabels) as HorensoType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedType === type
                  ? `${typeColors[type].bg} ${typeColors[type].text} border-2 ${typeColors[type].border}`
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 180px)" }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {displayTemplates.map((template) => {
              const colors = typeColors[template.type];
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelectTemplate(template)}
                  className={`group relative rounded-lg border-2 p-4 text-left transition-all ${colors.bg} ${colors.border} ${colors.hover} hover:shadow-md`}
                >
                  {/* Template Type Badge */}
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${colors.text}`}
                    >
                      {typeLabels[template.type]}
                    </span>
                    <span className="text-3xl">{template.icon}</span>
                  </div>

                  {/* Template Name */}
                  <h3 className="mb-2 text-lg font-bold text-gray-800">
                    {template.name}
                  </h3>

                  {/* Template Description */}
                  <p className="text-sm text-gray-600">{template.description}</p>

                  {/* Fields Preview */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.fields.slice(0, 3).map((field) => (
                      <span
                        key={field.key}
                        className="rounded bg-white/70 px-2 py-1 text-xs text-gray-600"
                      >
                        {field.label}
                      </span>
                    ))}
                    {template.fields.length > 3 && (
                      <span className="rounded bg-white/70 px-2 py-1 text-xs text-gray-600">
                        +{template.fields.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Hover Indicator */}
                  <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <svg
                      className="h-6 w-6 text-gray-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>

          {displayTemplates.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              <p>テンプレートが見つかりませんでした</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
