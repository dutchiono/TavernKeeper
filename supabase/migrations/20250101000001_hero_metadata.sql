create table if not exists hero_metadata (
  id uuid default gen_random_uuid() primary key,
  metadata jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table hero_metadata enable row level security;

create policy "Anyone can read hero metadata"
  on hero_metadata for select
  using (true);

create policy "Anyone can insert hero metadata"
  on hero_metadata for insert
  with check (true);
