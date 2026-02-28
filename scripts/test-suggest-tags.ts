import {
  suggestTagsFromUrl,
  suggestTagsFromHtml,
  addUrlKeywords,
  addMetaKeywords,
  addTextKeywords,
} from "../lib/suggest-tags";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function assertIncludes(arr: string[], item: string, message: string) {
  assert(arr.includes(item), `${message} — expected "${item}" in [${arr.join(", ")}]`);
}

function assertLength(arr: string[], max: number, message: string) {
  assert(arr.length <= max, `${message} — got ${arr.length}, expected <= ${max}`);
}

// ─── Test 1: URL-only suggestions ───────────────────────────────

console.log("\n1. URL-only tag extraction");

{
  const tags = suggestTagsFromUrl("https://github.com/user/react-dashboard");
  assertIncludes(tags, "github", "extracts domain name");
  assertIncludes(tags, "react", "extracts path segment 'react'");
  assertLength(tags, 3, "returns at most 3 tags");
}

{
  const tags = suggestTagsFromUrl("https://www.youtube.com/watch?v=abc123");
  assertIncludes(tags, "youtube", "strips www and extracts domain");
  assertLength(tags, 3, "returns at most 3 tags");
}

{
  const tags = suggestTagsFromUrl("https://developer.mozilla.org/en-US/docs/Web/JavaScript");
  assertIncludes(tags, "mozilla", "extracts subdomain part");
  assertIncludes(tags, "developer", "extracts subdomain 'developer'");
  assertLength(tags, 3, "returns at most 3 tags");
  // Note: "javascript" is a path segment competing with domain parts (score 3 vs 2).
  // In production, the HTML title would boost "javascript" into the top 3.
}

{
  // Verify "javascript" does appear when given the HTML context
  const html = `<html><head><title>JavaScript - MDN Web Docs</title></head><body></body></html>`;
  const tags = suggestTagsFromHtml("https://developer.mozilla.org/en-US/docs/Web/JavaScript", html);
  assertIncludes(tags, "javascript", "javascript boosted by title in full extraction");
}

{
  const tags = suggestTagsFromUrl("https://blog.example.com/2024/machine-learning-guide");
  assertIncludes(tags, "blog", "extracts subdomain");
  assertIncludes(tags, "machine", "extracts hyphenated path words");
  assertLength(tags, 3, "returns at most 3 tags");
}

// ─── Test 2: HTML meta keyword extraction ───────────────────────

console.log("\n2. HTML meta keywords extraction");

{
  const html = `
    <html>
      <head>
        <title>Introduction to TypeScript - Dev Blog</title>
        <meta name="keywords" content="typescript, programming, javascript, web development">
        <meta name="description" content="Learn the basics of TypeScript for modern web development">
      </head>
      <body></body>
    </html>
  `;
  const tags = suggestTagsFromHtml("https://example.com/blog/typescript-intro", html);
  assertIncludes(tags, "typescript", "picks up meta keyword 'typescript'");
  assertLength(tags, 3, "returns at most 3 tags");
}

{
  const html = `
    <html>
      <head>
        <title>Some Page</title>
        <meta property="article:tag" content="Rust">
        <meta property="article:tag" content="Systems Programming">
        <meta property="article:tag" content="Performance">
      </head>
      <body></body>
    </html>
  `;
  const tags = suggestTagsFromHtml("https://example.com/articles/rust-perf", html);
  assertIncludes(tags, "rust", "picks up OG article:tag");
  assertIncludes(tags, "performance", "picks up OG article:tag (lowercased)");
  assertLength(tags, 3, "returns at most 3 tags");
}

// ─── Test 3: OG title fallback ──────────────────────────────────

console.log("\n3. OG title fallback when no <title>");

{
  const html = `
    <html>
      <head>
        <meta property="og:title" content="Advanced Python Decorators Tutorial">
        <meta property="og:description" content="Deep dive into Python decorator patterns and best practices">
      </head>
      <body></body>
    </html>
  `;
  const tags = suggestTagsFromHtml("https://realpython.com/decorators", html);
  assertIncludes(tags, "python", "extracts 'python' from OG title");
  assertIncludes(tags, "decorators", "extracts 'decorators' from OG title or path");
  assertLength(tags, 3, "returns at most 3 tags");
}

// ─── Test 4: Stop words are filtered ────────────────────────────

console.log("\n4. Stop words are filtered out");

{
  const tags = suggestTagsFromUrl("https://www.com/the/and/or");
  assert(tags.length === 0, "all stop-word segments produce no tags");
}

{
  const candidates = new Map<string, number>();
  addTextKeywords("the and or but not this that", candidates, 1);
  assert(candidates.size === 0, "stop words not added from text");
}

// ─── Test 5: addUrlKeywords scoring ─────────────────────────────

console.log("\n5. Scoring: domain parts score higher than path parts");

{
  const candidates = new Map<string, number>();
  addUrlKeywords("https://python.org/blog/tutorial", candidates);
  const pythonScore = candidates.get("python") ?? 0;
  const blogScore = candidates.get("blog") ?? 0;
  const tutorialScore = candidates.get("tutorial") ?? 0;
  assert(pythonScore > blogScore, `domain "python" (${pythonScore}) scores higher than path "blog" (${blogScore})`);
  assert(pythonScore > tutorialScore, `domain "python" (${pythonScore}) scores higher than path "tutorial" (${tutorialScore})`);
}

// ─── Test 6: Meta keywords score highest ────────────────────────

console.log("\n6. Scoring: meta keywords outrank URL path segments");

{
  const candidates = new Map<string, number>();
  addUrlKeywords("https://example.com/random-path", candidates);
  addMetaKeywords(
    `<html><head><meta name="keywords" content="docker, containers"></head><body></body></html>`,
    "https://example.com/random-path",
    candidates,
  );
  const dockerScore = candidates.get("docker") ?? 0;
  const randomScore = candidates.get("random") ?? 0;
  assert(
    dockerScore > randomScore,
    `meta keyword "docker" (${dockerScore}) scores higher than path "random" (${randomScore})`,
  );
}

// ─── Test 7: addTextKeywords frequency ──────────────────────────

console.log("\n7. Text keyword frequency weighting");

{
  const candidates = new Map<string, number>();
  addTextKeywords("react react react vue angular", candidates, 1);
  const reactScore = candidates.get("react") ?? 0;
  const vueScore = candidates.get("vue") ?? 0;
  assert(
    reactScore > vueScore,
    `repeated word "react" (${reactScore}) scores higher than "vue" (${vueScore})`,
  );
}

// ─── Test 8: Numbers are filtered from paths ────────────────────

console.log("\n8. Pure numbers are filtered from paths");

{
  const tags = suggestTagsFromUrl("https://example.com/2024/01/15/article");
  assert(!tags.includes("2024"), "year '2024' is filtered");
  assert(!tags.includes("01"), "month '01' is filtered");
}

// ─── Test 9: Short segments filtered ────────────────────────────

console.log("\n9. Short segments (<=2 chars) are filtered");

{
  const tags = suggestTagsFromUrl("https://example.com/a/to/go/typescript");
  assert(!tags.includes("a"), "'a' is filtered");
  assert(!tags.includes("to"), "'to' is filtered");
  assert(!tags.includes("go"), "'go' is filtered (<=2 chars)");
  assertIncludes(tags, "typescript", "'typescript' is kept");
}

// ─── Test 10: Empty / invalid inputs ────────────────────────────

console.log("\n10. Edge cases");

{
  const tags = suggestTagsFromUrl("not-a-url");
  assert(tags.length === 0, "invalid URL returns empty array");
}

{
  const tags = suggestTagsFromHtml("https://example.com", "");
  assertIncludes(tags, "example", "empty HTML still returns URL-based tags");
}

{
  const tags = suggestTagsFromHtml("https://example.com", "<html><head></head><body></body></html>");
  assertIncludes(tags, "example", "minimal HTML returns URL-based tags");
}

// ─── Test 11: Real-world-ish scenarios ──────────────────────────

console.log("\n11. Real-world scenarios");

{
  const html = `
    <html>
      <head>
        <title>How to Build a REST API with Node.js and Express</title>
        <meta name="description" content="Step-by-step guide to creating a RESTful API using Node.js, Express framework, and MongoDB">
        <meta name="keywords" content="nodejs, express, rest api, mongodb, backend">
      </head>
      <body></body>
    </html>
  `;
  const tags = suggestTagsFromHtml("https://dev.to/johndoe/build-rest-api-nodejs", html);
  assertLength(tags, 3, "returns exactly 3 tags");
  // nodejs should be very high — it's in meta keywords + title + path
  assertIncludes(tags, "nodejs", "'nodejs' from meta keywords");
}

{
  const html = `
    <html>
      <head>
        <title>Understanding CSS Grid Layout - A Comprehensive Guide</title>
        <meta property="article:tag" content="CSS">
        <meta property="article:tag" content="Web Design">
        <meta property="article:tag" content="Frontend">
      </head>
      <body></body>
    </html>
  `;
  const tags = suggestTagsFromHtml("https://css-tricks.com/guide/grid-layout", html);
  assertIncludes(tags, "css", "'css' from article:tag");
  assertLength(tags, 3, "returns at most 3");
}

// ─── Summary ────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
