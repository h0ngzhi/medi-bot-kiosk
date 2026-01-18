-- Add email and created_by columns to programme_admins table
ALTER TABLE public.programme_admins 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.programme_admins(id) ON DELETE SET NULL;