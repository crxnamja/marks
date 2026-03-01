import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAllTags } from "@/lib/db";
import { suggestTags } from "@/lib/suggest-tags";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Fetch user's existing tags to boost relevant matches
    const existingTags = await getAllTags();
    const tagNames = existingTags.map((t) => t.name);

    const tags = await suggestTags(url, tagNames);
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
