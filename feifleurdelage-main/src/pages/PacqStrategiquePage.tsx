import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/hooks/useAgents";
import { THEMATIQUES_ESSMS, ANNEES_INDICATEURS, OBJECTIFS_PAR_THEMATIQUE, ThematiqueId } from "@/lib/pacqStrategique";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Target, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Calendar, User, CheckCircle2, BarChart3, Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Objectif = {
  id: string;
  thematique: string;
  titre: string;
  ordre: number;
  created_at: string;
  created_by: string | null;
};

type Action = {
  id: string;
  objectif_id: string;
  titre: string;
  description: string | null;
  pilote_id: string | null;
  date_echeance: string | null;
  statut: "en_cours" | "realise" | "abandonne";
  ordre: number;
};

type Indicateur = {
  id: string;
  action_id: string;
  annee: number;
  commentaire: string | null;
};

// ─── Configs ──────────────────────────────────────────────────────────────────

const THEMATIQUE_COLORS: Record<string, {
  tabActive: string;
  tabInactive: string;
  badge: string;
  border: string;
  dot: string;
}> = {
  blue:   { tabActive: "bg-blue-600 text-white shadow",   tabInactive: "text-blue-700 hover:bg-blue-50 border border-blue-200",   badge: "bg-blue-100 text-blue-700",   border: "border-l-blue-400",   dot: "bg-blue-500"   },
  green:  { tabActive: "bg-green-600 text-white shadow",  tabInactive: "text-green-700 hover:bg-green-50 border border-green-200",  badge: "bg-green-100 text-green-700",  border: "border-l-green-400",  dot: "bg-green-500"  },
  red:    { tabActive: "bg-red-600 text-white shadow",    tabInactive: "text-red-700 hover:bg-red-50 border border-red-200",    badge: "bg-red-100 text-red-700",    border: "border-l-red-400",    dot: "bg-red-500"    },
  purple: { tabActive: "bg-purple-600 text-white shadow", tabInactive: "text-purple-700 hover:bg-purple-50 border border-purple-200", badge: "bg-purple-100 text-purple-700", border: "border-l-purple-400", dot: "bg-purple-500" },
  orange: { tabActive: "bg-orange-600 text-white shadow", tabInactive: "text-orange-700 hover:bg-orange-50 border border-orange-200", badge: "bg-orange-100 text-orange-700", border: "border-l-orange-400", dot: "bg-orange-500" },
  teal:   { tabActive: "bg-teal-600 text-white shadow",   tabInactive: "text-teal-700 hover:bg-teal-50 border border-teal-200",   badge: "bg-teal-100 text-teal-700",   border: "border-l-teal-400",   dot: "bg-teal-500"   },
};

const STATUT_CONFIG: Record<Action["statut"], { label: string; color: string }> = {
  en_cours:  { label: "En cours",  color: "bg-blue-100 text-blue-700"      },
  realise:   { label: "Réalisé",   color: "bg-emerald-100 text-emerald-700" },
  abandonne: { label: "Abandonné", color: "bg-slate-100 text-slate-500"    },
};

const EMPTY_OBJ_FORM  = { titre: "" };
const EMPTY_ACT_FORM  = { titre: "", description: "", pilote_id: "", date_echeance: "", statut: "en_cours" as Action["statut"] };

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item      = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

// ─── Component ────────────────────────────────────────────────────────────────

export default function PacqStrategiquePage() {
  const { user } = useAuth();
  const agents = useAgents();

  const [selectedThematique, setSelectedThematique] = useState(THEMATIQUES_ESSMS[0].id);
  const [allObjectifs, setAllObjectifs]   = useState<Objectif[]>([]);
  const [actions, setActions]             = useState<Action[]>([]);
  const [indicateurs, setIndicateurs]     = useState<Indicateur[]>([]);
  const [indicateursEdit, setIndicateursEdit] = useState<Record<string, Record<number, string>>>({});
  const [savingInd, setSavingInd]         = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [expandedIndicateurs, setExpandedIndicateurs] = useState<Set<string>>(new Set());

  // Dialogs objectif
  const [objDialogOpen, setObjDialogOpen]     = useState(false);
  const [editingObj, setEditingObj]           = useState<Objectif | null>(null);
  const [objForm, setObjForm]                 = useState(EMPTY_OBJ_FORM);
  const [savingObj, setSavingObj]             = useState(false);
  const [deleteObj, setDeleteObj]             = useState<Objectif | null>(null);
  const [deletingObj, setDeletingObj]         = useState(false);

  // Dialogs action
  const [actDialogOpen, setActDialogOpen]     = useState(false);
  const [editingAct, setEditingAct]           = useState<Action | null>(null);
  const [actForm, setActForm]                 = useState(EMPTY_ACT_FORM);
  const [actObjectifId, setActObjectifId]     = useState<string>("");
  const [savingAct, setSavingAct]             = useState(false);
  const [deleteAct, setDeleteAct]             = useState<Action | null>(null);
  const [deletingAct, setDeletingAct]         = useState(false);
  const [initializingPredef, setInitializingPredef] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  const fetchAllObjectifs = useCallback(async () => {
    const { data } = await supabase
      .from("pacq_strategique_objectifs")
      .select("*")
      .order("ordre");
    setAllObjectifs((data as Objectif[]) || []);
  }, []);

  const fetchActionsAndIndicateurs = useCallback(async (thematique: string, objs: Objectif[]) => {
    const objIds = objs.filter(o => o.thematique === thematique).map(o => o.id);
    if (objIds.length === 0) {
      setActions([]);
      setIndicateurs([]);
      setIndicateursEdit({});
      setLoading(false);
      return;
    }
    const { data: actData } = await supabase
      .from("pacq_strategique_actions")
      .select("*")
      .in("objectif_id", objIds)
      .order("ordre");
    const acts = (actData as Action[]) || [];
    setActions(acts);

    const actIds = acts.map(a => a.id);
    let inds: Indicateur[] = [];
    if (actIds.length > 0) {
      const { data: indData } = await supabase
        .from("pacq_strategique_indicateurs")
        .select("*")
        .in("action_id", actIds);
      inds = (indData as Indicateur[]) || [];
    }
    setIndicateurs(inds);

    // Init edit state
    const editState: Record<string, Record<number, string>> = {};
    acts.forEach(act => {
      editState[act.id] = {};
      ANNEES_INDICATEURS.forEach(annee => {
        const found = inds.find(i => i.action_id === act.id && i.annee === annee);
        editState[act.id][annee] = found?.commentaire || "";
      });
    });
    setIndicateursEdit(editState);
    setLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pacq_strategique_objectifs")
        .select("*")
        .order("ordre");
      const objs = (data as Objectif[]) || [];
      setAllObjectifs(objs);
      await fetchActionsAndIndicateurs(selectedThematique, objs);
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleThematiqueChange = async (id: string) => {
    setSelectedThematique(id);
    setLoading(true);
    await fetchActionsAndIndicateurs(id, allObjectifs);
  };

  const refresh = async () => {
    setLoading(true);
    await fetchAllObjectifs();
    const { data } = await supabase
      .from("pacq_strategique_objectifs")
      .select("*")
      .order("ordre");
    const objs = (data as Objectif[]) || [];
    setAllObjectifs(objs);
    await fetchActionsAndIndicateurs(selectedThematique, objs);
  };

  // ── Objectif CRUD ───────────────────────────────────────────────────────────

  const openCreateObj = () => {
    setEditingObj(null);
    setObjForm(EMPTY_OBJ_FORM);
    setObjDialogOpen(true);
  };

  const openEditObj = (o: Objectif) => {
    setEditingObj(o);
    setObjForm({ titre: o.titre });
    setObjDialogOpen(true);
  };

  const handleSaveObj = async () => {
    if (!user || !objForm.titre.trim()) { toast.error("Le titre est obligatoire."); return; }
    setSavingObj(true);
    const payload = { titre: objForm.titre.trim(), thematique: selectedThematique };
    const { error } = editingObj
      ? await supabase.from("pacq_strategique_objectifs").update(payload).eq("id", editingObj.id)
      : await supabase.from("pacq_strategique_objectifs").insert({ ...payload, ordre: 0, created_by: user.id });
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success(editingObj ? "Objectif mis à jour." : "Objectif créé."); setObjDialogOpen(false); await refresh(); }
    setSavingObj(false);
  };

  const handleDeleteObj = async () => {
    if (!deleteObj) return;
    setDeletingObj(true);
    const { error } = await supabase.from("pacq_strategique_objectifs").delete().eq("id", deleteObj.id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Objectif supprimé."); setDeleteObj(null); await refresh(); }
    setDeletingObj(false);
  };

  // ── Action CRUD ─────────────────────────────────────────────────────────────

  const openCreateAct = (objectifId: string) => {
    setEditingAct(null);
    setActObjectifId(objectifId);
    setActForm(EMPTY_ACT_FORM);
    setActDialogOpen(true);
  };

  const openEditAct = (a: Action) => {
    setEditingAct(a);
    setActObjectifId(a.objectif_id);
    setActForm({
      titre: a.titre,
      description: a.description || "",
      pilote_id: a.pilote_id || "",
      date_echeance: a.date_echeance || "",
      statut: a.statut,
    });
    setActDialogOpen(true);
  };

  const handleSaveAct = async () => {
    if (!user || !actForm.titre.trim()) { toast.error("Le titre est obligatoire."); return; }
    setSavingAct(true);
    const payload = {
      titre: actForm.titre.trim(),
      description: actForm.description.trim() || null,
      pilote_id: actForm.pilote_id || null,
      date_echeance: actForm.date_echeance || null,
      statut: actForm.statut,
      objectif_id: actObjectifId,
    };
    const { error } = editingAct
      ? await supabase.from("pacq_strategique_actions").update(payload).eq("id", editingAct.id)
      : await supabase.from("pacq_strategique_actions").insert({ ...payload, ordre: 0, created_by: user.id });
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success(editingAct ? "Action mise à jour." : "Action créée."); setActDialogOpen(false); await refresh(); }
    setSavingAct(false);
  };

  const handleDeleteAct = async () => {
    if (!deleteAct) return;
    setDeletingAct(true);
    const { error } = await supabase.from("pacq_strategique_actions").delete().eq("id", deleteAct.id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Action supprimée."); setDeleteAct(null); await refresh(); }
    setDeletingAct(false);
  };

  // ── Initialisation prédéfinie ────────────────────────────────────────────────

  const handleInitializePredef = async () => {
    if (!user) return;
    const titres = OBJECTIFS_PAR_THEMATIQUE[selectedThematique as ThematiqueId];
    if (!titres?.length) return;
    setInitializingPredef(true);
    const rows = titres.map((titre, i) => ({
      thematique: selectedThematique,
      titre,
      ordre: i,
      created_by: user.id,
    }));
    const { error } = await supabase.from("pacq_strategique_objectifs").insert(rows);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Objectifs initialisés avec le référentiel HAS/AVS."); await refresh(); }
    setInitializingPredef(false);
  };

  // ── Indicateurs ─────────────────────────────────────────────────────────────

  const handleIndicateurBlur = async (actionId: string, annee: number) => {
    const commentaire = indicateursEdit[actionId]?.[annee] ?? "";
    const existing = indicateurs.find(i => i.action_id === actionId && i.annee === annee);
    if ((existing?.commentaire ?? "") === commentaire) return; // no change
    const key = `${actionId}-${annee}`;
    setSavingInd(key);
    const { error } = await supabase
      .from("pacq_strategique_indicateurs")
      .upsert({ action_id: actionId, annee, commentaire: commentaire || null }, { onConflict: "action_id,annee" });
    if (error) toast.error("Erreur sauvegarde indicateur : " + error.message);
    else {
      setIndicateurs(prev => {
        const next = prev.filter(i => !(i.action_id === actionId && i.annee === annee));
        next.push({ id: existing?.id || "", action_id: actionId, annee, commentaire: commentaire || null });
        return next;
      });
    }
    setSavingInd(null);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const thematique = THEMATIQUES_ESSMS.find(t => t.id === selectedThematique)!;
  const colors = THEMATIQUE_COLORS[thematique.color];
  const objectifsCurrent = allObjectifs.filter(o => o.thematique === selectedThematique);

  const countByThematique = (id: string) => allObjectifs.filter(o => o.thematique === id).length;

  const toggleActions = (objId: string) =>
    setExpandedActions(prev => { const n = new Set(prev); n.has(objId) ? n.delete(objId) : n.add(objId); return n; });

  const toggleIndicateurs = (actId: string) =>
    setExpandedIndicateurs(prev => { const n = new Set(prev); n.has(actId) ? n.delete(actId) : n.add(actId); return n; });

  const agentName = (id: string | null) =>
    id ? (agents.find(a => a.id === id)?.full_name ?? "Inconnu") : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">PACQ Stratégique</h1>
            <p className="text-xs text-muted-foreground">Plan d'amélioration continue de la qualité — Projet d'établissement</p>
          </div>
        </div>
        <Button onClick={openCreateObj} className="gap-2 shadow-warm shrink-0">
          <Plus className="w-4 h-4" /> Ajouter un objectif
        </Button>
      </motion.div>

      {/* Navigation thématiques */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex flex-wrap gap-2">
          {THEMATIQUES_ESSMS.map(t => {
            const c = THEMATIQUE_COLORS[t.color];
            const active = t.id === selectedThematique;
            const count = countByThematique(t.id);
            return (
              <button
                key={t.id}
                onClick={() => handleThematiqueChange(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  active ? c.tabActive : c.tabInactive + " bg-background"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${active ? "bg-white/80" : c.dot}`} />
                <span className="font-body">{t.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : c.badge}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Contenu de la thématique */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">

          {objectifsCurrent.length === 0 ? (
            <motion.div variants={item} className="text-center py-16 text-muted-foreground space-y-4">
              <Target className="w-12 h-12 mx-auto opacity-20" />
              <p className="font-medium">Aucun objectif pour cette thématique</p>
              <p className="text-sm">Cliquez sur "Ajouter un objectif" pour commencer,</p>
              <p className="text-sm -mt-2">ou initialisez avec les objectifs du référentiel HAS/AVS.</p>
              {OBJECTIFS_PAR_THEMATIQUE[selectedThematique as ThematiqueId]?.length > 0 && (
                <Button
                  variant="outline"
                  className="gap-2 border-dashed"
                  onClick={handleInitializePredef}
                  disabled={initializingPredef}
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  {initializingPredef ? "Initialisation…" : "Initialiser avec les objectifs HAS/AVS"}
                </Button>
              )}
            </motion.div>
          ) : (
            objectifsCurrent.map(obj => {
              const objActions = actions.filter(a => a.objectif_id === obj.id);
              const expanded = expandedActions.has(obj.id);
              const realise = objActions.filter(a => a.statut === "realise").length;

              return (
                <motion.div key={obj.id} variants={item}>
                  <div className={`rounded-xl border-l-4 ${colors.border} border border-border bg-card shadow-sm`}>

                    {/* Objectif header */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => toggleActions(obj.id)}
                          className="flex-1 flex items-center gap-3 text-left group"
                        >
                          <div>
                            <h2 className="font-display font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">
                              {obj.titre}
                            </h2>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                                {thematique.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {objActions.length} action{objActions.length > 1 ? "s" : ""}
                                {objActions.length > 0 && ` · ${realise} réalisée${realise > 1 ? "s" : ""}`}
                              </span>
                            </div>
                          </div>
                          {expanded
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                          }
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => openCreateAct(obj.id)}>
                            <Plus className="w-3 h-3" /> Action
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => openEditObj(obj)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteObj(obj)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Actions list */}
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border/60 divide-y divide-border/40">
                            {objActions.length === 0 ? (
                              <div className="px-5 py-4 text-xs text-muted-foreground italic">
                                Aucune action. Cliquez sur "+ Action" pour en ajouter une.
                              </div>
                            ) : (
                              objActions.map(act => {
                                const stat = STATUT_CONFIG[act.statut];
                                const pilote = agentName(act.pilote_id);
                                const indExpanded = expandedIndicateurs.has(act.id);

                                return (
                                  <div key={act.id} className="bg-muted/20">
                                    <div className="px-5 py-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <Badge variant="outline" className={`text-[11px] border-0 ${stat.color}`}>
                                              {stat.label}
                                            </Badge>
                                          </div>
                                          <p className="text-sm font-semibold text-foreground leading-snug">{act.titre}</p>
                                          {act.description && (
                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{act.description}</p>
                                          )}
                                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                            {pilote && (
                                              <span className="flex items-center gap-1.5">
                                                <User className="w-3 h-3" />{pilote}
                                              </span>
                                            )}
                                            {act.date_echeance && (
                                              <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(act.date_echeance).toLocaleDateString("fr-FR")}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={() => toggleIndicateurs(act.id)}
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                                          >
                                            <BarChart3 className="w-3.5 h-3.5" />
                                            <span>Indicateurs</span>
                                            {indExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                          </button>
                                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => openEditAct(act)}>
                                            <Pencil className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteAct(act)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Indicateurs */}
                                    <AnimatePresence>
                                      {indExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.18 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="px-5 pb-5 pt-1 border-t border-border/40 bg-background/50">
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 font-body">
                                              Indicateurs annuels
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                              {ANNEES_INDICATEURS.map(annee => {
                                                const key = `${act.id}-${annee}`;
                                                const isSaving = savingInd === key;
                                                return (
                                                  <div key={annee} className="space-y-1">
                                                    <label className="text-[11px] font-semibold text-muted-foreground font-body">{annee}</label>
                                                    <Textarea
                                                      value={indicateursEdit[act.id]?.[annee] ?? ""}
                                                      onChange={e => setIndicateursEdit(prev => ({
                                                        ...prev,
                                                        [act.id]: { ...(prev[act.id] || {}), [annee]: e.target.value },
                                                      }))}
                                                      onBlur={() => handleIndicateurBlur(act.id, annee)}
                                                      placeholder="Commentaire…"
                                                      rows={3}
                                                      className={`resize-none text-xs ${isSaving ? "opacity-60" : ""}`}
                                                    />
                                                    {isSaving && (
                                                      <p className="text-[10px] text-muted-foreground">Sauvegarde…</p>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}

      {/* Dialog Objectif */}
      <Dialog open={objDialogOpen} onOpenChange={setObjDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {editingObj ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingObj ? "Modifier l'objectif" : "Nouvel objectif"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Thématique</Label>
              <div className={`text-xs px-3 py-2 rounded-lg font-semibold ${colors.badge}`}>
                {thematique.label}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Titre de l'objectif <span className="text-destructive">*</span></Label>
              <Input
                value={objForm.titre}
                onChange={e => setObjForm({ titre: e.target.value })}
                placeholder="Ex : Renforcer l'expression des droits des résidents"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setObjDialogOpen(false)} disabled={savingObj}>Annuler</Button>
            <Button onClick={handleSaveObj} disabled={savingObj} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingObj ? "Enregistrement…" : editingObj ? "Mettre à jour" : "Créer l'objectif"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Action */}
      <Dialog open={actDialogOpen} onOpenChange={setActDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {editingAct ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingAct ? "Modifier l'action" : "Nouvelle action"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre de l'action <span className="text-destructive">*</span></Label>
              <Input
                value={actForm.titre}
                onChange={e => setActForm({ ...actForm, titre: e.target.value })}
                placeholder="Intitulé de l'action"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
              <Textarea
                value={actForm.description}
                onChange={e => setActForm({ ...actForm, description: e.target.value })}
                placeholder="Précisions, modalités de mise en œuvre…"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Pilote <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                <Select value={actForm.pilote_id || "none"} onValueChange={v => setActForm({ ...actForm, pilote_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date d'échéance <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                <Input
                  type="date"
                  value={actForm.date_echeance}
                  onChange={e => setActForm({ ...actForm, date_echeance: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={actForm.statut} onValueChange={v => setActForm({ ...actForm, statut: v as Action["statut"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="realise">Réalisé</SelectItem>
                  <SelectItem value="abandonne">Abandonné</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActDialogOpen(false)} disabled={savingAct}>Annuler</Button>
            <Button onClick={handleSaveAct} disabled={savingAct} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingAct ? "Enregistrement…" : editingAct ? "Mettre à jour" : "Créer l'action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog suppr objectif */}
      <AlertDialog open={!!deleteObj} onOpenChange={o => !o && setDeleteObj(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />Supprimer cet objectif ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteObj?.titre}"</strong> sera définitivement supprimé avec toutes ses actions et indicateurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingObj}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteObj} disabled={deletingObj} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingObj ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog suppr action */}
      <AlertDialog open={!!deleteAct} onOpenChange={o => !o && setDeleteAct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />Supprimer cette action ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteAct?.titre}"</strong> sera définitivement supprimée avec ses indicateurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAct}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAct} disabled={deletingAct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingAct ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
