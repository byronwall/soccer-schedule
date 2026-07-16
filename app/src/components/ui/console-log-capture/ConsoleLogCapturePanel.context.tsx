import {
  createContext,
  createEffect,
  createMemo,
  useContext,
  type Accessor,
  type JSX,
} from "solid-js";
import { createStore } from "solid-js/store";
import {
  clearConsoleLogEntries,
  consoleLogCaptureEnabled,
  consoleLogCaptureMaxEntries,
  consoleLogEntries,
  setConsoleLogCaptureEnabled,
  setConsoleLogCaptureMaxEntries,
  type ConsoleCaptureEntry,
} from "./consoleLogCapture.store";
import { emitConsoleLogCaptureTestLogs } from "./consoleLogCapture.testLogs";
import {
  buildDownloadFilename,
  buildPrefixesText,
  buildSingleEntryJson,
  buildVisibleJson,
  parseBoundedInt,
} from "./consoleLogCapture.utils";

type ConsoleLogCapturePanelState = {
  copy: {
    prefixes: boolean;
    rowId: number | null;
    visible: boolean;
  };
  expandedIds: number[];
  filters: {
    prefix: string;
    samplePerPrefix: boolean;
    searchQuery: string;
  };
  limits: {
    maxKeepInput: string;
    rowLimitInput: string;
  };
};

type ConsoleLogCapturePanelActions = {
  applyMaxKeep: () => void;
  clearEntries: () => void;
  copySingleEntry: (entry: ConsoleCaptureEntry) => void;
  copyVisibleLogs: () => void;
  copyVisiblePrefixes: () => void;
  downloadVisibleLogs: () => void;
  emitTestLogs: () => void;
  normalizeRowLimitInput: () => void;
  setMaxKeepInput: (next: string) => void;
  setPrefixFilter: (next: string) => void;
  setRowLimitInput: (next: string) => void;
  setSamplePerPrefix: (next: boolean) => void;
  setSearchQuery: (next: string) => void;
  toggleCapture: () => void;
  toggleExpanded: (id: number) => void;
};

type ConsoleLogCapturePanelContextValue = {
  actions: ConsoleLogCapturePanelActions;
  captureEnabled: typeof consoleLogCaptureEnabled;
  copiedPrefixes: Accessor<boolean>;
  copiedRowId: Accessor<number | null>;
  copiedVisible: Accessor<boolean>;
  displayedEntries: Accessor<ConsoleCaptureEntry[]>;
  expandedIds: Accessor<ReadonlySet<number>>;
  prefixCounts: Accessor<Map<string, number>>;
  prefixes: Accessor<string[]>;
  rowLimit: Accessor<number>;
  state: ConsoleLogCapturePanelState;
  visiblePrefixCounts: Accessor<Array<[string, number]>>;
};

type ConsoleLogCapturePanelProviderProps = {
  children: JSX.Element;
  open: boolean;
};

const initialState: ConsoleLogCapturePanelState = {
  copy: {
    prefixes: false,
    rowId: null,
    visible: false,
  },
  expandedIds: [],
  filters: {
    prefix: "all",
    samplePerPrefix: false,
    searchQuery: "",
  },
  limits: {
    maxKeepInput: "1000",
    rowLimitInput: "200",
  },
};

const ConsoleLogCapturePanelContext = createContext<ConsoleLogCapturePanelContextValue>();

export const ConsoleLogCapturePanelProvider = (props: ConsoleLogCapturePanelProviderProps) => {
  const [state, setState] = createStore<ConsoleLogCapturePanelState>(initialState);

  const rowLimit = createMemo(() => parseBoundedInt(state.limits.rowLimitInput, 200, 1, 5_000));

  createEffect(() => {
    const next = String(consoleLogCaptureMaxEntries());
    if (state.limits.maxKeepInput !== next) setState("limits", "maxKeepInput", next);
  });

  createEffect(() => {
    if (!props.open) setState("expandedIds", []);
  });

  const prefixCounts = createMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of consoleLogEntries()) {
      const key = entry.prefix || "untyped";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  });

  const prefixes = createMemo(() => {
    const list = [...prefixCounts().keys()].filter((key) => key !== "untyped");
    list.sort((a, b) => a.localeCompare(b));
    return list;
  });

  const filteredEntries = createMemo(() => {
    const filter = state.filters.prefix;
    if (filter === "all") return consoleLogEntries();
    if (filter === "untyped") return consoleLogEntries().filter((entry) => !entry.prefix);
    return consoleLogEntries().filter((entry) => entry.prefix === filter);
  });

  createEffect(() => {
    const current = state.filters.prefix;
    const hasCurrent = current === "all" || current === "untyped" || prefixes().includes(current);
    if (!hasCurrent) setState("filters", "prefix", "all");
  });

  const visibleEntries = createMemo(() => {
    const query = state.filters.searchQuery.trim().toLowerCase();
    if (!query) return filteredEntries();
    return filteredEntries().filter((entry) => entryMatchesQuery(entry, query));
  });

  const displayedEntries = createMemo(() => {
    const list = visibleEntries();
    if (!state.filters.samplePerPrefix) return list.slice(0, rowLimit());
    return sampleEntriesPerPrefix(list, rowLimit());
  });

  const visiblePrefixCounts = createMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of displayedEntries()) {
      const key = entry.prefix ?? "untyped";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  });

  const expandedIds = createMemo<ReadonlySet<number>>(() => new Set(state.expandedIds));
  const copiedVisible = () => state.copy.visible;
  const copiedPrefixes = () => state.copy.prefixes;
  const copiedRowId = () => state.copy.rowId;

  const actions: ConsoleLogCapturePanelActions = {
    applyMaxKeep: () => {
      const next = parseBoundedInt(state.limits.maxKeepInput, consoleLogCaptureMaxEntries(), 1, 10_000);
      setConsoleLogCaptureMaxEntries(next);
      setState("limits", "maxKeepInput", String(next));
    },
    clearEntries: clearConsoleLogEntries,
    copySingleEntry: (entry) => {
      void copyText(buildSingleEntryJson(entry)).then((ok) => {
        if (!ok) return;
        setState("copy", "rowId", entry.id);
        window.setTimeout(() => {
          setState("copy", "rowId", (current) => (current === entry.id ? null : current));
        }, 1200);
      });
    },
    copyVisibleLogs: () => {
      const payload = buildVisibleJson(displayedEntries(), state.filters.prefix, state.filters.searchQuery);
      void copyText(payload).then((ok) => {
        if (!ok) return;
        setState("copy", "visible", true);
        window.setTimeout(() => setState("copy", "visible", false), 1200);
      });
    },
    copyVisiblePrefixes: () => {
      const rows = visiblePrefixCounts();
      if (rows.length === 0) return;
      void copyText(buildPrefixesText(rows, displayedEntries().length)).then((ok) => {
        if (!ok) return;
        setState("copy", "prefixes", true);
        window.setTimeout(() => setState("copy", "prefixes", false), 1200);
      });
    },
    downloadVisibleLogs: () => {
      if (typeof window === "undefined") return;
      const blob = new Blob(
        [buildVisibleJson(displayedEntries(), state.filters.prefix, state.filters.searchQuery)],
        { type: "application/json" },
      );
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = buildDownloadFilename(state.filters.prefix);
      window.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    },
    emitTestLogs: emitConsoleLogCaptureTestLogs,
    normalizeRowLimitInput: () => setState("limits", "rowLimitInput", String(rowLimit())),
    setMaxKeepInput: (next) => setState("limits", "maxKeepInput", next),
    setPrefixFilter: (next) => setState("filters", "prefix", next),
    setRowLimitInput: (next) => setState("limits", "rowLimitInput", next),
    setSamplePerPrefix: (next) => setState("filters", "samplePerPrefix", next),
    setSearchQuery: (next) => setState("filters", "searchQuery", next),
    toggleCapture: () => setConsoleLogCaptureEnabled(!consoleLogCaptureEnabled()),
    toggleExpanded: (id) => {
      const next = new Set(state.expandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setState("expandedIds", [...next]);
    },
  };

  const value: ConsoleLogCapturePanelContextValue = {
    actions,
    captureEnabled: consoleLogCaptureEnabled,
    copiedPrefixes,
    copiedRowId,
    copiedVisible,
    displayedEntries,
    expandedIds,
    prefixCounts,
    prefixes,
    rowLimit,
    state,
    visiblePrefixCounts,
  };

  return <ConsoleLogCapturePanelContext.Provider value={value}>{props.children}</ConsoleLogCapturePanelContext.Provider>;
};

export const useConsoleLogCapturePanel = () => {
  const context = useContext(ConsoleLogCapturePanelContext);
  if (!context) throw new Error("useConsoleLogCapturePanel must be used inside ConsoleLogCapturePanelProvider");
  return context;
};

const entryMatchesQuery = (entry: ConsoleCaptureEntry, query: string) => {
  const haystack = `${entry.summary}\n${entry.details}\n${entry.prefix ?? ""}\n${entry.level}`.toLowerCase();
  return haystack.includes(query);
};

const sampleEntriesPerPrefix = (entries: ConsoleCaptureEntry[], limit: number) => {
  const usedByPrefix = new Map<string, number>();
  const sampled: ConsoleCaptureEntry[] = [];
  for (const entry of entries) {
    const key = entry.prefix ?? "untyped";
    const used = usedByPrefix.get(key) ?? 0;
    if (used >= limit) continue;
    usedByPrefix.set(key, used + 1);
    sampled.push(entry);
  }
  return sampled;
};

const copyText = async (value: string) => {
  if (typeof window === "undefined") return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};
