"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function DeleteButton({ bookmarkId }: { bookmarkId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    await fetch(`/api/bookmarks/${bookmarkId}`, { method: "DELETE" });
    router.refresh();
  }

  if (deleting) return null;

  return (
    <button
      className={`delete-btn ${confirming ? "delete-confirm" : ""}`}
      onClick={handleClick}
      title={confirming ? "Click again to delete" : "Remove"}
    >
      {confirming ? "remove?" : "\u00d7"}
    </button>
  );
}
