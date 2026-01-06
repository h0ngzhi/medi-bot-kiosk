-- Add RLS policies for feedback update and delete
-- Allow public update for kiosk context (users can edit their own feedback)
CREATE POLICY "Public update access" 
ON public.programme_feedback 
FOR UPDATE 
USING (true);

-- Allow public delete for kiosk context (admins and users can delete feedback)
CREATE POLICY "Public delete access" 
ON public.programme_feedback 
FOR DELETE 
USING (true);