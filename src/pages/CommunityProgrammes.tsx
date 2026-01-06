import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { ProgrammeCard, Programme } from '@/components/community/ProgrammeCard';
import { ProgrammeSignupForm } from '@/components/community/ProgrammeSignupForm';
import { ProgrammeFeedback } from '@/components/community/ProgrammeFeedback';
import { speakText } from '@/utils/speechUtils';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Filter,
  Heart,
  Brain,
  Users,
  HandHeart,
  Smartphone,
  X
} from 'lucide-react';

// Realistic Singapore CCN programmes data
const mockProgrammes: Programme[] = [
  // Active Ageing
  {
    id: '1',
    title: 'Morning Tai Chi for Seniors',
    description: 'Gentle exercise to improve balance and flexibility. Suitable for beginners. Wear comfortable clothes and shoes.',
    category: 'active-ageing',
    date: 'Every Tuesday & Thursday',
    time: '7:30 AM - 8:30 AM',
    venue: 'Bedok Community Centre, Level 1 Multi-Purpose Hall',
    region: 'East',
    eligibility: 'Singapore residents aged 60 and above',
    registrationMethod: 'walkin',
    pointsReward: 30,
    spotsLeft: 15,
    lastUpdated: '1 Jan 2026',
  },
  {
    id: '2',
    title: 'Qigong & Stretching Class',
    description: 'Slow, flowing movements to reduce stress and improve breathing. Great for those with joint pain.',
    category: 'active-ageing',
    date: 'Every Wednesday',
    time: '9:00 AM - 10:00 AM',
    venue: 'Ang Mo Kio Active Ageing Centre',
    region: 'Central',
    eligibility: 'Seniors aged 55 and above',
    registrationMethod: 'form',
    pointsReward: 30,
    spotsLeft: 20,
    lastUpdated: '1 Jan 2026',
  },
  {
    id: '3',
    title: 'Low-Impact Aerobics',
    description: 'Fun exercise class with upbeat music. Modified movements for seniors. No jumping or running.',
    category: 'active-ageing',
    date: 'Every Monday & Friday',
    time: '10:00 AM - 11:00 AM',
    venue: 'Tampines Hub, Level 3 Exercise Room',
    region: 'East',
    eligibility: 'All seniors welcome',
    registrationMethod: 'walkin',
    pointsReward: 30,
    spotsLeft: 25,
    lastUpdated: '1 Jan 2026',
  },

  // Health Education
  {
    id: '4',
    title: 'Managing Diabetes: Eating Well',
    description: 'Learn which foods help control blood sugar. Simple tips for healthy meals at home. Free recipe booklet provided.',
    category: 'health-education',
    date: 'Saturday, 18 Jan 2026',
    time: '2:00 PM - 4:00 PM',
    venue: 'Woodlands Civic Centre, Room 3-05',
    region: 'North',
    eligibility: 'Open to all. Caregivers welcome.',
    registrationMethod: 'phone',
    phoneNumber: '6355 1234',
    pointsReward: 50,
    spotsLeft: 8,
    lastUpdated: '1 Jan 2026',
  },
  {
    id: '5',
    title: 'Fall Prevention Workshop',
    description: 'Tips to prevent falls at home. Learn simple exercises to improve balance. Home safety checklist included.',
    category: 'health-education',
    date: 'Wednesday, 22 Jan 2026',
    time: '10:00 AM - 12:00 PM',
    venue: 'Pasir Ris Elders Activity Centre',
    region: 'East',
    eligibility: 'Seniors aged 60+ and their family members',
    registrationMethod: 'form',
    pointsReward: 50,
    spotsLeft: 12,
    lastUpdated: '1 Jan 2026',
  },
  {
    id: '6',
    title: 'Heart Health Talk',
    description: 'Understanding blood pressure and cholesterol. When to see a doctor. Questions answered by healthcare staff.',
    category: 'health-education',
    date: 'Friday, 24 Jan 2026',
    time: '3:00 PM - 4:30 PM',
    venue: 'Toa Payoh Community Club, Seminar Room',
    region: 'Central',
    eligibility: 'All are welcome',
    registrationMethod: 'walkin',
    pointsReward: 50,
    lastUpdated: '1 Jan 2026',
  },

  // Social Engagement
  {
    id: '7',
    title: 'Mandarin Karaoke Social',
    description: 'Sing your favourite oldies with new friends. Light refreshments provided. Just come and have fun!',
    category: 'social',
    date: 'Every Thursday',
    time: '2:00 PM - 4:00 PM',
    venue: 'Bishan Community Club, Karaoke Room',
    region: 'Central',
    eligibility: 'All seniors welcome',
    registrationMethod: 'walkin',
    pointsReward: 20,
    lastUpdated: '1 Jan 2026',
  },
  {
    id: '8',
    title: 'Mahjong Interest Group',
    description: 'Weekly mahjong sessions to keep your mind sharp. Beginners can learn from experienced players.',
    category: 'social',
    date: 'Every Saturday',
    time: '9:00 AM - 12:00 PM',
    venue: 'Jurong West Active Ageing Centre',
    region: 'West',
    eligibility: 'Members aged 55 and above',
    registrationMethod: 'form',
    pointsReward: 20,
    spotsLeft: 4,
    lastUpdated: '1 Jan 2026',
  },
  {
    id: '9',
    title: 'Gardening Club',
    description: 'Learn to grow vegetables and herbs. Take home plants for your HDB corridor garden. Seeds provided.',
    category: 'social',
    date: 'Every Sunday',
    time: '8:00 AM - 10:00 AM',
    venue: 'Yishun Community Garden (behind Block 765)',
    region: 'North',
    eligibility: 'All residents welcome',
    registrationMethod: 'phone',
    phoneNumber: '6751 4567',
    pointsReward: 25,
    spotsLeft: 10,
    lastUpdated: '1 Jan 2026',
  },

  // Caregiver Support
  {
    id: '10',
    title: 'Caregiver Support Circle',
    description: 'Share experiences with other caregivers. Learn coping strategies. Trained counsellor available.',
    category: 'caregiver',
    date: 'First Saturday of each month',
    time: '10:00 AM - 12:00 PM',
    venue: 'NTUC Health Active Ageing Hub @ Kampung Admiralty',
    region: 'North',
    eligibility: 'Family caregivers of elderly or persons with dementia',
    registrationMethod: 'phone',
    phoneNumber: '6850 7800',
    pointsReward: 40,
    lastUpdated: '1 Jan 2026',
  },
  {
    id: '11',
    title: 'Dementia Care Basics',
    description: 'Understand dementia symptoms. Learn communication tips. How to create a safe home environment.',
    category: 'caregiver',
    date: 'Saturday, 25 Jan 2026',
    time: '2:00 PM - 5:00 PM',
    venue: 'Alzheimer\'s Disease Association, Bendemeer',
    region: 'Central',
    eligibility: 'Family members caring for someone with memory issues',
    registrationMethod: 'form',
    pointsReward: 60,
    spotsLeft: 15,
    lastUpdated: '1 Jan 2026',
  },

  // Digital Literacy
  {
    id: '12',
    title: 'Smartphone Basics for Seniors',
    description: 'Learn to use WhatsApp, take photos, and make video calls. Bring your own phone. Patient instructors.',
    category: 'digital',
    date: 'Every Wednesday',
    time: '2:00 PM - 4:00 PM',
    venue: 'Our Tampines Hub Digital Learning Room',
    region: 'East',
    eligibility: 'Seniors with a smartphone who want to learn',
    registrationMethod: 'form',
    pointsReward: 40,
    spotsLeft: 6,
    lastUpdated: '1 Jan 2026',
  },
  {
    id: '13',
    title: 'Singpass & Government Apps',
    description: 'Set up Singpass on your phone. Learn to check CPF, book appointments. One-on-one help available.',
    category: 'digital',
    date: 'Tuesday, 21 Jan 2026',
    time: '10:00 AM - 12:00 PM',
    venue: 'Choa Chu Kang Community Club, IT Room',
    region: 'West',
    eligibility: 'All Singapore citizens and PRs',
    registrationMethod: 'walkin',
    pointsReward: 40,
    lastUpdated: '1 Jan 2026',
  },
  {
    id: '14',
    title: 'Online Safety for Seniors',
    description: 'Spot scam messages. Protect your personal information. What to do if you receive suspicious calls.',
    category: 'digital',
    date: 'Friday, 31 Jan 2026',
    time: '3:00 PM - 4:30 PM',
    venue: 'Sengkang Community Club, Learning Hub',
    region: 'North-East',
    eligibility: 'All are welcome',
    registrationMethod: 'form',
    pointsReward: 45,
    spotsLeft: 20,
    lastUpdated: '1 Jan 2026',
  },
];

type Category = 'all' | 'active-ageing' | 'health-education' | 'social' | 'caregiver' | 'digital';

const categories: { id: Category; icon: React.ElementType; labelKey: string }[] = [
  { id: 'all', icon: Filter, labelKey: 'community.filterAll' },
  { id: 'active-ageing', icon: Heart, labelKey: 'community.filterActive' },
  { id: 'health-education', icon: Brain, labelKey: 'community.filterHealth' },
  { id: 'social', icon: Users, labelKey: 'community.filterSocial' },
  { id: 'caregiver', icon: HandHeart, labelKey: 'community.filterCaregiver' },
  { id: 'digital', icon: Smartphone, labelKey: 'community.filterDigital' },
];

export default function CommunityProgrammes() {
  const { user, t, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState(mockProgrammes);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  // Fetch user's existing signups
  useEffect(() => {
    const fetchSignups = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('user_programme_signups')
        .select('programme_id')
        .eq('kiosk_user_id', user.id);

      if (!error && data) {
        const signedUpIds = data.map(s => s.programme_id);
        setProgrammes(prev => 
          prev.map(p => ({
            ...p,
            isSignedUp: signedUpIds.includes(p.id)
          }))
        );
      }
    };

    fetchSignups();
  }, [user?.id]);

  // Show feedback after 3 interactions
  useEffect(() => {
    if (interactionCount >= 3 && !showFeedback) {
      const timer = setTimeout(() => {
        setShowFeedback(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [interactionCount, showFeedback]);

  const handleSignUp = (programme: Programme) => {
    setSelectedProgramme(programme);
    setShowSignupForm(true);
    setInteractionCount(prev => prev + 1);
  };

  const handleSignupSuccess = () => {
    if (selectedProgramme) {
      setProgrammes(prev =>
        prev.map(p =>
          p.id === selectedProgramme.id
            ? { ...p, isSignedUp: true, spotsLeft: p.spotsLeft ? p.spotsLeft - 1 : undefined }
            : p
        )
      );
    }
  };

  const filteredProgrammes = activeCategory === 'all'
    ? programmes
    : programmes.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
      {/* Header */}
      <header className="bg-card shadow-soft p-6 mb-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            onMouseEnter={() => handleSpeak(t('common.back'))}
            className="w-14 h-14 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 
              className="text-heading text-foreground cursor-default" 
              onMouseEnter={() => handleSpeak(t('community.title'))}
            >
              {t('community.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('community.subtitle')}</p>
          </div>
        </div>
      </header>

      {/* Category filters */}
      <div className="max-w-2xl mx-auto px-6 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <Button
                key={cat.id}
                variant={isActive ? 'default' : 'outline'}
                size="lg"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setInteractionCount(prev => prev + 1);
                }}
                onMouseEnter={() => handleSpeak(t(cat.labelKey))}
                className={`flex-shrink-0 ${isActive ? '' : 'bg-card'}`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {t(cat.labelKey)}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Programme list */}
      <main className="max-w-2xl mx-auto px-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-muted-foreground">
            {filteredProgrammes.length} {t('community.programmesFound')}
          </p>
          {activeCategory !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveCategory('all')}
              className="text-primary"
            >
              <X className="w-4 h-4 mr-1" />
              {t('community.clearFilter')}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {filteredProgrammes.map((programme, index) => (
            <ProgrammeCard
              key={programme.id}
              programme={programme}
              onSignUp={handleSignUp}
              index={index}
            />
          ))}
        </div>

        {filteredProgrammes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">{t('community.noProgrammes')}</p>
          </div>
        )}

        {/* Quarterly update notice */}
        <div className="mt-8 bg-muted rounded-2xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t('community.programmeNote')}
          </p>
        </div>
      </main>

      {/* Signup Form Modal */}
      {selectedProgramme && (
        <ProgrammeSignupForm
          isOpen={showSignupForm}
          onClose={() => {
            setShowSignupForm(false);
            setSelectedProgramme(null);
          }}
          programme={selectedProgramme}
          onSuccess={handleSignupSuccess}
        />
      )}

      {/* Feedback Modal */}
      <ProgrammeFeedback
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />

      <AccessibilityBar />
    </div>
  );
}
