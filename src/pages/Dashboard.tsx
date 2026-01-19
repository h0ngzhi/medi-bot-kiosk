import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { AccessibilityBar } from "@/components/AccessibilityBar";
import { useDebouncedSpeak } from "@/hooks/useDebouncedSpeak";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { Heart, MapPin, Users, User, LogOut } from "lucide-react";

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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-6 pb-28 overflow-hidden">
        <h2
          className="text-xl font-bold text-foreground mb-4 animate-fade-in cursor-default text-center"
          onMouseEnter={() => handleMouseEnter(t("dashboard.title"))}
          onMouseLeave={handleMouseLeave}
        >
          {t("dashboard.title")}
        </h2>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-5 flex-1">
          {menuItems.map((item, index) => (
            <Button
              key={item.id}
              variant="outline"
              onClick={() => navigate(item.path)}
              onMouseEnter={() => handleMouseEnter(t(item.titleKey))}
              onMouseLeave={handleMouseLeave}
              className="h-full min-h-[160px] flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border-2 hover:border-primary hover:bg-primary/5 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-20 h-20 rounded-2xl ${item.bgColor} flex items-center justify-center`}>
                <item.icon className={`w-10 h-10 ${item.color}`} />
              </div>
              <div
                className="text-center"
                onMouseEnter={() => handleMouseEnter(`${t(item.titleKey)}. ${t(item.descKey)}`)}
                onMouseLeave={handleMouseLeave}
              >
                <h3 className="text-xl font-bold text-foreground mb-1">{t(item.titleKey)}</h3>
                <p className="text-base text-muted-foreground line-clamp-2">{t(item.descKey)}</p>
              </div>
            </Button>
          ))}
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}