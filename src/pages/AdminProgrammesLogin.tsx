import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProgrammeAdmin } from "@/contexts/ProgrammeAdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Users, Shield, Eye, Pencil, Crown, Info } from "lucide-react";

interface AdminAccount {
  id: string;
  username: string;
  display_name: string;
  role: string;
}

const AdminProgrammesLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { admin, login, loading: authLoading } = useProgrammeAdmin();
  
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Quick select
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [quickPassword, setQuickPassword] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && admin) {
      navigate("/admin/programmes");
    }
  }, [admin, authLoading, navigate]);

  // Fetch existing accounts for quick select
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("programme_admins")
      .select("id, username, display_name, role")
      .eq("is_active", true)
      .order("display_name");

    if (!error && data) {
      setAccounts(data);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      toast({ title: "Error", description: "Please enter username and password", variant: "destructive" });
      return;
    }

    setLoginLoading(true);
    const result = await login(loginUsername, loginPassword);
    setLoginLoading(false);

    if (result.success) {
      toast({ title: "Welcome!", description: "Login successful" });
      navigate("/admin/programmes");
    } else {
      toast({ title: "Login Failed", description: result.error, variant: "destructive" });
    }
  };

  const handleQuickLogin = async () => {
    if (!selectedAccountId || !quickPassword.trim()) {
      toast({ title: "Error", description: "Please select an account and enter password", variant: "destructive" });
      return;
    }

    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return;

    setLoginLoading(true);
    const result = await login(account.username, quickPassword);
    setLoginLoading(false);

    if (result.success) {
      toast({ title: "Welcome!", description: `Logged in as ${account.display_name}` });
      navigate("/admin/programmes");
    } else {
      toast({ title: "Login Failed", description: result.error, variant: "destructive" });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin": return <Crown className="h-4 w-4 text-amber-500" />;
      case "editor": return <Pencil className="h-4 w-4 text-primary" />;
      case "viewer": return <Eye className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "editor": return "Editor";
      case "viewer": return "Viewer";
      default: return role;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Programme Admin Portal</CardTitle>
          <CardDescription>
            Sign in to manage community programmes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Select for Testing */}
          {accounts.length > 0 && (
            <div className="space-y-4 pb-6 border-b">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                Quick Select (Testing)
              </div>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(account.role)}
                        <span>{account.display_name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({getRoleBadge(account.role)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAccountId && (
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={quickPassword}
                    onChange={(e) => setQuickPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQuickLogin()}
                  />
                  <Button onClick={handleQuickLogin} disabled={loginLoading}>
                    {loginLoading ? "..." : "Login"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Manual Login */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              {accounts.length > 0 ? "Or login manually" : "Login"}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loginLoading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loginLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="w-full p-3 bg-muted/50 rounded-lg flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Need an account? Contact your system administrator to request access.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminProgrammesLogin;
