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
  userDataLoading: boolean;
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
  userDataLoading: false,
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
  const [userDataLoading, setUserDataLoading] = useState(false);

  // fetchUserData gère son propre état userDataLoading
  const fetchUserData = async (userId: string) => {
    setUserDataLoading(true);
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
    } finally {
      setUserDataLoading(false);
    }
  };

  const resetUserData = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setIsResponsable(false);
    setUserService(null);
    setUserDataLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    // Safety timeout : si getSession ne répond pas en 4s, on débloque quand même
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        setUserDataLoading(false);
      }
    }, 4000);

    // ── 1. Session initiale ──────────────────────────────────────────────────
    // On débloquer le routing dès que getSession() répond (lecture localStorage, rapide).
    // fetchUserData tourne en arrière-plan via userDataLoading.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      clearTimeout(safetyTimeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // débloque le routing immédiatement
      if (session?.user) {
        // fetchUserData appelle setUserDataLoading(true) de façon synchrone
        // avant son premier await → React batch avec le render ci-dessus
        await fetchUserData(session.user.id);
      }
    });

    // ── 2. Événements suivants ───────────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        if (event === "INITIAL_SESSION") return;

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            // fetchUserData appelle setUserDataLoading(true) de façon synchrone
            // → batché avec setUser dans le même rendu React 18
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
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isResponsable, userService, loading, userDataLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
