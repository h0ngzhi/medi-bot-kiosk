-- Add serial_id column for unique 5-6 digit programme identifier
ALTER TABLE public.community_programmes 
ADD COLUMN serial_id TEXT UNIQUE;

-- Create function to generate unique 6-digit serial ID
CREATE OR REPLACE FUNCTION public.generate_programme_serial_id()
RETURNS TRIGGER AS $$
DECLARE
  new_serial TEXT;
  done BOOL;
BEGIN
  done := FALSE;
  WHILE NOT done LOOP
    -- Generate random 6-digit number (100000-999999)
    new_serial := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    -- Check if it's unique
    BEGIN
      PERFORM 1 FROM public.community_programmes WHERE serial_id = new_serial;
      IF NOT FOUND THEN
        done := TRUE;
      END IF;
    END;
  END LOOP;
  NEW.serial_id := new_serial;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate serial_id for new programmes
CREATE TRIGGER generate_programme_serial_id_trigger
BEFORE INSERT ON public.community_programmes
FOR EACH ROW
WHEN (NEW.serial_id IS NULL)
EXECUTE FUNCTION public.generate_programme_serial_id();

-- Backfill existing programmes with serial IDs
UPDATE public.community_programmes
SET serial_id = LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
WHERE serial_id IS NULL;