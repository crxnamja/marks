"use client";

export function Bookmarklet() {
  // Build the bookmarklet JS — same pattern as Pinboard's
  // Uses window.location.origin at drag-time, but we embed the current origin
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  const bookmarkletCode = `javascript:void(open('${origin}/add?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title)+'&description='+encodeURIComponent(document.getSelection?.()??''),'Marks','toolbar=no,width=600,height=500'))`;

  return (
    <div className="bookmarklet-section">
      <p className="bookmarklet-label">
        Drag this to your bookmark bar &rarr;{" "}
        <a
          className="bookmarklet-link"
          href={bookmarkletCode}
          onClick={(e) => e.preventDefault()}
          title="Drag this to your bookmark bar"
        >
          + Mark
        </a>
      </p>
    </div>
  );
}
