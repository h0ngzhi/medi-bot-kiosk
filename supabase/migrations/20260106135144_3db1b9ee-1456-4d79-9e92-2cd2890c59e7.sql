-- Add recurrence_type column to community_programmes
ALTER TABLE public.community_programmes 
ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'one_time';

-- Create programme_feedback table for star ratings and comments
CREATE TABLE public.programme_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID NOT NULL REFERENCES public.community_programmes(id) ON DELETE CASCADE,
  kiosk_user_id UUID NOT NULL REFERENCES public.kiosk_users(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one feedback per user per programme
  UNIQUE(programme_id, kiosk_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.programme_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (kiosk context)
CREATE POLICY "Public read access" 
ON public.programme_feedback 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert access" 
ON public.programme_feedback 
FOR INSERT 
WITH CHECK (true);

-- No update or delete policies as per requirements