import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { AccessibilityBar } from "@/components/AccessibilityBar";
import { speakText } from "@/utils/speechUtils";
import { Heart, MapPin, Users, User, ChevronRight, LogOut } from "lucide-react";

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
      <header className="bg-card shadow-soft p-6 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="animate-fade-in">
            <p
              className="text-lg text-muted-foreground cursor-default"
              onMouseEnter={() => handleSpeak(t("dashboard.welcome"))}
            >
              {t("dashboard.welcome")}
            </p>
            <h1
              className="text-heading text-foreground cursor-default"
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
            className="w-14 h-14 rounded-full"
          >
            <LogOut className="w-6 h-6 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main content - Grid layout */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-6 pb-32">
        <h2
          className="text-heading text-foreground mb-6 animate-fade-in cursor-default flex-shrink-0"
          style={{ animationDelay: "0.1s" }}
          onMouseEnter={() => handleSpeak(t("dashboard.title"))}
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
              onMouseEnter={() => handleSpeak(t(item.titleKey))}
              className="h-full min-h-[140px] flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border-2 hover:border-primary hover:bg-primary/5 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${(index + 2) * 0.1}s` }}
            >
              <div className={`w-20 h-20 rounded-2xl ${item.bgColor} flex items-center justify-center`}>
                <item.icon className={`w-10 h-10 ${item.color}`} />
              </div>
              <div
                className="text-center"
                onMouseEnter={() => handleSpeak(`${t(item.titleKey)}. ${t(item.descKey)}`)}
              >
                <h3 className="text-xl font-bold text-foreground mb-1">{t(item.titleKey)}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{t(item.descKey)}</p>
              </div>
            </Button>
          ))}
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
