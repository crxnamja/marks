import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createBookmark } from "@/lib/db";
import { uploadToStorage } from "@/lib/storage";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate PDF
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (50 MB max)" }, { status: 400 });
    }

    const filename = file.name || "document.pdf";
    const displayTitle = title || filename.replace(/\.pdf$/i, "");

    // Create bookmark entry
    const bookmark = await createBookmark({
      url: `pdf://upload/${encodeURIComponent(filename)}`,
      title: displayTitle,
      type: "pdf",
      type_metadata: {
        original_filename: filename,
        file_size: file.size,
        uploaded: true,
      },
      user_id: user.id,
    });

    // Upload PDF to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToStorage(
      user.id,
      bookmark.id,
      "document.pdf",
      buffer,
      "application/pdf",
      "pdf_upload",
    );

    if (!result) {
      return NextResponse.json(
        { error: "Upload failed — check storage quota" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, bookmark });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PDF upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
