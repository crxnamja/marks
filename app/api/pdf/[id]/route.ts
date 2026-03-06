import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { getSignedUrl } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    const supabase = await createClient();
    const { data: media } = await supabase
      .from("stored_media")
      .select("storage_path")
      .eq("bookmark_id", id)
      .eq("media_type", "pdf_upload")
      .single();

    if (!media) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const signedUrl = await getSignedUrl(media.storage_path);
    if (!signedUrl) {
      return NextResponse.json({ error: "Could not generate URL" }, { status: 500 });
    }

    return NextResponse.redirect(signedUrl);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to serve PDF" }, { status: 500 });
  }
}
