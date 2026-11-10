import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_PRICE_BOOK,
  PRICE_BOOK_STORAGE_KEY,
  makePriceBookEntry,
  parseStoredPriceBook,
  removePriceBookEntry,
  resolvePriceBook,
  serializePriceBook,
  upsertPriceBookEntry,
  type PriceBook,
  type PriceBookEntry,
} from "./price-book";

export interface PriceBookValue {
  book: PriceBook;
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
}

const inert: PriceBookValue = {
  book: EMPTY_PRICE_BOOK,
  resolve: (currency) => resolvePriceBook(EMPTY_PRICE_BOOK, currency),
  saveEntry: () => ({ ok: false, reason: "The price book is not available here." }),
  removeEntry: () => {},
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

  useEffect(() => {
    try {
      window.localStorage.setItem(PRICE_BOOK_STORAGE_KEY, serializePriceBook(book));
    } catch {
      // Persistence is best effort: the session still works from memory.
    }
  }, [book]);

  const saveEntry = useCallback<PriceBookValue["saveEntry"]>((parts) => {
    const made = makePriceBookEntry(parts);
    if ("reason" in made) return { ok: false, reason: made.reason };
    setBook((current) => upsertPriceBookEntry(current, made.entry));
    return { ok: true, entry: made.entry };
  }, []);

  const removeEntry = useCallback((slug: string) => {
    setBook((current) => removePriceBookEntry(current, slug));
  }, []);

  const value = useMemo<PriceBookValue>(
    () => ({
      book,
      resolve: (currency) => resolvePriceBook(book, currency),
      saveEntry,
      removeEntry,
    }),
    [book, saveEntry, removeEntry],
  );

  return <PriceBookContext.Provider value={value}>{children}</PriceBookContext.Provider>;
}

/** Inert outside a provider, so every calculator keeps working unchanged. */
export function usePriceBook(): PriceBookValue {
  return useContext(PriceBookContext) ?? inert;
}
