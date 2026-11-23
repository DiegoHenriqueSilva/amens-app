-- Temporarily remove the daily intercession cap so APP05 can be exercised
-- repeatedly with the test accounts. The allowance functions remain available
-- for a future product decision; enforcement is disabled at the database layer.

drop trigger if exists enforce_prayer_daily_limit on public.prayer_intercessions;
