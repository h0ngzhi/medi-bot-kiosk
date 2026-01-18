-- Add badge_color to rewards table for medal/badge role color in comments
ALTER TABLE public.rewards
ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT '#f59e0b';

-- Add color to reward_tier_settings for trophy color
ALTER TABLE public.reward_tier_settings
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#f59e0b';