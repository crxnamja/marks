"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArchiveActions({
  bookmarkId,
  isArchived,
  source,
}: {
  bookmarkId: number;
  isArchived: boolean;
  source?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function archive(forceArchive = false) {
    setLoading(true);
    setStatus(forceArchive ? "Fetching via archive.ph..." : "Extracting...");

    const res = await fetch(`/api/bookmarks/${bookmarkId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force_archive: forceArchive }),
    });

    if (res.ok) {
      setStatus("");
      router.refresh();
    } else {
      const data = await res.json();
      setStatus(data.error ?? "Failed");
      setLoading(false);
    }
  }

  if (loading) {
    return <span className="archive-status">{status}</span>;
  }

  return (
    <>
      {!isArchived && (
        <button className="reader-action-btn" onClick={() => archive(false)}>
          archive
        </button>
      )}
      {isArchived && source !== "archive.ph" && (
        <button className="reader-action-btn" onClick={() => archive(true)}>
          try archive.ph
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
