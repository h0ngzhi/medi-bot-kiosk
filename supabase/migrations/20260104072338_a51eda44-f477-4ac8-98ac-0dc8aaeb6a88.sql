-- Create screening_results table to store BP and height/weight measurements
CREATE TABLE public.screening_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kiosk_user_id UUID NOT NULL,
  screening_type TEXT NOT NULL CHECK (screening_type IN ('bp', 'weight')),
  -- BP fields
  systolic INTEGER,
  diastolic INTEGER,
  pulse INTEGER,
  -- Weight/height fields
  height NUMERIC(5,1),
  weight NUMERIC(5,1),
  bmi NUMERIC(4,1),
  -- Common fields
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'high')),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.screening_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (kiosk context)
CREATE POLICY "Public read access" 
ON public.screening_results 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert access" 
ON public.screening_results 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster lookups by user
CREATE INDEX idx_screening_results_user ON public.screening_results(kiosk_user_id);
CREATE INDEX idx_screening_results_type ON public.screening_results(kiosk_user_id, screening_type);