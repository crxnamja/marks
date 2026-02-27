-- Marks: Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Bookmarks
create table bookmarks (
  id bigint generated always as identity primary key,
  url text unique not null,
  title text not null default '',
  description text not null default '',
  is_read boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tags
create table tags (
  id bigint generated always as identity primary key,
  name text unique not null
);

-- Bookmark <-> Tag junction
create table bookmark_tags (
  bookmark_id bigint references bookmarks(id) on delete cascade,
  tag_id bigint references tags(id) on delete cascade,
  primary key (bookmark_id, tag_id)
);

-- Archived article content
create table archived_content (
  bookmark_id bigint primary key references bookmarks(id) on delete cascade,
  content_html text,
  content_text text,
  excerpt text,
  byline text,
  word_count int,
  source text not null default 'readability'
);

-- Full-text search on bookmarks (title weighted highest, then description, then url)
alter table bookmarks add column fts tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(url, '')), 'C')
  ) stored;

create index bookmarks_fts_idx on bookmarks using gin(fts);

-- Full-text search on archived content
alter table archived_content add column fts tsvector
  generated always as (
    to_tsvector('english', coalesce(content_text, ''))
  ) stored;

create index archived_fts_idx on archived_content using gin(fts);

-- Index for common queries
create index bookmarks_created_at_idx on bookmarks(created_at desc);
create index bookmarks_is_read_idx on bookmarks(is_read) where is_read = false;
create index bookmark_tags_tag_idx on bookmark_tags(tag_id);
