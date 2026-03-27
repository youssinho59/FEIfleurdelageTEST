import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { THEMES_AGEVAL, ANNEES_INDICATEURS } from "@/lib/pacqStrategique";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Calendar, BarChart3, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionWithObjectif = {
  id: string;
  intitule: string | null;
  pilote: string | null;
  priorite: string | null;
  avancement: string | null;
  echeance: string | null;
  objectif_id: string;
  objectif_intitule: string;
  objectif_theme: string;
};

type Indicateur = {
  action_id: string;
  annee: number;
  commentaire: string | null;
};

// ─── Configs ──────────────────────────────────────────────────────────────────

const AVANCEMENT_CONFIG: Record<string, { color: string }> = {
  "Non initié":   { color: "bg-slate-100 text-slate-500"    },
  "Planification":{ color: "bg-amber-100 text-amber-700"    },
  "En cours":     { color: "bg-blue-100 text-blue-700"      },
  "Finalisation": { color: "bg-violet-100 text-violet-700"  },
  "Terminé":      { color: "bg-emerald-100 text-emerald-700"},
};

const THEME_BADGE: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-700",
  rose:   "bg-rose-100 text-rose-700",
  blue:   "bg-blue-100 text-blue-700",
  green:  "bg-green-100 text-green-700",
  red:    "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  teal:   "bg-teal-100 text-teal-700",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item      = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

// ─── Component ────────────────────────────────────────────────────────────────

export default function MesPacqStrategiquePage() {
  const { profile } = useAuth();
  const [actions, setActions]           = useState<ActionWithObjectif[]>([]);
  const [indicateurs, setIndicateurs]   = useState<Indicateur[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterAvancement, setFilterAvancement] = useState("tous");
  const [expandedIndicateurs, setExpandedIndicateurs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile?.full_name) return;
    const load = async () => {
      setLoading(true);

      const { data: actData, error: actErr } = await supabase
        .from("pacq_strategique_actions")
        .select(`
          id, intitule, pilote, priorite, avancement, echeance, objectif_id,
          pacq_strategique_objectifs ( intitule, theme )
        `)
        .eq("pilote", profile.full_name)
        .order("echeance", { ascending: true, nullsFirst: false });

      if (actErr) { setLoading(false); return; }

      const acts: ActionWithObjectif[] = ((actData as any[]) || []).map(a => ({
        id: a.id,
        intitule: a.intitule,
        pilote: a.pilote,
        priorite: a.priorite,
        avancement: a.avancement,
        echeance: a.echeance,
        objectif_id: a.objectif_id,
        objectif_intitule: a.pacq_strategique_objectifs?.intitule ?? "—",
        objectif_theme: a.pacq_strategique_objectifs?.theme ?? "",
      }));
      setActions(acts);

      const actIds = acts.map(a => a.id);
      if (actIds.length > 0) {
        const { data: indData } = await supabase
          .from("pacq_strategique_indicateurs")
          .select("action_id, annee, commentaire")
          .in("action_id", actIds);
        setIndicateurs((indData as Indicateur[]) || []);
      }

      setLoading(false);
    };
    load();
  }, [profile?.full_name]);

  const filtered = actions.filter(a =>
    filterAvancement === "tous" || a.avancement === filterAvancement
  );

  const toggleIndicateurs = (id: string) =>
    setExpandedIndicateurs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const themeMeta = (themeId: string) => THEMES_AGEVAL.find(t => t.id === themeId);

  const enCours  = actions.filter(a => a.avancement === "En cours").length;
  const termines = actions.filter(a => a.avancement === "Terminé").length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Mes actions — PACQS Stratégique</h1>
          <p className="text-xs text-muted-foreground">Actions du projet d'établissement dont vous êtes pilote</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4">
        {[
          { label: "Total",     value: actions.length, accent: "border-l-[#c46b48]",    numColor: "text-[#c46b48]"    },
          { label: "En cours",  value: enCours,        accent: "border-l-blue-400",     numColor: "text-blue-600"     },
          { label: "Terminées", value: termines,       accent: "border-l-emerald-400",  numColor: "text-emerald-600"  },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-l-4 ${s.accent} border border-border/60 bg-card px-5 py-4 flex items-center justify-between shadow-sm`}>
            <p className="text-sm font-semibold text-foreground">{s.label}</p>
            <span className={`text-2xl font-display font-bold tabular-nums ${s.numColor}`}>{s.value}</span>
          </div>
        ))}
      </motion.div>

      {/* Filtre */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="flex flex-wrap gap-3 items-center p-4 rounded-xl border border-border bg-card/50">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={filterAvancement} onValueChange={setFilterAvancement}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les avancements</SelectItem>
            {["Non initié", "Planification", "En cours", "Finalisation", "Terminé"].map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterAvancement !== "tous" && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => setFilterAvancement("tous")}>
            Réinitialiser
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} action{filtered.length > 1 ? "s" : ""}</span>
      </motion.div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <Target className="w-12 h-12 mx-auto opacity-20" />
          <p className="font-medium">Aucune action ne vous est assignée</p>
          <p className="text-sm">Les actions dont vous êtes pilote apparaîtront ici.</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {filtered.map(act => {
            const avCfg    = AVANCEMENT_CONFIG[act.avancement || "Non initié"] ?? AVANCEMENT_CONFIG["Non initié"];
            const tmeta    = themeMeta(act.objectif_theme);
            const badgeCls = tmeta ? THEME_BADGE[tmeta.color] : "bg-slate-100 text-slate-600";
            const indExpanded = expandedIndicateurs.has(act.id);
            const actInds = indicateurs.filter(i => i.action_id === act.id);
            const hasInds = actInds.some(i => i.commentaire);

            return (
              <motion.div key={act.id} variants={item}>
                <div className="rounded-xl border border-border bg-card shadow-sm">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="outline" className={`text-[11px] border-0 ${avCfg.color}`}>
                            {act.avancement || "Non initié"}
                          </Badge>
                          {tmeta && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>
                              {tmeta.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-display font-semibold text-foreground leading-snug mb-1">
                          {act.intitule || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Objectif : <span className="text-foreground/70">{act.objectif_intitule}</span>
                        </p>
                        {act.echeance && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Échéance : {new Date(act.echeance).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleIndicateurs(act.id)}
                      className="mt-4 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Indicateurs annuels
                      {hasInds && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full font-semibold">renseignés</span>}
                      {indExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {indExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t border-border/60 bg-muted/20">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 mt-3 font-body">
                            Indicateurs annuels
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            {ANNEES_INDICATEURS.map(annee => {
                              const ind = actInds.find(i => i.annee === annee);
                              return (
                                <div key={annee} className="space-y-1">
                                  <p className="text-[11px] font-semibold text-muted-foreground font-body">{annee}</p>
                                  <div className="text-xs text-foreground/80 bg-background border border-border rounded-md px-3 py-2 min-h-[64px] leading-relaxed">
                                    {ind?.commentaire || (
                                      <span className="text-muted-foreground/50 italic">Non renseigné</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
