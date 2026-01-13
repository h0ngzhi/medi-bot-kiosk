import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { AccessibilityBar } from "@/components/AccessibilityBar";
import { useDebouncedSpeak } from "@/hooks/useDebouncedSpeak";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { Heart, MapPin, Users, User, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardSlide {
  id: string;
  media_url: string;
  media_type: string;
  duration_seconds: number;
  position: 'left' | 'right';
}

const menuItems = [
  {
    id: "community",
    icon: Users,
    titleKey: "dashboard.community",
    descKey: "dashboard.community.desc",
    path: "/community",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    id: "health",
    icon: Heart,
    titleKey: "dashboard.health",
    descKey: "dashboard.health.desc",
    path: "/health",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "findcare",
    icon: MapPin,
    titleKey: "dashboard.findcare",
    descKey: "dashboard.findcare.desc",
    path: "/findcare",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    id: "profile",
    icon: User,
    titleKey: "dashboard.profile",
    descKey: "dashboard.profile.desc",
    path: "/profile",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

// Vertical Slideshow Component
function VerticalSlideshow({ slides }: { slides: DashboardSlide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (slides.length === 0) return;

    const currentSlide = slides[currentIndex];
    const duration = (currentSlide?.duration_seconds || 5) * 1000;

    const timer = setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, slides]);

  if (slides.length === 0) {
    return (
      <div className="w-full h-full rounded-2xl bg-card/50 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No slides</p>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-card shadow-soft relative">
      <div className={`w-full h-full transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {currentSlide.media_type === 'video' ? (
          <video
            key={currentSlide.id}
            src={currentSlide.media_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            key={currentSlide.id}
            src={currentSlide.media_url}
            alt="Slideshow"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      
      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                currentIndex === index
                  ? "bg-white scale-110"
                  : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, t, setUser, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [leftSlides, setLeftSlides] = useState<DashboardSlide[]>([]);
  const [rightSlides, setRightSlides] = useState<DashboardSlide[]>([]);

  // Fetch dashboard slideshow items
  useEffect(() => {
    const fetchSlides = async () => {
      const { data, error } = await supabase
        .from("dashboard_slideshow")
        .select("id, media_url, media_type, duration_seconds, position")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data) {
        setLeftSlides(data.filter(s => s.position === 'left') as DashboardSlide[]);
        setRightSlides(data.filter(s => s.position === 'right') as DashboardSlide[]);
      }
    };

    fetchSlides();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("dashboard_slideshow_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dashboard_slideshow" },
        () => fetchSlides()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const { handleMouseEnter, handleMouseLeave } = useDebouncedSpeak(isTtsEnabled, language);
  
  // Auto sign-out after 1 minute of inactivity
  useInactivityTimeout();

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('kioskUser');
    navigate("/scan");
  };

  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card shadow-soft p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="animate-fade-in">
            <p
              className="text-base text-muted-foreground cursor-default"
              onMouseEnter={() => handleMouseEnter(t("dashboard.welcome"))}
              onMouseLeave={handleMouseLeave}
            >
              {t("dashboard.welcome")}
            </p>
            <h1
              className="text-2xl font-bold text-foreground cursor-default"
              onMouseEnter={() => handleMouseEnter(user?.name || "Guest")}
              onMouseLeave={handleMouseLeave}
            >
              {user?.name || "Guest"}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            onMouseEnter={() => handleMouseEnter(t("common.logout"))}
            onMouseLeave={handleMouseLeave}
            className="w-12 h-12 rounded-full"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex gap-4 max-w-7xl mx-auto w-full px-4 py-4 pb-28 overflow-hidden">
        {/* Left Slideshow */}
        <div className="w-48 flex-shrink-0 animate-fade-in">
          <VerticalSlideshow slides={leftSlides} />
        </div>

        {/* Center - Menu Grid */}
        <div className="flex-1 flex flex-col">
          <h2
            className="text-xl font-bold text-foreground mb-3 animate-fade-in cursor-default text-center"
            onMouseEnter={() => handleMouseEnter(t("dashboard.title"))}
            onMouseLeave={handleMouseLeave}
          >
            {t("dashboard.title")}
          </h2>

          {/* 2x2 Grid */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            {menuItems.map((item, index) => (
              <Button
                key={item.id}
                variant="outline"
                onClick={() => navigate(item.path)}
                onMouseEnter={() => handleMouseEnter(t(item.titleKey))}
                onMouseLeave={handleMouseLeave}
                className="h-full min-h-[140px] flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 hover:border-primary hover:bg-primary/5 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${(index + 2) * 0.1}s` }}
              >
                <div className={`w-16 h-16 rounded-2xl ${item.bgColor} flex items-center justify-center`}>
                  <item.icon className={`w-8 h-8 ${item.color}`} />
                </div>
                <div
                  className="text-center"
                  onMouseEnter={() => handleMouseEnter(`${t(item.titleKey)}. ${t(item.descKey)}`)}
                  onMouseLeave={handleMouseLeave}
                >
                  <h3 className="text-lg font-bold text-foreground mb-1">{t(item.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{t(item.descKey)}</p>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Right Slideshow */}
        <div className="w-48 flex-shrink-0 animate-fade-in">
          <VerticalSlideshow slides={rightSlides} />
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}