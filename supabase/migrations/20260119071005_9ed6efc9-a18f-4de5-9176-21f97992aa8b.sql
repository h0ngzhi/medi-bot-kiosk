-- Add columns to track daily event points earnings
ALTER TABLE public.kiosk_users
ADD COLUMN IF NOT EXISTS daily_event_points_earned INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.kiosk_users
ADD COLUMN IF NOT EXISTS daily_event_points_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN public.kiosk_users.daily_event_points_earned IS 'Points earned from events today (max 10)';
COMMENT ON COLUMN public.kiosk_users.daily_event_points_date IS 'Date when daily_event_points_earned was last reset';