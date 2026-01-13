-- Add navigation PDF URL column to community_programmes table
ALTER TABLE public.community_programmes
ADD COLUMN navigation_pdf_url text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.community_programmes.navigation_pdf_url IS 'URL to the navigation/direction PDF card that vendors provide for physical locations';