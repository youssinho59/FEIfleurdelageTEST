import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/hooks/useAgents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ClipboardCheck, Plus, ListTodo, Clock, CheckCircle2,
  AlertTriangle, User, Calendar, FileText, Pencil, Trash2,
  Filter, TrendingUp, MessageSquare, Send, ChevronDown, ChevronUp, UserCheck,
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
  service: string | null;
  source: string | null;
  user_id: string;
  created_at: string;
};

const SERVICES = ["Administration", "Cuisine", "Technique", "Lingerie", "Animation", "Soins/Hôtellerie", "Entretien"];

const SOURCES_ACTION = [
  "Enquête de satisfaction", "Avis", "Plainte et réclamation", "Groupe de travail",
  "Audit interne", "Instance (CVS, CA...)", "Cartographie des risques", "FEI", "Autre",
];

type Commentaire = {
  id: string;
  action_id: string;
  user_id: string;
  auteur_nom: string;
  contenu: string;
  created_at: string;
};

type FeiOption = { id: string; type_fei: string; date_evenement: string };
type PlainteOption = { id: string; objet: string; date_plainte: string };

const PRIORITE_CONFIG: Record<Priorite, { label: string; color: string; dot: string; border: string }> = {
  haute:   { label: "Haute",   color: "bg-red-100 text-red-700",          dot: "bg-red-500",    border: "border-l-red-400" },
  moyenne: { label: "Moyenne", color: "bg-amber-100 text-amber-700",      dot: "bg-amber-400",  border: "border-l-amber-400" },
  faible:  { label: "Faible",  color: "bg-emerald-100 text-emerald-700",  dot: "bg-emerald-400", border: "border-l-emerald-400" },
};

const STATUT_CONFIG: Record<Statut, { label: string; color: string }> = {
  a_faire:  { label: "À faire",  color: "bg-slate-100 text-slate-600" },
  en_cours: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  realisee: { label: "Réalisée", color: "bg-emerald-100 text-emerald-700" },
  evaluee:  { label: "Évaluée",  color: "bg-violet-100 text-violet-700" },
};

const EMPTY_FORM = {
  titre: "", description: "", responsable_id: "",
  date_echeance: "", priorite: "moyenne" as Priorite,
  statut: "a_faire" as Statut, fei_id: "", service: "", source: "",
};

const isRetard = (a: ActionCorrective) =>
  a.statut !== "realisee" && a.statut !== "evaluee" &&
  new Date(a.date_echeance) < new Date(new Date().toDateString());

const initials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function PlanActionsCorrectives() {
  const { user, profile, isAdmin } = useAuth();
  const agents = useAgents();

  const [actions, setActions] = useState<ActionCorrective[]>([]);
  const [commentsByAction, setCommentsByAction] = useState<Record<string, Commentaire[]>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [feiOptions, setFeiOptions] = useState<FeiOption[]>([]);
  const [plainteOptions, setPlainteOptions] = useState<PlainteOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterPriorite, setFilterPriorite] = useState("toutes");
  const [filterResponsable, setFilterResponsable] = useState("tous");
  const [filterService, setFilterService] = useState("tous");
  const [filterSource, setFilterSource] = useState("tous");
  const [filterMesActions, setFilterMesActions] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionCorrective | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ActionCorrective | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [linkedIndicateurs, setLinkedIndicateurs] = useState<{id: string; indicateur_domaine: string; indicateur_label: string}[]>([]);
  const [allIndicateursMap, setAllIndicateursMap] = useState<Record<string, {indicateur_domaine: string; indicateur_label: string}[]>>({});

  const fetchActions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("actions_correctives").select("*").order("date_echeance", { ascending: true });
    if (error) toast.error("Erreur : " + error.message);
    else setActions((data as ActionCorrective[]) || []);
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data } = await supabase.from("action_commentaires").select("*").order("created_at", { ascending: true });
    if (data) {
      const grouped = (data as Commentaire[]).reduce((acc, c) => {
        (acc[c.action_id] = acc[c.action_id] || []).push(c);
        return acc;
      }, {} as Record<string, Commentaire[]>);
      setCommentsByAction(grouped);
    }
  };

  const fetchRefs = async () => {
    const [feiRes, plainteRes] = await Promise.all([
      supabase.from("fei").select("id, type_fei, date_evenement").order("date_evenement", { ascending: false }),
      supabase.from("plaintes").select("id, objet, date_plainte").order("date_plainte", { ascending: false }),
    ]);
    setFeiOptions((feiRes.data as FeiOption[]) || []);
    setPlainteOptions((plainteRes.data as PlainteOption[]) || []);
  };

  const fetchAllIndicateursMap = async () => {
    const { data } = await supabase.from('indicateurs_actions')
      .select('action_id, indicateur_domaine, indicateur_label')
      .eq('action_type', 'operationnel');
    if (data) {
      const map: Record<string, {indicateur_domaine: string; indicateur_label: string}[]> = {};
      (data as {action_id: string; indicateur_domaine: string; indicateur_label: string}[]).forEach(r => {
        (map[r.action_id] = map[r.action_id] || []).push(r);
      });
      setAllIndicateursMap(map);
    }
  };

  useEffect(() => { fetchActions(); fetchComments(); fetchRefs(); fetchAllIndicateursMap(); }, []);

  // Stats
  const total = actions.length;
  const aFaire = actions.filter(a => a.statut === "a_faire").length;
  const enCours = actions.filter(a => a.statut === "en_cours").length;
  const realisees = actions.filter(a => a.statut === "realisee" || a.statut === "evaluee").length;
  const progress = total > 0 ? Math.round((realisees / total) * 100) : 0;
  const retards = actions.filter(isRetard).length;

  // Filtered
  const filtered = actions.filter(a => {
    if (filterMesActions && a.responsable_id !== user?.id) return false;
    if (filterStatut !== "tous" && a.statut !== filterStatut) return false;
    if (filterPriorite !== "toutes" && a.priorite !== filterPriorite) return false;
    if (filterResponsable !== "tous" && a.responsable_id !== filterResponsable) return false;
    if (filterService !== "tous") {
      if (filterService === "sans" && a.service) return false;
      if (filterService !== "sans" && a.service !== filterService) return false;
    }
    if (filterSource !== "tous") {
      if (filterSource === "sans" && a.source) return false;
      if (filterSource !== "sans" && a.source !== filterSource) return false;
    }
    return true;
  });

  // Sources dynamiques présentes dans les données
  const sourcesPresentes = Array.from(new Set(actions.map(a => a.source).filter(Boolean) as string[])).sort();

  // Groupement par service
  const serviceGroups: { service: string | null; actions: ActionCorrective[] }[] = [];
  const serviceMap = new Map<string, ActionCorrective[]>();
  filtered.forEach(a => {
    const key = a.service || "";
    if (!serviceMap.has(key)) serviceMap.set(key, []);
    serviceMap.get(key)!.push(a);
  });
  // Services avec actions, triés alphabétiquement, "Sans service" en dernier
  const keys = Array.from(serviceMap.keys()).sort((a, b) => {
    if (a === "") return 1;
    if (b === "") return -1;
    return a.localeCompare(b, "fr");
  });
  keys.forEach(k => serviceGroups.push({ service: k || null, actions: serviceMap.get(k)! }));

  const toggleComments = (id: string) =>
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAddComment = async (actionId: string) => {
    const contenu = newComments[actionId]?.trim();
    if (!contenu || !user) return;
    setSubmittingComment(actionId);
    const { error } = await supabase.from("action_commentaires").insert({
      action_id: actionId,
      user_id: user.id,
      auteur_nom: profile?.full_name || user.email || "Inconnu",
      contenu,
    });
    if (error) toast.error("Erreur : " + error.message);
    else {
      setNewComments(prev => ({ ...prev, [actionId]: "" }));
      fetchComments();
    }
    setSubmittingComment(null);
  };

  const openCreate = () => { setEditingAction(null); setForm(EMPTY_FORM); setLinkedIndicateurs([]); setDialogOpen(true); };
  const openEdit = async (a: ActionCorrective) => {
    setEditingAction(a);
    setForm({ titre: a.titre, description: a.description || "", responsable_id: a.responsable_id || "", date_echeance: a.date_echeance, priorite: a.priorite, statut: a.statut, fei_id: a.fei_id || "", service: a.service || "", source: a.source || "" });
    setLinkedIndicateurs([]);
    setDialogOpen(true);
    const { data } = await supabase.from('indicateurs_actions')
      .select('id, indicateur_domaine, indicateur_label')
      .eq('action_id', a.id);
    if (data) setLinkedIndicateurs(data as {id: string; indicateur_domaine: string; indicateur_label: string}[]);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.titre.trim() || !form.responsable_id || !form.date_echeance) {
      toast.error("Titre, responsable et date d'échéance sont obligatoires.");
      return;
    }
    setSaving(true);
    const agent = agents.find(a => a.id === form.responsable_id);
    const payload = {
      titre: form.titre.trim(),
      description: form.description.trim() || null,
      responsable: agent?.full_name || "Inconnu",
      responsable_id: form.responsable_id,
      date_echeance: form.date_echeance,
      priorite: form.priorite,
      statut: form.statut,
      fei_id: form.fei_id || null,
      service: form.service || null,
      source: form.source || null,
    };
    const { error } = editingAction
      ? await supabase.from("actions_correctives").update(payload).eq("id", editingAction.id)
      : await supabase.from("actions_correctives").insert({ ...payload, user_id: user.id });
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success(editingAction ? "Action mise à jour." : "Action créée."); setDialogOpen(false); fetchActions(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("actions_correctives").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Action supprimée."); setDeleteTarget(null); fetchActions(); }
    setDeleting(false);
  };

  const canEdit = (a: ActionCorrective) => isAdmin || a.user_id === user?.id;
  const canComment = (a: ActionCorrective) => isAdmin || a.responsable_id === user?.id || a.user_id === user?.id;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Plan d'Actions Correctives</h1>
            <p className="text-xs text-muted-foreground">Plan d'Amélioration Continue de la Qualité et de la Sécurité (PACQS)</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-warm shrink-0">
          <Plus className="w-4 h-4" /> Nouvelle action
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total",     sub: "actions enregistrées", value: total,     icon: ListTodo,     accent: "border-l-[#c46b48]", iconBg: "bg-[#c46b48]/10", iconColor: "text-[#c46b48]",    numColor: "text-[#c46b48]" },
          { label: "À faire",   sub: "en attente",            value: aFaire,    icon: ListTodo,     accent: "border-l-slate-400",  iconBg: "bg-slate-100",    iconColor: "text-slate-500",    numColor: "text-slate-700" },
          { label: "En cours",  sub: "en progression",        value: enCours,   icon: Clock,        accent: "border-l-blue-400",   iconBg: "bg-blue-50",      iconColor: "text-blue-500",     numColor: "text-blue-600" },
          { label: "Réalisées", sub: "réalisées + évaluées",  value: realisees, icon: CheckCircle2, accent: "border-l-emerald-400", iconBg: "bg-emerald-50",   iconColor: "text-emerald-500",  numColor: "text-emerald-600" },
        ].map(s => (
          <motion.div key={s.label} variants={item}>
            <div className={`rounded-xl border-l-4 ${s.accent} border border-border/60 bg-card px-5 py-5 flex flex-col gap-3 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <span className={`text-3xl font-display font-bold tabular-nums ${s.numColor}`}>{s.value}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">{s.sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Progression */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Progression globale du PACQS</span>
          </div>
          <div className="flex items-center gap-3">
            {retards > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                <AlertTriangle className="w-3 h-3" />{retards} en retard
              </span>
            )}
            <span className="text-2xl font-display font-bold text-primary">{progress}%</span>
          </div>
        </div>
        <Progress value={progress} className="h-3" />
        <p className="text-[11px] text-muted-foreground mt-2">{realisees} action{realisees > 1 ? "s" : ""} réalisée{realisees > 1 ? "s" : ""} sur {total}</p>
      </motion.div>

      {/* Filtres */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        className="flex flex-wrap gap-3 items-center p-4 rounded-xl border border-border bg-card/50">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Button
          variant={filterMesActions ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5 text-xs shrink-0"
          onClick={() => setFilterMesActions(v => !v)}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Mes actions
        </Button>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="a_faire">À faire</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="realisee">Réalisée</SelectItem>
            <SelectItem value="evaluee">Évaluée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriorite} onValueChange={setFilterPriorite}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes priorités</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="moyenne">Moyenne</SelectItem>
            <SelectItem value="faible">Faible</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterResponsable} onValueChange={setFilterResponsable}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Tous les agents" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les agents</SelectItem>
            {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Tous les services" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les services</SelectItem>
            {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            <SelectItem value="sans">Sans service</SelectItem>
          </SelectContent>
        </Select>
        {sourcesPresentes.length > 0 && (
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Toutes les sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Toutes les sources</SelectItem>
              {sourcesPresentes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              <SelectItem value="sans">Sans source</SelectItem>
            </SelectContent>
          </Select>
        )}
        {(filterStatut !== "tous" || filterPriorite !== "toutes" || filterResponsable !== "tous" || filterService !== "tous" || filterSource !== "tous") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setFilterStatut("tous"); setFilterPriorite("toutes"); setFilterResponsable("tous"); setFilterService("tous"); setFilterSource("tous"); }}>
            Réinitialiser
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} action{filtered.length > 1 ? "s" : ""}</span>
      </motion.div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <ClipboardCheck className="w-12 h-12 mx-auto opacity-20" />
          <p className="font-medium">Aucune action trouvée</p>
          <p className="text-sm">Modifiez les filtres ou créez une nouvelle action.</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          {serviceGroups.map(({ service, actions: groupActions }) => {
            const groupDone = groupActions.filter(a => a.statut === "realisee" || a.statut === "evaluee").length;
            const groupPct = groupActions.length > 0 ? Math.round((groupDone / groupActions.length) * 100) : 0;
            return (
              <div key={service ?? "__sans__"} className="space-y-3">
                {/* En-tête groupe service */}
                <div className="flex items-center gap-3 pb-1 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">{service ?? "Sans service"}</span>
                  <span className="text-xs text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">{groupActions.length} action{groupActions.length > 1 ? "s" : ""}</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Progress value={groupPct} className="h-1.5 w-20" />
                    <span className="text-[11px] font-semibold text-primary tabular-nums">{groupPct}%</span>
                  </div>
                </div>
                <div className="space-y-3">
          {groupActions.map(action => {
            const retard = isRetard(action);
            const prio = PRIORITE_CONFIG[action.priorite];
            const stat = STATUT_CONFIG[action.statut];
            const fei = feiOptions.find(f => f.id === action.fei_id);
            const plainte = plainteOptions.find(p => p.id === action.plainte_id);
            const comments = commentsByAction[action.id] || [];
            const expanded = expandedComments.has(action.id);

            return (
              <motion.div key={action.id} variants={item}>
                <div className={`rounded-xl border-l-4 ${retard ? "border-l-red-500 border-red-200 bg-red-50/30" : `${prio.border} border-border bg-card`} border shadow-sm`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
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
                          {action.source && (
                            <Badge variant="outline" className="text-[11px] bg-violet-50 text-violet-700 border-violet-200">
                              {action.source}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-display font-semibold text-foreground text-sm leading-snug mb-1">{action.titre}</h3>
                        {action.description && <p className="text-xs text-muted-foreground leading-relaxed mb-3">{action.description}</p>}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5"><User className="w-3 h-3" />{action.responsable}</span>
                          <span className={`flex items-center gap-1.5 ${retard ? "text-red-600 font-semibold" : ""}`}>
                            <Calendar className="w-3 h-3" />{new Date(action.date_echeance).toLocaleDateString("fr-FR")}
                          </span>
                          {fei && <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" />FEI · {fei.type_fei} — {new Date(fei.date_evenement).toLocaleDateString("fr-FR")}</span>}
                          {plainte && <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" />Plainte · {plainte.objet.slice(0, 40)}{plainte.objet.length > 40 ? "…" : ""}</span>}
                        </div>
                        {(allIndicateursMap[action.id] || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(allIndicateursMap[action.id] || []).map((ind, i) => (
                              <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 border border-primary/20">
                                📊 {ind.indicateur_domaine} — {ind.indicateur_label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {canEdit(action) && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(action)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(action)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
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
                          {/* Liste commentaires */}
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
                          {canComment(action) && (
                            <div className="flex gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-1">
                                {initials(profile?.full_name || "?")}
                              </div>
                              <div className="flex-1 flex gap-2">
                                <Textarea
                                  value={newComments[action.id] || ""}
                                  onChange={e => setNewComments(prev => ({ ...prev, [action.id]: e.target.value }))}
                                  placeholder="Ajouter un commentaire…"
                                  rows={2}
                                  className="resize-none text-xs flex-1"
                                  onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleAddComment(action.id); }}
                                />
                                <Button
                                  size="icon"
                                  className="h-9 w-9 shrink-0 self-end"
                                  disabled={!newComments[action.id]?.trim() || submittingComment === action.id}
                                  onClick={() => handleAddComment(action.id)}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Dialog Créer / Modifier */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {editingAction ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingAction ? "Modifier l'action" : "Nouvelle action corrective"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre <span className="text-destructive">*</span></Label>
              <Input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Intitulé de l'action corrective" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Détails, contexte, objectif attendu…" rows={3} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Responsable <span className="text-destructive">*</span></Label>
                <Select value={form.responsable_id} onValueChange={v => setForm({ ...form, responsable_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date d'échéance <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.date_echeance} onChange={e => setForm({ ...form, date_echeance: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select value={form.priorite} onValueChange={v => setForm({ ...form, priorite: v as Priorite })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haute">🔴 Haute</SelectItem>
                    <SelectItem value="moyenne">🟡 Moyenne</SelectItem>
                    <SelectItem value="faible">🟢 Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={v => setForm({ ...form, statut: v as Statut })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_faire">À faire</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="realisee">Réalisée</SelectItem>
                    <SelectItem value="evaluee">Évaluée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Service <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                <Select value={form.service || "none"} onValueChange={v => setForm({ ...form, service: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Tous les services" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sans service</SelectItem>
                    {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source de l'action <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                <Select value={form.source || "none"} onValueChange={v => setForm({ ...form, source: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sans source</SelectItem>
                    {SOURCES_ACTION.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>FEI associée <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
              <Select value={form.fei_id || "none"} onValueChange={v => setForm({ ...form, fei_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Aucune FEI associée" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune (action manuelle)</SelectItem>
                  {feiOptions.map(f => <SelectItem key={f.id} value={f.id}>{f.type_fei} — {new Date(f.date_evenement).toLocaleDateString("fr-FR")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {linkedIndicateurs.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Indicateurs liés</Label>
                <div className="flex flex-wrap gap-1.5">
                  {linkedIndicateurs.map(ind => (
                    <span key={ind.id} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 border border-primary/20">
                      📊 {ind.indicateur_domaine} — {ind.indicateur_label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {saving ? "Enregistrement…" : editingAction ? "Mettre à jour" : "Créer l'action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />Supprimer cette action ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteTarget?.titre}"</strong> sera définitivement supprimée avec tous ses commentaires.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
