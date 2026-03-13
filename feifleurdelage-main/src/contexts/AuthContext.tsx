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
  applySession: (session: Session) => Promise<void>;
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
  applySession: async () => {},
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

  const fetchUserData = async (userId: string) => {
    setUserDataLoading(true);
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role, service").eq("user_id", userId),
      ]);
      setProfile(profileResult.data);
      if (rolesResult.error) {
        console.error("Erreur lecture user_roles:", rolesResult.error);
      }
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

  // Appelé directement par LoginPage après signInWithPassword réussi.
  // Ne dépend pas de onAuthStateChange pour le redirect.
  const applySession = async (newSession: Session) => {
    setSession(newSession);
    setUser(newSession.user);
    await fetchUserData(newSession.user.id);
  };

  // Déconnexion immédiate : on réinitialise l'état localement sans attendre
  // que l'événement SIGNED_OUT remonte depuis Supabase.
  const signOut = async () => {
    resetUserData();
    setLoading(false);
    await supabase.auth.signOut().catch(() => {});
  };

  useEffect(() => {
    let isMounted = true;

    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        setUserDataLoading(false);
      }
    }, 4000);

    // ── Session initiale (lecture depuis localStorage, rapide) ───────────────
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      clearTimeout(safetyTimeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
    });

    // ── Événements suivants (TOKEN_REFRESHED, SIGNED_OUT côté serveur…) ──────
    // SIGNED_IN est géré par applySession() dans LoginPage.
    // On conserve l'écoute TOKEN_REFRESHED pour les refresh automatiques.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") return;

        if (event === "TOKEN_REFRESHED") {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchUserData(session.user.id);
          }
        } else if (event === "SIGNED_OUT") {
          // Peut arriver si le serveur révoque la session à distance
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

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isResponsable, userService, loading, userDataLoading, signOut, applySession }}>
      {children}
    </AuthContext.Provider>
  );
};
