import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { speakText } from '@/utils/speechUtils';
import { 
  ArrowLeft, 
  Calendar,
  MapPin,
  Star,
  Users,
  CheckCircle2,
  Play,
  MessageSquare,
  Award
} from 'lucide-react';

interface Programme {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  points: number;
  participants: number;
  isSignedUp: boolean;
  isPast: boolean;
  rating?: number;
  reviews?: { text: string; author: string }[];
  videoReview?: string;
}

const mockProgrammes: Programme[] = [
  {
    id: '1',
    title: 'Heart Health Talk',
    date: '15 Jan 2026',
    time: '10:00 AM',
    location: 'Bedok CC',
    points: 50,
    participants: 25,
    isSignedUp: false,
    isPast: false,
  },
  {
    id: '2',
    title: 'Digital Skills Workshop',
    date: '20 Jan 2026',
    time: '2:00 PM',
    location: 'Tampines Hub',
    points: 100,
    participants: 15,
    isSignedUp: true,
    isPast: false,
  },
  {
    id: '3',
    title: 'Morning Tai Chi',
    date: '10 Jan 2026',
    time: '7:00 AM',
    location: 'Pasir Ris Park',
    points: 30,
    participants: 40,
    isSignedUp: true,
    isPast: true,
    rating: 4.8,
    reviews: [
      { text: 'Very relaxing and good for joints!', author: 'Mdm. Lee' },
      { text: 'Instructor was patient and kind.', author: 'Mr. Tan' },
    ],
  },
  {
    id: '4',
    title: 'Diabetes Prevention',
    date: '5 Jan 2026',
    time: '3:00 PM',
    location: 'Ang Mo Kio CC',
    points: 50,
    participants: 30,
    isSignedUp: true,
    isPast: true,
    rating: 4.5,
    reviews: [
      { text: 'Learned a lot about healthy eating!', author: 'Mdm. Lim' },
    ],
  },
];

export default function CommunityProgrammes() {
  const { t, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState(mockProgrammes);
  const [showReviews, setShowReviews] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const handleSignUp = (id: string) => {
    setProgrammes(prev => 
      prev.map(p => 
        p.id === id ? { ...p, isSignedUp: true, participants: p.participants + 1 } : p
      )
    );
  };

  const upcomingProgrammes = programmes.filter(p => !p.isPast);
  const pastProgrammes = programmes.filter(p => p.isPast);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
      {/* Header */}
      <header className="bg-card shadow-soft p-6 mb-6">
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
          <h1 className="text-heading text-foreground cursor-default" onMouseEnter={() => handleSpeak(t('community.title'))}>{t('community.title')}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'upcoming' ? 'default' : 'outline'}
            size="lg"
            onClick={() => setActiveTab('upcoming')}
            onMouseEnter={() => handleSpeak(t('community.upcoming'))}
            className="flex-1"
          >
            {t('community.upcoming')}
          </Button>
          <Button
            variant={activeTab === 'past' ? 'default' : 'outline'}
            size="lg"
            onClick={() => setActiveTab('past')}
            onMouseEnter={() => handleSpeak(t('community.past'))}
            className="flex-1"
          >
            {t('community.past')}
          </Button>
        </div>

        {/* Programme list */}
        <div className="space-y-4">
          {(activeTab === 'upcoming' ? upcomingProgrammes : pastProgrammes).map((programme, index) => (
            <div
              key={programme.id}
              className="bg-card rounded-3xl shadow-soft p-6 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div onMouseEnter={() => handleSpeak(`${programme.title}. ${programme.date} ${programme.time}. ${programme.location}`)}>
                  <h3 className="text-xl font-bold text-foreground mb-2 cursor-default">{programme.title}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1 cursor-default">
                    <Calendar className="w-5 h-5" />
                    <span>{programme.date} • {programme.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground cursor-default">
                    <MapPin className="w-5 h-5" />
                    <span>{programme.location}</span>
                  </div>
                </div>
                <div className="text-right" onMouseEnter={() => handleSpeak(`${programme.points} ${t('community.points')}`)}>
                  <div className="flex items-center gap-1 text-warning mb-1 cursor-default">
                    <Award className="w-5 h-5" />
                    <span className="font-bold">{programme.points}</span>
                  </div>
                  <span className="text-sm text-muted-foreground cursor-default">{t('community.points')}</span>
                </div>
              </div>

              <div 
                className="flex items-center gap-2 text-muted-foreground mb-4 cursor-default"
                onMouseEnter={() => handleSpeak(`${programme.participants} participants${programme.rating ? `. Rating: ${programme.rating}` : ''}`)}
              >
                <Users className="w-5 h-5" />
                <span>{programme.participants} participants</span>
                {programme.rating && (
                  <>
                    <span className="mx-2">•</span>
                    <Star className="w-5 h-5 text-warning fill-warning" />
                    <span>{programme.rating}</span>
                  </>
                )}
              </div>

              {!programme.isPast && (
                <Button
                  variant={programme.isSignedUp ? 'success' : 'default'}
                  size="lg"
                  onClick={() => !programme.isSignedUp && handleSignUp(programme.id)}
                  onMouseEnter={() => handleSpeak(programme.isSignedUp ? t('community.signed') : t('community.signup'))}
                  disabled={programme.isSignedUp}
                  className="w-full"
                >
                  {programme.isSignedUp ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      {t('community.signed')}
                    </>
                  ) : (
                    t('community.signup')
                  )}
                </Button>
              )}

              {programme.isPast && programme.reviews && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowReviews(showReviews === programme.id ? null : programme.id)}
                    onMouseEnter={() => handleSpeak(t('community.reviews'))}
                    className="w-full"
                  >
                    <MessageSquare className="w-5 h-5" />
                    {t('community.reviews')} ({programme.reviews.length})
                  </Button>

                  {showReviews === programme.id && (
                    <div className="mt-4 space-y-3 animate-fade-in">
                      {/* Video review placeholder */}
                      <button className="w-full aspect-video bg-muted rounded-2xl flex items-center justify-center gap-3 hover:bg-accent transition-colors">
                        <Play className="w-10 h-10 text-primary" />
                        <span className="text-lg font-medium text-foreground">Watch Video Review</span>
                      </button>
                      
                      {/* Text reviews */}
                      {programme.reviews.map((review, idx) => (
                        <div key={idx} className="bg-muted rounded-2xl p-4">
                          <p className="text-foreground mb-2">"{review.text}"</p>
                          <p className="text-sm text-muted-foreground">— {review.author}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
