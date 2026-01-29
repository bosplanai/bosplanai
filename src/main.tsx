import { createRoot } from "react-dom/client";
import "./index.css";

// If React fails to mount for any reason, avoid a completely blank preview.
const rootEl = document.getElementById("root");

const showFatal = (title: string, details?: unknown) => {
  if (!rootEl) return;
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const message =
    details instanceof Error
      ? `${details.name}: ${details.message}\n\n${details.stack ?? ""}`
      : typeof details === "string"
        ? details
        : JSON.stringify(details, null, 2);

  rootEl.innerHTML = `
    <div style="min-height:100vh;padding:16px;font-family:ui-sans-serif,system-ui;background:#fff;color:#111;">
      <div style="max-width:960px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <div style="font-size:18px;font-weight:700;">${title}</div>
        <div style="margin-top:6px;font-size:13px;color:#374151;">This is a client-side runtime error. The exact message is below.</div>
        <pre style="margin-top:12px;white-space:pre-wrap;word-break:break-word;background:#f3f4f6;padding:12px;border-radius:10px;font-size:12px;line-height:1.35;">${escapeHtml(
          message ?? "(no details)"
        )}</pre>
        <button onclick="location.reload()" style="margin-top:12px;height:36px;padding:0 12px;border-radius:10px;border:1px solid #111;background:#111;color:#fff;cursor:pointer;">Reload</button>
      </div>
    </div>
  `;
};

// Keep root element empty during initial load - React will render the app

// Ignore errors from browser extensions (MetaMask, etc.)
const isExtensionError = (error: unknown): boolean => {
  const errorStr = String(error);
  return (
    errorStr.includes("chrome-extension://") ||
    errorStr.includes("moz-extension://") ||
    errorStr.includes("MetaMask") ||
    errorStr.includes("ethereum")
  );
};

window.addEventListener("error", (e) => {
  if (isExtensionError(e.error) || isExtensionError(e.message)) {
    e.preventDefault();
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[WINDOW_ERROR]", e.error ?? e.message);
  showFatal("Runtime error", e.error ?? e.message);
});

window.addEventListener("unhandledrejection", (e) => {
  if (isExtensionError(e.reason)) {
    e.preventDefault();
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[UNHANDLED_REJECTION]", e.reason);
  showFatal("Unhandled promise rejection", e.reason);
});

try {
  // IMPORTANT: use dynamic import so we can still show an error overlay if App (or any
  // of its deep imports) fails to load/evaluate.
  import("./App.tsx")
    .then(({ default: App }) => {
      createRoot(rootEl!).render(<App />);
    })
    .catch(async (err) => {
      // eslint-disable-next-line no-console
      console.error("[APP_IMPORT_ERROR]", err);
      // Vite often returns a useful error page when a module fails to transform.
      // Fetch it and show the status/text so we can see the real root cause.
      try {
        const resp = await fetch("/src/App.tsx", { cache: "no-store" });
        const text = await resp.text();
        const details = `Import error: ${String(err)}\n\nHTTP ${resp.status} ${resp.statusText}\n\n${text.slice(0, 4000)}`;
        showFatal("Failed to load App module", details);
      } catch (fetchErr) {
        showFatal("Failed to load App module", `${String(err)}\n\nAlso failed to fetch module: ${String(fetchErr)}`);
      }
    });
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[REACT_MOUNT_ERROR]", err);
  showFatal("React failed to mount", err);
}
