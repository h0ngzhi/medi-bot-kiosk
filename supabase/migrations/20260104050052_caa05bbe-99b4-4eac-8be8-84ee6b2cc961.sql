
-- Create kiosk_users table
CREATE TABLE public.kiosk_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  chas_card_type TEXT DEFAULT 'blue',
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create health_screenings table
CREATE TABLE public.health_screenings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kiosk_user_id UUID NOT NULL REFERENCES public.kiosk_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  scheduled_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medications table
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kiosk_user_id UUID NOT NULL REFERENCES public.kiosk_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'in_transit', 'delivered')),
  delivery_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_programmes table
CREATE TABLE public.community_programmes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date DATE,
  points_reward INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_programme_signups table
CREATE TABLE public.user_programme_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kiosk_user_id UUID NOT NULL REFERENCES public.kiosk_users(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES public.community_programmes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up', 'attended', 'cancelled')),
  signed_up_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attended_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(kiosk_user_id, programme_id)
);

-- Enable Row Level Security
ALTER TABLE public.kiosk_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_programme_signups ENABLE ROW LEVEL SECURITY;

-- Create public read/write policies (kiosk system - no auth required)
CREATE POLICY "Public read access" ON public.kiosk_users FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.kiosk_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.kiosk_users FOR UPDATE USING (true);

CREATE POLICY "Public read access" ON public.health_screenings FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.health_screenings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.health_screenings FOR UPDATE USING (true);

CREATE POLICY "Public read access" ON public.medications FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.medications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.medications FOR UPDATE USING (true);

CREATE POLICY "Public read access" ON public.community_programmes FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.community_programmes FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read access" ON public.user_programme_signups FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.user_programme_signups FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.user_programme_signups FOR UPDATE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for kiosk_users
CREATE TRIGGER update_kiosk_users_updated_at
  BEFORE UPDATE ON public.kiosk_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample community programmes
INSERT INTO public.community_programmes (title, description, location, event_date, points_reward) VALUES
  ('Morning Tai Chi', 'Join us for relaxing morning exercises', 'Bishan Park', CURRENT_DATE + INTERVAL '7 days', 15),
  ('Health Talk: Diabetes Management', 'Learn about managing diabetes', 'CC Auditorium', CURRENT_DATE + INTERVAL '14 days', 20),
  ('Walking Group', 'Weekly walking group for seniors', 'East Coast Park', CURRENT_DATE + INTERVAL '3 days', 10);
