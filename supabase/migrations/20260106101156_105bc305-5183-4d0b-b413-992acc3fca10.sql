-- Add capacity tracking to community_programmes
ALTER TABLE public.community_programmes
ADD COLUMN IF NOT EXISTS max_capacity integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS current_signups integer DEFAULT 0;

-- Add name and phone to user_programme_signups
ALTER TABLE public.user_programme_signups
ADD COLUMN IF NOT EXISTS participant_name text,
ADD COLUMN IF NOT EXISTS phone_number text;

-- Update existing programmes with capacity
UPDATE public.community_programmes SET max_capacity = 30, current_signups = 0 WHERE max_capacity IS NULL;

-- Create function to increment signup count
CREATE OR REPLACE FUNCTION public.increment_programme_signups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_programmes
  SET current_signups = current_signups + 1
  WHERE id = NEW.programme_id;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-increment on signup
DROP TRIGGER IF EXISTS on_programme_signup ON public.user_programme_signups;
CREATE TRIGGER on_programme_signup
  AFTER INSERT ON public.user_programme_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_programme_signups();