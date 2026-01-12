-- Add multilingual support columns to community_programmes table
ALTER TABLE public.community_programmes 
ADD COLUMN IF NOT EXISTS title_zh TEXT,
ADD COLUMN IF NOT EXISTS title_ms TEXT,
ADD COLUMN IF NOT EXISTS title_ta TEXT,
ADD COLUMN IF NOT EXISTS description_zh TEXT,
ADD COLUMN IF NOT EXISTS description_ms TEXT,
ADD COLUMN IF NOT EXISTS description_ta TEXT;