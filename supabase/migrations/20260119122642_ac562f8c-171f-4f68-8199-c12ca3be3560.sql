-- Add gender column to kiosk_users
ALTER TABLE public.kiosk_users 
ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female'));