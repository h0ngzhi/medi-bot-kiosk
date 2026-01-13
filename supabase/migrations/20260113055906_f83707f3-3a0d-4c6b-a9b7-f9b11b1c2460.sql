-- Create storage bucket for navigation PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('navigation-pdfs', 'navigation-pdfs', true);

-- Allow public read access to navigation PDFs
CREATE POLICY "Public can read navigation PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'navigation-pdfs');

-- Allow anyone to upload navigation PDFs (for admin use in kiosk context)
CREATE POLICY "Anyone can upload navigation PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'navigation-pdfs');

-- Allow anyone to update navigation PDFs
CREATE POLICY "Anyone can update navigation PDFs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'navigation-pdfs');

-- Allow anyone to delete navigation PDFs
CREATE POLICY "Anyone can delete navigation PDFs"
ON storage.objects FOR DELETE
USING (bucket_id = 'navigation-pdfs');