import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: { full_name: string } | null;
  isAdmin: boolean;
  isResponsable: boolean;
  userServices: string[];
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
  userServices: [],
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
  const [userServices, setUserServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(false);

  const fetchUserData = async (userId: string) => {
    setUserDataLoading(true);
    try {
      // Promise.allSettled : une requête qui échoue ne réinitialise pas les autres
      const [profileSettled, rolesSettled, servicesSettled] = await Promise.allSettled([
        supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("user_services").select("service").eq("user_id", userId),
      ]);

      // Profil
      if (profileSettled.status === "fulfilled") {
        setProfile(profileSettled.value.data);
      }

      // Rôles (critique — log explicite si échec)
      if (rolesSettled.status === "rejected") {
        console.error("Erreur lecture user_roles (exception):", rolesSettled.reason);
        setIsAdmin(false);
        setIsResponsable(false);
      } else {
        if (rolesSettled.value.error) {
          console.error("Erreur lecture user_roles:", rolesSettled.value.error);
        }
        const roles = rolesSettled.value.data || [];
        setIsAdmin(roles.some((r) => r.role === "admin"));
        setIsResponsable(roles.some((r) => r.role === "responsable"));
      }

      // Services (non critique — échec silencieux)
      if (servicesSettled.status === "fulfilled") {
        setUserServices(servicesSettled.value.data?.map((s) => s.service) ?? []);
      } else {
        console.warn("Erreur lecture user_services:", servicesSettled.reason);
        setUserServices([]);
      }
    } catch (e) {
      console.error("Error fetching user data:", e);
      setProfile(null);
      setIsAdmin(false);
      setIsResponsable(false);
      setUserServices([]);
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
    setUserServices([]);
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
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isResponsable, userServices, loading, userDataLoading, signOut, applySession }}>
      {children}
    </AuthContext.Provider>
  );
};
