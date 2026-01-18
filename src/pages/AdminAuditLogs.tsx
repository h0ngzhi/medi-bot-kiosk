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
} from "lucide-react";
import { format } from "date-fns";

const ACCESS_PASSWORD = "catinthebin123";

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

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ACCESS_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError("");
      sessionStorage.setItem("audit_logs_auth", "true");
    } else {
      setPasswordError("Invalid password");
    }
  };

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("audit_logs_auth");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
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
            <CardTitle>Audit Logs Access</CardTitle>
            <CardDescription>
              Enter the password to view admin audit logs
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
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Access Logs
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
                Audit Logs
              </h1>
              <p className="text-sm text-muted-foreground">
                Track all admin account changes
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Showing the last {logs.length} audit log entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No audit logs found</p>
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
