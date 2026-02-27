-- Migration: Search function for full-text search
-- Run this in Supabase SQL Editor

create or replace function search_bookmarks(
  search_query text,
  user_uuid uuid,
  result_limit int default 50
)
returns table (
  id bigint,
  url text,
  title text,
  description text,
  is_read boolean,
  is_archived boolean,
  created_at timestamptz,
  headline_title text,
  headline_description text,
  headline_content text,
  rank real,
  source text
)
language sql stable
as $$
  with query as (
    select websearch_to_tsquery('english', search_query) as q
  ),
  -- Tier 1: search bookmark title/description/url
  bookmark_hits as (
    select
      b.id,
      b.url,
      b.title,
      b.description,
      b.is_read,
      b.is_archived,
      b.created_at,
      ts_headline('english', b.title, q.q, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=1') as headline_title,
      ts_headline('english', b.description, q.q, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=1') as headline_description,
      null::text as headline_content,
      ts_rank(b.fts, q.q) as rank,
      null::text as source
    from bookmarks b, query q
    where b.user_id = user_uuid
      and b.fts @@ q.q
  ),
  -- Tier 2: search archived article content
  content_hits as (
    select
      b.id,
      b.url,
      b.title,
      b.description,
      b.is_read,
      b.is_archived,
      b.created_at,
      b.title as headline_title,
      b.description as headline_description,
      ts_headline('english', ac.content_text, q.q, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=30, MinWords=15') as headline_content,
      ts_rank(ac.fts, q.q) * 0.8 as rank,
      ac.source
    from archived_content ac
    join bookmarks b on b.id = ac.bookmark_id
    cross join query q
    where b.user_id = user_uuid
      and ac.fts @@ q.q
      and b.id not in (select bh.id from bookmark_hits bh)
  )
  select * from bookmark_hits
  union all
  select * from content_hits
  order by rank desc
  limit result_limit;
$$;
