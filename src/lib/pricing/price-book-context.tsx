import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_PRICE_BOOK,
  PRICE_BOOK_STORAGE_KEY,
  makePriceBookEntry,
  mergePriceBooks,
  parseStoredPriceBook,
  removePriceBookEntry,
  resolvePriceBook,
  serializePriceBook,
  upsertPriceBookEntry,
  type PriceBook,
  type PriceBookEntry,
} from "./price-book";
import {
  deleteAccountEntry,
  fetchAccountBook,
  saveAccountEntry,
} from "./price-book-sync";

/**
 * Where the current rates live.
 *
 * "local"    no account is in play, so the browser copy is all there is.
 * "syncing"  the account copy is being read.
 * "synced"   the account accepted the last write and the copy was merged.
 * "unsynced" an account exists but the last read or write did not land.
 */
export type PriceBookSyncState = "local" | "syncing" | "synced" | "unsynced";

export interface PriceBookValue {
  book: PriceBook;
  sync: PriceBookSyncState;
  /** Rates usable in the given currency, plus the entries that were skipped. */
  resolve: (currency: string) => ReturnType<typeof resolvePriceBook>;
  /** Returns the refusal reason when the entry is not a usable rate. */
  saveEntry: (parts: {
    slug: string;
    rate: number | string;
    currency: string;
    unit?: string;
    note?: string;
  }) => { ok: true; entry: PriceBookEntry } | { ok: false; reason: string };
  removeEntry: (slug: string) => void;
  /** Read the account copy again, e.g. after signing in or on return to the tab. */
  resync: () => void;
}

const inert: PriceBookValue = {
  book: EMPTY_PRICE_BOOK,
  sync: "local",
  resolve: (currency) => resolvePriceBook(EMPTY_PRICE_BOOK, currency),
  saveEntry: () => ({ ok: false, reason: "The price book is not available here." }),
  removeEntry: () => {},
  resync: () => {},
};

const PriceBookContext = createContext<PriceBookValue | null>(null);

function readStored(): PriceBook {
  if (typeof window === "undefined") return EMPTY_PRICE_BOOK;
  try {
    return parseStoredPriceBook(window.localStorage.getItem(PRICE_BOOK_STORAGE_KEY));
  } catch {
    // Storage can be unavailable (private mode, quota). A missing book is an
    // empty book, never a crash on a calculator page.
    return EMPTY_PRICE_BOOK;
  }
}

export function PriceBookProvider({ children }: { children: ReactNode }) {
  const [book, setBook] = useState<PriceBook>(readStored);
  const [sync, setSync] = useState<PriceBookSyncState>("local");

  // The merge must compare against the newest local state, including anything
  // typed while the account read was in flight.
  const bookRef = useRef(book);
  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRICE_BOOK_STORAGE_KEY, serializePriceBook(book));
    } catch {
      // Persistence is best effort: the session still works from memory.
    }
  }, [book]);

  const syncOnce = useCallback(async () => {
    setSync("syncing");
    const remote = await fetchAccountBook();
    if (remote.status === "unconfigured" || remote.status === "signed-out") {
      setSync("local");
      return;
    }
    if (remote.status === "failed") {
      setSync("unsynced");
      return;
    }

    const merged = mergePriceBooks(bookRef.current, {
      version: 1,
      entries: remote.entries,
    });
    setBook(merged.book);

    if (merged.toPush.length === 0) {
      setSync("synced");
      return;
    }
    const results = await Promise.all(merged.toPush.map(saveAccountEntry));
    setSync(results.every((r) => r.ok) ? "synced" : "unsynced");
  }, []);

  useEffect(() => {
    void syncOnce();
    // Returning to the tab is the cheapest moment to pick up a rate entered on
    // another device; it does not poll.
    const onFocus = () => void syncOnce();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncOnce]);

  const saveEntry = useCallback<PriceBookValue["saveEntry"]>((parts) => {
    const made = makePriceBookEntry(parts);
    if ("reason" in made) return { ok: false, reason: made.reason };
    setBook((current) => upsertPriceBookEntry(current, made.entry));
    void saveAccountEntry(made.entry).then((result) => {
      if (result.ok) setSync("synced");
      else setSync(result.reason === "not signed in" ? "local" : "unsynced");
    });
    return { ok: true, entry: made.entry };
  }, []);

  const removeEntry = useCallback((slug: string) => {
    setBook((current) => removePriceBookEntry(current, slug));
    void deleteAccountEntry(slug).then((result) => {
      if (result.ok) setSync("synced");
      else setSync(result.reason === "not signed in" ? "local" : "unsynced");
    });
  }, []);

  const value = useMemo<PriceBookValue>(
    () => ({
      book,
      sync,
      resolve: (currency) => resolvePriceBook(book, currency),
      saveEntry,
      removeEntry,
      resync: () => void syncOnce(),
    }),
    [book, sync, saveEntry, removeEntry, syncOnce],
  );

  return <PriceBookContext.Provider value={value}>{children}</PriceBookContext.Provider>;
}

/** Inert outside a provider, so every calculator keeps working unchanged. */
export function usePriceBook(): PriceBookValue {
  return useContext(PriceBookContext) ?? inert;
}
