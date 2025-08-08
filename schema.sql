-- Supabase 用スキーマ（SQL エディタで実行）
-- 1) テーブル作成
create table if not exists public.stocks (
  id uuid primary key,
  user_id uuid not null,
  category text not null,
  name text not null,
  qty integer not null default 0,
  date date null,
  updated_at timestamptz not null default now()
);

-- 2) RLS 有効化
alter table public.stocks enable row level security;

-- 3) ポリシー：自分のデータだけ read/write
create policy "allow read own" on public.stocks
  for select using ( auth.uid() = user_id );

create policy "allow write own" on public.stocks
  for insert with check ( auth.uid() = user_id );

create policy "allow update own" on public.stocks
  for update using ( auth.uid() = user_id );

create policy "allow delete own" on public.stocks
  for delete using ( auth.uid() = user_id );
