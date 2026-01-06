-- Add admin email field to community_programmes
ALTER TABLE public.community_programmes
ADD COLUMN IF NOT EXISTS admin_email text;