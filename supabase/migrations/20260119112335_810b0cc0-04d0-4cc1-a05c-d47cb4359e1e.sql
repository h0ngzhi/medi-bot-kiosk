-- Add date_of_birth column to kiosk_users table
ALTER TABLE public.kiosk_users
ADD COLUMN date_of_birth DATE;

-- Add a comment explaining the field
COMMENT ON COLUMN public.kiosk_users.date_of_birth IS 'User date of birth for age-adjusted health thresholds';