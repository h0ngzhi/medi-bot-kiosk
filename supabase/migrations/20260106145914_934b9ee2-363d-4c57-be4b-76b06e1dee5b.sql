-- Add series_id to link recurring programmes together
ALTER TABLE public.community_programmes
ADD COLUMN series_id uuid DEFAULT NULL;

-- Set series_id to own id for existing programmes (each becomes its own series)
UPDATE public.community_programmes
SET series_id = id
WHERE series_id IS NULL;

-- Make series_id not null after setting defaults
ALTER TABLE public.community_programmes
ALTER COLUMN series_id SET NOT NULL;

-- Add index for efficient querying by series
CREATE INDEX idx_community_programmes_series_id ON public.community_programmes(series_id);