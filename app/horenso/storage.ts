import type { HorensoEntry } from "../types";

const HORENSO_ENTRIES_KEY = "horenso-entries";

/**
 * すべての報連相エントリを取得
 */
export function getAllEntries(): HorensoEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(HORENSO_ENTRIES_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as HorensoEntry[];
  } catch (error) {
    console.error("Failed to load horenso entries:", error);
    return [];
  }
}

/**
 * 報連相エントリを保存
 */
export function saveEntry(entry: HorensoEntry): void {
  if (typeof window === "undefined") return;

  try {
    const entries = getAllEntries();
    entries.unshift(entry); // 新しいエントリを先頭に追加
    localStorage.setItem(HORENSO_ENTRIES_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Failed to save horenso entry:", error);
  }
}

/**
 * 報連相エントリを更新
 */
export function updateEntry(entry: HorensoEntry): void {
  if (typeof window === "undefined") return;

  try {
    const entries = getAllEntries();
    const index = entries.findIndex((e) => e.id === entry.id);
    if (index !== -1) {
      entries[index] = entry;
      localStorage.setItem(HORENSO_ENTRIES_KEY, JSON.stringify(entries));
    }
  } catch (error) {
    console.error("Failed to update horenso entry:", error);
  }
}

/**
 * 報連相エントリを削除
 */
export function deleteEntry(id: string): void {
  if (typeof window === "undefined") return;

  try {
    const entries = getAllEntries();
    const filtered = entries.filter((e) => e.id !== id);
    localStorage.setItem(HORENSO_ENTRIES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete horenso entry:", error);
  }
}

/**
 * IDで報連相エントリを取得
 */
export function getEntryById(id: string): HorensoEntry | undefined {
  return getAllEntries().find((e) => e.id === id);
}

/**
 * タイプ別に報連相エントリを取得
 */
export function getEntriesByType(type: string): HorensoEntry[] {
  return getAllEntries().filter((e) => e.type === type);
}

/**
 * チャットセッションIDに関連する報連相エントリを取得
 */
export function getEntriesBySession(sessionId: string): HorensoEntry[] {
  return getAllEntries().filter((e) => e.chatSessionId === sessionId);
}

/**
 * 日付範囲で報連相エントリを取得
 */
export function getEntriesByDateRange(startDate: Date, endDate: Date): HorensoEntry[] {
  return getAllEntries().filter((e) => {
    const entryDate = new Date(e.createdAt);
    return entryDate >= startDate && entryDate <= endDate;
  });
}

/**
 * すべての報連相エントリをクリア
 */
export function clearAllEntries(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(HORENSO_ENTRIES_KEY);
  } catch (error) {
    console.error("Failed to clear horenso entries:", error);
  }
}
