-- Add missing fields for admin programme management
ALTER TABLE public.community_programmes
ADD COLUMN IF NOT EXISTS event_time text,
ADD COLUMN IF NOT EXISTS region text DEFAULT 'Central',
ADD COLUMN IF NOT EXISTS contact_number text,
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add update trigger for updated_at
CREATE TRIGGER update_community_programmes_updated_at
BEFORE UPDATE ON public.community_programmes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow updates and deletes for admin management
CREATE POLICY "Public update access"
ON public.community_programmes
FOR UPDATE
USING (true);

CREATE POLICY "Public delete access"
ON public.community_programmes
FOR DELETE
USING (true);