import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: { full_name: string } | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchUserData = async (userId: string) => {
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      setProfile(profileResult.data);
      setIsAdmin(rolesResult.data?.some((r) => r.role === "admin") ?? false);
    } catch (e) {
      console.error("Error fetching user data:", e);
      setProfile(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            await fetchUserData(session.user.id);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // Safety timeout
    timeoutId = setTimeout(() => {
      setLoading(false);
    }, 8000);

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
