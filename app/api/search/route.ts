import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_bookmarks", {
      search_query: q,
      user_uuid: user.id,
      result_limit: 50,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch tags for each result
    const ids = (data ?? []).map((r: { id: number }) => r.id);
    let tagMap = new Map<number, string[]>();

    if (ids.length > 0) {
      const { data: junctions } = await supabase
        .from("bookmark_tags")
        .select("bookmark_id, tag_id")
        .in("bookmark_id", ids);

      if (junctions && junctions.length > 0) {
        const tagIds = [...new Set(junctions.map((j) => j.tag_id))];
        const { data: tags } = await supabase
          .from("tags")
          .select("id, name")
          .in("id", tagIds);

        const tagNameMap = new Map(tags?.map((t) => [t.id, t.name]) ?? []);

        for (const j of junctions) {
          const name = tagNameMap.get(j.tag_id);
          if (!name) continue;
          const arr = tagMap.get(j.bookmark_id) ?? [];
          arr.push(name);
          tagMap.set(j.bookmark_id, arr);
        }
      }
    }

    const results = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      tags: tagMap.get(r.id as number) ?? [],
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
