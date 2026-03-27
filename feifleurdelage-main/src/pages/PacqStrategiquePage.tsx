import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { THEMES_AGEVAL, ANNEES_INDICATEURS } from "@/lib/pacqStrategique";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Target, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Calendar, User, CheckCircle2, BarChart3,
  Download, FileSpreadsheet, Loader2, UserCheck,
} from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type Objectif = {
  id: string;
  reference: string | null;
  intitule: string | null;
  theme: string | null;
  responsable: string | null;
  priorite: string | null;
  avancement: string | null;
  echeance: string | null;
};

type Action = {
  id: string;
  objectif_id: string;
  intitule: string | null;
  pilote: string | null;
  priorite: string | null;
  avancement: string | null;
  echeance: string | null;
};

type Indicateur = {
  id: string;
  action_id: string;
  annee: number;
  commentaire: string | null;
};

// ─── Configs ──────────────────────────────────────────────────────────────────

const AVANCEMENT_OPTIONS = ["Non initié", "Planification", "En cours", "Finalisation", "Terminé"];
const PRIORITE_OPTIONS   = ["Basse", "Normale", "Haute", "Critique"];

const AVANCEMENT_CONFIG: Record<string, { color: string }> = {
  "Non initié":  { color: "bg-slate-100 text-slate-500"       },
  "Planification":{ color: "bg-amber-100 text-amber-700"       },
  "En cours":    { color: "bg-blue-100 text-blue-700"          },
  "Finalisation":{ color: "bg-violet-100 text-violet-700"      },
  "Terminé":     { color: "bg-emerald-100 text-emerald-700"    },
};

const PRIORITE_CONFIG: Record<string, { color: string }> = {
  "Basse":    { color: "bg-slate-100 text-slate-500"     },
  "Normale":  { color: "bg-sky-100 text-sky-700"         },
  "Haute":    { color: "bg-orange-100 text-orange-700"   },
  "Critique": { color: "bg-red-100 text-red-700"         },
};

const THEME_COLORS: Record<string, {
  tabActive: string; tabInactive: string; badge: string; border: string; dot: string;
}> = {
  indigo: { tabActive: "bg-indigo-600 text-white shadow", tabInactive: "text-indigo-700 hover:bg-indigo-50 border border-indigo-200", badge: "bg-indigo-100 text-indigo-700", border: "border-l-indigo-400", dot: "bg-indigo-500" },
  rose:   { tabActive: "bg-rose-600 text-white shadow",   tabInactive: "text-rose-700 hover:bg-rose-50 border border-rose-200",   badge: "bg-rose-100 text-rose-700",   border: "border-l-rose-400",   dot: "bg-rose-500"   },
  blue:   { tabActive: "bg-blue-600 text-white shadow",   tabInactive: "text-blue-700 hover:bg-blue-50 border border-blue-200",   badge: "bg-blue-100 text-blue-700",   border: "border-l-blue-400",   dot: "bg-blue-500"   },
  green:  { tabActive: "bg-green-600 text-white shadow",  tabInactive: "text-green-700 hover:bg-green-50 border border-green-200",  badge: "bg-green-100 text-green-700",  border: "border-l-green-400",  dot: "bg-green-500"  },
  purple: { tabActive: "bg-purple-600 text-white shadow", tabInactive: "text-purple-700 hover:bg-purple-50 border border-purple-200", badge: "bg-purple-100 text-purple-700", border: "border-l-purple-400", dot: "bg-purple-500" },
  red:    { tabActive: "bg-red-600 text-white shadow",    tabInactive: "text-red-700 hover:bg-red-50 border border-red-200",    badge: "bg-red-100 text-red-700",    border: "border-l-red-400",    dot: "bg-red-500"    },
  orange: { tabActive: "bg-orange-600 text-white shadow", tabInactive: "text-orange-700 hover:bg-orange-50 border border-orange-200", badge: "bg-orange-100 text-orange-700", border: "border-l-orange-400", dot: "bg-orange-500" },
  teal:   { tabActive: "bg-teal-600 text-white shadow",   tabInactive: "text-teal-700 hover:bg-teal-50 border border-teal-200",   badge: "bg-teal-100 text-teal-700",   border: "border-l-teal-400",   dot: "bg-teal-500"   },
};

const EMPTY_OBJ_FORM = { reference: "", intitule: "", theme: "", responsable: "", priorite: "Normale", avancement: "Non initié", echeance: "" };
const EMPTY_ACT_FORM = { intitule: "", pilote: "", priorite: "Normale", avancement: "Non initié", echeance: "" };

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item      = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

// ─── Component ────────────────────────────────────────────────────────────────

export default function PacqStrategiquePage() {
  const { profile } = useAuth();

  const [selectedTheme, setSelectedTheme] = useState(THEMES_AGEVAL[0].id);
  const [filterAvancement, setFilterAvancement] = useState("tous");
  const [filterMesActions, setFilterMesActions] = useState(false);
  const [allObjectifs, setAllObjectifs] = useState<Objectif[]>([]);
  const [actions, setActions]           = useState<Action[]>([]);
  const [indicateurs, setIndicateurs]   = useState<Indicateur[]>([]);
  const [loading, setLoading]           = useState(true);
  const [expandedObjectifs, setExpandedObjectifs] = useState<Set<string>>(new Set());
  const [expandedIndicateurs, setExpandedIndicateurs] = useState<Set<string>>(new Set());

  // Objectif dialog
  const [objDialog, setObjDialog]   = useState(false);
  const [objEditing, setObjEditing] = useState<Objectif | null>(null);
  const [objForm, setObjForm]       = useState({ ...EMPTY_OBJ_FORM });
  const [objSaving, setObjSaving]   = useState(false);

  // Action dialog
  const [actDialog, setActDialog]     = useState(false);
  const [actEditing, setActEditing]   = useState<Action | null>(null);
  const [actParentId, setActParentId] = useState<string>("");
  const [actForm, setActForm]         = useState({ ...EMPTY_ACT_FORM });
  const [actSaving, setActSaving]     = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ type: "objectif" | "action"; id: string } | null>(null);

  // Indicateur edit
  const [indEditing, setIndEditing] = useState<{ actionId: string; annee: number } | null>(null);
  const [indValue, setIndValue]     = useState("");
  const [indSaving, setIndSaving]   = useState(false);

  // Export
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    const [{ data: objs }, { data: acts }, { data: inds }] = await Promise.all([
      supabase.from("pacq_strategique_objectifs")
        .select("id, reference, intitule, theme, responsable, priorite, avancement, echeance")
        .order("reference", { ascending: true }),
      supabase.from("pacq_strategique_actions")
        .select("id, objectif_id, intitule, pilote, priorite, avancement, echeance")
        .order("intitule", { ascending: true }),
      supabase.from("pacq_strategique_indicateurs")
        .select("id, action_id, annee, commentaire"),
    ]);

    const raw = (objs as any[]) || [];
    console.log("[PACQ] premier objectif brut :", JSON.stringify(raw[0]));
    console.log("[PACQ] themes distincts :", JSON.stringify([...new Set(raw.map((o:any) => o.theme))]));
    setAllObjectifs(raw as Objectif[]);
    setActions((acts as Action[]) || []);
    setIndicateurs((inds as Indicateur[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  // TEMP : theme null en base — affiche tout pour valider l'affichage
  const objectifsForTheme = allObjectifs;

  const visibleObjectifs = objectifsForTheme.filter(o => {
    const objActions = actions.filter(a => a.objectif_id === o.id);
    if (filterMesActions) {
      if (!objActions.some(a => a.pilote === profile?.full_name)) return false;
    }
    if (filterAvancement !== "tous") {
      if (!objActions.some(a => a.avancement === filterAvancement)) return false;
    }
    return true;
  });

  const actionsForObjectif = (objId: string) => {
    let acts = actions.filter(a => a.objectif_id === objId);
    if (filterAvancement !== "tous") acts = acts.filter(a => a.avancement === filterAvancement);
    if (filterMesActions) acts = acts.filter(a => a.pilote === profile?.full_name);
    return acts;
  };

  const totalActions   = actions.length;
  const terminees      = actions.filter(a => a.avancement === "Terminé").length;
  const enCours        = actions.filter(a => a.avancement === "En cours").length;
  const progressPct    = totalActions > 0 ? Math.round((terminees / totalActions) * 100) : 0;

  // ── Toggle helpers ───────────────────────────────────────────────────────────

  const toggleObjectif = (id: string) =>
    setExpandedObjectifs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleIndicateurs = (id: string) =>
    setExpandedIndicateurs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Objectif CRUD ────────────────────────────────────────────────────────────

  const openAddObjectif = () => {
    setObjEditing(null);
    setObjForm({ ...EMPTY_OBJ_FORM, theme: selectedTheme });
    setObjDialog(true);
  };

  const openEditObjectif = (o: Objectif) => {
    setObjEditing(o);
    setObjForm({
      reference:   o.reference   || "",
      intitule:    o.intitule    || "",
      theme:       o.theme       || selectedTheme,
      responsable: o.responsable || "",
      priorite:    o.priorite    || "Normale",
      avancement:  o.avancement  || "Non initié",
      echeance:    o.echeance    || "",
    });
    setObjDialog(true);
  };

  const saveObjectif = async () => {
    if (!objForm.intitule.trim()) { toast.error("L'intitulé est obligatoire"); return; }
    setObjSaving(true);
    const payload: any = {
      reference:   objForm.reference   || null,
      intitule:    objForm.intitule.trim(),
      theme:       objForm.theme        || null,
      responsable: objForm.responsable  || null,
      priorite:    objForm.priorite     || "Normale",
      avancement:  objForm.avancement   || "Non initié",
      echeance:    objForm.echeance     || null,
    };
    const { error } = objEditing
      ? await supabase.from("pacq_strategique_objectifs").update(payload).eq("id", objEditing.id)
      : await supabase.from("pacq_strategique_objectifs").insert(payload);
    setObjSaving(false);
    if (error) { toast.error("Erreur lors de l'enregistrement"); return; }
    toast.success(objEditing ? "Objectif mis à jour" : "Objectif créé");
    setObjDialog(false);
    load();
  };

  // ── Action CRUD ──────────────────────────────────────────────────────────────

  const openAddAction = (objId: string) => {
    setActEditing(null);
    setActParentId(objId);
    setActForm({ ...EMPTY_ACT_FORM });
    setActDialog(true);
  };

  const openEditAction = (a: Action) => {
    setActEditing(a);
    setActParentId(a.objectif_id);
    setActForm({
      intitule:   a.intitule   || "",
      pilote:     a.pilote     || "",
      priorite:   a.priorite   || "Normale",
      avancement: a.avancement || "Non initié",
      echeance:   a.echeance   || "",
    });
    setActDialog(true);
  };

  const saveAction = async () => {
    if (!actForm.intitule.trim()) { toast.error("L'intitulé est obligatoire"); return; }
    setActSaving(true);
    const payload: any = {
      objectif_id: actParentId,
      intitule:    actForm.intitule.trim(),
      pilote:      actForm.pilote    || null,
      priorite:    actForm.priorite  || "Normale",
      avancement:  actForm.avancement || "Non initié",
      echeance:    actForm.echeance  || null,
    };
    const { error } = actEditing
      ? await supabase.from("pacq_strategique_actions").update(payload).eq("id", actEditing.id)
      : await supabase.from("pacq_strategique_actions").insert(payload);
    setActSaving(false);
    if (error) { toast.error("Erreur lors de l'enregistrement"); return; }
    toast.success(actEditing ? "Action mise à jour" : "Action créée");
    setActDialog(false);
    load();
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const table = deleteTarget.type === "objectif" ? "pacq_strategique_objectifs" : "pacq_strategique_actions";
    const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Erreur lors de la suppression"); }
    else { toast.success(deleteTarget.type === "objectif" ? "Objectif supprimé" : "Action supprimée"); load(); }
    setDeleteTarget(null);
  };

  // ── Indicateurs ──────────────────────────────────────────────────────────────

  const openEditIndicateur = (actionId: string, annee: number) => {
    const existing = indicateurs.find(i => i.action_id === actionId && i.annee === annee);
    setIndEditing({ actionId, annee });
    setIndValue(existing?.commentaire || "");
  };

  const saveIndicateur = async () => {
    if (!indEditing) return;
    setIndSaving(true);
    const existing = indicateurs.find(i => i.action_id === indEditing.actionId && i.annee === indEditing.annee);
    const payload = { action_id: indEditing.actionId, annee: indEditing.annee, commentaire: indValue };
    const { error } = existing
      ? await supabase.from("pacq_strategique_indicateurs").update({ commentaire: indValue }).eq("id", existing.id)
      : await supabase.from("pacq_strategique_indicateurs").insert(payload);
    setIndSaving(false);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Indicateur enregistré");
    setIndEditing(null);
    const { data } = await supabase.from("pacq_strategique_indicateurs").select("id, action_id, annee, commentaire");
    setIndicateurs((data as Indicateur[]) || []);
  };

  // ── Export PDF ───────────────────────────────────────────────────────────────

  const exportPDF = async () => {
    setExporting("pdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PACQS Stratégique — Plan d'amélioration continue de la qualité", pageW / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Exporté le ${new Date().toLocaleDateString("fr-FR")}`, pageW / 2, y, { align: "center" });
    y += 10;

    for (const theme of THEMES_AGEVAL) {
      const objs = allObjectifs.filter(o => o.theme === theme.id);
      if (objs.length === 0) continue;

      if (y > 170) { doc.addPage(); y = 15; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`▸ ${theme.label}`, 10, y);
      y += 7;

      for (const obj of objs) {
        if (y > 170) { doc.addPage(); y = 15; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const ref = obj.reference ? `[${obj.reference}] ` : "";
        const lines = doc.splitTextToSize(`${ref}${obj.intitule || ""}`, pageW - 30);
        doc.text(lines, 14, y);
        y += lines.length * 5;

        if (obj.responsable || obj.priorite || obj.avancement) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          const meta = [
            obj.responsable ? `Responsable: ${obj.responsable}` : null,
            obj.priorite    ? `Priorité: ${obj.priorite}`       : null,
            obj.avancement  ? `Avancement: ${obj.avancement}`   : null,
          ].filter(Boolean).join("  |  ");
          doc.text(meta, 14, y);
          y += 5;
        }

        const objActions = actions.filter(a => a.objectif_id === obj.id);
        for (const act of objActions) {
          if (y > 180) { doc.addPage(); y = 15; }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          const actLines = doc.splitTextToSize(`• ${act.intitule || ""}`, pageW - 40);
          doc.text(actLines, 20, y);
          y += actLines.length * 4.5;

          const meta2 = [
            act.pilote     ? `Pilote: ${act.pilote}`          : null,
            act.avancement ? `Avancement: ${act.avancement}`  : null,
            act.echeance   ? `Échéance: ${new Date(act.echeance).toLocaleDateString("fr-FR")}` : null,
          ].filter(Boolean).join("  |  ");
          if (meta2) {
            doc.setFontSize(7);
            doc.setTextColor(120);
            doc.text(meta2, 22, y);
            doc.setTextColor(0);
            y += 4.5;
          }
        }
        y += 2;
      }
      y += 4;
    }

    doc.save("PACQS_Strategique.pdf");
    setExporting(null);
  };

  // ── Export Excel ─────────────────────────────────────────────────────────────

  const exportExcel = () => {
    setExporting("xlsx");
    const rows: any[] = [];
    for (const theme of THEMES_AGEVAL) {
      const objs = allObjectifs.filter(o => o.theme === theme.id);
      for (const obj of objs) {
        const objActions = actions.filter(a => a.objectif_id === obj.id);
        if (objActions.length === 0) {
          rows.push({
            Thème: theme.label,
            Référence: obj.reference || "",
            Objectif: obj.intitule || "",
            Responsable: obj.responsable || "",
            "Priorité objectif": obj.priorite || "",
            "Avancement objectif": obj.avancement || "",
            "Échéance objectif": obj.echeance ? new Date(obj.echeance).toLocaleDateString("fr-FR") : "",
            Action: "",
            Pilote: "",
            "Priorité action": "",
            "Avancement action": "",
            "Échéance action": "",
          });
        } else {
          for (const act of objActions) {
            rows.push({
              Thème: theme.label,
              Référence: obj.reference || "",
              Objectif: obj.intitule || "",
              Responsable: obj.responsable || "",
              "Priorité objectif": obj.priorite || "",
              "Avancement objectif": obj.avancement || "",
              "Échéance objectif": obj.echeance ? new Date(obj.echeance).toLocaleDateString("fr-FR") : "",
              Action: act.intitule || "",
              Pilote: act.pilote || "",
              "Priorité action": act.priorite || "",
              "Avancement action": act.avancement || "",
              "Échéance action": act.echeance ? new Date(act.echeance).toLocaleDateString("fr-FR") : "",
            });
          }
        }
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PACQS Stratégique");
    XLSX.writeFile(wb, "PACQS_Strategique.xlsx");
    setExporting(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const currentThemeMeta = THEMES_AGEVAL.find(t => t.id === selectedTheme)!;
  const themeColors = THEME_COLORS[currentThemeMeta.color];

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">PACQS Stratégique</h1>
            <p className="text-xs text-muted-foreground">Plan d'amélioration continue — Référentiel HAS / Ageval</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportPDF} disabled={!!exporting}>
            {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportExcel} disabled={!!exporting}>
            {exporting === "xlsx" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            Excel
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openAddObjectif}>
            <Plus className="w-3.5 h-3.5" /> Objectif
          </Button>
        </div>
      </motion.div>

      {/* Statistiques globales */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Objectifs",       value: allObjectifs.length,     accent: "border-l-[#c46b48]", numColor: "text-[#c46b48]" },
          { label: "Actions",         value: totalActions,             accent: "border-l-sky-400",   numColor: "text-sky-600"   },
          { label: "En cours",        value: enCours,                  accent: "border-l-blue-400",  numColor: "text-blue-600"  },
          { label: "Terminées",       value: terminees,                accent: "border-l-emerald-400", numColor: "text-emerald-600" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-l-4 ${s.accent} border border-border/60 bg-card px-5 py-4 flex items-center justify-between shadow-sm`}>
            <p className="text-sm font-semibold text-foreground">{s.label}</p>
            <span className={`text-2xl font-display font-bold tabular-nums ${s.numColor}`}>{s.value}</span>
          </div>
        ))}
      </motion.div>

      {/* Barre de progression */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Progression globale</span>
          <span className="text-muted-foreground">{terminees} / {totalActions} actions terminées — {progressPct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
      </motion.div>

      {/* Filtres */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
        className="flex flex-wrap gap-2 items-center p-4 rounded-xl border border-border bg-card/50">
        <Select value={filterAvancement} onValueChange={setFilterAvancement}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Avancement" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les avancements</SelectItem>
            {AVANCEMENT_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          variant={filterMesActions ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setFilterMesActions(v => !v)}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Mes actions
        </Button>

        {(filterAvancement !== "tous" || filterMesActions) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setFilterAvancement("tous"); setFilterMesActions(false); }}>
            Réinitialiser
          </Button>
        )}
      </motion.div>

      {/* Tabs thèmes */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2">
        {THEMES_AGEVAL.map(t => {
          const c = THEME_COLORS[t.color];
          const active = t.id === selectedTheme;
          const count = allObjectifs.filter(o => o.theme === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTheme(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all duration-150 ${active ? c.tabActive : c.tabInactive}`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/25 text-white" : c.badge}`}>{count}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Contenu du thème */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : visibleObjectifs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <Target className="w-12 h-12 mx-auto opacity-20" />
          <p className="font-medium">Aucun objectif dans ce thème</p>
          <p className="text-sm">Ajoutez un objectif ou modifiez vos filtres.</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {visibleObjectifs.map(obj => {
            const expanded = expandedObjectifs.has(obj.id);
            const objActs  = actionsForObjectif(obj.id);
            const avCfg    = AVANCEMENT_CONFIG[obj.avancement || "Non initié"] ?? AVANCEMENT_CONFIG["Non initié"];
            const prCfg    = PRIORITE_CONFIG[obj.priorite || "Normale"]        ?? PRIORITE_CONFIG["Normale"];

            return (
              <motion.div key={obj.id} variants={item}>
                <div className={`rounded-xl border border-border bg-card shadow-sm border-l-4 ${themeColors.border}`}>
                  {/* Objectif header */}
                  <div
                    className="p-4 cursor-pointer select-none"
                    onClick={() => toggleObjectif(obj.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {obj.reference && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${themeColors.badge}`}>
                              {obj.reference}
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 ${avCfg.color}`}>
                            {obj.avancement || "Non initié"}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 ${prCfg.color}`}>
                            {obj.priorite || "Normale"}
                          </span>
                        </div>
                        <p className="text-sm font-display font-semibold text-foreground leading-snug">
                          {obj.intitule || "—"}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-1.5">
                          {obj.responsable && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="w-3 h-3" /> {obj.responsable}
                            </span>
                          )}
                          {obj.echeance && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" /> {new Date(obj.echeance).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {objActs.length} action{objActs.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEditObjectif(obj); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: "objectif", id: obj.id }); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
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
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-border/60 bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between py-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 font-body">
                              Actions ({objActs.length})
                            </p>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openAddAction(obj.id)}>
                              <Plus className="w-3.5 h-3.5" /> Ajouter
                            </Button>
                          </div>

                          {objActs.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 text-center py-3">Aucune action pour cet objectif</p>
                          ) : (
                            <div className="space-y-2">
                              {objActs.map(act => {
                                const aAvCfg = AVANCEMENT_CONFIG[act.avancement || "Non initié"] ?? AVANCEMENT_CONFIG["Non initié"];
                                const aPrCfg = PRIORITE_CONFIG[act.priorite || "Normale"] ?? PRIORITE_CONFIG["Normale"];
                                const indExpanded = expandedIndicateurs.has(act.id);
                                const actInds = indicateurs.filter(i => i.action_id === act.id);
                                const hasInds = actInds.some(i => i.commentaire);

                                return (
                                  <div key={act.id} className="rounded-lg border border-border/60 bg-card p-3">
                                    <div className="flex items-start gap-2">
                                      <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${themeColors.dot}`} />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${aAvCfg.color}`}>
                                            {act.avancement || "Non initié"}
                                          </span>
                                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${aPrCfg.color}`}>
                                            {act.priorite || "Normale"}
                                          </span>
                                        </div>
                                        <p className="text-xs font-semibold text-foreground leading-snug">{act.intitule || "—"}</p>
                                        <div className="flex flex-wrap gap-3 mt-1">
                                          {act.pilote && (
                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                              <User className="w-3 h-3" /> {act.pilote}
                                            </span>
                                          )}
                                          {act.echeance && (
                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                              <Calendar className="w-3 h-3" /> {new Date(act.echeance).toLocaleDateString("fr-FR")}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => toggleIndicateurs(act.id)}
                                          className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <BarChart3 className="w-3 h-3" />
                                          Indicateurs annuels
                                          {hasInds && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full font-semibold">renseignés</span>}
                                          {indExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditAction(act)}>
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "action", id: act.id })}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Indicateurs */}
                                    <AnimatePresence>
                                      {indExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.15 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="mt-3 pt-3 border-t border-border/50">
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 font-body">
                                              Indicateurs annuels
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                              {ANNEES_INDICATEURS.map(annee => {
                                                const ind = actInds.find(i => i.annee === annee);
                                                const isEditing = indEditing?.actionId === act.id && indEditing?.annee === annee;
                                                return (
                                                  <div key={annee} className="space-y-1">
                                                    <p className="text-[11px] font-semibold text-muted-foreground font-body">{annee}</p>
                                                    {isEditing ? (
                                                      <div className="space-y-1">
                                                        <textarea
                                                          value={indValue}
                                                          onChange={e => setIndValue(e.target.value)}
                                                          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 min-h-[56px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                                                        />
                                                        <div className="flex gap-1">
                                                          <Button size="sm" className="h-6 text-[10px] px-2" onClick={saveIndicateur} disabled={indSaving}>
                                                            {indSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                          </Button>
                                                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setIndEditing(null)}>
                                                            ✕
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div
                                                        className="text-xs bg-background border border-border rounded-md px-2 py-1.5 min-h-[56px] cursor-pointer hover:border-primary/50 transition-colors leading-relaxed"
                                                        onClick={() => openEditIndicateur(act.id, annee)}
                                                      >
                                                        {ind?.commentaire || <span className="text-muted-foreground/50 italic text-[11px]">Cliquer pour saisir</span>}
                                                      </div>
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
                              })}
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
        </motion.div>
      )}

      {/* Dialog — Objectif */}
      <Dialog open={objDialog} onOpenChange={setObjDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{objEditing ? "Modifier l'objectif" : "Nouvel objectif"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Référence</Label>
                <Input className="h-8 text-xs" placeholder="ex. 01" value={objForm.reference}
                  onChange={e => setObjForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Thème</Label>
                <Select value={objForm.theme} onValueChange={v => setObjForm(f => ({ ...f, theme: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {THEMES_AGEVAL.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Intitulé *</Label>
              <Input className="h-8 text-xs" placeholder="Intitulé de l'objectif" value={objForm.intitule}
                onChange={e => setObjForm(f => ({ ...f, intitule: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Responsable</Label>
              <Input className="h-8 text-xs" placeholder="Nom du responsable" value={objForm.responsable}
                onChange={e => setObjForm(f => ({ ...f, responsable: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Priorité</Label>
                <Select value={objForm.priorite} onValueChange={v => setObjForm(f => ({ ...f, priorite: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITE_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Avancement</Label>
                <Select value={objForm.avancement} onValueChange={v => setObjForm(f => ({ ...f, avancement: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{AVANCEMENT_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Échéance</Label>
              <Input type="date" className="h-8 text-xs" value={objForm.echeance}
                onChange={e => setObjForm(f => ({ ...f, echeance: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setObjDialog(false)}>Annuler</Button>
            <Button size="sm" onClick={saveObjectif} disabled={objSaving}>
              {objSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {objEditing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Action */}
      <Dialog open={actDialog} onOpenChange={setActDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{actEditing ? "Modifier l'action" : "Nouvelle action"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Intitulé *</Label>
              <Input className="h-8 text-xs" placeholder="Intitulé de l'action" value={actForm.intitule}
                onChange={e => setActForm(f => ({ ...f, intitule: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pilote</Label>
              <Input className="h-8 text-xs" placeholder="Nom du pilote" value={actForm.pilote}
                onChange={e => setActForm(f => ({ ...f, pilote: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Priorité</Label>
                <Select value={actForm.priorite} onValueChange={v => setActForm(f => ({ ...f, priorite: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITE_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Avancement</Label>
                <Select value={actForm.avancement} onValueChange={v => setActForm(f => ({ ...f, avancement: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{AVANCEMENT_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Échéance</Label>
              <Input type="date" className="h-8 text-xs" value={actForm.echeance}
                onChange={e => setActForm(f => ({ ...f, echeance: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActDialog(false)}>Annuler</Button>
            <Button size="sm" onClick={saveAction} disabled={actSaving}>
              {actSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {actEditing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog — Suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "objectif"
                ? "Cet objectif et toutes ses actions seront supprimés définitivement."
                : "Cette action sera supprimée définitivement."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
