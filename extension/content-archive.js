// Content script for archive.today / archive.ph / archive.is pages.
// Runs at document_idle — the page is fully loaded, no timing guesswork.
//
// When the Marks extension opens an archive tab to fetch a paywalled article,
// it stores a pendingArchive request in chrome.storage.local. This script
// picks it up, captures the page HTML, and sends it to the background.

(async () => {
  try {
    const { pendingArchive } = await chrome.storage.local.get("pendingArchive");
    if (!pendingArchive) return; // No pending request — normal browsing

    // --- Guard: only capture on actual snapshot pages ---
    // Cloudflare challenge pages, submission forms, search pages, and the
    // root / are NOT snapshots. Snapshot URLs look like /AbCdE (short ID)
    // or /oldest/URL, /newest/URL, /TIMESTAMP/URL — all of which will
    // eventually redirect to /AbCdE.

    const loc = document.location;

    // Still on ?run=1 submission URL — archive.today hasn't redirected yet
    if (loc.search.includes("run=1") || loc.search.includes("url=")) return;

    // Root, search, submit pages
    if (
      loc.pathname === "/" ||
      loc.pathname.startsWith("/search") ||
      loc.pathname.startsWith("/submit")
    ) return;

    // Cloudflare challenge pages
    if (
      document.querySelector(
        "#challenge-form, .challenge-running, #cf-challenge-running, .cf-turnstile"
      )
    ) return;

    // Page too small — likely error or challenge
    const html = document.documentElement.outerHTML;
    if (html.length < 5000) return;

    // --- We're on a real archive snapshot — capture it ---
    // Clear the pending request so we don't capture twice
    await chrome.storage.local.remove("pendingArchive");

    // Strip scripts/styles/links to reduce payload (Readability doesn't need them)
    const clone = document.documentElement.cloneNode(true);
    clone
      .querySelectorAll(
        'script, link[rel="stylesheet"], link[rel="preload"], link[rel="prefetch"], iframe[src*="recaptcha"], noscript'
      )
      .forEach((el) => el.remove());
    // Remove archive.today's own toolbar/header if present
    clone.querySelectorAll("#HEADER, #FOOTER, #TOOLBOX").forEach((el) => el.remove());
    // Remove style tags in head (keep inline styles on elements)
    clone.querySelectorAll("head style").forEach((el) => el.remove());

    const strippedHtml = clone.outerHTML;

    chrome.runtime.sendMessage({
      type: "archive-captured",
      html: strippedHtml,
      finalUrl: loc.href,
      bookmarkId: pendingArchive.bookmarkId,
    });
  } catch (e) {
    // If anything goes wrong, clean up so future requests aren't blocked
    await chrome.storage.local.remove("pendingArchive").catch(() => {});
    console.error("[Marks] content-archive error:", e);
  }
})();
