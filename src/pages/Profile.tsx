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
  Star,
  Plus,
  Minus,
  MapPin
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

// CHAS Card images
import chasBlue from '@/assets/chas-blue.png';
import chasOrange from '@/assets/chas-orange.png';
import chasGreen from '@/assets/chas-green.png';
import chasMerdeka from '@/assets/chas-merdeka.png';
import chasPioneer from '@/assets/chas-pioneer.png';
import { toast } from '@/hooks/use-toast';

interface Reward {
  id: string;
  titleKey: string;
  titleEn: string;
  points: number;
  descriptionKey: string;
  descriptionEn: string;
  maxQuantity: number;
}

const availableRewards: Reward[] = [
  {
    id: '1',
    titleKey: 'rewards.ntucVoucher',
    titleEn: '$5 NTUC Voucher',
    points: 200,
    descriptionKey: 'rewards.ntucDesc',
    descriptionEn: 'Use at any NTUC FairPrice outlet',
    maxQuantity: 5,
  },
  {
    id: '2',
    titleKey: 'rewards.guardianVoucher',
    titleEn: '$10 Guardian Voucher',
    points: 400,
    descriptionKey: 'rewards.guardianDesc',
    descriptionEn: 'Use at any Guardian pharmacy',
    maxQuantity: 3,
  },
  {
    id: '3',
    titleKey: 'rewards.healthScreening',
    titleEn: 'Free Health Screening',
    points: 500,
    descriptionKey: 'rewards.screeningDesc',
    descriptionEn: 'One free comprehensive health check',
    maxQuantity: 2,
  },
];

// Reward translations
const rewardTranslations: Record<string, Record<string, string>> = {
  en: {
    'rewards.ntucVoucher': '$5 NTUC Voucher',
    'rewards.ntucDesc': 'Use at any NTUC FairPrice outlet',
    'rewards.guardianVoucher': '$10 Guardian Voucher',
    'rewards.guardianDesc': 'Use at any Guardian pharmacy',
    'rewards.healthScreening': 'Free Health Screening',
    'rewards.screeningDesc': 'One free comprehensive health check',
  },
  zh: {
    'rewards.ntucVoucher': '$5 职总礼券',
    'rewards.ntucDesc': '可在任何职总平价超市使用',
    'rewards.guardianVoucher': '$10 Guardian礼券',
    'rewards.guardianDesc': '可在任何Guardian药房使用',
    'rewards.healthScreening': '免费健康检查',
    'rewards.screeningDesc': '一次全面健康检查',
  },
  ms: {
    'rewards.ntucVoucher': 'Baucar NTUC $5',
    'rewards.ntucDesc': 'Guna di mana-mana cawangan NTUC FairPrice',
    'rewards.guardianVoucher': 'Baucar Guardian $10',
    'rewards.guardianDesc': 'Guna di mana-mana farmasi Guardian',
    'rewards.healthScreening': 'Pemeriksaan Kesihatan Percuma',
    'rewards.screeningDesc': 'Satu pemeriksaan kesihatan menyeluruh percuma',
  },
  ta: {
    'rewards.ntucVoucher': '$5 NTUC வவுச்சர்',
    'rewards.ntucDesc': 'எந்த NTUC FairPrice கடையிலும் பயன்படுத்தலாம்',
    'rewards.guardianVoucher': '$10 Guardian வவுச்சர்',
    'rewards.guardianDesc': 'எந்த Guardian மருந்தகத்திலும் பயன்படுத்தலாம்',
    'rewards.healthScreening': 'இலவச சுகாதார பரிசோதனை',
    'rewards.screeningDesc': 'ஒரு முழுமையான சுகாதார பரிசோதனை',
  },
};

const chasCardImages: Record<string, string> = {
  Blue: chasBlue,
  Orange: chasOrange,
  Green: chasGreen,
  'Merdeka generation': chasMerdeka,
  'Pioneer generation': chasPioneer,
};

export default function Profile() {
  const { user, t, setUser, language, isVoiceEnabled } = useApp();
  const navigate = useNavigate();
  const [showRewards, setShowRewards] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [address, setAddress] = useState({
    blockNo: '',
    unitNo: '',
    street: '',
    postalCode: '',
  });

  // Helper to get reward text in current language
  const getRewardText = (key: string) => {
    return rewardTranslations[language]?.[key] || rewardTranslations['en'][key] || key;
  };

  // Speak button text on hover (always enabled for accessibility)
  const handleButtonSpeak = (text: string) => {
    speakText(text, language);
  };

  const handleQuantityChange = (rewardId: string, delta: number) => {
    const reward = availableRewards.find(r => r.id === rewardId);
    if (!reward) return;
    
    setQuantities(prev => {
      const current = prev[rewardId] || 1;
      const newQty = Math.max(1, Math.min(reward.maxQuantity, current + delta));
      return { ...prev, [rewardId]: newQty };
    });
  };

  const getQuantity = (rewardId: string) => quantities[rewardId] || 1;

  const getTotalPoints = (reward: Reward) => reward.points * getQuantity(reward.id);

  const canAfford = (reward: Reward) => user && user.points >= getTotalPoints(reward);

  const handleRedeemClick = (reward: Reward) => {
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
    
    // Validate address
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
      // Update points in database
      const { error } = await supabase
        .from('kiosk_users')
        .update({ points: newPoints })
        .eq('id', user.id);

      if (error) throw error;

      // Update local user state
      setUser({
        ...user,
        points: newPoints,
      });

      const rewardTitle = getRewardText(selectedReward.titleKey);
      toast({
        title: t('profile.rewardRedeemed'),
        description: `${getQuantity(selectedReward.id)}x ${rewardTitle} ${t('profile.willBeSent')}`,
      });

      setShowAddressDialog(false);
      setSelectedReward(null);
      setAddress({ blockNo: '', unitNo: '', street: '', postalCode: '' });
      // Reset quantity for this reward
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

  if (!user) {
    return null;
  }

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
        {/* CHAS Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-medium mb-6 animate-fade-in aspect-[1.586/1]">
          <img 
            src={chasCardImages[user.chasType] || chasBlue}
            alt={`${user.chasType} CHAS Card`}
            className="w-full h-full object-cover"
          />
          {/* Overlay with user info */}
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-lg font-bold text-gray-800 drop-shadow-sm">{user.name}</p>
          </div>
        </div>

        {/* Points card */}
        <div className="bg-card rounded-3xl shadow-soft p-6 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center">
                <Award className="w-8 h-8 text-warning" />
              </div>
              <div onMouseEnter={() => handleButtonSpeak(`${t('profile.points')}: ${user.points}`)}>
                <p className="text-muted-foreground cursor-default">{t('profile.points')}</p>
                <p className="text-4xl font-bold text-foreground cursor-default">{user.points}</p>
              </div>
            </div>
            <div className="flex">
              {[1, 2, 3].map((i) => (
                <Star key={i} className="w-6 h-6 text-warning fill-warning" />
              ))}
            </div>
          </div>
        </div>

        {/* Participation history */}
        <div className="bg-card rounded-3xl shadow-soft p-6 mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-4" onMouseEnter={() => handleButtonSpeak(t('profile.history'))}>
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground cursor-default">{t('profile.history')}</h2>
          </div>
          <div className="space-y-3">
            {user.participationHistory.length > 0 ? (
              user.participationHistory.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted rounded-xl cursor-default"
                  onMouseEnter={() => handleButtonSpeak(item)}
                >
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))
            ) : (
              <div 
                className="text-center py-6 text-muted-foreground cursor-default"
                onMouseEnter={() => handleButtonSpeak(`${t('profile.noHistory')}. ${t('profile.joinProgrammes')}`)}
              >
                <p className="text-lg">{t('profile.noHistory')}</p>
                <p className="text-sm mt-1">{t('profile.joinProgrammes')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rewards section */}
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button
            variant={showRewards ? 'default' : 'outline'}
            size="xl"
            onClick={() => setShowRewards(!showRewards)}
            onMouseEnter={() => handleButtonSpeak(t('profile.rewards'))}
            className="w-full mb-4"
          >
            <Gift className="w-6 h-6" />
            {t('profile.rewards')}
          </Button>

          {showRewards && (
            <div className="space-y-4 animate-fade-in">
              {availableRewards.map((reward) => {
                const quantity = getQuantity(reward.id);
                const totalPoints = getTotalPoints(reward);
                const affordable = canAfford(reward);
                const rewardTitle = getRewardText(reward.titleKey);
                const rewardDesc = getRewardText(reward.descriptionKey);
                const needMorePoints = totalPoints - user.points;

                return (
                  <div
                    key={reward.id}
                    className="bg-card rounded-2xl shadow-soft p-5 border-2 border-transparent"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{rewardTitle}</h3>
                        <p className="text-sm text-muted-foreground">{rewardDesc}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-warning">
                          <Award className="w-5 h-5" />
                          <span className="font-bold">{reward.points}</span>
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
                          onClick={() => handleQuantityChange(reward.id, -1)}
                          onMouseEnter={() => handleButtonSpeak(t('common.back'))}
                          disabled={quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-10 h-10 rounded-full"
                          onClick={() => handleQuantityChange(reward.id, 1)}
                          onMouseEnter={() => handleButtonSpeak(t('common.next'))}
                          disabled={quantity >= reward.maxQuantity}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Total and redeem button */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-muted-foreground">{t('profile.totalPoints')}:</span>
                      <span className="text-lg font-bold text-warning">{totalPoints} pts</span>
                    </div>
                    
                    <Button
                      variant={affordable ? 'warm' : 'outline'}
                      size="lg"
                      onClick={() => handleRedeemClick(reward)}
                      onMouseEnter={() => handleButtonSpeak(affordable ? t('profile.redeem') : t('profile.needMorePoints').replace('{points}', String(needMorePoints)))}
                      disabled={!affordable}
                      className="w-full"
                    >
                      {affordable ? (
                        t('profile.redeem')
                      ) : (
                        t('profile.needMorePoints').replace('{points}', String(needMorePoints))
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
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
            <p className="text-muted-foreground">
              {t('profile.enterAddress')}
            </p>

            {selectedReward && (
              <div className="bg-muted rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{getQuantity(selectedReward.id)}x {getRewardText(selectedReward.titleKey)}</p>
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
                  onFocus={() => handleButtonSpeak(t('meds.blockNo'))}
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
                  onFocus={() => handleButtonSpeak(t('meds.unitNo'))}
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
                onFocus={() => handleButtonSpeak(t('meds.street'))}
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
                onFocus={() => handleButtonSpeak(t('meds.postalCode'))}
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
                onMouseEnter={() => handleButtonSpeak(t('common.cancel'))}
                className="flex-1"
                disabled={isProcessing}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="warm"
                size="lg"
                onClick={handleConfirmRedeem}
                onMouseEnter={() => handleButtonSpeak(isProcessing ? t('profile.processing') : t('profile.confirmRedeem'))}
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
