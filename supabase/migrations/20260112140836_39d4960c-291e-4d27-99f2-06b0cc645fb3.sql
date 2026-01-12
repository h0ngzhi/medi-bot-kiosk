-- Create table for idle screen slideshow content
CREATE TABLE public.idle_slideshow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  display_order INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  duration_seconds INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.idle_slideshow ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (kiosk needs to display slides)
CREATE POLICY "Anyone can view active slideshow items" 
ON public.idle_slideshow 
FOR SELECT 
USING (is_active = true);

-- Create policy for admin insert/update/delete (no auth for kiosk prototype)
CREATE POLICY "Anyone can manage slideshow items" 
ON public.idle_slideshow 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_idle_slideshow_updated_at
BEFORE UPDATE ON public.idle_slideshow
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for slideshow media
INSERT INTO storage.buckets (id, name, public) VALUES ('slideshow-media', 'slideshow-media', true);

-- Create storage policies for slideshow media
CREATE POLICY "Slideshow media is publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'slideshow-media');

CREATE POLICY "Anyone can upload slideshow media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'slideshow-media');

CREATE POLICY "Anyone can update slideshow media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'slideshow-media');

CREATE POLICY "Anyone can delete slideshow media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'slideshow-media');