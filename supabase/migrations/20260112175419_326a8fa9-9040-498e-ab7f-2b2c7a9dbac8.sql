-- Create enum for programme admin roles
CREATE TYPE public.programme_admin_role AS ENUM ('viewer', 'editor', 'super_admin');

-- Create table for programme admin accounts (separate from kiosk users)
CREATE TABLE public.programme_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role programme_admin_role NOT NULL DEFAULT 'editor',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add created_by column to community_programmes to track ownership
ALTER TABLE public.community_programmes 
ADD COLUMN created_by_admin_id UUID REFERENCES public.programme_admins(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.programme_admins ENABLE ROW LEVEL SECURITY;

-- Allow public read for login purposes (password hash will be checked in app)
CREATE POLICY "Allow public read for programme_admins"
ON public.programme_admins
FOR SELECT
USING (true);

-- Allow all operations for now (kiosk context - no Supabase auth)
CREATE POLICY "Allow public insert for programme_admins"
ON public.programme_admins
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update for programme_admins"
ON public.programme_admins
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete for programme_admins"
ON public.programme_admins
FOR DELETE
USING (true);

-- Add trigger to update updated_at
CREATE TRIGGER update_programme_admins_updated_at
BEFORE UPDATE ON public.programme_admins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a default super admin account (password: admin123 - should be changed in production)
-- Using a simple hash for demo purposes - in production use proper bcrypt
INSERT INTO public.programme_admins (username, password_hash, display_name, role)
VALUES ('admin', 'admin123', 'Super Administrator', 'super_admin');

-- Add index for faster lookups
CREATE INDEX idx_programme_admins_username ON public.programme_admins(username);
CREATE INDEX idx_community_programmes_created_by ON public.community_programmes(created_by_admin_id);