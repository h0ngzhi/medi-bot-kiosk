-- Create trigger to auto-generate unique serial_id on insert
CREATE TRIGGER set_programme_serial_id
BEFORE INSERT ON public.community_programmes
FOR EACH ROW
WHEN (NEW.serial_id IS NULL)
EXECUTE FUNCTION public.generate_programme_serial_id();