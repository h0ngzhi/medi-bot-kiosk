-- Add guest_option field for "Caregiver welcome" or "Bring a friend" tags
ALTER TABLE public.community_programmes 
ADD COLUMN guest_option text DEFAULT NULL;

-- Valid values: 'caregiver_welcome', 'bring_friend', or NULL for no tag
COMMENT ON COLUMN public.community_programmes.guest_option IS 'Optional tag: caregiver_welcome or bring_friend';