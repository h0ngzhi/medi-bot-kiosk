import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { 
  ArrowLeft, 
  Award,
  Gift,
  History,
  CheckCircle2,
  Plus,
  Minus,
  MapPin,
  Lock,
  Unlock,
  Trophy
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { speakText } from '@/utils/speechUtils';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface Reward {
  id: string;
  title: string;
  title_zh: string | null;
  title_ms: string | null;
  title_ta: string | null;
  description: string | null;
  description_zh: string | null;
  description_ms: string | null;
  description_ta: string | null;
  points_cost: number;
  tier: number;
  max_quantity: number;
}

interface TierSetting {
  tier: number;
  events_required: number;
  title: string;
  title_zh: string | null;
  title_ms: string | null;
  title_ta: string | null;
}

export default function Profile() {
  const { user, t, setUser, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [tierSettings, setTierSettings] = useState<TierSetting[]>([]);
  const [eventsAttended, setEventsAttended] = useState(0);
  const [address, setAddress] = useState({
    blockNo: '',
    unitNo: '',
    street: '',
    postalCode: '',
  });

  // Fetch rewards, tier settings, and user events attended
  useEffect(() => {
    const fetchData = async () => {
      // Fetch rewards
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('tier', { ascending: true })
        .order('display_order', { ascending: true });
      
      if (rewardsData) setRewards(rewardsData);

      // Fetch tier settings
      const { data: tierData } = await supabase
        .from('reward_tier_settings')
        .select('*')
        .order('tier', { ascending: true });
      
      if (tierData) setTierSettings(tierData);

      // Fetch user's events attended
      if (user?.id) {
        const { data: userData } = await supabase
          .from('kiosk_users')
          .select('events_attended')
          .eq('id', user.id)
          .single();
        
        if (userData) setEventsAttended(userData.events_attended || 0);
      }
    };

    fetchData();
  }, [user?.id]);

  // Get localized text
  const getLocalizedText = (item: { title?: string; title_zh?: string | null; title_ms?: string | null; title_ta?: string | null }, field: 'title') => {
    const langKey = field + '_' + (language === 'en' ? '' : language);
    if (language === 'en') return item[field] || '';
    const localizedField = item[langKey as keyof typeof item] as string | null;
    return localizedField || item[field] || '';
  };

  const getLocalizedDesc = (item: { description?: string | null; description_zh?: string | null; description_ms?: string | null; description_ta?: string | null }) => {
    if (language === 'en') return item.description || '';
    const langKey = 'description_' + language;
    const localizedField = item[langKey as keyof typeof item] as string | null;
    return localizedField || item.description || '';
  };

  const getTierTitle = (tier: TierSetting) => {
    if (language === 'en') return tier.title;
    const langKey = 'title_' + language;
    const localizedField = tier[langKey as keyof typeof tier] as string | null;
    return localizedField || tier.title;
  };

  // Check if user has unlocked a tier
  const isTierUnlocked = (tier: number) => {
    const setting = tierSettings.find(t => t.tier === tier);
    if (!setting) return false;
    return eventsAttended >= setting.events_required;
  };

  // Get progress to next tier
  const getNextTierProgress = () => {
    for (const tier of tierSettings) {
      if (eventsAttended < tier.events_required) {
        return {
          tier: tier.tier,
          current: eventsAttended,
          required: tier.events_required,
          percentage: (eventsAttended / tier.events_required) * 100
        };
      }
    }
    return null; // All tiers unlocked
  };

  const handleButtonSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const handleQuantityChange = (rewardId: string, delta: number, maxQty: number) => {
    setQuantities(prev => {
      const current = prev[rewardId] || 1;
      const newQty = Math.max(1, Math.min(maxQty, current + delta));
      return { ...prev, [rewardId]: newQty };
    });
  };

  const getQuantity = (rewardId: string) => quantities[rewardId] || 1;

  const getTotalPoints = (reward: Reward) => reward.points_cost * getQuantity(reward.id);

  const canAfford = (reward: Reward) => user && user.points >= getTotalPoints(reward);

  const handleRedeemClick = (reward: Reward) => {
    if (!isTierUnlocked(reward.tier)) {
      toast({
        title: t('profile.tierLocked'),
        description: `${t('profile.attendMoreEvents')} ${tierSettings.find(t => t.tier === reward.tier)?.events_required || 0}`,
        variant: 'destructive',
      });
      return;
    }
    if (!canAfford(reward)) {
      toast({
        title: t('profile.notEnoughPoints'),
        description: t('profile.joinProgrammes'),
        variant: 'destructive',
      });
      return;
    }
    setSelectedReward(reward);
    setShowAddressDialog(true);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward || !user) return;
    
    if (!address.blockNo || !address.street || !address.postalCode) {
      toast({
        title: t('profile.fillAddress'),
        description: t('profile.needAddress'),
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    const totalPointsToDeduct = getTotalPoints(selectedReward);
    const newPoints = user.points - totalPointsToDeduct;

    try {
      // Create redemption record
      await supabase.from('user_reward_redemptions').insert({
        kiosk_user_id: user.id,
        reward_id: selectedReward.id,
        quantity: getQuantity(selectedReward.id),
        points_spent: totalPointsToDeduct,
        delivery_address: address,
      });

      // Update points
      const { error } = await supabase
        .from('kiosk_users')
        .update({ points: newPoints })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, points: newPoints });

      toast({
        title: t('profile.rewardRedeemed'),
        description: `${getQuantity(selectedReward.id)}x ${getLocalizedText(selectedReward, 'title')} ${t('profile.willBeSent')}`,
      });

      setShowAddressDialog(false);
      setSelectedReward(null);
      setAddress({ blockNo: '', unitNo: '', street: '', postalCode: '' });
      setQuantities(prev => ({ ...prev, [selectedReward.id]: 1 }));
    } catch (error) {
      console.error('Failed to redeem reward:', error);
      toast({
        title: t('profile.redemptionFailed'),
        description: t('profile.tryAgainLater'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) return null;

  const tier1Rewards = rewards.filter(r => r.tier === 1);
  const tier2Rewards = rewards.filter(r => r.tier === 2);
  const nextTier = getNextTierProgress();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
      {/* Header */}
      <header className="bg-card shadow-soft p-6 mb-6">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            onMouseEnter={() => handleButtonSpeak(t('common.back'))}
            className="w-14 h-14 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-heading text-foreground cursor-default" onMouseEnter={() => handleButtonSpeak(t('profile.title'))}>{t('profile.title')}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        {/* Points & Progress Card */}
        <div className="bg-card rounded-3xl shadow-soft p-6 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center">
                <Award className="w-8 h-8 text-warning" />
              </div>
              <div onMouseEnter={() => handleButtonSpeak(`${t('profile.points')}: ${user.points}`)}>
                <p className="text-muted-foreground cursor-default">{t('profile.points')}</p>
                <p className="text-4xl font-bold text-foreground cursor-default">{user.points}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t('profile.eventsAttended')}</p>
              <p className="text-2xl font-bold text-primary">{eventsAttended}</p>
            </div>
          </div>

          {/* Progress to next tier */}
          {nextTier && (
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {t('profile.progressToTier')} {nextTier.tier}
                </span>
                <span className="text-sm text-muted-foreground">
                  {nextTier.current} / {nextTier.required}
                </span>
              </div>
              <Progress value={nextTier.percentage} className="h-3" />
            </div>
          )}
          {!nextTier && (
            <div className="bg-success/10 rounded-xl p-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-success" />
              <span className="font-medium text-success">{t('profile.allTiersUnlocked')}</span>
            </div>
          )}
        </div>

        {/* Participation History */}
        <div className="bg-card rounded-3xl shadow-soft p-6 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-4" onMouseEnter={() => handleButtonSpeak(t('profile.history'))}>
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground cursor-default">{t('profile.history')}</h2>
          </div>
          <div className="space-y-3">
            {user.participationHistory.length > 0 ? (
              user.participationHistory.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-xl cursor-default">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>{t('profile.noHistory')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rewards Section */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-6">
            <Gift className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">{t('profile.redeemRewards')}</h2>
          </div>

          {/* Tier 1 Rewards */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              {isTierUnlocked(1) ? (
                <Unlock className="w-6 h-6 text-success" />
              ) : (
                <Lock className="w-6 h-6 text-muted-foreground" />
              )}
              <h3 className="text-xl font-bold text-foreground">
                {tierSettings.find(t => t.tier === 1) ? getTierTitle(tierSettings.find(t => t.tier === 1)!) : 'Tier 1'}
              </h3>
              {!isTierUnlocked(1) && (
                <span className="text-sm text-muted-foreground">
                  ({tierSettings.find(t => t.tier === 1)?.events_required} {t('profile.eventsRequired')})
                </span>
              )}
            </div>
            
            <div className={`space-y-4 ${!isTierUnlocked(1) ? 'opacity-50' : ''}`}>
              {tier1Rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  quantity={getQuantity(reward.id)}
                  onQuantityChange={(delta) => handleQuantityChange(reward.id, delta, reward.max_quantity)}
                  onRedeem={() => handleRedeemClick(reward)}
                  canAfford={canAfford(reward)}
                  isLocked={!isTierUnlocked(1)}
                  userPoints={user.points}
                  language={language}
                  t={t}
                  getLocalizedText={getLocalizedText}
                  getLocalizedDesc={getLocalizedDesc}
                  handleButtonSpeak={handleButtonSpeak}
                />
              ))}
            </div>
          </div>

          {/* Tier 2 Rewards */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              {isTierUnlocked(2) ? (
                <Unlock className="w-6 h-6 text-success" />
              ) : (
                <Lock className="w-6 h-6 text-muted-foreground" />
              )}
              <h3 className="text-xl font-bold text-foreground">
                {tierSettings.find(t => t.tier === 2) ? getTierTitle(tierSettings.find(t => t.tier === 2)!) : 'Tier 2'}
              </h3>
              {!isTierUnlocked(2) && (
                <span className="text-sm text-muted-foreground">
                  ({tierSettings.find(t => t.tier === 2)?.events_required} {t('profile.eventsRequired')})
                </span>
              )}
            </div>
            
            <div className={`space-y-4 ${!isTierUnlocked(2) ? 'opacity-50' : ''}`}>
              {tier2Rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  quantity={getQuantity(reward.id)}
                  onQuantityChange={(delta) => handleQuantityChange(reward.id, delta, reward.max_quantity)}
                  onRedeem={() => handleRedeemClick(reward)}
                  canAfford={canAfford(reward)}
                  isLocked={!isTierUnlocked(2)}
                  userPoints={user.points}
                  language={language}
                  t={t}
                  getLocalizedText={getLocalizedText}
                  getLocalizedDesc={getLocalizedDesc}
                  handleButtonSpeak={handleButtonSpeak}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MapPin className="w-6 h-6 text-primary" />
              {t('profile.deliveryAddress')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-muted-foreground">{t('profile.enterAddress')}</p>

            {selectedReward && (
              <div className="bg-muted rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{getQuantity(selectedReward.id)}x {getLocalizedText(selectedReward, 'title')}</p>
                    <p className="text-sm text-muted-foreground">{t('profile.pointsDeduct')}: {getTotalPoints(selectedReward)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blockNo" className="text-base">{t('meds.blockNo')} *</Label>
                <Input
                  id="blockNo"
                  value={address.blockNo}
                  onChange={(e) => setAddress(prev => ({ ...prev, blockNo: e.target.value }))}
                  placeholder="123"
                  className="h-14 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitNo" className="text-base">{t('meds.unitNo')}</Label>
                <Input
                  id="unitNo"
                  value={address.unitNo}
                  onChange={(e) => setAddress(prev => ({ ...prev, unitNo: e.target.value }))}
                  placeholder="#01-01"
                  className="h-14 text-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street" className="text-base">{t('meds.street')} *</Label>
              <Input
                id="street"
                value={address.street}
                onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
                placeholder="Bedok North Avenue 1"
                className="h-14 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode" className="text-base">{t('meds.postalCode')} *</Label>
              <Input
                id="postalCode"
                value={address.postalCode}
                onChange={(e) => setAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                placeholder="460123"
                className="h-14 text-lg"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowAddressDialog(false)}
                className="flex-1"
                disabled={isProcessing}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="warm"
                size="lg"
                onClick={handleConfirmRedeem}
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? t('profile.processing') : t('profile.confirmRedeem')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AccessibilityBar />
    </div>
  );
}

// Reward Card Component
interface RewardCardProps {
  reward: Reward;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  onRedeem: () => void;
  canAfford: boolean;
  isLocked: boolean;
  userPoints: number;
  language: string;
  t: (key: string) => string;
  getLocalizedText: (item: Reward, field: 'title') => string;
  getLocalizedDesc: (item: Reward) => string;
  handleButtonSpeak: (text: string) => void;
}

function RewardCard({
  reward,
  quantity,
  onQuantityChange,
  onRedeem,
  canAfford,
  isLocked,
  userPoints,
  t,
  getLocalizedText,
  getLocalizedDesc,
  handleButtonSpeak,
}: RewardCardProps) {
  const totalPoints = reward.points_cost * quantity;
  const needMorePoints = totalPoints - userPoints;

  return (
    <div className="bg-card rounded-2xl shadow-soft p-5 border-2 border-transparent hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-lg font-bold text-foreground">{getLocalizedText(reward, 'title')}</h4>
          <p className="text-sm text-muted-foreground">{getLocalizedDesc(reward)}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-warning">
            <Award className="w-5 h-5" />
            <span className="font-bold">{reward.points_cost}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('profile.perVoucher')}</p>
        </div>
      </div>

      {/* Quantity selector */}
      <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-xl">
        <span className="text-foreground font-medium">{t('profile.quantity')}</span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="w-10 h-10 rounded-full"
            onClick={() => onQuantityChange(-1)}
            disabled={quantity <= 1 || isLocked}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-xl font-bold w-8 text-center">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="w-10 h-10 rounded-full"
            onClick={() => onQuantityChange(1)}
            disabled={quantity >= reward.max_quantity || isLocked}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Total and redeem */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted-foreground">{t('profile.totalPoints')}:</span>
        <span className="text-lg font-bold text-warning">{totalPoints} pts</span>
      </div>
      
      <Button
        variant={isLocked ? 'outline' : canAfford ? 'warm' : 'outline'}
        size="lg"
        onClick={onRedeem}
        onMouseEnter={() => handleButtonSpeak(isLocked ? t('profile.tierLocked') : canAfford ? t('profile.redeem') : t('profile.needMorePoints').replace('{points}', String(needMorePoints)))}
        disabled={isLocked || !canAfford}
        className="w-full"
      >
        {isLocked ? (
          <><Lock className="w-4 h-4 mr-2" /> {t('profile.tierLocked')}</>
        ) : canAfford ? (
          t('profile.redeem')
        ) : (
          t('profile.needMorePoints').replace('{points}', String(needMorePoints))
        )}
      </Button>
    </div>
  );
}