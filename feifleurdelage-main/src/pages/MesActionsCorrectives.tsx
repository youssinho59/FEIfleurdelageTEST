import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ClipboardCheck, Clock, CheckCircle2, ListTodo,
  AlertTriangle, Calendar, FileText, MessageSquare, Send,
  ChevronDown, ChevronUp,
} from "lucide-react";

type Priorite = "haute" | "moyenne" | "faible";
type Statut = "a_faire" | "en_cours" | "realisee" | "evaluee";

type ActionCorrective = {
  id: string;
  titre: string;
  description: string | null;
  responsable: string;
  responsable_id: string | null;
  date_echeance: string;
  priorite: Priorite;
  statut: Statut;
  fei_id: string | null;
  plainte_id: string | null;
  user_id: string;
};

type Commentaire = {
  id: string;
  action_id: string;
  auteur_nom: string;
  contenu: string;
  created_at: string;
  user_id: string;
};

const PRIORITE_CONFIG: Record<Priorite, { label: string; color: string; dot: string; border: string }> = {
  haute:   { label: "Haute",   color: "bg-red-100 text-red-700",         dot: "bg-red-500",     border: "border-l-red-400" },
  moyenne: { label: "Moyenne", color: "bg-amber-100 text-amber-700",     dot: "bg-amber-400",   border: "border-l-amber-400" },
  faible:  { label: "Faible",  color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400", border: "border-l-emerald-400" },
};

const STATUT_CONFIG: Record<Statut, { label: string; color: string }> = {
  a_faire:  { label: "À faire",  color: "bg-slate-100 text-slate-600" },
  en_cours: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  realisee: { label: "Réalisée", color: "bg-emerald-100 text-emerald-700" },
  evaluee:  { label: "Évaluée",  color: "bg-violet-100 text-violet-700" },
};

const isRetard = (a: ActionCorrective) =>
  a.statut !== "realisee" && a.statut !== "evaluee" &&
  new Date(a.date_echeance) < new Date(new Date().toDateString());

const initials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function MesActionsCorrectives() {
  const { user, profile } = useAuth();
  const [actions, setActions] = useState<ActionCorrective[]>([]);
  const [commentsByAction, setCommentsByAction] = useState<Record<string, Commentaire[]>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [feiOptions, setFeiOptions] = useState<{ id: string; type_fei: string; date_evenement: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [actionsRes, commentsRes, feiRes] = await Promise.all([
      supabase.from("actions_correctives").select("*").eq("responsable_id", user.id).order("date_echeance", { ascending: true }),
      supabase.from("action_commentaires").select("*").order("created_at", { ascending: true }),
      supabase.from("fei").select("id, type_fei, date_evenement"),
    ]);
    setActions((actionsRes.data as ActionCorrective[]) || []);
    if (commentsRes.data) {
      const grouped = (commentsRes.data as Commentaire[]).reduce((acc, c) => {
        (acc[c.action_id] = acc[c.action_id] || []).push(c);
        return acc;
      }, {} as Record<string, Commentaire[]>);
      setCommentsByAction(grouped);
    }
    setFeiOptions(feiRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const total = actions.length;
  const aFaire = actions.filter(a => a.statut === "a_faire").length;
  const enCours = actions.filter(a => a.statut === "en_cours").length;
  const realisees = actions.filter(a => a.statut === "realisee" || a.statut === "evaluee").length;

  const toggleComments = (id: string) =>
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleStatusChange = async (actionId: string, newStatut: Statut) => {
    setUpdatingStatus(actionId);
    const { error } = await supabase.from("actions_correctives").update({ statut: newStatut }).eq("id", actionId);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Statut mis à jour."); fetchData(); }
    setUpdatingStatus(null);
  };

  const handleAddComment = async (actionId: string) => {
    const contenu = newComments[actionId]?.trim();
    if (!contenu || !user) return;
    setSubmitting(actionId);
    const { error } = await supabase.from("action_commentaires").insert({
      action_id: actionId,
      user_id: user.id,
      auteur_nom: profile?.full_name || user.email || "Inconnu",
      contenu,
    });
    if (error) toast.error("Erreur : " + error.message);
    else { setNewComments(prev => ({ ...prev, [actionId]: "" })); fetchData(); }
    setSubmitting(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
          <ClipboardCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Mes Actions Assignées</h1>
          <p className="text-xs text-muted-foreground">Actions correctives dont vous êtes responsable</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total",     value: total,     icon: ListTodo,     accent: "border-l-[#c46b48]", iconBg: "bg-[#c46b48]/10", iconColor: "text-[#c46b48]",    numColor: "text-[#c46b48]" },
          { label: "À faire",   value: aFaire,    icon: ListTodo,     accent: "border-l-slate-400",  iconBg: "bg-slate-100",    iconColor: "text-slate-500",    numColor: "text-slate-700" },
          { label: "En cours",  value: enCours,   icon: Clock,        accent: "border-l-blue-400",   iconBg: "bg-blue-50",      iconColor: "text-blue-500",     numColor: "text-blue-600" },
          { label: "Réalisées", value: realisees, icon: CheckCircle2, accent: "border-l-emerald-400", iconBg: "bg-emerald-50",   iconColor: "text-emerald-500",  numColor: "text-emerald-600" },
        ].map(s => (
          <motion.div key={s.label} variants={item}>
            <div className={`rounded-xl border-l-4 ${s.accent} border border-border/60 bg-card px-5 py-4 flex items-center justify-between shadow-sm`}>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                </div>
                <span className={`text-2xl font-display font-bold tabular-nums ${s.numColor}`}>{s.value}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : actions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <ClipboardCheck className="w-12 h-12 mx-auto opacity-20" />
          <p className="font-medium">Aucune action ne vous est assignée</p>
          <p className="text-sm">Les actions correctives qui vous sont confiées apparaîtront ici.</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          {actions.map(action => {
            const retard = isRetard(action);
            const prio = PRIORITE_CONFIG[action.priorite];
            const stat = STATUT_CONFIG[action.statut];
            const comments = commentsByAction[action.id] || [];
            const expanded = expandedComments.has(action.id);
            const fei = feiOptions.find(f => f.id === action.fei_id);

            return (
              <motion.div key={action.id} variants={item}>
                <div className={`rounded-xl border-l-4 ${retard ? "border-l-red-500 border-red-100 bg-red-50/20" : `${prio.border} border-border bg-card`} border shadow-sm`}>
                  <div className="p-5">
                    {/* Titre + badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {retard && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
                          <AlertTriangle className="w-3 h-3" />En retard
                        </span>
                      )}
                      <Badge variant="outline" className={`text-[11px] ${stat.color} border-0`}>{stat.label}</Badge>
                      <Badge variant="outline" className={`text-[11px] ${prio.color} border-0 flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />{prio.label}
                      </Badge>
                    </div>
                    <h3 className="font-display font-semibold text-foreground text-sm leading-snug mb-1">{action.titre}</h3>
                    {action.description && <p className="text-xs text-muted-foreground leading-relaxed mb-3">{action.description}</p>}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4">
                      <span className={`flex items-center gap-1.5 ${retard ? "text-red-600 font-semibold" : ""}`}>
                        <Calendar className="w-3 h-3" />Échéance : {new Date(action.date_echeance).toLocaleDateString("fr-FR")}
                      </span>
                      {fei && <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" />FEI · {fei.type_fei}</span>}
                    </div>

                    {/* Mise à jour du statut */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-medium">Mettre à jour :</span>
                      {(["a_faire", "en_cours", "realisee"] as Statut[]).map(s => (
                        <button
                          key={s}
                          disabled={action.statut === s || updatingStatus === action.id}
                          onClick={() => handleStatusChange(action.id, s)}
                          className={`text-xs px-3 py-1 rounded-full border transition-all font-medium
                            ${action.statut === s
                              ? `${STATUT_CONFIG[s].color} border-transparent cursor-default`
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"
                            }`}
                        >
                          {STATUT_CONFIG[s].label}
                        </button>
                      ))}
                    </div>

                    {/* Toggle commentaires */}
                    <button
                      onClick={() => toggleComments(action.id)}
                      className="mt-4 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {comments.length} commentaire{comments.length > 1 ? "s" : ""}
                      {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Section commentaires */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border/60"
                      >
                        <div className="px-5 py-4 space-y-4 bg-muted/20">
                          {comments.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Aucun commentaire pour l'instant.</p>
                          ) : (
                            <div className="space-y-3">
                              {comments.map(c => (
                                <div key={c.id} className="flex gap-3">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                    {initials(c.auteur_nom)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-xs font-semibold text-foreground">{c.auteur_nom}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {new Date(c.created_at).toLocaleDateString("fr-FR")} à{" "}
                                        {new Date(c.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">{c.contenu}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Ajouter commentaire */}
                          <div className="flex gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-1">
                              {initials(profile?.full_name || "?")}
                            </div>
                            <div className="flex-1 flex gap-2">
                              <Textarea
                                value={newComments[action.id] || ""}
                                onChange={e => setNewComments(prev => ({ ...prev, [action.id]: e.target.value }))}
                                placeholder="Ajouter un commentaire sur l'avancement…"
                                rows={2}
                                className="resize-none text-xs flex-1"
                                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleAddComment(action.id); }}
                              />
                              <Button
                                size="icon"
                                className="h-9 w-9 shrink-0 self-end"
                                disabled={!newComments[action.id]?.trim() || submitting === action.id}
                                onClick={() => handleAddComment(action.id)}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </Button>
                            </div>
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
