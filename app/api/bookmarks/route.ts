import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getBookmarks, createBookmark } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);

    const result = await getBookmarks({ tag, page });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const bookmark = await createBookmark({
      url: body.url,
      title: body.title ?? "",
      description: body.description ?? "",
      tags: body.tags ?? [],
      is_read: body.is_read ?? false,
      user_id: user.id,
    });

    return NextResponse.json(bookmark, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
