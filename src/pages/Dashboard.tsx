import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AccessibilityBar } from '@/components/AccessibilityBar';
import { speakText } from '@/utils/speechUtils';
import { 
  Heart, 
  Video, 
  Users, 
  User, 
  ChevronRight,
  LogOut,
  Pill
} from 'lucide-react';

const menuItems = [
  {
    id: 'health',
    icon: Heart,
    titleKey: 'dashboard.health',
    descKey: 'dashboard.health.desc',
    path: '/health',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'medications',
    icon: Pill,
    titleKey: 'dashboard.medications',
    descKey: 'dashboard.medications.desc',
    path: '/medications',
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  {
    id: 'teleconsult',
    icon: Video,
    titleKey: 'dashboard.teleconsult',
    descKey: 'dashboard.teleconsult.desc',
    path: '/teleconsult',
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    id: 'community',
    icon: Users,
    titleKey: 'dashboard.community',
    descKey: 'dashboard.community.desc',
    path: '/community',
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    id: 'profile',
    icon: User,
    titleKey: 'dashboard.profile',
    descKey: 'dashboard.profile.desc',
    path: '/profile',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
];

export default function Dashboard() {
  const { user, t, setUser, language } = useApp();
  const navigate = useNavigate();

  const handleSpeak = (text: string) => {
    speakText(text, language);
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted pb-32">
      {/* Header */}
      <header className="bg-card shadow-soft p-6 mb-8">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="animate-fade-in">
            <p className="text-lg text-muted-foreground">{t('dashboard.welcome')}</p>
            <h1 className="text-heading text-foreground">{user?.name || 'Guest'}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            onMouseEnter={() => handleSpeak(t('common.logout'))}
            className="w-14 h-14 rounded-full"
          >
            <LogOut className="w-6 h-6 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-6">
        <h2 className="text-heading text-foreground mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {t('dashboard.title')}
        </h2>

        {/* Menu grid */}
        <div className="space-y-4">
          {menuItems.map((item, index) => (
            <Button
              key={item.id}
              variant="menu"
              size="menu"
              onClick={() => navigate(item.path)}
              onMouseEnter={() => handleSpeak(t(item.titleKey))}
              className="w-full animate-slide-up"
              style={{ animationDelay: `${(index + 2) * 0.1}s` }}
            >
              <div className={`w-16 h-16 rounded-2xl ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                <item.icon className={`w-8 h-8 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-foreground">{t(item.titleKey)}</h3>
                <p className="text-base text-muted-foreground">{t(item.descKey)}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
            </Button>
          ))}
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
