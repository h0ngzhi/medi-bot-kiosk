-- Add multilingual learning objectives columns
ALTER TABLE public.community_programmes
ADD COLUMN IF NOT EXISTS learning_objectives_zh text[],
ADD COLUMN IF NOT EXISTS learning_objectives_ms text[],
ADD COLUMN IF NOT EXISTS learning_objectives_ta text[];