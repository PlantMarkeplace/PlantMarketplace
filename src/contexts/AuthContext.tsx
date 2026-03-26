import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole = "buyer" | "seller" | "expert" | "admin";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  businessName?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

interface SignupData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  businessName?: string;
  specialization?: string;
  yearsOfExperience?: string;
  certifications?: string;
  priceOnline?: string;
  priceOnsite?: string;
  expertLocation?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  // Fetch profile from DB
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", supabaseUser.id)
    .single();

  // Fetch role from DB
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", supabaseUser.id)
    .single();

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    fullName: profile?.full_name ?? supabaseUser.user_metadata?.full_name ?? supabaseUser.email?.split("@")[0] ?? "",
    role: (roleRow?.role as UserRole) ?? "buyer",
    avatar: profile?.avatar_url ?? undefined,
    businessName: profile?.business_name ?? undefined,
    createdAt: supabaseUser.created_at,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          // Defer profile fetch to avoid deadlock
          setTimeout(async () => {
            const mappedUser = await mapSupabaseUser(newSession.user);
            setUser(mappedUser);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!existingSession) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const signup = async (data: SignupData): Promise<{ success: boolean; error?: string }> => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          role: data.role,
          business_name: data.businessName ?? null,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { success: false, error: error.message };

    // If expert role, create expert profile after signup
    if (data.role === "expert" && authData.user) {
      const specs = data.specialization?.split(",").map(s => s.trim()).filter(Boolean) || [];
      const certs = data.certifications?.split(",").map(s => s.trim()).filter(Boolean) || [];
      await supabase.from("experts").insert({
        user_id: authData.user.id,
        specialization: specs,
        years_of_experience: parseInt(data.yearsOfExperience || "0") || 0,
        certifications: certs,
        consultation_price_online: parseFloat(data.priceOnline || "0") || 0,
        consultation_price_onsite: parseFloat(data.priceOnsite || "0") || 0,
        location: data.expertLocation || null,
      });
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);

    // Persist to DB
    await supabase
      .from("profiles")
      .update({
        full_name: updatedUser.fullName,
        avatar_url: updatedUser.avatar ?? null,
        business_name: updatedUser.businessName ?? null,
      })
      .eq("user_id", user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
