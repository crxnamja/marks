import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { suggestTags } from "@/lib/suggest-tags";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    const tags = await suggestTags(url);
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
