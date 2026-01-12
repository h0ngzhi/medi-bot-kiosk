-- Create table to cache clinic operating hours from Google Places API
CREATE TABLE public.clinic_hours_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id TEXT NOT NULL UNIQUE,
  clinic_name TEXT NOT NULL,
  hours TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed', 'not_found'
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinic_hours_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (kiosk context)
CREATE POLICY "Anyone can read clinic hours cache"
  ON public.clinic_hours_cache
  FOR SELECT
  USING (true);

-- Allow public insert/update (for the edge function to cache results)
CREATE POLICY "Anyone can insert clinic hours cache"
  ON public.clinic_hours_cache
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update clinic hours cache"
  ON public.clinic_hours_cache
  FOR UPDATE
  USING (true);

-- Create index for fast lookup by clinic_id
CREATE INDEX idx_clinic_hours_cache_clinic_id ON public.clinic_hours_cache(clinic_id);

-- Add trigger for updated_at
CREATE TRIGGER update_clinic_hours_cache_updated_at
  BEFORE UPDATE ON public.clinic_hours_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();