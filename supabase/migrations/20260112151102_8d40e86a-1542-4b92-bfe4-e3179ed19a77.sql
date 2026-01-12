-- Add events_attended column to kiosk_users to track how many events a user has attended
ALTER TABLE public.kiosk_users 
ADD COLUMN IF NOT EXISTS events_attended INTEGER NOT NULL DEFAULT 0;

-- Create rewards table with tier information
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_zh TEXT,
  title_ms TEXT,
  title_ta TEXT,
  description TEXT,
  description_zh TEXT,
  description_ms TEXT,
  description_ta TEXT,
  points_cost INTEGER NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1, -- 1 = Tier 1, 2 = Tier 2
  max_quantity INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reward tier settings table
CREATE TABLE public.reward_tier_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier INTEGER NOT NULL UNIQUE,
  events_required INTEGER NOT NULL,
  title TEXT NOT NULL,
  title_zh TEXT,
  title_ms TEXT,
  title_ta TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user reward redemptions table to track what users have redeemed
CREATE TABLE public.user_reward_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kiosk_user_id UUID NOT NULL REFERENCES public.kiosk_users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  points_spent INTEGER NOT NULL,
  delivery_address JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_tier_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reward_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for rewards (public read for kiosk)
CREATE POLICY "Anyone can view active rewards" ON public.rewards
  FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage rewards" ON public.rewards
  FOR ALL USING (true);

-- RLS policies for tier settings (public read)
CREATE POLICY "Anyone can view tier settings" ON public.reward_tier_settings
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage tier settings" ON public.reward_tier_settings
  FOR ALL USING (true);

-- RLS policies for redemptions
CREATE POLICY "Users can view their own redemptions" ON public.user_reward_redemptions
  FOR SELECT USING (true);

CREATE POLICY "Users can create redemptions" ON public.user_reward_redemptions
  FOR INSERT WITH CHECK (true);

-- Insert default tier settings
INSERT INTO public.reward_tier_settings (tier, events_required, title, title_zh, title_ms, title_ta, description) VALUES
(1, 30, 'Tier 1 Rewards', '一级奖励', 'Ganjaran Tahap 1', 'நிலை 1 வெகுமதிகள்', 'Unlock after attending 30 events'),
(2, 60, 'Tier 2 Rewards', '二级奖励', 'Ganjaran Tahap 2', 'நிலை 2 வெகுமதிகள்', 'Unlock after attending 60 events');

-- Insert sample rewards
INSERT INTO public.rewards (title, title_zh, title_ms, title_ta, description, description_zh, description_ms, description_ta, points_cost, tier, max_quantity, display_order) VALUES
-- Tier 1 rewards
('$5 NTUC Voucher', '$5 职总礼券', 'Baucar NTUC $5', '$5 NTUC வவுச்சர்', 'Use at any NTUC FairPrice outlet', '可在任何职总平价超市使用', 'Guna di mana-mana cawangan NTUC FairPrice', 'எந்த NTUC FairPrice கடையிலும் பயன்படுத்தலாம்', 200, 1, 5, 1),
('$10 Guardian Voucher', '$10 Guardian礼券', 'Baucar Guardian $10', '$10 Guardian வவுச்சர்', 'Use at any Guardian pharmacy', '可在任何Guardian药房使用', 'Guna di mana-mana farmasi Guardian', 'எந்த Guardian மருந்தகத்திலும் பயன்படுத்தலாம்', 400, 1, 3, 2),
('Free Health Screening', '免费健康检查', 'Pemeriksaan Kesihatan Percuma', 'இலவச சுகாதார பரிசோதனை', 'One free comprehensive health check', '一次全面健康检查', 'Satu pemeriksaan kesihatan menyeluruh percuma', 'ஒரு முழுமையான சுகாதார பரிசோதனை', 500, 1, 2, 3),
-- Tier 2 rewards
('$20 Shopping Voucher', '$20 购物礼券', 'Baucar Beli-Belah $20', '$20 ஷாப்பிங் வவுச்சர்', 'Use at participating stores', '可在参与商店使用', 'Guna di kedai yang mengambil bahagian', 'பங்கேற்கும் கடைகளில் பயன்படுத்தவும்', 800, 2, 3, 4),
('Premium Wellness Package', '高级健康配套', 'Pakej Kesihatan Premium', 'பிரீமியம் ஆரோக்கிய தொகுப்பு', 'Includes massage and health consultation', '包括按摩和健康咨询', 'Termasuk urutan dan konsultasi kesihatan', 'மசாஜ் மற்றும் சுகாதார ஆலோசனை அடங்கும்', 1000, 2, 2, 5),
('$50 Grocery Bundle', '$50 杂货组合', 'Bungkusan Runcit $50', '$50 மளிகை தொகுப்பு', 'Monthly grocery essentials delivered', '每月必需品送货上门', 'Keperluan runcit bulanan dihantar', 'மாதாந்திர மளிகை அத்தியாவசியங்கள் வழங்கப்படும்', 1500, 2, 1, 6);

-- Create trigger to update events_attended when user marks attendance
CREATE OR REPLACE FUNCTION public.update_user_events_attended()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'attended' AND (OLD.status IS NULL OR OLD.status != 'attended') THEN
    UPDATE public.kiosk_users
    SET events_attended = events_attended + 1
    WHERE id = NEW.kiosk_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_events_attended
AFTER UPDATE ON public.user_programme_signups
FOR EACH ROW
EXECUTE FUNCTION public.update_user_events_attended();