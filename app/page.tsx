import Link from "next/link";
import { getBookmarks, getAllTags } from "@/lib/db";
import { DeleteButton } from "./delete-button";
import { SearchBar } from "./search-bar";
import { Bookmarklet } from "./bookmarklet";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; page?: string }>;
}) {
  const params = await searchParams;
  const tag = params.tag;
  const page = parseInt(params.page ?? "1", 10);

  const [{ bookmarks, total }, allTags] = await Promise.all([
    getBookmarks({ tag, page }),
    getAllTags(),
  ]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="container">
      <header>
        <h1>Marks</h1>
        <nav>
          <Link href="/">all</Link>
          <Link href="/read">read later</Link>
          <Link href="/add" className="nav-add">
            + add
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="nav-signout">
              sign out
            </button>
          </form>
        </nav>
      </header>

      <SearchBar />

      {allTags.length > 0 && (
        <div className="tag-list">
          {tag && (
            <Link href="/" className="tag">
              &times; clear
            </Link>
          )}
          {allTags.slice(0, 40).map((t) => (
            <Link
              key={t.name}
              href={`/?tag=${encodeURIComponent(t.name)}`}
              className={`tag ${tag === t.name ? "active" : ""}`}
            >
              {t.name} ({t.count})
            </Link>
          ))}
        </div>
      )}

      {bookmarks.length === 0 ? (
        <div className="empty">
          {tag ? (
            <p>
              No bookmarks tagged &ldquo;{tag}&rdquo;.{" "}
              <Link href="/">Show all</Link>
            </p>
          ) : (
            <p>No bookmarks yet.</p>
          )}
        </div>
      ) : (
        <>
          <ul className="bookmark-list">
            {bookmarks.map((b) => (
              <li key={b.id} className="bookmark-item">
                <div className="bookmark-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="favicon"
                    src={`https://www.google.com/s2/favicons?sz=32&domain=${new URL(b.url).hostname}`}
                    alt=""
                    width={16}
                    height={16}
                    loading="lazy"
                  />
                  <div className="bookmark-content">
                    <a
                      href={b.url}
                      className="bookmark-title"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {b.title || b.url}
                    </a>
                    <span className="bookmark-url">
                      {new URL(b.url).hostname.replace("www.", "")}
                    </span>
                    <div className="bookmark-meta">
                      <span className="date">
                        {new Date(b.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year:
                            new Date(b.created_at).getFullYear() !==
                            new Date().getFullYear()
                              ? "numeric"
                              : undefined,
                        })}
                      </span>
                      {b.tags.length > 0 && (
                        <div className="tags">
                          {b.tags.map((t) => (
                            <Link
                              key={t}
                              href={`/?tag=${encodeURIComponent(t)}`}
                              className="tag"
                            >
                              {t}
                            </Link>
                          ))}
                        </div>
                      )}
                      <Link href={`/reader/${b.id}`} className="read-link">
                        read
                      </Link>
                      <DeleteButton bookmarkId={b.id} />
                    </div>
                    {b.description && (
                      <p className="bookmark-description">{b.description}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="pagination">
              {page > 1 && (
                <Link
                  href={`/?${new URLSearchParams({
                    ...(tag ? { tag } : {}),
                    page: String(page - 1),
                  })}`}
                >
                  &larr; prev
                </Link>
              )}
              <span className="date">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/?${new URLSearchParams({
                    ...(tag ? { tag } : {}),
                    page: String(page + 1),
                  })}`}
                >
                  next &rarr;
                </Link>
              )}
            </div>
          )}
        </>
      )}

      <Bookmarklet />
    </div>
  );
}
