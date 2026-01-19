-- Add DELETE policy for kiosk_users table
CREATE POLICY "Public delete access" 
ON public.kiosk_users 
FOR DELETE 
USING (true);

-- Add DELETE policy for screening_results (currently missing)
CREATE POLICY "Public delete access" 
ON public.screening_results 
FOR DELETE 
USING (true);

-- Add DELETE policy for medications (currently missing)
CREATE POLICY "Public delete access" 
ON public.medications 
FOR DELETE 
USING (true);

-- Add DELETE policy for health_screenings (currently missing)
CREATE POLICY "Public delete access" 
ON public.health_screenings 
FOR DELETE 
USING (true);