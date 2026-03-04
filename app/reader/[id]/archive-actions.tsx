"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: Window & { __marks_extension?: boolean };

export function ArchiveActions({
  bookmarkId,
  bookmarkUrl,
  isArchived,
  source,
}: {
  bookmarkId: number;
  bookmarkUrl: string;
  isArchived: boolean;
  source?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(!isArchived);
  const [status, setStatus] = useState(!isArchived ? "Extracting…" : "");
  const [error, setError] = useState("");
  const autoTriggered = useRef(false);

  useEffect(() => {
    if (!isArchived && !autoTriggered.current) {
      autoTriggered.current = true;
      archive(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function hasExtension(): boolean {
    return window.__marks_extension === true;
  }

  /** Wait for the extension to signal archive capture is done */
  function waitForArchiveDone(): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      const timeout = setTimeout(
        () => resolve({ ok: false, error: "Timed out — try refreshing the page" }),
        90000,
      );

      function onDone(event: MessageEvent) {
        if (event.data?.type !== "marks:archive-done") return;
        window.removeEventListener("message", onDone);
        clearTimeout(timeout);
        resolve({ ok: event.data.ok, error: event.data.error });
      }

      window.addEventListener("message", onDone);
    });
  }

  async function archive(forceArchive = false) {
    setLoading(true);
    setError("");

    try {
      // "try web archive" with extension installed
      if (forceArchive && hasExtension()) {
        // 1. Open archive.today FIRST — must be synchronous with click to avoid popup blocker
        setStatus("Opening archive.today…");
        window.open(
          `https://archive.today/?run=1&url=${encodeURIComponent(bookmarkUrl)}`,
          "_blank",
        );

        // 2. Tell extension to prepare (stores bookmarkId + readerTabId)
        window.postMessage({
          type: "marks:prepare-archive",
          bookmarkId,
          url: bookmarkUrl,
        });

        // 3. Wait for extension to capture, send to server, and notify us
        setStatus("Capturing from archive.today…");
        const result = await waitForArchiveDone();

        setStatus("");
        setLoading(false);
        if (result.ok) {
          router.refresh();
        } else {
          setError(result.error ?? "Could not capture from archive.today");
        }
        return;
      }

      // Server-side extraction path
      setStatus(forceArchive ? "Trying web archives…" : "Extracting…");

      const res = await fetch(`/api/bookmarks/${bookmarkId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_archive: forceArchive }),
      });

      if (res.ok) {
        setStatus("");
        setLoading(false);
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to extract");
      setStatus("");
      setLoading(false);
    } catch {
      setError("Network error");
      setStatus("");
      setLoading(false);
    }
  }

  if (loading) {
    return <span className="archive-status">{status}</span>;
  }

  return (
    <>
      {error && <span className="archive-error">{error}</span>}
      {!isArchived && (
        <button className="reader-action-btn" onClick={() => archive(false)}>
          archive
        </button>
      )}
      {isArchived && source === "readability" && (
        <button className="reader-action-btn" onClick={() => archive(true)}>
          try web archive
        </button>
      )}
      {isArchived && (
        <button className="reader-action-btn" onClick={() => archive(false)}>
          re-extract
        </button>
      )}
    </>
  );
}
