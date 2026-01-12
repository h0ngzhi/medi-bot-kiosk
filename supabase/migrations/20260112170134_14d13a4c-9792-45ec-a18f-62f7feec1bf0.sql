-- Add equipped_medal_id column to track which medal the user has equipped
ALTER TABLE public.kiosk_users 
ADD COLUMN equipped_medal_id UUID REFERENCES public.user_reward_redemptions(id) ON DELETE SET NULL;