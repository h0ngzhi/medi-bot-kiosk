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
  Lock,
  Unlock,
  Trophy,
  Printer,
  Loader2,
  ChevronRight,
  QrCode
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebouncedSpeak } from '@/hooks/useDebouncedSpeak';
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
  image_url: string | null;
  reward_type: string | null;
}

interface TierSetting {
  tier: number;
  events_required: number;
  title: string;
  title_zh: string | null;
  title_ms: string | null;
  title_ta: string | null;
}

interface RedeemedReward {
  id: string;
  reward_id: string;
  quantity: number;
  points_spent: number;
  redeemed_at: string;
  voucher_code: string | null;
  status: string;
  reward: Reward | null;
}

export default function Profile() {
  const { user, t, setUser, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [processingRewardId, setProcessingRewardId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [tierSettings, setTierSettings] = useState<TierSetting[]>([]);
  const [eventsAttended, setEventsAttended] = useState(0);
  const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
  const [printingCertId, setPrintingCertId] = useState<string | null>(null);
  const [equippedMedalId, setEquippedMedalId] = useState<string | null>(null);
  const [equippingMedalId, setEquippingMedalId] = useState<string | null>(null);
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);
  const [showingVoucherId, setShowingVoucherId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<number>(1);

  // Generate a random voucher code
  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Fetch rewards, tier settings, user events attended, and redeemed rewards
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

      // Fetch user's events attended, equipped medal, and check daily login bonus
      if (user?.id) {
        const { data: userData } = await supabase
          .from('kiosk_users')
          .select('events_attended, equipped_medal_id, last_login_bonus_at, points')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setEventsAttended(userData.events_attended || 0);
          setEquippedMedalId(userData.equipped_medal_id || null);
          
          // Check and grant daily login bonus
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
          const lastBonusDate = userData.last_login_bonus_at;
          
          if (lastBonusDate !== today) {
            // Grant daily login bonus
            const newPoints = (userData.points || 0) + 5;
            const { error } = await supabase
              .from('kiosk_users')
              .update({ 
                points: newPoints,
                last_login_bonus_at: today
              })
              .eq('id', user.id);
            
            if (!error) {
              setUser({ ...user, points: newPoints });
              setDailyBonusClaimed(true);
              toast({
                title: t('profile.dailyBonusClaimed'),
                description: t('profile.dailyBonusDesc'),
              });
            }
          }
        }

        // Fetch redeemed rewards
        const { data: redemptions } = await supabase
          .from('user_reward_redemptions')
          .select(`
            id,
            reward_id,
            quantity,
            points_spent,
            redeemed_at,
            voucher_code,
            status,
            rewards (
              id, title, title_zh, title_ms, title_ta,
              description, description_zh, description_ms, description_ta,
              points_cost, tier, max_quantity, image_url, reward_type
            )
          `)
          .eq('kiosk_user_id', user.id)
          .order('redeemed_at', { ascending: false });

        if (redemptions) {
          setRedeemedRewards(redemptions.map(r => ({
            ...r,
            reward: r.rewards as unknown as Reward
          })));
        }
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
    return null;
  };

  const { handleMouseEnter: handleButtonSpeak, handleMouseLeave } = useDebouncedSpeak(isTtsEnabled, language);

  // Get redeemed quantity for a reward
  const getRedeemedQuantity = (rewardId: string) => {
    return redeemedRewards
      .filter(r => r.reward_id === rewardId)
      .reduce((sum, r) => sum + r.quantity, 0);
  };

  // Get remaining quantity available to redeem
  const getRemainingQuantity = (reward: Reward) => {
    return reward.max_quantity - getRedeemedQuantity(reward.id);
  };

  // Check if reward is maxed out
  const isMaxedOut = (reward: Reward) => {
    return getRedeemedQuantity(reward.id) >= reward.max_quantity;
  };

  const handleQuantityChange = (rewardId: string, delta: number, maxQty: number) => {
    const remaining = getRemainingQuantity(rewards.find(r => r.id === rewardId)!);
    setQuantities(prev => {
      const current = prev[rewardId] || 1;
      const newQty = Math.max(1, Math.min(Math.min(maxQty, remaining), current + delta));
      return { ...prev, [rewardId]: newQty };
    });
  };

  const getQuantity = (rewardId: string) => quantities[rewardId] || 1;

  const getTotalPoints = (reward: Reward) => reward.points_cost * getQuantity(reward.id);

  const canAfford = (reward: Reward) => user && user.points >= getTotalPoints(reward);

  const handleRedeemClick = async (reward: Reward) => {
    if (!user) return;

    if (isMaxedOut(reward)) {
      toast({
        title: t('profile.maxedOut'),
        description: t('profile.alreadyRedeemed'),
        variant: 'destructive',
      });
      return;
    }

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

    setProcessingRewardId(reward.id);
    const totalPointsToDeduct = getTotalPoints(reward);
    const newPoints = user.points - totalPointsToDeduct;

    // Generate voucher code for voucher type rewards
    const voucherCode = reward.reward_type === 'voucher' ? generateVoucherCode() : null;

    try {
      // Create redemption record
      const { data: redemption } = await supabase.from('user_reward_redemptions').insert({
        kiosk_user_id: user.id,
        reward_id: reward.id,
        quantity: getQuantity(reward.id),
        points_spent: totalPointsToDeduct,
        voucher_code: voucherCode,
      }).select().single();

      // Update points
      const { error } = await supabase
        .from('kiosk_users')
        .update({ points: newPoints })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, points: newPoints });

      // Add to redeemed rewards list
      if (redemption) {
        setRedeemedRewards(prev => [{
          ...redemption,
          reward: reward
        }, ...prev]);
      }

      toast({
        title: t('profile.rewardRedeemed'),
        description: `${getQuantity(reward.id)}x ${getLocalizedText(reward, 'title')}`,
      });

      setQuantities(prev => ({ ...prev, [reward.id]: 1 }));
    } catch (error) {
      console.error('Failed to redeem reward:', error);
      toast({
        title: t('profile.redemptionFailed'),
        description: t('profile.tryAgainLater'),
        variant: 'destructive',
      });
    } finally {
      setProcessingRewardId(null);
    }
  };

  const handlePrintCertificate = async (redemptionId: string) => {
    setPrintingCertId(redemptionId);
    // Simulate printing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPrintingCertId(null);
    toast({
      title: t('profile.certificatePrinted'),
      description: t('profile.collectCertificate'),
    });
  };

  // Handle equipping/unequipping a medal
  const handleEquipMedal = async (redemptionId: string | null) => {
    if (!user) return;
    
    setEquippingMedalId(redemptionId || 'unequip');
    
    try {
      const { error } = await supabase
        .from('kiosk_users')
        .update({ equipped_medal_id: redemptionId })
        .eq('id', user.id);

      if (error) throw error;

      setEquippedMedalId(redemptionId);
      
      if (redemptionId) {
        const medal = redeemedRewards.find(r => r.id === redemptionId);
        toast({
          title: t('profile.medalEquipped'),
          description: medal?.reward ? getLocalizedText(medal.reward, 'title') : '',
        });
      } else {
        toast({
          title: t('profile.medalUnequipped'),
        });
      }
    } catch (error) {
      console.error('Failed to equip medal:', error);
      toast({
        title: t('profile.equipFailed'),
        variant: 'destructive',
      });
    } finally {
      setEquippingMedalId(null);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) return null;

  const nextTier = getNextTierProgress();

  // Separate redeemed rewards by type
  const redeemedMedals = redeemedRewards.filter(r => r.reward?.reward_type === 'medal');
  const redeemedCertificates = redeemedRewards.filter(r => r.reward?.reward_type === 'certificate');
  const redeemedVouchers = redeemedRewards.filter(r => r.reward?.reward_type === 'voucher' || !r.reward?.reward_type);

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
          <div className="flex items-center justify-between mb-2">
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
          
          {/* Points System Explanation */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm font-bold text-primary">{t('profile.howPointsWork')}</p>
            </div>
            <ul className="text-sm text-primary space-y-1 ml-7 list-disc">
              <li>{t('profile.dailyBonusRule')}</li>
              <li>{t('profile.eventPointsRule')}</li>
              <li>{t('profile.maxDailyPointsRule')}</li>
            </ul>
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

        {/* Participation History Link */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate('/profile/history')}
          className="w-full mb-6 h-16 text-lg justify-between"
        >
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-primary" />
            <span>{t('profile.history')}</span>
          </div>
          <ChevronRight className="w-5 h-5" />
        </Button>

        {/* Trophy Rack - Medals */}
        {redeemedMedals.length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-3xl shadow-soft p-6 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-7 h-7 text-amber-500" />
                <h2 className="text-xl font-bold text-foreground">{t('profile.trophyRack')}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{t('profile.tapToEquip')}</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {redeemedMedals.map((redemption) => {
                const isEquipped = equippedMedalId === redemption.id;
                const isEquipping = equippingMedalId === redemption.id;
                
                return (
                  <button
                    key={redemption.id}
                    onClick={() => handleEquipMedal(redemption.id)}
                    disabled={isEquipping}
                    className={`text-center p-2 rounded-xl transition-all ${
                      isEquipped 
                        ? 'ring-4 ring-amber-500 bg-amber-100 dark:bg-amber-900/50 scale-105' 
                        : 'hover:bg-white/50 dark:hover:bg-white/10'
                    }`}
                  >
                    {isEquipping ? (
                      <div className="w-20 h-20 mx-auto rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                      </div>
                    ) : redemption.reward?.image_url ? (
                      <img 
                        src={redemption.reward.image_url}
                        alt={getLocalizedText(redemption.reward, 'title')}
                        className="w-20 h-20 mx-auto object-contain rounded-xl bg-white/50 p-2 shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-20 mx-auto rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <Trophy className="w-10 h-10 text-amber-500" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-foreground mt-2 line-clamp-2">
                      {redemption.reward ? getLocalizedText(redemption.reward, 'title') : 'Medal'}
                    </p>
                    {isEquipped && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('profile.equipped')}
                      </span>
                    )}
                    {redemption.quantity > 1 && !isEquipped && (
                      <span className="text-xs text-muted-foreground">x{redemption.quantity}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {equippedMedalId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEquipMedal(null)}
                className="mt-4 text-muted-foreground"
              >
                {t('profile.unequipMedal')}
              </Button>
            )}
          </div>
        )}

        {/* Certificates Section */}
        {redeemedCertificates.length > 0 && (
          <div className="bg-card rounded-3xl shadow-soft p-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">{t('profile.certificates')}</h2>
            </div>
            <div className="space-y-3">
              {redeemedCertificates.map((redemption) => (
                <div key={redemption.id} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div className="flex items-center gap-3">
                    {redemption.reward?.image_url ? (
                      <img 
                        src={redemption.reward.image_url}
                        alt=""
                        className="w-12 h-12 object-contain rounded bg-white p-1"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                        <Award className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {redemption.reward ? getLocalizedText(redemption.reward, 'title') : 'Certificate'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(redemption.redeemed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handlePrintCertificate(redemption.id)}
                    disabled={printingCertId === redemption.id}
                    className="h-12"
                  >
                    {printingCertId === redemption.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('profile.printing')}
                      </>
                    ) : printingCertId === null ? (
                      <>
                        <Printer className="w-4 h-4 mr-2" />
                        {t('profile.print')}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                        {t('profile.printed')}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vouchers Section */}
        {redeemedVouchers.length > 0 && (
          <div className="bg-card rounded-3xl shadow-soft p-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-success" />
              <h2 className="text-xl font-bold text-foreground">{t('profile.vouchers')}</h2>
            </div>
            <div className="space-y-4">
              {redeemedVouchers.map((redemption) => (
                <div key={redemption.id} className="p-4 bg-gradient-to-r from-success/5 to-primary/5 rounded-xl border border-success/20">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-lg text-foreground">
                        {redemption.reward ? getLocalizedText(redemption.reward, 'title') : 'Voucher'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('profile.redeemedOn')} {new Date(redemption.redeemed_at).toLocaleDateString()}
                      </p>
                    </div>
                    {redemption.quantity > 1 && (
                      <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                        x{redemption.quantity}
                      </span>
                    )}
                  </div>
                  
                  {/* Show Barcode Button or Barcode */}
                  {showingVoucherId === redemption.id ? (
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="flex justify-center items-end gap-0.5 h-16 mb-2">
                        {/* Generate barcode-like bars */}
                        {Array.from({ length: 40 }).map((_, i) => (
                          <div 
                            key={i}
                            className="bg-black"
                            style={{ 
                              width: Math.random() > 0.5 ? '2px' : '3px',
                              height: `${40 + Math.random() * 24}px`
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <QrCode className="w-4 h-4 text-muted-foreground" />
                        <p className="font-mono text-lg font-bold tracking-wider text-foreground">
                          {redemption.voucher_code || generateVoucherCode()}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('profile.showToRedeem')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowingVoucherId(null)}
                        className="mt-3"
                      >
                        {t('profile.hideBarcode')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => setShowingVoucherId(redemption.id)}
                      className="w-full h-14 text-lg"
                    >
                      <QrCode className="w-5 h-5 mr-2" />
                      {t('profile.showBarcode')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards Section */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-4">
            <Gift className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">{t('profile.redeemRewards')}</h2>
          </div>

          {/* Tier Selection Buttons */}
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
            {tierSettings.map((tier) => {
              const isUnlocked = isTierUnlocked(tier.tier);
              const isSelected = selectedTier === tier.tier;
              const tierRewardsCount = rewards.filter(r => r.tier === tier.tier).length;
              
              return (
                <Button
                  key={tier.tier}
                  variant={isSelected ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setSelectedTier(tier.tier)}
                  onMouseEnter={() => handleButtonSpeak(getTierTitle(tier))}
                  className={`flex-shrink-0 h-14 px-6 gap-2 ${
                    isSelected 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : !isUnlocked 
                        ? 'opacity-60' 
                        : ''
                  }`}
                >
                  {isUnlocked ? (
                    <Unlock className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  <span className="font-bold">{getTierTitle(tier)}</span>
                  {tierRewardsCount > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isSelected 
                        ? 'bg-primary-foreground/20 text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {tierRewardsCount}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Selected Tier Info */}
          {tierSettings.find(t => t.tier === selectedTier) && (
            <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl ${
              isTierUnlocked(selectedTier) 
                ? 'bg-success/10 border border-success/20' 
                : 'bg-muted border border-border'
            }`}>
              {isTierUnlocked(selectedTier) ? (
                <>
                  <Unlock className="w-5 h-5 text-success" />
                  <span className="text-success font-medium">{t('profile.tierUnlocked')}</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {t('profile.attendEventsToUnlock').replace('{count}', String(tierSettings.find(t => t.tier === selectedTier)?.events_required || 0))}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Filtered Rewards by Tier */}
          <div className={`space-y-4 ${!isTierUnlocked(selectedTier) ? 'opacity-50' : ''}`}>
            {rewards
              .filter(reward => reward.tier === selectedTier)
              .map((reward) => {
                const remaining = getRemainingQuantity(reward);
                const maxedOut = isMaxedOut(reward);
                return (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    quantity={getQuantity(reward.id)}
                    onQuantityChange={(delta) => handleQuantityChange(reward.id, delta, reward.max_quantity)}
                    onRedeem={() => handleRedeemClick(reward)}
                    canAfford={canAfford(reward)}
                    isLocked={!isTierUnlocked(selectedTier)}
                    isMaxedOut={maxedOut}
                    remainingQuantity={remaining}
                    isProcessing={processingRewardId === reward.id}
                    userPoints={user.points}
                    language={language}
                    t={t}
                    getLocalizedText={getLocalizedText}
                    getLocalizedDesc={getLocalizedDesc}
                    handleButtonSpeak={handleButtonSpeak}
                  />
                );
              })}
            {rewards.filter(reward => reward.tier === selectedTier).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('profile.noRewardsInTier')}</p>
              </div>
            )}
          </div>
        </div>
      </main>

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
  isMaxedOut: boolean;
  remainingQuantity: number;
  isProcessing: boolean;
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
  isMaxedOut,
  remainingQuantity,
  isProcessing,
  userPoints,
  t,
  getLocalizedText,
  getLocalizedDesc,
  handleButtonSpeak,
}: RewardCardProps) {
  const totalPoints = reward.points_cost * quantity;
  const needMorePoints = totalPoints - userPoints;

  const typeIcon = reward.reward_type === 'certificate' ? '📜' : reward.reward_type === 'medal' ? '🏆' : '🎫';

  const isDisabled = isLocked || !canAfford || isMaxedOut || isProcessing;

  return (
    <div className={`bg-card rounded-2xl shadow-soft p-5 border-2 border-transparent transition-colors ${isMaxedOut ? 'opacity-50' : 'hover:border-primary/20'}`}>
      <div className="flex items-start gap-4 mb-3">
        {/* Badge Image */}
        {reward.image_url && (
          <div className="flex-shrink-0">
            <img 
              src={reward.image_url} 
              alt={getLocalizedText(reward, 'title')}
              className="w-20 h-20 object-contain rounded-xl bg-muted p-1"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{typeIcon}</span>
                <h4 className="text-lg font-bold text-foreground">{getLocalizedText(reward, 'title')}</h4>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{getLocalizedDesc(reward)}</p>
              {/* Max quantity info */}
              <p className="text-xs text-muted-foreground mt-1">
                {t('profile.maxQuantity')}: {reward.max_quantity} ({remainingQuantity} {t('profile.remaining')})
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="flex items-center gap-1 text-warning">
                <Award className="w-5 h-5" />
                <span className="font-bold">{reward.points_cost}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('profile.perVoucher')}</p>
            </div>
          </div>
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
            disabled={quantity <= 1 || isDisabled}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-xl font-bold w-8 text-center">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="w-10 h-10 rounded-full"
            onClick={() => onQuantityChange(1)}
            disabled={quantity >= remainingQuantity || isDisabled}
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
        variant={isDisabled ? 'outline' : 'warm'}
        size="lg"
        onClick={onRedeem}
        onMouseEnter={() => handleButtonSpeak(
          isMaxedOut ? t('profile.maxedOut') :
          isLocked ? t('profile.tierLocked') : 
          canAfford ? t('profile.redeem') : 
          t('profile.needMorePoints').replace('{points}', String(needMorePoints))
        )}
        disabled={isDisabled}
        className="w-full"
      >
        {isProcessing ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('profile.processing')}</>
        ) : isMaxedOut ? (
          <><CheckCircle2 className="w-4 h-4 mr-2" /> {t('profile.maxedOut')}</>
        ) : isLocked ? (
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
