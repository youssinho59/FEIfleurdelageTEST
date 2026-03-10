import { Link } from "react-router-dom";
import { FileText, MessageSquareWarning, BarChart3, ClipboardList, History, ArrowRight, Flower2, Users, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
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
  iconBg: string;
  adminOnly?: boolean;
};

const actions: QuickAction[] = [
  { to: "/fei", icon: FileText, title: "Saisir une FEI", description: "Déclarez un événement indésirable", gradient: "from-primary to-accent", iconBg: "from-[#c46b48] to-[#d4845e]" },
  { to: "/plaintes", icon: MessageSquareWarning, title: "Plaintes & Réclamations", description: "Enregistrez une plainte ou réclamation", gradient: "from-amber-400 to-amber-500", iconBg: "from-amber-400 to-amber-500" },
  { to: "/mes-fei", icon: History, title: "Mes FEI", description: "Suivez vos déclarations et retours", gradient: "from-emerald-500 to-teal-500", iconBg: "from-emerald-500 to-teal-500" },
  { to: "/gestion-fei", icon: ClipboardList, title: "Gestion des FEI", description: "Analysez et traitez les fiches", gradient: "from-primary/80 to-primary", iconBg: "from-[#c46b48] to-[#a0522d]", adminOnly: true },
  { to: "/agents", icon: Users, title: "Agents", description: "Gérez les comptes agents", gradient: "from-blue-500 to-indigo-500", iconBg: "from-blue-500 to-indigo-500", adminOnly: true },
  { to: "/statistiques", icon: BarChart3, title: "Statistiques", description: "Consultez les analyses et rapports", gradient: "from-violet-500 to-purple-600", iconBg: "from-violet-500 to-purple-600", adminOnly: true },
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
  const [time, setTime] = useState(new Date());

  const visibleActions = actions.filter((a) => !a.adminOnly || isAdmin);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const hour = time.getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const dateStr = time.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const hhmm = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const ss = time.toLocaleTimeString("fr-FR", { second: "2-digit" }).padStart(2, "0").slice(-2);

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3a1f12] via-[#5c2d18] to-[#7a3d20] p-7 md:p-10 text-white shadow-xl"
      >
        {/* Decorative flowers */}
        <div className="absolute -top-6 -right-6 w-64 h-64 opacity-[0.06]">
          <Flower2 className="w-full h-full" strokeWidth={0.4} />
        </div>
        <div className="absolute -bottom-10 -left-8 w-48 h-48 opacity-[0.04] rotate-45">
          <Flower2 className="w-full h-full" strokeWidth={0.4} />
        </div>
        {/* Subtle inner glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: greeting */}
          <div>
            <span className="inline-block text-white/50 text-[10px] font-semibold uppercase tracking-[0.2em] mb-3">
              Espace Qualité · EHPAD La Fleur de l'Âge
            </span>
            <h1 className="text-2xl md:text-3xl font-display font-bold leading-snug">
              {greeting}{profile?.full_name ? `,` : ""}<br className="hidden md:block" />
              {profile?.full_name && (
                <span className="text-[#f0a882]"> {profile.full_name}</span>
              )} {!profile?.full_name && ""}
            </h1>
            <p className="text-white/50 text-sm font-body capitalize mt-2">{dateStr}</p>
            {isAdmin && (
              <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider bg-white/10 border border-white/15 rounded-full px-2.5 py-1 text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f0a882] inline-block" />
                Administrateur
              </span>
            )}
          </div>

          {/* Center: live clock */}
          <div className="flex flex-col items-center md:items-center select-none">
            <div className="flex items-end gap-1 leading-none">
              <span className="text-5xl md:text-6xl font-display font-bold tracking-tight tabular-nums text-white">
                {hhmm}
              </span>
              <span className="text-2xl md:text-3xl font-display font-bold tabular-nums text-white/35 mb-1">
                :{ss}
              </span>
            </div>
            <span className="text-white/35 text-[10px] uppercase tracking-widest mt-2 font-medium">
              Heure locale
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Stats ────────────────────────────────────────────── */}
      {stats && (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "FEI total",
              sub: "toutes déclarations",
              value: stats.totalFei,
              icon: FileText,
              accent: "border-[#c46b48]",
              iconBg: "bg-[#c46b48]/10",
              iconColor: "text-[#c46b48]",
              numColor: "text-[#c46b48]",
            },
            {
              label: "En cours",
              sub: "en attente de traitement",
              value: stats.enCours,
              icon: Clock,
              accent: "border-amber-400",
              iconBg: "bg-amber-50",
              iconColor: "text-amber-500",
              numColor: "text-amber-600",
            },
            {
              label: "Clôturées",
              sub: "dossiers résolus",
              value: stats.closes,
              icon: CheckCircle2,
              accent: "border-emerald-400",
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-500",
              numColor: "text-emerald-600",
            },
            {
              label: "Critiques",
              sub: "gravité ≥ 4",
              value: stats.critiques,
              icon: AlertCircle,
              accent: "border-red-400",
              iconBg: "bg-red-50",
              iconColor: "text-red-500",
              numColor: "text-red-600",
            },
          ].map((s) => (
            <motion.div key={s.label} variants={item}>
              <div className={`rounded-xl border-l-4 ${s.accent} border border-border/60 bg-card px-5 py-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <span className={`text-3xl font-display font-bold tabular-nums ${s.numColor}`}>{s.value}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-none">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-4">Accès rapide</h2>
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleActions.map((action) => (
            <motion.div key={action.to} variants={item}>
              <Link to={action.to} className="group block h-full">
                <div className="relative h-full rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 hover:border-transparent overflow-hidden">
                  {/* Top gradient bar */}
                  <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${action.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-300`} />
                  {/* Hover background glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-13 h-13 w-12 h-12 rounded-2xl bg-gradient-to-br ${action.iconBg} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-300 mt-1" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground text-sm mb-1">{action.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                  </div>
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
