"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaChartBar,
  FaCheckCircle,
  FaClock,
  FaList,
  FaSearch,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import type { Message } from "../types";

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

type ViewMode = "calendar" | "list" | "stats";

interface DailyReportDashboardProps {
  onBack?: () => void;
}

export function DailyReportDashboard({ onBack }: DailyReportDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [users, setUsers] = useState<DailyReportUser[]>([]);
  const [reports, setReports] = useState<SavedDailyReport[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedReport, setSelectedReport] = useState<SavedDailyReport | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  // ユーザー一覧を読み込む
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/daily-report-users");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
      }
    };
    loadUsers();
  }, []);

  // 日報を読み込む
  useEffect(() => {
    const loadReports = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedUserId) {
          params.append("userId", selectedUserId);
        }
        const response = await fetch(`/api/daily-reports?${params}`);
        if (response.ok) {
          const data = await response.json();
          setReports(data);
        }
      } catch (error) {
        console.error("Failed to load reports:", error);
      }
    };
    loadReports();
  }, [selectedUserId]);

  // 選択した月の日報をフィルタ
  const filterReportsByMonth = useCallback(
    (reportsToFilter: SavedDailyReport[]) => {
      return reportsToFilter.filter((report) => {
        return report.reportDate.startsWith(selectedMonth);
      });
    },
    [selectedMonth]
  );

  // カレンダービューの日報データを取得
  const getCalendarData = useCallback(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const monthReports = filterReportsByMonth(reports);

    const calendarDays: Array<{
      day: number | null;
      date: string | null;
      hasReport: boolean;
      isCompleted: boolean;
      report?: SavedDailyReport;
    }> = [];

    // 前月の空白
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push({ day: null, date: null, hasReport: false, isCompleted: false });
    }

    // 当月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const report = monthReports.find((r) => r.reportDate === dateStr);
      calendarDays.push({
        day,
        date: dateStr,
        hasReport: !!report,
        isCompleted: !!report?.extractedData,
        report,
      });
    }

    return calendarDays;
  }, [selectedMonth, reports, filterReportsByMonth]);

  // 統計データを計算
  const getStatistics = useCallback(() => {
    const monthReports = filterReportsByMonth(reports);
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const submittedCount = monthReports.filter((r) => r.extractedData).length;
    const draftCount = monthReports.filter((r) => !r.extractedData).length;
    const submissionRate = daysInMonth > 0 ? (submittedCount / daysInMonth) * 100 : 0;

    // キーワード分析
    const keywords: Record<string, number> = {};
    monthReports.forEach((report) => {
      if (report.extractedData) {
        Object.values(report.extractedData).forEach((value) => {
          const words = value.split(/\s+/);
          words.forEach((word) => {
            if (word.length > 2) {
              keywords[word] = (keywords[word] || 0) + 1;
            }
          });
        });
      }
    });

    const topKeywords = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      totalReports: monthReports.length,
      submittedCount,
      draftCount,
      submissionRate,
      daysInMonth,
      topKeywords,
    };
  }, [reports, selectedMonth, filterReportsByMonth]);

  // リストビューの日報をフィルタ
  const getFilteredReports = useCallback(() => {
    let filtered = filterReportsByMonth(reports);

    if (searchKeyword) {
      filtered = filtered.filter((report) => {
        const searchTarget = JSON.stringify(report.extractedData || {}).toLowerCase();
        return searchTarget.includes(searchKeyword.toLowerCase());
      });
    }

    return filtered.sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  }, [reports, searchKeyword, filterReportsByMonth]);

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const stats = getStatistics();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">日報ダッシュボード</h1>
                  {selectedUser && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      {selectedUser.name}（{selectedUser.department}）
                    </p>
                  )}
                </div>
              </div>

              {/* フィルタ */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg">
                  <FaUser className="text-gray-500 text-sm" />
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="bg-transparent text-sm text-gray-700 focus:outline-none"
                  >
                    <option value="">全社員</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}（{user.department}）
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg">
                  <FaCalendarAlt className="text-gray-500 text-sm" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-sm text-gray-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 統計サマリー - 横並び */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-1">総日報数</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalReports}</p>
              </div>
              <div className="flex-1 bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FaCheckCircle className="text-green-600 text-sm" />
                  <p className="text-sm text-green-800 font-medium">提出済み</p>
                </div>
                <p className="text-3xl font-bold text-green-900">{stats.submittedCount}</p>
              </div>
              <div className="flex-1 bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FaClock className="text-amber-600 text-sm" />
                  <p className="text-sm text-amber-800 font-medium">下書き</p>
                </div>
                <p className="text-3xl font-bold text-amber-900">{stats.draftCount}</p>
              </div>
              <div className="flex-1 bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4">
                <p className="text-sm text-purple-800 font-medium mb-1">提出率</p>
                <p className="text-3xl font-bold text-purple-900">
                  {stats.submissionRate.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* ビューモード切り替え */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "calendar"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FaCalendarAlt />
                カレンダー
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FaList />
                一覧
              </button>
              <button
                type="button"
                onClick={() => setViewMode("stats")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "stats"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FaChartBar />
                統計
              </button>
            </div>
          </div>
        </header>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* カレンダービュー */}
          {viewMode === "calendar" && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                {/* 曜日ヘッダー */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
                    <div
                      key={day}
                      className={`text-center text-sm font-semibold py-2 ${
                        index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-gray-700"
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* カレンダーグリッド */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  {getCalendarData().map((dayData, index) => (
                    <div
                      key={index}
                      style={{ aspectRatio: '1 / 1' }}
                      className={`rounded-lg transition-all ${
                        dayData.day
                          ? dayData.hasReport
                            ? dayData.isCompleted
                              ? "bg-green-50 border-2 border-green-500 cursor-pointer hover:bg-green-100"
                              : "bg-amber-50 border-2 border-amber-500 cursor-pointer hover:bg-amber-100"
                            : "bg-white border border-gray-200 hover:bg-gray-50"
                          : "bg-gray-50 border border-transparent"
                      }`}
                      onClick={() => dayData.report && setSelectedReport(dayData.report)}
                    >
                      {dayData.day && (
                        <div className="flex flex-col h-full p-2">
                          <div
                            className={`text-sm font-medium ${
                              dayData.hasReport
                                ? dayData.isCompleted
                                  ? "text-green-700"
                                  : "text-amber-700"
                                : "text-gray-600"
                            }`}
                          >
                            {dayData.day}
                          </div>
                          {dayData.hasReport && (
                            <div className="flex-1 flex items-center justify-center">
                              {dayData.isCompleted ? (
                                <FaCheckCircle className="text-green-600 text-lg" />
                              ) : (
                                <FaClock className="text-amber-600 text-lg" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* リストビュー */}
          {viewMode === "list" && (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* 検索バー */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FaSearch className="text-gray-400" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="キーワードで検索..."
                    className="flex-1 bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* 日報リスト */}
              <div className="space-y-3">
                {getFilteredReports().length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-500">日報が見つかりませんでした</p>
                  </div>
                ) : (
                  getFilteredReports().map((report) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {report.extractedData ? (
                          <FaCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
                        ) : (
                          <FaClock className="text-amber-600 mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{report.reportDate}</p>
                            <p className="text-sm text-gray-600">
                              {report.userName}（{report.userDepartment}）
                            </p>
                          </div>
                          {report.extractedData && (
                            <div className="text-sm text-gray-600 line-clamp-2 mt-2">
                              {Object.entries(report.extractedData)
                                .slice(0, 2)
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span> {value}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 統計ビュー */}
          {viewMode === "stats" && (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">頻出キーワード TOP 10</h3>
                {stats.topKeywords.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topKeywords.map(([keyword, count], index) => (
                      <div key={keyword} className="flex items-center gap-4">
                        {/* 順位 */}
                        <div className="w-10 text-center">
                          <span className={`text-lg font-bold ${
                            index === 0 ? "text-yellow-600" :
                            index === 1 ? "text-gray-400" :
                            index === 2 ? "text-orange-600" :
                            "text-gray-500"
                          }`}>
                            {index + 1}
                          </span>
                        </div>

                        {/* キーワード */}
                        <div className="w-32">
                          <span className="text-base font-semibold text-gray-900">{keyword}</span>
                        </div>

                        {/* バー */}
                        <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500"
                            style={{
                              width: `${Math.max(15, (count / (stats.topKeywords[0]?.[1] || 1)) * 100)}%`,
                            }}
                          />
                        </div>

                        {/* 回数 */}
                        <div className="w-20 text-right">
                          <span className="text-lg font-bold text-gray-900">{count}</span>
                          <span className="text-sm text-gray-500 ml-1">回</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-base">データがまだありません</p>
                    <p className="text-sm text-gray-400 mt-2">日報が提出されるとキーワード分析が表示されます</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedReport && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedReport(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* モーダルヘッダー */}
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedReport.reportDate}
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {selectedReport.userName}（{selectedReport.userDepartment}）
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              {/* モーダルコンテンツ */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedReport.extractedData ? (
                  <div className="space-y-4">
                    {Object.entries(selectedReport.extractedData).map(([key, value]) => (
                      <div key={key} className="border border-gray-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                          {key}
                        </p>
                        <p className="text-gray-900 whitespace-pre-wrap">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FaClock className="text-amber-500 text-3xl mx-auto mb-3" />
                    <p className="text-gray-700 font-medium">この日報はまだ提出されていません</p>
                    <p className="text-sm text-gray-500 mt-1">（下書き状態）</p>
                  </div>
                )}

                {/* 会話履歴 */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">会話履歴</h3>
                  <div className="space-y-3">
                    {selectedReport.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg border ${
                          msg.role === "user"
                            ? "bg-blue-50 border-blue-200 ml-8"
                            : "bg-gray-50 border-gray-200 mr-8"
                        }`}
                      >
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          {msg.role === "user" ? "社員" : "AI"}
                        </p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
