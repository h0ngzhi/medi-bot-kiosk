import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  Shield, 
  Image, 
  Trophy, 
  LogIn,
  ArrowLeft
} from "lucide-react";

const adminLinks = [
  {
    title: "Programme Login",
    description: "Sign in to manage community programmes",
    icon: LogIn,
    path: "/admin/programmes/login",
    color: "text-primary",
  },
  {
    title: "Programme Management",
    description: "Create, edit and manage community activities",
    icon: Calendar,
    path: "/admin/programmes",
    color: "text-success",
  },
  {
    title: "Account Management",
    description: "Manage vendor and editor accounts",
    icon: Users,
    path: "/admin/programmes/accounts",
    color: "text-info",
  },
  {
    title: "Rewards Management",
    description: "Manage badges, vouchers and tier settings",
    icon: Trophy,
    path: "/admin/rewards",
    color: "text-warning",
  },
  {
    title: "Slideshow Management",
    description: "Control idle screen and dashboard media",
    icon: Image,
    path: "/admin/slideshow",
    color: "text-secondary",
  },
  {
    title: "Owner Dashboard",
    description: "View audit logs and system activity",
    icon: Shield,
    path: "/admin/audit-logs",
    color: "text-destructive",
  },
];

const Admin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage all administrative functions</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {adminLinks.map((link) => (
            <Card 
              key={link.path}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-primary/50"
              onClick={() => navigate(link.path)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${link.color}`}>
                    <link.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{link.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {link.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Admin;
