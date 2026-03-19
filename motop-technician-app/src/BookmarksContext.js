import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "motop_tech_bookmarks_v1";
const MAX_BOOKMARKS = 40;

/** @typedef {{ id: string, workOrderNumber: string, companyName: string, quoteRfqNumber: string, savedAt: string }} BookmarkItem */

const BookmarksContext = createContext(null);

export function BookmarksProvider({ children }) {
  const [items, setItems] = useState(/** @type {BookmarkItem[]} */ ([]));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed
              .filter((x) => x && typeof x.id === "string" && x.id.trim())
              .map((x) => ({
                id: String(x.id).trim(),
                workOrderNumber: String(x.workOrderNumber || "").slice(0, 120),
                companyName: String(x.companyName || "").slice(0, 200),
                quoteRfqNumber: String(x.quoteRfqNumber || "").slice(0, 80),
                savedAt: String(x.savedAt || new Date().toISOString()),
              }));
            setItems(cleaned.slice(0, MAX_BOOKMARKS));
          }
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next) => {
    setItems(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const isBookmarked = useCallback(
    (workOrderId) => items.some((i) => i.id === workOrderId),
    [items]
  );

  /** @param {{ id: string, workOrderNumber?: string, companyName?: string, quoteRfqNumber?: string }} wo */
  const addBookmark = useCallback(
    async (wo) => {
      const id = String(wo?.id || "").trim();
      if (!id) return;
      const next = items.filter((i) => i.id !== id);
      next.unshift({
        id,
        workOrderNumber: String(wo.workOrderNumber || id).slice(0, 120),
        companyName: String(wo.companyName || "").slice(0, 200),
        quoteRfqNumber: String(wo.quoteRfqNumber || "").slice(0, 80),
        savedAt: new Date().toISOString(),
      });
      await persist(next.slice(0, MAX_BOOKMARKS));
    },
    [items, persist]
  );

  const removeBookmark = useCallback(
    async (workOrderId) => {
      const id = String(workOrderId || "").trim();
      if (!id) return;
      await persist(items.filter((i) => i.id !== id));
    },
    [items, persist]
  );

  const toggleBookmark = useCallback(
    async (wo) => {
      const id = String(wo?.id || "").trim();
      if (!id) return;
      if (isBookmarked(id)) await removeBookmark(id);
      else await addBookmark(wo);
    },
    [addBookmark, removeBookmark, isBookmarked]
  );

  const value = useMemo(
    () => ({
      bookmarksReady: ready,
      bookmarks: items,
      isBookmarked,
      addBookmark,
      removeBookmark,
      toggleBookmark,
    }),
    [ready, items, isBookmarked, addBookmark, removeBookmark, toggleBookmark]
  );

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx) {
    throw new Error("useBookmarks must be used within BookmarksProvider");
  }
  return ctx;
}
