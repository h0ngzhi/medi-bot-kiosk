-- Add multilingual navigation PDF columns to community_programmes
ALTER TABLE public.community_programmes 
ADD COLUMN IF NOT EXISTS navigation_pdf_url_zh TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS navigation_pdf_url_ms TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS navigation_pdf_url_ta TEXT DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.community_programmes.navigation_pdf_url IS 'Navigation card PDF URL for English';
COMMENT ON COLUMN public.community_programmes.navigation_pdf_url_zh IS 'Navigation card PDF URL for Chinese';
COMMENT ON COLUMN public.community_programmes.navigation_pdf_url_ms IS 'Navigation card PDF URL for Malay';
COMMENT ON COLUMN public.community_programmes.navigation_pdf_url_ta IS 'Navigation card PDF URL for Tamil';