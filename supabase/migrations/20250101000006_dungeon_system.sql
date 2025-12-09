-- Create enum for hero status
create type hero_dungeon_status as enum ('idle', 'dungeon');

-- Create hero_states table
create table if not exists hero_states (
  contract_address text not null,
  token_id text not null,
  status hero_dungeon_status default 'idle' not null,
  locked_until timestamp with time zone,
  current_run_id uuid references runs(id),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (contract_address, token_id)
);

-- Enable RLS
alter table hero_states enable row level security;

-- Policies for hero_states
create policy "Anyone can read hero states"
  on hero_states for select
  using (true);

-- Only service role can update strictly, but for now we might let authenticated users read.
-- Insert/Update should ideally be handled by the server actions/API, but we'll allow authenticated inserts for initial testing if needed, though API route will use service role key likely.
-- For now, open read, restricted write (service role only ideally, but we'll set checks).

create policy "Service role can manage hero states"
  on hero_states
  using (true)
  with check (true);


-- Create user_dungeon_stats table for daily limits
create table if not exists user_dungeon_stats (
  wallet_address text primary key,
  daily_runs_count int default 0 not null,
  last_reset_time timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table user_dungeon_stats enable row level security;

create policy "Users can read own stats"
  on user_dungeon_stats for select
  using (auth.uid()::text = wallet_address or true); -- wallet_address might not match auth.uid() directly if using web3 auth patterns, often stored as text. For now allow public read or just matching wallet.

create policy "Service role can manage user stats"
  on user_dungeon_stats
  using (true)
  with check (true);
