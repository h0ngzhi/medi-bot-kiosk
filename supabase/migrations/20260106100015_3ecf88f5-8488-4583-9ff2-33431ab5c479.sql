-- Add new columns to community_programmes table for richer programme details
ALTER TABLE public.community_programmes
ADD COLUMN IF NOT EXISTS duration text,
ADD COLUMN IF NOT EXISTS group_size text,
ADD COLUMN IF NOT EXISTS languages text[],
ADD COLUMN IF NOT EXISTS conducted_by text,
ADD COLUMN IF NOT EXISTS learning_objectives text[],
ADD COLUMN IF NOT EXISTS category text DEFAULT 'health';

-- Insert sample programmes
INSERT INTO public.community_programmes (title, description, event_date, location, points_reward, duration, group_size, languages, conducted_by, learning_objectives, category)
VALUES 
(
  'Nutrition & Oral Health Workshop',
  'Learn about the close relationship between nutrition and oral health, and how to maintain oral health through a balanced diet and proper oral hygiene.',
  '2026-02-15',
  'Bedok Community Centre',
  20,
  '2hr workshop',
  '10-30 pax',
  ARRAY['English', 'Mandarin'],
  'Dietitian (+ Oral Health Therapist)',
  ARRAY['Recognize the relationship between nutrition and oral health', 'Understand poor nutrition and oral health problems', 'Identify the important nutrients for good oral health', 'Demonstrate good oral care to maintain good oral health'],
  'health'
),
(
  'Active Ageing Tai Chi',
  'Gentle exercise programme designed for seniors to improve balance, flexibility and overall well-being through traditional Tai Chi movements.',
  '2026-02-20',
  'Tampines Hub',
  15,
  '1hr session',
  '15-25 pax',
  ARRAY['English', 'Mandarin'],
  'Certified Tai Chi Instructor',
  ARRAY['Learn basic Tai Chi movements', 'Improve balance and coordination', 'Reduce stress through mindful exercise', 'Build strength safely'],
  'active_ageing'
),
(
  'Diabetes Management Talk',
  'Educational session on managing diabetes through lifestyle changes, medication adherence, and regular monitoring.',
  '2026-02-25',
  'Ang Mo Kio Polyclinic',
  25,
  '1.5hr talk',
  '20-40 pax',
  ARRAY['English', 'Mandarin', 'Malay'],
  'Diabetes Nurse Educator',
  ARRAY['Understand blood sugar management', 'Learn about healthy eating for diabetics', 'Know when to seek medical help', 'Proper medication management'],
  'health'
),
(
  'Social Befriending Circle',
  'Weekly social gathering for seniors to connect, share stories, and build meaningful friendships in a supportive environment.',
  '2026-03-01',
  'Toa Payoh Community Club',
  10,
  '2hr session',
  '8-15 pax',
  ARRAY['English', 'Mandarin', 'Hokkien'],
  'Trained Volunteer Facilitators',
  ARRAY['Build new friendships', 'Share life experiences', 'Participate in group activities', 'Reduce social isolation'],
  'social'
);