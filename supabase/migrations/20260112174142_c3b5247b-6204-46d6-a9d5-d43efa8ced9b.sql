-- Add column to track daily login bonus timestamp
ALTER TABLE public.kiosk_users
ADD COLUMN last_login_bonus_at DATE;

-- Add comment to explain the column
COMMENT ON COLUMN public.kiosk_users.last_login_bonus_at IS 'Tracks the last date the user received their daily login bonus (resets at midnight)';