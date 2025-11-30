-- Ensure tables exist (just in case)
create table if not exists parties (
  id uuid default gen_random_uuid() primary key,
  owner_id text not null,
  dungeon_id text,
  status text not null default 'waiting',
  invite_code text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  max_members integer default 4
);

create table if not exists hero_ownership (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  token_id text not null,
  contract_address text not null,
  chain_id integer not null,
  metadata jsonb,
  last_synced_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(token_id, contract_address, chain_id)
);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
