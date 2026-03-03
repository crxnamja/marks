import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export type TweetEnrichment = {
  summary: string;
  action_items: { text: string }[];
  tags: string[];
};

export async function suggestBookmarkTags(
  url: string,
  title: string,
  description: string,
  existingTags: string[],
): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-20250214",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Given this bookmark, suggest 3-5 short topic tags for categorization.

URL: ${url}
Title: ${title}
Description: ${description}

Rules:
- Tags should be lowercase, 1-2 words each
- Focus on the specific topic, not generic words like "article", "blog", "website", "online", "post"
- When a tag from the user's existing list fits well, prefer it over creating a new one
- Only return tags that are genuinely relevant to this specific page

User's existing tags: [${existingTags.slice(0, 80).join(", ")}]

Return ONLY a JSON array of strings, e.g. ["tag1", "tag2", "tag3"]. No markdown fences.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const cleaned = text
    .replace(/^```json?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  const tags = JSON.parse(cleaned) as string[];
  return tags.map((t) => t.toLowerCase().trim()).filter((t) => t.length > 0);
}

export async function enrichTweet(
  tweetText: string,
  handle: string,
  existingTags: string[],
): Promise<TweetEnrichment> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-20250214",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Analyze this tweet from @${handle}:

"${tweetText}"

Return a JSON object with:
1. "summary": A single clear sentence summarizing what this tweet says. If the tweet IS already one clear sentence, just clean it up slightly.
2. "action_items": An array of actionable advice extracted from the tweet. Each item should be a concrete thing the reader could do. Return an empty array [] if there's nothing actionable (e.g. news, opinions, jokes).
3. "tags": 2-5 topic tags for categorization. Use lowercase, no #. Prefer matching from this list of existing tags when relevant: [${existingTags.slice(0, 50).join(", ")}]. Add new tags only if nothing existing fits.

Return ONLY valid JSON, no markdown fences.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Defensive parsing: strip markdown fences if present
  const cleaned = text
    .replace(/^```json?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  return JSON.parse(cleaned) as TweetEnrichment;
}
