import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Shield,
  Lock,
  UserPlus,
  Pencil,
  Key,
  UserX,
  UserCheck,
  FileText,
  RefreshCw,
  Plus,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

const OWNER_DASHBOARD_TOKEN_KEY = 'ownerDashboardToken';

// Validate token format and expiration (24 hours)
function isValidToken(token: string | null): boolean {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    if (parts[0] !== 'owner_dashboard' || parts.length < 2) return false;
    const timestamp = parseInt(parts[1], 10);
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return now - timestamp < twentyFourHours;
  } catch {
    return false;
  }
}

interface AuditLog {
  id: string;
  action: string;
  target_admin_id: string | null;
  target_username: string | null;
  target_display_name: string | null;
  performed_by_id: string | null;
  performed_by_username: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const AdminAuditLogs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Create account state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    display_name: "",
    email: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setPasswordError("Please enter a password");
      return;
    }

    setIsVerifying(true);
    setPasswordError("");

    try {
      const { data, error } = await supabase.functions.invoke('verify-owner-dashboard-access', {
        body: { password }
      });

      if (error) {
        throw error;
      }

      if (data.success && data.token) {
        sessionStorage.setItem(OWNER_DASHBOARD_TOKEN_KEY, data.token);
        sessionStorage.setItem("audit_logs_auth", "true");
        setIsAuthenticated(true);
        setPassword("");
        setPasswordError("");
      } else {
        setPasswordError(data.error || "Incorrect password");
      }
    } catch (error: any) {
      console.error('Password verification error:', error);
      setPasswordError(error?.message || "Failed to verify password. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem(OWNER_DASHBOARD_TOKEN_KEY);
    if (isValidToken(token)) {
      setIsAuthenticated(true);
    } else {
      // Clear invalid token
      sessionStorage.removeItem(OWNER_DASHBOARD_TOKEN_KEY);
      sessionStorage.removeItem("audit_logs_auth");
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLogs();
    }
  }, [isAuthenticated]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast({ title: "Error", description: "Failed to fetch audit logs", variant: "destructive" });
    } else if (data) {
      setLogs(data as AuditLog[]);
    }
    setLoading(false);
  };

  // Audit logging helper
  const logAuditEvent = async (
    action: string,
    targetAccount: { id: string; username: string; display_name: string },
    details?: Record<string, string | number | boolean>
  ) => {
    try {
      await supabase.from("admin_audit_logs").insert([{
        action,
        target_admin_id: targetAccount.id,
        target_username: targetAccount.username,
        target_display_name: targetAccount.display_name,
        performed_by_id: null, // System/owner action
        performed_by_username: "owner",
        details: details ? JSON.parse(JSON.stringify(details)) : null,
      }]);
    } catch (err) {
      console.error("Failed to log audit event:", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.username.trim() || !createForm.password.trim() || !createForm.display_name.trim()) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (createForm.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setCreateLoading(true);

    const { data, error } = await supabase
      .from("programme_admins")
      .insert([{
        username: createForm.username.toLowerCase().trim(),
        password_hash: createForm.password, // Simple for demo - use bcrypt in production
        display_name: createForm.display_name.trim(),
        email: createForm.email.trim() || null,
        role: "editor", // Always create as editor
        created_by: null, // Owner creation
      }])
      .select()
      .single();

    setCreateLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Error", description: "Username already exists", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to create account", variant: "destructive" });
      }
      return;
    }

    // Log audit event
    if (data) {
      await logAuditEvent("account_created", {
        id: data.id,
        username: data.username,
        display_name: data.display_name,
      }, {
        email: createForm.email.trim() || "none",
        role: "editor",
      });
    }

    toast({ title: "Account Created!", description: `Editor account for ${createForm.display_name} has been created` });
    setCreateForm({ username: "", password: "", display_name: "", email: "" });
    setCreateDialogOpen(false);
    fetchLogs(); // Refresh logs to show the new entry
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "account_created":
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case "account_modified":
        return <Pencil className="h-4 w-4 text-blue-600" />;
      case "password_reset":
        return <Key className="h-4 w-4 text-amber-600" />;
      case "account_deactivated":
        return <UserX className="h-4 w-4 text-destructive" />;
      case "account_reactivated":
        return <UserCheck className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "account_created":
        return <Badge className="bg-green-500/10 text-green-600">Created</Badge>;
      case "account_modified":
        return <Badge className="bg-blue-500/10 text-blue-600">Modified</Badge>;
      case "password_reset":
        return <Badge className="bg-amber-500/10 text-amber-600">Password Reset</Badge>;
      case "account_deactivated":
        return <Badge className="bg-destructive/10 text-destructive">Deactivated</Badge>;
      case "account_reactivated":
        return <Badge className="bg-green-500/10 text-green-600">Reactivated</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return null;
    
    const entries = Object.entries(details);
    if (entries.length === 0) return null;

    return (
      <div className="text-xs text-muted-foreground space-y-0.5">
        {entries.map(([key, value]) => (
          <div key={key}>
            <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>{" "}
            {String(value)}
          </div>
        ))}
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Owner Access</CardTitle>
            <CardDescription>
              Enter the password to manage accounts and view audit logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter access password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  autoFocus
                  disabled={isVerifying}
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Access Dashboard
                  </>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/programmes")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/programmes")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Owner Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Create accounts and track all changes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Vendor Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name *</Label>
                    <Input
                      id="display-name"
                      placeholder="Vendor name"
                      value={createForm.display_name}
                      onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      placeholder="Login username"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-password">Password *</Label>
                    <Input
                      id="create-password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Contact email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      New accounts are created with <strong>Editor</strong> role by default. 
                      Editors can only manage programmes they create.
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={createLoading}>
                    {createLoading ? "Creating..." : "Create Account"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              Showing the last {logs.length} account activity entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No audit logs found. Create an account to see activity here.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target Account</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          {getActionBadge(log.action)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.target_display_name ? (
                          <div>
                            <p className="font-medium">{log.target_display_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              @{log.target_username}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.performed_by_username ? (
                          <span className="font-mono text-sm">@{log.performed_by_username}</span>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDetails(log.details as Record<string, unknown>)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAuditLogs;
