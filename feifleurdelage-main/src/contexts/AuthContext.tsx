import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: { full_name: string } | null;
  isAdmin: boolean;
  isResponsable: boolean;
  userService: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isResponsable: false,
  userService: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isResponsable, setIsResponsable] = useState(false);
  const [userService, setUserService] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role, service").eq("user_id", userId),
      ]);
      setProfile(profileResult.data);
      const roles = rolesResult.data || [];
      setIsAdmin(roles.some((r) => r.role === "admin"));
      const responsableRow = roles.find((r) => r.role === "responsable");
      setIsResponsable(!!responsableRow);
      setUserService(responsableRow?.service ?? null);
    } catch (e) {
      console.error("Error fetching user data:", e);
      setProfile(null);
      setIsAdmin(false);
      setIsResponsable(false);
      setUserService(null);
    }
  };

  const resetUserData = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setIsResponsable(false);
    setUserService(null);
  };

  useEffect(() => {
    let isMounted = true;
    const safetyTimeout = setTimeout(() => setLoading(false), 8000);

    // ── 1. Session initiale ──────────────────────────────────────────────────
    // getSession() garantit que le client Supabase a propagé ses headers auth
    // avant d'interroger user_roles (évite la race condition avec INITIAL_SESSION)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    // ── 2. Événements suivants ───────────────────────────────────────────────
    // onAuthStateChange écoute SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED.
    // On ignore INITIAL_SESSION (déjà traité ci-dessus via getSession).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        if (event === "INITIAL_SESSION") return;

        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session?.user) {
            await fetchUserData(session.user.id);
          }
          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          resetUserData();
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isResponsable, userService, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
