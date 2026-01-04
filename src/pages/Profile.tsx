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

// CHAS Card images
import chasBlue from '@/assets/chas-blue.png';
import chasOrange from '@/assets/chas-orange.png';
import chasGreen from '@/assets/chas-green.png';
import chasMerdeka from '@/assets/chas-merdeka.png';
import chasPioneer from '@/assets/chas-pioneer.png';
import { toast } from '@/hooks/use-toast';

interface Reward {
  id: string;
  title: string;
  points: number;
  description: string;
  maxQuantity: number;
}

const availableRewards: Reward[] = [
  {
    id: '1',
    title: '$5 NTUC Voucher',
    points: 200,
    description: 'Use at any NTUC FairPrice outlet',
    maxQuantity: 5,
  },
  {
    id: '2',
    title: '$10 Guardian Voucher',
    points: 400,
    description: 'Use at any Guardian pharmacy',
    maxQuantity: 3,
  },
  {
    id: '3',
    title: 'Free Health Screening',
    points: 500,
    description: 'One free comprehensive health check',
    maxQuantity: 2,
  },
];

const chasCardImages: Record<string, string> = {
  Blue: chasBlue,
  Orange: chasOrange,
  Green: chasGreen,
  'Merdeka generation': chasMerdeka,
  'Pioneer generation': chasPioneer,
};

export default function Profile() {
  const { user, t, setUser } = useApp();
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
        title: 'Not enough points',
        description: 'Join more programmes to earn points!',
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
        title: 'Please fill in your address',
        description: 'We need your address to deliver the reward.',
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

      toast({
        title: 'Reward Redeemed!',
        description: `${getQuantity(selectedReward.id)}x ${selectedReward.title} will be sent to your home.`,
      });

      setShowAddressDialog(false);
      setSelectedReward(null);
      setAddress({ blockNo: '', unitNo: '', street: '', postalCode: '' });
      // Reset quantity for this reward
      setQuantities(prev => ({ ...prev, [selectedReward.id]: 1 }));
    } catch (error) {
      console.error('Failed to redeem reward:', error);
      toast({
        title: 'Redemption Failed',
        description: 'Please try again later.',
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
            className="w-14 h-14 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-heading text-foreground">{t('profile.title')}</h1>
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
              <div>
                <p className="text-muted-foreground">{t('profile.points')}</p>
                <p className="text-4xl font-bold text-foreground">{user.points}</p>
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
          <div className="flex items-center gap-3 mb-4">
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{t('profile.history')}</h2>
          </div>
          <div className="space-y-3">
            {user.participationHistory.length > 0 ? (
              user.participationHistory.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted rounded-xl"
                >
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-lg">No programme participation yet</p>
                <p className="text-sm mt-1">Join community programmes to earn points!</p>
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

                return (
                  <div
                    key={reward.id}
                    className="bg-card rounded-2xl shadow-soft p-5 border-2 border-transparent"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{reward.title}</h3>
                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-warning">
                          <Award className="w-5 h-5" />
                          <span className="font-bold">{reward.points}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">per voucher</p>
                      </div>
                    </div>

                    {/* Quantity selector */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-xl">
                      <span className="text-foreground font-medium">Quantity</span>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-10 h-10 rounded-full"
                          onClick={() => handleQuantityChange(reward.id, -1)}
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
                          disabled={quantity >= reward.maxQuantity}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Total and redeem button */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-muted-foreground">Total points needed:</span>
                      <span className="text-lg font-bold text-warning">{totalPoints} pts</span>
                    </div>
                    
                    <Button
                      variant={affordable ? 'warm' : 'outline'}
                      size="lg"
                      onClick={() => handleRedeemClick(reward)}
                      disabled={!affordable}
                      className="w-full"
                    >
                      {affordable ? (
                        t('profile.redeem')
                      ) : (
                        `Need ${totalPoints - user.points} more points`
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
              Delivery Address
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-muted-foreground">
              Enter your address for reward delivery:
            </p>

            {selectedReward && (
              <div className="bg-muted rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{getQuantity(selectedReward.id)}x {selectedReward.title}</p>
                    <p className="text-sm text-muted-foreground">Points to deduct: {getTotalPoints(selectedReward)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blockNo" className="text-base">Block/House No. *</Label>
                <Input
                  id="blockNo"
                  value={address.blockNo}
                  onChange={(e) => setAddress(prev => ({ ...prev, blockNo: e.target.value }))}
                  placeholder="123"
                  className="h-14 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitNo" className="text-base">Unit No.</Label>
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
              <Label htmlFor="street" className="text-base">Street Name *</Label>
              <Input
                id="street"
                value={address.street}
                onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
                placeholder="Bedok North Avenue 1"
                className="h-14 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode" className="text-base">Postal Code *</Label>
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
                Cancel
              </Button>
              <Button
                variant="warm"
                size="lg"
                onClick={handleConfirmRedeem}
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Confirm & Redeem'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AccessibilityBar />
    </div>
  );
}
