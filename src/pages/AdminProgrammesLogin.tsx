import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProgrammeAdmin } from "@/contexts/ProgrammeAdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Users, Shield, Eye, Pencil, Crown } from "lucide-react";

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
  
  // Signup form
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupRole, setSignupRole] = useState<string>("editor");
  const [signupLoading, setSignupLoading] = useState(false);

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupUsername.trim() || !signupPassword.trim() || !signupDisplayName.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (signupPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setSignupLoading(true);

    const { error } = await supabase
      .from("programme_admins")
      .insert([{
        username: signupUsername.toLowerCase().trim(),
        password_hash: signupPassword, // Simple for demo - use bcrypt in production
        display_name: signupDisplayName.trim(),
        role: signupRole as "viewer" | "editor" | "super_admin",
      }]);

    setSignupLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Error", description: "Username already exists", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to create account", variant: "destructive" });
      }
      return;
    }

    toast({ title: "Account Created!", description: "You can now log in" });
    setSignupUsername("");
    setSignupPassword("");
    setSignupDisplayName("");
    setSignupRole("editor");
    fetchAccounts();
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
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6">
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
                  Or login manually
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
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-display-name">Display Name</Label>
                  <Input
                    id="signup-display-name"
                    placeholder="Your name"
                    value={signupDisplayName}
                    onChange={(e) => setSignupDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    placeholder="Choose a username"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={signupRole} onValueChange={setSignupRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>Viewer</span>
                          <span className="text-xs text-muted-foreground">- View only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Pencil className="h-4 w-4 text-primary" />
                          <span>Editor</span>
                          <span className="text-xs text-muted-foreground">- Manage own programmes</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="super_admin">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-500" />
                          <span>Super Admin</span>
                          <span className="text-xs text-muted-foreground">- Full access</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={signupLoading}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {signupLoading ? "Creating..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProgrammesLogin;
