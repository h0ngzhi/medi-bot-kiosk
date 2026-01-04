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
  Star
} from 'lucide-react';

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
  isRedeemed: boolean;
}

const mockRewards: Reward[] = [
  {
    id: '1',
    title: '$5 NTUC Voucher',
    points: 200,
    description: 'Use at any NTUC FairPrice outlet',
    isRedeemed: false,
  },
  {
    id: '2',
    title: '$10 Guardian Voucher',
    points: 400,
    description: 'Use at any Guardian pharmacy',
    isRedeemed: false,
  },
  {
    id: '3',
    title: 'Free Health Screening',
    points: 500,
    description: 'One free comprehensive health check',
    isRedeemed: false,
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
  const { user, t } = useApp();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState(mockRewards);
  const [showRewards, setShowRewards] = useState(false);

  const handleRedeem = (id: string, points: number) => {
    if (!user || user.points < points) {
      toast({
        title: 'Not enough points',
        description: 'Join more programmes to earn points!',
        variant: 'destructive',
      });
      return;
    }

    setRewards(prev =>
      prev.map(r => (r.id === id ? { ...r, isRedeemed: true } : r))
    );

    toast({
      title: 'Reward Redeemed!',
      description: 'Your voucher will be sent to your home.',
    });
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
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className={`bg-card rounded-2xl shadow-soft p-5 border-2 ${
                    reward.isRedeemed ? 'border-success/50 opacity-60' : 'border-transparent'
                  }`}
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
                    </div>
                  </div>
                  
                  <Button
                    variant={reward.isRedeemed ? 'success' : user.points >= reward.points ? 'warm' : 'outline'}
                    size="lg"
                    onClick={() => !reward.isRedeemed && handleRedeem(reward.id, reward.points)}
                    disabled={reward.isRedeemed || user.points < reward.points}
                    className="w-full"
                  >
                    {reward.isRedeemed ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Redeemed
                      </>
                    ) : user.points >= reward.points ? (
                      t('profile.redeem')
                    ) : (
                      `Need ${reward.points - user.points} more points`
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
