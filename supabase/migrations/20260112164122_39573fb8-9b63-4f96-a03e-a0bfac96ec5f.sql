-- Add reward_type column to rewards table (certificate, medal, voucher)
ALTER TABLE public.rewards 
ADD COLUMN reward_type TEXT DEFAULT 'voucher' CHECK (reward_type IN ('certificate', 'medal', 'voucher'));

-- Add voucher_code column to user_reward_redemptions for storing generated codes
ALTER TABLE public.user_reward_redemptions
ADD COLUMN voucher_code TEXT;

-- Update comment
COMMENT ON COLUMN public.rewards.reward_type IS 'Type of reward: certificate (printable), medal (display in trophy rack), voucher (barcode/code)';