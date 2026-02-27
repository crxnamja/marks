"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SearchResult = {
  id: number;
  url: string;
  title: string;
  headline_title: string;
  headline_description: string;
  headline_content: string | null;
  rank: number;
  source: string | null;
  tags: string[];
  created_at: string;
};

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(value.trim())}`,
      );
      const data = await res.json();
      setResults(data.results ?? []);
      setOpen(true);
      setLoading(false);
    }, 250);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="search-container" ref={containerRef}>
      <input
        type="search"
        className="search-input"
        placeholder="Search bookmarks..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {open && (
        <div className="search-dropdown">
          {loading && <p className="search-loading">Searching...</p>}
          {!loading && results.length === 0 && query.trim() && (
            <p className="search-empty">No results for &ldquo;{query}&rdquo;</p>
          )}
          {!loading &&
            results.map((r) => (
              <Link
                key={r.id}
                href={`/reader/${r.id}`}
                className="search-result"
                onClick={() => setOpen(false)}
              >
                <span
                  className="search-result-title"
                  dangerouslySetInnerHTML={{ __html: r.headline_title }}
                />
                <span className="search-result-host">
                  {new URL(r.url).hostname.replace("www.", "")}
                </span>
                {r.headline_content && (
                  <span
                    className="search-result-snippet"
                    dangerouslySetInnerHTML={{ __html: r.headline_content }}
                  />
                )}
                {r.tags.length > 0 && (
                  <span className="search-result-tags">
                    {r.tags.join(", ")}
                  </span>
                )}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
