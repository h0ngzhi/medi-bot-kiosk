import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProgrammeAdminRole = "viewer" | "editor" | "super_admin";

export interface ProgrammeAdmin {
  id: string;
  username: string;
  display_name: string;
  role: ProgrammeAdminRole;
  is_active: boolean;
}

interface ProgrammeAdminContextType {
  admin: ProgrammeAdmin | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canEdit: (createdByAdminId: string | null) => boolean;
  canDelete: (createdByAdminId: string | null) => boolean;
  canCreate: () => boolean;
  isViewer: () => boolean;
  isEditor: () => boolean;
  isSuperAdmin: () => boolean;
}

const ProgrammeAdminContext = createContext<ProgrammeAdminContextType | undefined>(undefined);

const STORAGE_KEY = "programme_admin_session";

export const ProgrammeAdminProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<ProgrammeAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Verify the admin still exists and is active
        verifySession(parsed.id);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const verifySession = async (adminId: string) => {
    const { data, error } = await supabase
      .from("programme_admins")
      .select("id, username, display_name, role, is_active")
      .eq("id", adminId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      localStorage.removeItem(STORAGE_KEY);
      setAdmin(null);
    } else {
      setAdmin(data as ProgrammeAdmin);
    }
    setLoading(false);
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase
      .from("programme_admins")
      .select("id, username, display_name, role, is_active, password_hash")
      .eq("username", username.toLowerCase().trim())
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return { success: false, error: "Failed to verify credentials" };
    }

    if (!data) {
      return { success: false, error: "Invalid username or password" };
    }

    // Simple password check (for demo - use bcrypt in production)
    if (data.password_hash !== password) {
      return { success: false, error: "Invalid username or password" };
    }

    const adminData: ProgrammeAdmin = {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      role: data.role as ProgrammeAdminRole,
      is_active: data.is_active,
    };

    setAdmin(adminData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: data.id }));
    return { success: true };
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isViewer = () => admin?.role === "viewer";
  const isEditor = () => admin?.role === "editor";
  const isSuperAdmin = () => admin?.role === "super_admin";

  const canCreate = () => {
    if (!admin) return false;
    return admin.role === "editor" || admin.role === "super_admin";
  };

  const canEdit = (createdByAdminId: string | null) => {
    if (!admin) return false;
    if (admin.role === "super_admin") return true;
    if (admin.role === "editor") {
      return createdByAdminId === admin.id;
    }
    return false;
  };

  const canDelete = (createdByAdminId: string | null) => {
    if (!admin) return false;
    if (admin.role === "super_admin") return true;
    if (admin.role === "editor") {
      return createdByAdminId === admin.id;
    }
    return false;
  };

  return (
    <ProgrammeAdminContext.Provider
      value={{
        admin,
        loading,
        login,
        logout,
        canEdit,
        canDelete,
        canCreate,
        isViewer,
        isEditor,
        isSuperAdmin,
      }}
    >
      {children}
    </ProgrammeAdminContext.Provider>
  );
};

export const useProgrammeAdmin = () => {
  const context = useContext(ProgrammeAdminContext);
  if (context === undefined) {
    throw new Error("useProgrammeAdmin must be used within a ProgrammeAdminProvider");
  }
  return context;
};
