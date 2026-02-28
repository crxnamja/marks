import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 100;

async function main() {
  const filePath = process.argv[2] ?? "./twitter-archive/data/bookmark.js";
  const userId = process.argv[3];

  if (!userId) {
    console.error(
      "Usage: npx tsx scripts/import-twitter.ts <bookmark.js file> <user-id>",
    );
    console.error("");
    console.error("How to get your Twitter archive:");
    console.error("  1. Go to Settings → Your account → Download an archive of your data");
    console.error("  2. Wait for the archive to be ready and download it");
    console.error("  3. Extract the zip — the bookmark file is at data/bookmark.js");
    console.error("");
    console.error(
      "Get your user ID from Supabase dashboard → Authentication → Users",
    );
    process.exit(1);
  }

  console.log(`Reading ${filePath}...`);
  console.log(`Importing for user: ${userId}`);

  let raw = readFileSync(filePath, "utf-8");

  // Strip the JS variable assignment prefix
  // Format: window.YTD.bookmark.part0 = [...]
  const jsonStart = raw.indexOf("[");
  if (jsonStart === -1) {
    console.error("Could not find JSON array in file. Expected format: window.YTD.bookmark.part0 = [...]");
    process.exit(1);
  }
  raw = raw.slice(jsonStart);

  type TwitterBookmark = {
    bookmark: {
      tweetId: string;
    };
  };

  const all: TwitterBookmark[] = JSON.parse(raw);
  console.log(`Total bookmarks in file: ${all.length}`);

  if (all.length === 0) {
    console.log("Nothing to import.");
    return;
  }

  // Twitter archive only has tweet IDs — we create bookmarks with tweet URLs
  // The actual tweet content will be empty (user can view it via the URL)
  const bookmarks = all.map((b) => ({
    tweetId: b.bookmark.tweetId,
    url: `https://x.com/i/status/${b.bookmark.tweetId}`,
  }));

  // Ensure the "twitter" tag exists
  const twitterTagName = "twitter";
  let { data: tagRow } = await supabase
    .from("tags")
    .select("id")
    .eq("name", twitterTagName)
    .single();

  if (!tagRow) {
    const { data: created } = await supabase
      .from("tags")
      .insert({ name: twitterTagName })
      .select("id")
      .single();
    tagRow = created;
  }

  const twitterTagId = tagRow!.id;

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
    const batch = bookmarks.slice(i, i + BATCH_SIZE);

    const rows = batch.map((b) => ({
      url: b.url,
      title: `Tweet ${b.tweetId}`,
      description: "",
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: userId,
    }));

    const { data, error } = await supabase
      .from("bookmarks")
      .upsert(rows, { onConflict: "user_id,url" })
      .select("id, url");

    if (error) {
      console.error(`Batch ${i} error:`, error);
      skipped += batch.length;
      continue;
    }

    // Tag all imported bookmarks with "twitter"
    if (data && data.length > 0) {
      const junctionRows = data.map((row) => ({
        bookmark_id: row.id,
        tag_id: twitterTagId,
      }));

      // Delete existing "twitter" tag links for these bookmarks, then re-insert
      const batchIds = data.map((r) => r.id);
      await supabase
        .from("bookmark_tags")
        .delete()
        .in("bookmark_id", batchIds)
        .eq("tag_id", twitterTagId);

      await supabase.from("bookmark_tags").insert(junctionRows);
    }

    imported += data?.length ?? 0;
    process.stdout.write(`\r  Imported ${imported} / ${bookmarks.length}`);
  }

  console.log(`\nDone! Imported: ${imported}, Skipped: ${skipped}`);
  console.log(
    "\nNote: Twitter archives only contain tweet IDs, not tweet content.",
  );
  console.log(
    "Each bookmark links to the tweet URL. Use the Chrome extension for",
  );
  console.log("future bookmarks — it captures full tweet text and hashtags.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
