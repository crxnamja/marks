import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getBookmark, updateBookmark } from "@/lib/db";
import { extractArticle, extractViaArchive } from "@/lib/extract";
import { createClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    const bookmark = await getBookmark(id);
    if (!bookmark) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if caller wants to force archive.ph
    const body = await req.json().catch(() => ({}));
    const forceArchive = body.force_archive === true;

    const article = forceArchive
      ? await extractViaArchive(bookmark.url)
      : await extractArticle(bookmark.url);

    if (!article) {
      return NextResponse.json(
        { error: "Could not extract article content" },
        { status: 422 },
      );
    }

    // Upsert into archived_content
    const supabase = await createClient();
    const { error } = await supabase.from("archived_content").upsert(
      {
        bookmark_id: id,
        content_html: article.content_html,
        content_text: article.content_text,
        excerpt: article.excerpt,
        byline: article.byline,
        word_count: article.word_count,
        source: article.source,
      },
      { onConflict: "bookmark_id" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark bookmark as archived
    await updateBookmark(id, { is_archived: true });

    return NextResponse.json({
      ok: true,
      source: article.source,
      word_count: article.word_count,
      excerpt: article.excerpt,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
