-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.kiosk_users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow public read access for kiosk context
CREATE POLICY "Allow public read access to user_roles"
ON public.user_roles
FOR SELECT
USING (true);

-- Allow public insert for kiosk context
CREATE POLICY "Allow public insert to user_roles"
ON public.user_roles
FOR INSERT
WITH CHECK (true);

-- Allow public delete for kiosk context
CREATE POLICY "Allow public delete from user_roles"
ON public.user_roles
FOR DELETE
USING (true);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_kiosk_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _kiosk_user_id
      AND role = _role
  )
$$;