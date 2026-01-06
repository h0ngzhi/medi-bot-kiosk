-- Add DELETE policy for user_programme_signups to allow users to cancel their participation
CREATE POLICY "Public delete access" 
ON public.user_programme_signups 
FOR DELETE 
USING (true);