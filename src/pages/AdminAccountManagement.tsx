import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProgrammeAdmin } from "@/contexts/ProgrammeAdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Plus,
  Pencil,
  UserX,
  UserCheck,
  Shield,
  Eye,
  Crown,
  Users,
  Key,
} from "lucide-react";
import { format } from "date-fns";

interface AdminAccount {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  role: "viewer" | "editor" | "super_admin";
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

const AdminAccountManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { admin, loading: authLoading, isSuperAdmin } = useProgrammeAdmin();

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    display_name: "",
    email: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
    display_name: "",
    email: "",
    role: "editor" as "viewer" | "editor" | "super_admin",
  });
  const [editLoading, setEditLoading] = useState(false);

  // Reset password form
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Redirect if not super admin
  useEffect(() => {
    if (!authLoading && (!admin || !isSuperAdmin())) {
      navigate("/admin/programmes");
    }
  }, [admin, authLoading, navigate, isSuperAdmin]);

  useEffect(() => {
    if (admin && isSuperAdmin()) {
      fetchAccounts();
    }
  }, [admin]);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("programme_admins")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAccounts(data as AdminAccount[]);
    }
    setLoading(false);
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

    const { error } = await supabase
      .from("programme_admins")
      .insert([{
        username: createForm.username.toLowerCase().trim(),
        password_hash: createForm.password, // Simple for demo - use bcrypt in production
        display_name: createForm.display_name.trim(),
        email: createForm.email.trim() || null,
        role: "editor", // Always create as editor
        created_by: admin?.id || null,
      }]);

    setCreateLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Error", description: "Username already exists", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to create account", variant: "destructive" });
      }
      return;
    }

    toast({ title: "Account Created!", description: `Editor account for ${createForm.display_name} has been created` });
    setCreateForm({ username: "", password: "", display_name: "", email: "" });
    setCreateDialogOpen(false);
    fetchAccounts();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setEditLoading(true);

    const { error } = await supabase
      .from("programme_admins")
      .update({
        display_name: editForm.display_name.trim(),
        email: editForm.email.trim() || null,
        role: editForm.role,
      })
      .eq("id", selectedAccount.id);

    setEditLoading(false);

    if (error) {
      toast({ title: "Error", description: "Failed to update account", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Account updated" });
    setEditDialogOpen(false);
    setSelectedAccount(null);
    fetchAccounts();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setResetLoading(true);

    const { error } = await supabase
      .from("programme_admins")
      .update({ password_hash: newPassword })
      .eq("id", selectedAccount.id);

    setResetLoading(false);

    if (error) {
      toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Password has been reset" });
    setNewPassword("");
    setResetPasswordDialogOpen(false);
    setSelectedAccount(null);
  };

  const toggleAccountStatus = async (account: AdminAccount) => {
    const { error } = await supabase
      .from("programme_admins")
      .update({ is_active: !account.is_active })
      .eq("id", account.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update account status", variant: "destructive" });
      return;
    }

    toast({ 
      title: "Success", 
      description: account.is_active ? "Account deactivated" : "Account reactivated" 
    });
    fetchAccounts();
  };

  const openEditDialog = (account: AdminAccount) => {
    setSelectedAccount(account);
    setEditForm({
      display_name: account.display_name,
      email: account.email || "",
      role: account.role,
    });
    setEditDialogOpen(true);
  };

  const openResetPasswordDialog = (account: AdminAccount) => {
    setSelectedAccount(account);
    setNewPassword("");
    setResetPasswordDialogOpen(true);
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
      case "super_admin": return <Badge className="bg-amber-500/10 text-amber-600">Super Admin</Badge>;
      case "editor": return <Badge className="bg-primary/10 text-primary">Editor</Badge>;
      case "viewer": return <Badge variant="secondary">Viewer</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!admin || !isSuperAdmin()) {
    return null;
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
                <Users className="h-5 w-5" />
                Account Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Create and manage vendor accounts
              </p>
            </div>
          </div>
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
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Accounts</CardTitle>
            <CardDescription>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading accounts...</p>
            ) : accounts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No accounts found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id} className={!account.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(account.role)}
                          <div>
                            <p className="font-medium">{account.display_name}</p>
                            {account.email && (
                              <p className="text-xs text-muted-foreground">{account.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{account.username}</TableCell>
                      <TableCell>{getRoleBadge(account.role)}</TableCell>
                      <TableCell>
                        {account.is_active ? (
                          <Badge className="bg-green-500/10 text-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(account.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(account)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openResetPasswordDialog(account)}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                {account.is_active ? (
                                  <UserX className="h-4 w-4 text-destructive" />
                                ) : (
                                  <UserCheck className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {account.is_active ? "Deactivate Account?" : "Reactivate Account?"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {account.is_active
                                    ? `${account.display_name} will no longer be able to log in or manage programmes.`
                                    : `${account.display_name} will be able to log in again.`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => toggleAccountStatus(account)}>
                                  {account.is_active ? "Deactivate" : "Reactivate"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input
                id="edit-display-name"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: "viewer" | "editor" | "super_admin") => 
                  setEditForm({ ...editForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>Viewer - View only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-primary" />
                      <span>Editor - Manage own programmes</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span>Super Admin - Full access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={editLoading}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter a new password for <strong>{selectedAccount?.display_name}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAccountManagement;
