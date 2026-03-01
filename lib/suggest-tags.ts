import { JSDOM } from "jsdom";

// Common stop words to filter out
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "is", "it", "as", "be", "was", "are", "been", "from", "has",
  "have", "had", "not", "this", "that", "which", "who", "will", "can", "more",
  "when", "what", "how", "all", "if", "no", "do", "so", "up", "out", "about",
  "than", "into", "over", "just", "your", "you", "we", "our", "my", "me",
  "its", "his", "her", "he", "she", "they", "them", "their", "would", "could",
  "should", "may", "might", "must", "shall", "also", "only", "then", "after",
  "before", "new", "one", "two", "get", "got", "use", "used", "using",
  "www", "com", "org", "net", "http", "https", "html", "htm", "php", "asp",
  "best", "top", "most", "very", "like", "some", "any", "each", "every",
  "first", "last", "next", "back", "here", "there", "where", "while",
  "these", "those", "such", "other", "many", "much", "even", "still",
  "well", "way", "part", "per", "via", "etc", "see", "end", "let",
  "say", "said", "make", "made", "take", "come", "know", "think",
  "look", "want", "give", "day", "good", "year", "right", "too",
  "own", "same", "tell", "need", "home", "big", "high", "long",
  "page", "site", "web", "blog", "post", "article", "read", "click",
  "share", "follow", "sign", "free", "view", "index", "main", "amp",
]);

/** Check if a keyword is a stop word (handles multi-word meta keywords) */
function isStopWord(keyword: string): boolean {
  // Single word: direct check
  if (!keyword.includes(" ")) return STOP_WORDS.has(keyword);
  // Multi-word: stop word if ALL words are stop words
  const words = keyword.split(/\s+/);
  return words.every((w) => STOP_WORDS.has(w) || w.length <= 2);
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export async function suggestTags(
  url: string,
  userTags?: string[],
): Promise<string[]> {
  const candidates = new Map<string, number>();

  // Extract keywords from URL structure
  addUrlKeywords(url, candidates);

  // Fetch page and extract metadata keywords
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const html = await res.text();
      addMetaKeywords(html, url, candidates);
    }
  } catch {
    // If fetch fails, we still have URL-based suggestions
  }

  // Boost candidates that match user's existing tags
  if (userTags?.length) {
    const userTagSet = new Set(userTags.map((t) => t.toLowerCase()));
    for (const [tag, score] of candidates) {
      if (userTagSet.has(tag)) {
        candidates.set(tag, score + 10);
      }
    }
    // Also check if any user tag is a substring match of a candidate or vice versa
    for (const userTag of userTagSet) {
      if (!candidates.has(userTag)) {
        // Check if any candidate contains this user tag or vice versa
        for (const [candidate] of candidates) {
          if (candidate.includes(userTag) || userTag.includes(candidate)) {
            candidates.set(userTag, (candidates.get(userTag) ?? 0) + 8);
            break;
          }
        }
      }
    }
  }

  // Sort by score and return top 5
  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
}

/** Build candidates from URL alone (no fetch needed). Exported for testing. */
export function suggestTagsFromUrl(url: string): string[] {
  const candidates = new Map<string, number>();
  addUrlKeywords(url, candidates);
  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);
}

/** Build candidates from URL + raw HTML. Exported for testing. */
export function suggestTagsFromHtml(
  url: string,
  html: string,
): string[] {
  const candidates = new Map<string, number>();
  addUrlKeywords(url, candidates);
  addMetaKeywords(html, url, candidates);
  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);
}

export function addUrlKeywords(url: string, candidates: Map<string, number>) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    // Domain name (e.g., "github" from "github.com")
    const domainParts = host.split(".");
    for (const part of domainParts) {
      if (part.length > 2 && !STOP_WORDS.has(part)) {
        candidates.set(part, (candidates.get(part) ?? 0) + 3);
      }
    }

    // Path segments (e.g., "/blog/javascript-tips" → "blog", "javascript", "tips")
    const pathParts = parsed.pathname
      .split(/[/\-_.]/)
      .map((s) => s.toLowerCase().trim())
      .filter((s) => s.length > 2 && !STOP_WORDS.has(s) && !/^\d+$/.test(s));

    for (const part of pathParts) {
      candidates.set(part, (candidates.get(part) ?? 0) + 2);
    }
  } catch {
    // Invalid URL, skip
  }
}

export function addMetaKeywords(
  html: string,
  url: string,
  candidates: Map<string, number>,
) {
  try {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Meta keywords tag
    const metaKeywords = doc
      .querySelector('meta[name="keywords"]')
      ?.getAttribute("content");
    if (metaKeywords) {
      const keywords = metaKeywords
        .split(",")
        .map((k) => k.toLowerCase().trim())
        .filter((k) => k.length > 1 && k.length <= 30 && !isStopWord(k));
      for (const kw of keywords.slice(0, 10)) {
        candidates.set(kw, (candidates.get(kw) ?? 0) + 5);
      }
    }

    // OG tags (article:tag)
    const ogTags = doc.querySelectorAll('meta[property="article:tag"]');
    for (const el of ogTags) {
      const tag = el.getAttribute("content")?.toLowerCase().trim();
      if (tag && tag.length > 1 && tag.length <= 30 && !isStopWord(tag)) {
        candidates.set(tag, (candidates.get(tag) ?? 0) + 5);
      }
    }

    // Title keywords
    const title =
      doc.querySelector("title")?.textContent ??
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
      "";
    addTextKeywords(title, candidates, 2);

    // Description keywords
    const description =
      doc
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ??
      doc
        .querySelector('meta[property="og:description"]')
        ?.getAttribute("content") ??
      "";
    addTextKeywords(description, candidates, 1);
  } catch {
    // Parse error, skip
  }
}

export function addTextKeywords(
  text: string,
  candidates: Map<string, number>,
  weight: number,
) {
  if (!text) return;

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

  // Count word frequency in this text
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  // Add top words by frequency
  const topWords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  for (const [word, count] of topWords) {
    candidates.set(word, (candidates.get(word) ?? 0) + weight * count);
  }
}
