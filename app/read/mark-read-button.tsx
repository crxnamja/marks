"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkReadButton({ bookmarkId }: { bookmarkId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markRead() {
    setLoading(true);
    await fetch(`/api/bookmarks/${bookmarkId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true }),
    });
    router.refresh();
  }

  return (
    <button
      className="mark-read-btn"
      onClick={markRead}
      disabled={loading}
      title="Mark as read"
    >
      {loading ? "..." : "done"}
    </button>
  );
}
