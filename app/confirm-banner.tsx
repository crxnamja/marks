"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function ConfirmBanner() {
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !searchParams.get("confirm")) return null;

  return (
    <div
      style={{
        background: "var(--accent, #0066cc)",
        color: "white",
        padding: "10px 16px",
        borderRadius: 6,
        fontSize: 13,
        marginBottom: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>
        Check your email for a confirmation link to verify your account.
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: "none",
          border: "none",
          color: "white",
          cursor: "pointer",
          fontSize: 18,
          padding: "0 0 0 12px",
          lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
}
