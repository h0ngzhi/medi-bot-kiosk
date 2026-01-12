-- Create a separate table for dashboard slideshows
CREATE TABLE public.dashboard_slideshow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  title TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  duration_seconds INTEGER NOT NULL DEFAULT 5,
  position TEXT NOT NULL DEFAULT 'left' CHECK (position IN ('left', 'right')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_slideshow ENABLE ROW LEVEL SECURITY;

-- Allow public read access for the kiosk
CREATE POLICY "Anyone can view active dashboard slides"
ON public.dashboard_slideshow
FOR SELECT
USING (true);

-- Allow public insert/update/delete for admin (prototype context)
CREATE POLICY "Anyone can insert dashboard slides"
ON public.dashboard_slideshow
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update dashboard slides"
ON public.dashboard_slideshow
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete dashboard slides"
ON public.dashboard_slideshow
FOR DELETE
USING (true);