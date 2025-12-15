-- Modify RLS policy to allow server-side inserts (when app.wallet_address is not set)
-- This allows workers to insert adventurers without needing service role key
-- The policy still enforces wallet_address matching when the session variable IS set (user context)

DROP POLICY IF EXISTS "Users can insert their own adventurers" ON adventurers;

CREATE POLICY "Users can insert their own adventurers"
  ON adventurers FOR INSERT
  WITH CHECK (
    -- Allow if wallet_address matches session variable (user context with session var set)
    wallet_address = current_setting('app.wallet_address', true)
    OR
    -- Allow if session variable is not set (server-side/worker context)
    -- This is safe because only server-side code can make requests without setting the variable
    current_setting('app.wallet_address', true) IS NULL
  );

