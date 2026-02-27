-- Migration: Single-user → Multi-user with Supabase Auth
-- Run this in Supabase SQL Editor AFTER the initial schema

-- 1. Add user_id to bookmarks (references Supabase auth.users)
alter table bookmarks add column user_id uuid references auth.users(id) on delete cascade;

-- 2. Enable Row Level Security on all tables
alter table bookmarks enable row level security;
alter table tags enable row level security;
alter table bookmark_tags enable row level security;
alter table archived_content enable row level security;

-- 3. RLS policies for bookmarks — users only see their own
create policy "Users can view own bookmarks"
  on bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bookmarks"
  on bookmarks for update
  using (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on bookmarks for delete
  using (auth.uid() = user_id);

-- 4. Tags are shared globally (any user can read/create)
create policy "Anyone can read tags"
  on tags for select
  using (true);

create policy "Authenticated users can create tags"
  on tags for insert
  with check (auth.role() = 'authenticated');

-- 5. Bookmark_tags — only for your own bookmarks
create policy "Users can view own bookmark_tags"
  on bookmark_tags for select
  using (
    exists (
      select 1 from bookmarks
      where bookmarks.id = bookmark_tags.bookmark_id
      and bookmarks.user_id = auth.uid()
    )
  );

create policy "Users can insert own bookmark_tags"
  on bookmark_tags for insert
  with check (
    exists (
      select 1 from bookmarks
      where bookmarks.id = bookmark_tags.bookmark_id
      and bookmarks.user_id = auth.uid()
    )
  );

create policy "Users can delete own bookmark_tags"
  on bookmark_tags for delete
  using (
    exists (
      select 1 from bookmarks
      where bookmarks.id = bookmark_tags.bookmark_id
      and bookmarks.user_id = auth.uid()
    )
  );

-- 6. Archived content — only for your own bookmarks
create policy "Users can view own archived_content"
  on archived_content for select
  using (
    exists (
      select 1 from bookmarks
      where bookmarks.id = archived_content.bookmark_id
      and bookmarks.user_id = auth.uid()
    )
  );

create policy "Users can insert own archived_content"
  on archived_content for insert
  with check (
    exists (
      select 1 from bookmarks
      where bookmarks.id = archived_content.bookmark_id
      and bookmarks.user_id = auth.uid()
    )
  );

create policy "Users can update own archived_content"
  on archived_content for update
  using (
    exists (
      select 1 from bookmarks
      where bookmarks.id = archived_content.bookmark_id
      and bookmarks.user_id = auth.uid()
    )
  );

-- 7. Index on user_id for fast per-user queries
create index bookmarks_user_id_idx on bookmarks(user_id);
create index bookmarks_user_created_idx on bookmarks(user_id, created_at desc);

-- 8. Update the unique constraint — same URL can be bookmarked by different users
alter table bookmarks drop constraint bookmarks_url_key;
alter table bookmarks add constraint bookmarks_user_url_unique unique (user_id, url);
