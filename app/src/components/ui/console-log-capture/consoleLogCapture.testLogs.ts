export const emitConsoleLogCaptureTestLogs = () => {
  const stamp = new Date().toISOString();
  const testErr = new Error("Simulated test error for log panel");

  console.log(`[test] plain message @ ${stamp}`);
  console.info("[api] request", { method: "GET", path: "/api/docs", ms: 87 });
  console.warn("[auth] token expiring soon", { userId: "u_123", inSeconds: 45 });
  console.error("[db] failed query", { code: "P2025", retryable: false, error: testErr });
  console.debug("[vite] hmr", { file: "/src/components/ui/console-log-capture/ConsoleLogCapturePanel.tsx" });
  console.trace("[trace] stack sample from ConsoleLogCapturePanel");
  console.table([
    { service: "search", status: "ok", ms: 41 },
    { service: "index", status: "degraded", ms: 212 },
  ]);
  console.log("[metrics] counters", { cacheHit: 31, cacheMiss: 7, ratio: 0.815 });
  console.log("[selection] ids", ["a12", "a14", "b02"]);
  console.log("[render] nested", { widget: "console-panel", options: { dense: true, monospace: true } });
  console.info("No prefix entry for untyped filter");
  console.warn("[feature-flag] toggles", { logPanel: true, debugCapture: true });
  console.error("[network] timeout", { endpoint: "/api/docs", timeoutMs: 5000 });
};
