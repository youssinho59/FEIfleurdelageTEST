import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  ClipboardCheck, Plus, ListTodo, Clock, CheckCircle2, Star,
  AlertTriangle, User, Calendar, FileText, Pencil, Trash2,
  ChevronDown, Filter, TrendingUp,
} from "lucide-react";

type Priorite = "haute" | "moyenne" | "faible";
type Statut = "a_faire" | "en_cours" | "realisee" | "evaluee";

type ActionCorrective = {
  id: string;
  titre: string;
  description: string | null;
  responsable: string;
  date_echeance: string;
  priorite: Priorite;
  statut: Statut;
  fei_id: string | null;
  plainte_id: string | null;
  user_id: string;
  created_at: string;
};

type FeiOption = { id: string; type_fei: string; date_evenement: string };
type PlainteOption = { id: string; objet: string; date_plainte: string };

const PRIORITE_CONFIG: Record<Priorite, { label: string; color: string; dot: string; border: string }> = {
  haute:   { label: "Haute",   color: "bg-red-100 text-red-700",     dot: "bg-red-500",    border: "border-l-red-400" },
  moyenne: { label: "Moyenne", color: "bg-amber-100 text-amber-700", dot: "bg-amber-400",  border: "border-l-amber-400" },
  faible:  { label: "Faible",  color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400", border: "border-l-emerald-400" },
};

const STATUT_CONFIG: Record<Statut, { label: string; color: string }> = {
  a_faire:  { label: "À faire",   color: "bg-slate-100 text-slate-600" },
  en_cours: { label: "En cours",  color: "bg-blue-100 text-blue-700" },
  realisee: { label: "Réalisée",  color: "bg-emerald-100 text-emerald-700" },
  evaluee:  { label: "Évaluée",   color: "bg-violet-100 text-violet-700" },
};

const EMPTY_FORM = {
  titre: "",
  description: "",
  responsable: "",
  date_echeance: "",
  priorite: "moyenne" as Priorite,
  statut: "a_faire" as Statut,
  fei_id: "",
};

const isRetard = (action: ActionCorrective) =>
  action.statut !== "realisee" &&
  action.statut !== "evaluee" &&
  new Date(action.date_echeance) < new Date(new Date().toDateString());

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function PlanActionsCorrectives() {
  const { user, isAdmin } = useAuth();
  const [actions, setActions] = useState<ActionCorrective[]>([]);
  const [feiOptions, setFeiOptions] = useState<FeiOption[]>([]);
  const [plainteOptions, setPlainteOptions] = useState<PlainteOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterPriorite, setFilterPriorite] = useState("toutes");
  const [filterResponsable, setFilterResponsable] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionCorrective | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ActionCorrective | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchActions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("actions_correctives")
      .select("*")
      .order("date_echeance", { ascending: true });
    if (error) toast.error("Erreur : " + error.message);
    else setActions((data as ActionCorrective[]) || []);
    setLoading(false);
  };

  const fetchFei = async () => {
    const { data } = await supabase.from("fei").select("id, type_fei, date_evenement").order("date_evenement", { ascending: false });
    setFeiOptions((data as FeiOption[]) || []);
  };

  const fetchPlaintes = async () => {
    const { data } = await supabase.from("plaintes").select("id, objet, date_plainte").order("date_plainte", { ascending: false });
    setPlainteOptions((data as PlainteOption[]) || []);
  };

  useEffect(() => {
    fetchActions();
    fetchFei();
    fetchPlaintes();
  }, []);

  // ── Stats ────────────────────────────────────────────────────
  const total = actions.length;
  const aFaire = actions.filter((a) => a.statut === "a_faire").length;
  const enCours = actions.filter((a) => a.statut === "en_cours").length;
  const realisees = actions.filter((a) => a.statut === "realisee" || a.statut === "evaluee").length;
  const progress = total > 0 ? Math.round((realisees / total) * 100) : 0;
  const retards = actions.filter(isRetard).length;

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = actions.filter((a) => {
    if (filterStatut !== "tous" && a.statut !== filterStatut) return false;
    if (filterPriorite !== "toutes" && a.priorite !== filterPriorite) return false;
    if (filterResponsable && !a.responsable.toLowerCase().includes(filterResponsable.toLowerCase())) return false;
    return true;
  });

  // ── Dialog helpers ────────────────────────────────────────────
  const openCreate = () => {
    setEditingAction(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (action: ActionCorrective) => {
    setEditingAction(action);
    setForm({
      titre: action.titre,
      description: action.description || "",
      responsable: action.responsable,
      date_echeance: action.date_echeance,
      priorite: action.priorite,
      statut: action.statut,
      fei_id: action.fei_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.titre.trim() || !form.responsable.trim() || !form.date_echeance) {
      toast.error("Titre, responsable et date d'échéance sont obligatoires.");
      return;
    }
    setSaving(true);
    const payload = {
      titre: form.titre.trim(),
      description: form.description.trim() || null,
      responsable: form.responsable.trim(),
      date_echeance: form.date_echeance,
      priorite: form.priorite,
      statut: form.statut,
      fei_id: form.fei_id || null,
    };

    let error;
    if (editingAction) {
      ({ error } = await supabase.from("actions_correctives").update(payload).eq("id", editingAction.id));
    } else {
      ({ error } = await supabase.from("actions_correctives").insert({ ...payload, user_id: user.id }));
    }

    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success(editingAction ? "Action mise à jour." : "Action créée.");
      setDialogOpen(false);
      fetchActions();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("actions_correctives").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success("Action supprimée.");
      setDeleteTarget(null);
      fetchActions();
    }
    setDeleting(false);
  };

  const canEdit = (action: ActionCorrective) => isAdmin || action.user_id === user?.id;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── En-tête ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Plan d'Actions Correctives</h1>
            <p className="text-xs text-muted-foreground">Plan d'Amélioration Continue de la Qualité (PACQ)</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-warm shrink-0">
          <Plus className="w-4 h-4" />
          Nouvelle action
        </Button>
      </motion.div>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total",      sub: "actions enregistrées",  value: total,     icon: ListTodo,     accent: "border-l-[#c46b48]", iconBg: "bg-[#c46b48]/10", iconColor: "text-[#c46b48]", numColor: "text-[#c46b48]" },
          { label: "À faire",    sub: "en attente",             value: aFaire,    icon: ListTodo,     accent: "border-l-slate-400",  iconBg: "bg-slate-100",     iconColor: "text-slate-500",  numColor: "text-slate-700" },
          { label: "En cours",   sub: "en progression",        value: enCours,   icon: Clock,        accent: "border-l-blue-400",   iconBg: "bg-blue-50",       iconColor: "text-blue-500",   numColor: "text-blue-600" },
          { label: "Réalisées",  sub: "réalisées + évaluées",  value: realisees, icon: CheckCircle2, accent: "border-l-emerald-400", iconBg: "bg-emerald-50",    iconColor: "text-emerald-500",numColor: "text-emerald-600" },
        ].map((s) => (
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

      {/* ── Barre de progression globale ──────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Progression globale du PACQ</span>
          </div>
          <div className="flex items-center gap-3">
            {retards > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                <AlertTriangle className="w-3 h-3" />
                {retards} en retard
              </span>
            )}
            <span className="text-2xl font-display font-bold text-primary">{progress}%</span>
          </div>
        </div>
        <Progress value={progress} className="h-3" />
        <p className="text-[11px] text-muted-foreground mt-2">
          {realisees} action{realisees > 1 ? "s" : ""} réalisée{realisees > 1 ? "s" : ""} ou évaluée{realisees > 1 ? "s" : ""} sur {total}
        </p>
      </motion.div>

      {/* ── Filtres ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        className="flex flex-wrap gap-3 items-center p-4 rounded-xl border border-border bg-card/50">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="a_faire">À faire</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="realisee">Réalisée</SelectItem>
            <SelectItem value="evaluee">Évaluée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriorite} onValueChange={setFilterPriorite}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes priorités</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="moyenne">Moyenne</SelectItem>
            <SelectItem value="faible">Faible</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Rechercher un responsable…"
          value={filterResponsable}
          onChange={(e) => setFilterResponsable(e.target.value)}
          className="h-8 text-xs w-52"
        />
        {(filterStatut !== "tous" || filterPriorite !== "toutes" || filterResponsable) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setFilterStatut("tous"); setFilterPriorite("toutes"); setFilterResponsable(""); }}>
            Réinitialiser
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} action{filtered.length > 1 ? "s" : ""}</span>
      </motion.div>

      {/* ── Liste des actions ─────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <ClipboardCheck className="w-12 h-12 mx-auto opacity-20" />
          <p className="font-medium">Aucune action trouvée</p>
          <p className="text-sm">Modifiez les filtres ou créez une nouvelle action.</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {filtered.map((action) => {
            const retard = isRetard(action);
            const prio = PRIORITE_CONFIG[action.priorite];
            const stat = STATUT_CONFIG[action.statut];
            const fei = feiOptions.find((f) => f.id === action.fei_id);

            return (
              <motion.div key={action.id} variants={item}>
                <div className={`rounded-xl border-l-4 ${retard ? "border-l-red-500 border-red-200 bg-red-50/30" : `${prio.border} border-border bg-card`} border shadow-sm hover:shadow-md transition-shadow`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Titre + badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {retard && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
                              <AlertTriangle className="w-3 h-3" />
                              En retard
                            </span>
                          )}
                          <Badge variant="outline" className={`text-[11px] ${stat.color} border-0`}>{stat.label}</Badge>
                          <Badge variant="outline" className={`text-[11px] ${prio.color} border-0 flex items-center gap-1`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                            {prio.label}
                          </Badge>
                        </div>
                        <h3 className="font-display font-semibold text-foreground text-sm leading-snug mb-1">{action.titre}</h3>
                        {action.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{action.description}</p>
                        )}

                        {/* Méta */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {action.responsable}
                          </span>
                          <span className={`flex items-center gap-1.5 ${retard ? "text-red-600 font-semibold" : ""}`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(action.date_echeance).toLocaleDateString("fr-FR")}
                          </span>
                          {fei && (
                            <span className="flex items-center gap-1.5">
                              <FileText className="w-3 h-3" />
                              FEI · {fei.type_fei} — {new Date(fei.date_evenement).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                          {action.plainte_id && (() => {
                            const plainte = plainteOptions.find((p) => p.id === action.plainte_id);
                            return plainte ? (
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-3 h-3" />
                                Plainte · {plainte.objet.slice(0, 40)}{plainte.objet.length > 40 ? "…" : ""}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      {/* Actions */}
                      {canEdit(action) && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(action)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(action)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Dialog Créer / Modifier ───────────────────────────── */}
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
              <Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
                placeholder="Intitulé de l'action corrective" />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Détails, contexte, objectif attendu…" rows={3} className="resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Responsable <span className="text-destructive">*</span></Label>
                <Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                  placeholder="Nom du responsable" />
              </div>
              <div className="space-y-1.5">
                <Label>Date d'échéance <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.date_echeance} onChange={(e) => setForm({ ...form, date_echeance: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select value={form.priorite} onValueChange={(v) => setForm({ ...form, priorite: v as Priorite })}>
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
                <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v as Statut })}>
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

            <div className="space-y-1.5">
              <Label>FEI associée <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
              <Select value={form.fei_id || "none"} onValueChange={(v) => setForm({ ...form, fei_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Aucune FEI associée" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune (action manuelle)</SelectItem>
                  {feiOptions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.type_fei} — {new Date(f.date_evenement).toLocaleDateString("fr-FR")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      {/* ── Dialog Suppression ────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />
              Supprimer cette action ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteTarget?.titre}"</strong> sera définitivement supprimée. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
