// Content script for getmarks.sh reader pages (runs in ISOLATED world)
// The MAIN world script (content-marks-main.js) sets window.__marks_extension.
// This script handles message passing since only isolated world has chrome.runtime.

// --- Messages FROM the page (React) → extension background ---
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;

  if (event.data?.type === "marks:ping-extension") {
    window.postMessage({ type: "marks:pong-extension" });
    return;
  }

  // React asks us to prepare for an archive capture
  if (event.data?.type === "marks:prepare-archive") {
    try {
      await chrome.runtime.sendMessage({
        type: "prepare-archive",
        bookmarkId: event.data.bookmarkId,
        url: event.data.url,
      });
    } catch (e) {
      console.error("[Marks] prepare-archive failed:", e);
    }
    return;
  }
});

// --- Messages FROM the background → page (React) ---
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "archive-done") {
    window.postMessage({
      type: "marks:archive-done",
      ok: msg.ok,
      error: msg.error,
    });
  }
});
