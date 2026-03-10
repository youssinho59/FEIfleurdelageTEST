import { Link } from "react-router-dom";
import { FileText, MessageSquareWarning, BarChart3, ClipboardList, History, ArrowRight, Flower2, Users, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

type QuickAction = {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  adminOnly?: boolean;
};

const actions: QuickAction[] = [
  { to: "/fei", icon: FileText, title: "Saisir une FEI", description: "Déclarez un événement indésirable", gradient: "from-primary to-accent" },
  { to: "/plaintes", icon: MessageSquareWarning, title: "Plaintes & Réclamations", description: "Enregistrez une plainte ou réclamation", gradient: "from-accent to-[hsl(45,70%,65%)]" },
  { to: "/mes-fei", icon: History, title: "Mes FEI", description: "Suivez vos déclarations et retours", gradient: "from-[hsl(142,60%,40%)] to-[hsl(160,50%,45%)]" },
  { to: "/gestion-fei", icon: ClipboardList, title: "Gestion des FEI", description: "Analysez et traitez les fiches", gradient: "from-primary/80 to-primary", adminOnly: true },
  { to: "/agents", icon: Users, title: "Agents", description: "Gérez les comptes agents", gradient: "from-[hsl(220,50%,55%)] to-[hsl(240,45%,60%)]", adminOnly: true },
  { to: "/statistiques", icon: BarChart3, title: "Statistiques", description: "Consultez les analyses et rapports", gradient: "from-secondary-foreground/70 to-secondary-foreground", adminOnly: true },
];

type Stats = {
  totalFei: number;
  enCours: number;
  closes: number;
  critiques: number;
  totalPlaintes: number;
};

const Dashboard = () => {
  const { isAdmin, profile, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const visibleActions = actions.filter((a) => !a.adminOnly || isAdmin);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const query = isAdmin
        ? supabase.from("fei").select("statut, gravite")
        : supabase.from("fei").select("statut, gravite").eq("user_id", user.id);
      const [feiResult, plaintesResult] = await Promise.all([
        query,
        isAdmin
          ? supabase.from("plaintes").select("id", { count: "exact" })
          : supabase.from("plaintes").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);
      if (feiResult.data) {
        setStats({
          totalFei: feiResult.data.length,
          enCours: feiResult.data.filter((f) => f.statut === "ouvert" || f.statut === "en_cours").length,
          closes: feiResult.data.filter((f) => f.statut === "clos").length,
          critiques: feiResult.data.filter((f) => f.gravite >= 4).length,
          totalPlaintes: plaintesResult.count ?? 0,
        });
      }
    };
    fetchStats();
  }, [user, isAdmin]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl gradient-primary p-7 md:p-10 text-primary-foreground"
      >
        <div className="absolute top-0 right-0 w-56 h-56 opacity-10">
          <Flower2 className="w-full h-full" strokeWidth={0.5} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div>
            <p className="text-primary-foreground/60 text-xs font-medium uppercase tracking-widest mb-1">Espace Qualité · EHPAD La Fleur de l'Âge</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
              {greeting}{profile?.full_name ? `, ${profile.full_name}` : ""} 👋
            </h1>
            <p className="text-primary-foreground/70 text-sm font-body capitalize">{dateStr}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { label: "FEI total", value: stats.totalFei, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
            { label: "En cours", value: stats.enCours, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
            { label: "Clôturées", value: stats.closes, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
            { label: "Critiques (≥4)", value: stats.critiques, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
          ].map((s) => (
            <motion.div key={s.label} variants={item}>
              <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground font-body leading-tight">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-widest mb-4">Accès rapide</h2>
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleActions.map((action) => (
            <motion.div key={action.to} variants={item}>
              <Link to={action.to} className="group block h-full">
                <div className="relative h-full rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-warm hover:-translate-y-1 overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${action.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm`}>
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-sm mb-0.5">{action.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
