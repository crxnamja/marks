# Marks — Private Bookmark Tracker

## Tech Stack
- **Next.js 16** (App Router) + React 19 + TypeScript
- **Supabase** (Postgres + Auth + RLS)
- **CSS**: Single `globals.css` with CSS variables, dark mode via `prefers-color-scheme`

## Skills
- `/import-data` — Generate an import script for a new data source (Twitter, Chrome, Raindrop, etc.)
- `/add-api-route` — Scaffold a new API route with auth + validation
- `/test-lib` — Create a test script for a lib module
- `/deploy-stack` — Set up Supabase + Vercel + Cloudflare for deployment

## Conventions
- **API routes**: Always call `requireUser()` from `lib/auth.ts` first. Return 401 for auth errors, 400 for validation, 500 for server errors.
- **Database**: All queries go through `lib/db.ts`. Tags are global, bookmarks are per-user via RLS.
- **Tests**: Plain TypeScript scripts in `scripts/test-*.ts`, run with `npx tsx`. No test framework.
- **CSS**: All styles in `app/globals.css`. Use existing CSS variables (`--bg`, `--accent`, `--tag-bg`, etc.)
- **Components**: Server Components by default, `"use client"` only for interactive components.

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npx tsx scripts/test-suggest-tags.ts` — Run tag suggestion tests
- `npx tsx scripts/import-pinboard.ts <file> <user-id>` — Import Pinboard bookmarks
- `npx tsx scripts/import-twitter.ts <file> <user-id>` — Import Twitter archive
