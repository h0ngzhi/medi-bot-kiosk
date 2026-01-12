import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { AccessibilityBar } from "@/components/AccessibilityBar";
import { speakText } from "@/utils/speechUtils";
import { Heart, MapPin, Users, User, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface SlideItem {
  id: string;
  media_url: string;
  media_type: string;
  title: string | null;
  duration_seconds: number;
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

export default function Dashboard() {
  const { user, t, setUser, language, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Fetch slideshow items
  useEffect(() => {
    const fetchSlides = async () => {
      const { data, error } = await supabase
        .from("idle_slideshow")
        .select("id, media_url, media_type, title, duration_seconds")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data) {
        setSlides(data);
      }
    };

    fetchSlides();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("dashboard_slideshow")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "idle_slideshow" },
        () => fetchSlides()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (!api || slides.length === 0) return;

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    const currentSlide = slides[current];
    const duration = (currentSlide?.duration_seconds || 5) * 1000;

    const timer = setTimeout(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [api, current, slides]);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const handleLogout = () => {
    setUser(null);
    navigate("/");
  };

  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card shadow-soft p-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="animate-fade-in">
            <p
              className="text-base text-muted-foreground cursor-default"
              onMouseEnter={() => handleSpeak(t("dashboard.welcome"))}
            >
              {t("dashboard.welcome")}
            </p>
            <h1
              className="text-2xl font-bold text-foreground cursor-default"
              onMouseEnter={() => handleSpeak(user?.name || "Guest")}
            >
              {user?.name || "Guest"}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            onMouseEnter={() => handleSpeak(t("common.logout"))}
            className="w-12 h-12 rounded-full"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex gap-4 max-w-6xl mx-auto w-full px-4 py-4 pb-28 overflow-hidden">
        {/* Left side - Slideshow */}
        <div className="flex-1 flex flex-col animate-fade-in">
          {slides.length > 0 ? (
            <Carousel
              setApi={setApi}
              className="w-full h-full rounded-3xl overflow-hidden bg-card shadow-soft"
              opts={{ loop: true }}
            >
              <CarouselContent className="h-full">
                {slides.map((slide) => (
                  <CarouselItem key={slide.id} className="h-full">
                    <div className="relative w-full h-full">
                      {slide.media_type === "video" ? (
                        <video
                          src={slide.media_url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={slide.media_url}
                          alt={slide.title || "Slideshow"}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {slides.length > 1 && (
                <>
                  <CarouselPrevious className="left-4 h-12 w-12" />
                  <CarouselNext className="right-4 h-12 w-12" />
                  {/* Slide indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => api?.scrollTo(index)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          current === index
                            ? "bg-white scale-110"
                            : "bg-white/50 hover:bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </Carousel>
          ) : (
            <div className="w-full h-full rounded-3xl bg-card shadow-soft flex items-center justify-center">
              <p className="text-muted-foreground text-lg">No slides available</p>
            </div>
          )}
        </div>

        {/* Right side - Menu Grid */}
        <div className="w-[400px] flex-shrink-0 flex flex-col">
          <h2
            className="text-xl font-bold text-foreground mb-3 animate-fade-in cursor-default"
            onMouseEnter={() => handleSpeak(t("dashboard.title"))}
          >
            {t("dashboard.title")}
          </h2>

          {/* 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            {menuItems.map((item, index) => (
              <Button
                key={item.id}
                variant="outline"
                onClick={() => navigate(item.path)}
                onMouseEnter={() => handleSpeak(t(item.titleKey))}
                className="h-full min-h-[100px] flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 hover:border-primary hover:bg-primary/5 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${(index + 2) * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                  <item.icon className={`w-7 h-7 ${item.color}`} />
                </div>
                <div
                  className="text-center"
                  onMouseEnter={() => handleSpeak(`${t(item.titleKey)}. ${t(item.descKey)}`)}
                >
                  <h3 className="text-lg font-bold text-foreground">{t(item.titleKey)}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{t(item.descKey)}</p>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
