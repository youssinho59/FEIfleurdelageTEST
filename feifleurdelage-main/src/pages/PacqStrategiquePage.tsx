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
  Download, FileSpreadsheet, Loader2,
} from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

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
  source: string | null;
  ordre: number;
};

const SOURCES_PACQS = [
  "Auto-évaluation", "Projet d'établissement 2026-2030", "Réglementation",
  "Évaluation externe 2027", "DUERP", "Cartographie des risques",
  "Instance", "Audit interne", "Autre",
];

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
const EMPTY_ACT_FORM  = { titre: "", description: "", pilote_id: "", date_echeance: "", statut: "en_cours" as Action["statut"], source: "" };

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
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

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
      source: a.source || "",
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
      source: actForm.source || null,
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

  // ── Exports ─────────────────────────────────────────────────────────────────

  const fetchAllForExport = async () => {
    const [objRes, actRes, indRes, profilesRes] = await Promise.all([
      supabase.from("pacq_strategique_objectifs").select("*").order("thematique").order("ordre"),
      supabase.from("pacq_strategique_actions").select("*").order("ordre"),
      supabase.from("pacq_strategique_indicateurs").select("*"),
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    return {
      allObjs: (objRes.data || []) as Objectif[],
      allActs: (actRes.data || []) as Action[],
      allInds: (indRes.data || []) as Indicateur[],
      profiles: (profilesRes.data || []) as { user_id: string; full_name: string }[],
    };
  };

  const exportPDF = async () => {
    setExporting("pdf");
    toast("Génération en cours…");
    const { allObjs, allActs, allInds, profiles } = await fetchAllForExport();

    const piloteName = (id: string | null) =>
      id ? (profiles.find((p) => p.user_id === id)?.full_name ?? "Inconnu") : "—";

    const TERRACOTTA: [number, number, number] = [196, 107, 72];
    const DARK: [number, number, number] = [41, 37, 33];
    const MUTED: [number, number, number] = [140, 130, 120];
    const SECTION_BG: [number, number, number] = [245, 240, 235];
    const BORDER: [number, number, number] = [220, 210, 200];
    const THEMATIQUE_HEX: Record<string, [number, number, number]> = {
      blue: [59, 130, 246], green: [34, 197, 94], red: [239, 68, 68],
      purple: [168, 85, 247], orange: [249, 115, 22], teal: [20, 184, 166],
    };

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const PAGE_W = 210;
    const MARGIN = 14;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const dateStr = new Date().toLocaleDateString("fr-FR");

    const STATUT_LABELS: Record<string, string> = { en_cours: "En cours", realise: "Réalisé", abandonne: "Abandonné" };

    // ── Header helper ──
    const addPageHeader = () => {
      doc.setFillColor(...TERRACOTTA);
      doc.roundedRect(0, 0, PAGE_W, 40, 0, 0, "F");
      doc.setFillColor(220, 140, 100);
      doc.rect(0, 36, PAGE_W, 4, "F");
      doc.setFillColor(255, 255, 255);
      doc.circle(25, 20, 10, "F");
      doc.setTextColor(...TERRACOTTA);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("F\u00C2", 21, 23);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("EHPAD La Fleur de l'\u00C2ge", 42, 18);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("PACQS Strat\u00E9gique \u2014 Plan d\u2019am\u00E9lioration continue de la qualit\u00E9 et de la s\u00E9curit\u00E9", 42, 28);
      doc.setTextColor(...DARK);
    };

    addPageHeader();
    let y = 48;
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`G\u00E9n\u00E9r\u00E9 le ${dateStr}`, PAGE_W - MARGIN, y - 2, { align: "right" });

    const checkPageBreak = (needed: number) => {
      if (y + needed > 278) {
        doc.addPage();
        addPageHeader();
        y = 48;
      }
    };

    for (const t of THEMATIQUES_ESSMS) {
      const tColor = THEMATIQUE_HEX[t.color] ?? TERRACOTTA;
      const tObjs = allObjs.filter((o) => o.thematique === t.id);
      if (tObjs.length === 0) continue;

      checkPageBreak(16);
      // Thématique title band
      doc.setFillColor(...tColor);
      doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text(t.label, MARGIN + 4, y + 7);
      doc.setTextColor(...DARK);
      y += 14;

      for (const obj of tObjs) {
        const objActs = allActs.filter((a) => a.objectif_id === obj.id);
        checkPageBreak(14);

        // Objectif sub-section
        doc.setFillColor(...SECTION_BG);
        doc.setDrawColor(...BORDER);
        doc.roundedRect(MARGIN, y, CONTENT_W, 9, 2, 2, "FD");
        doc.setFillColor(...tColor);
        doc.roundedRect(MARGIN, y, 3, 9, 1, 0, "F");
        doc.rect(MARGIN + 1, y, 2, 9, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...tColor);
        const objTitleLines = doc.splitTextToSize(obj.titre, CONTENT_W - 12);
        doc.text(objTitleLines[0], MARGIN + 7, y + 6);
        doc.setTextColor(...DARK);
        y += 13;

        if (objActs.length === 0) {
          checkPageBreak(7);
          doc.setFontSize(8);
          doc.setTextColor(...MUTED);
          doc.setFont("helvetica", "italic");
          doc.text("Aucune action renseign\u00E9e.", MARGIN + 4, y + 4);
          y += 8;
          continue;
        }

        // Table header
        const C = {
          act: { x: MARGIN, w: 62 },
          pilote: { x: MARGIN + 62, w: 30 },
          echeance: { x: MARGIN + 92, w: 24 },
          statut: { x: MARGIN + 116, w: 22 },
          ind: { x: MARGIN + 138, w: CONTENT_W - 138 },
        };
        checkPageBreak(8);
        doc.setFillColor(...BORDER);
        doc.roundedRect(MARGIN, y, CONTENT_W, 6, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...DARK);
        doc.text("Action", C.act.x + 1, y + 4.3);
        doc.text("Pilote", C.pilote.x + 1, y + 4.3);
        doc.text("\u00C9ch\u00E9ance", C.echeance.x + 1, y + 4.3);
        doc.text("Statut", C.statut.x + 1, y + 4.3);
        doc.text("Indicateurs", C.ind.x + 1, y + 4.3);
        y += 7;

        for (const act of objActs) {
          const actInds = allInds.filter((i) => i.action_id === act.id && i.commentaire);
          const indText = actInds.map((i) => `${i.annee}: ${i.commentaire}`).join("  |  ") || "\u2014";
          const actionLines = doc.splitTextToSize(act.titre, C.act.w - 2);
          const piloteLines = doc.splitTextToSize(piloteName(act.pilote_id), C.pilote.w - 2);
          const indLines = doc.splitTextToSize(indText, C.ind.w - 2);
          const rowH = Math.max(actionLines.length, piloteLines.length, indLines.length) * 4 + 4;

          checkPageBreak(rowH);
          doc.setFillColor(250, 247, 243);
          doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
          doc.setDrawColor(...BORDER);
          doc.setLineWidth(0.2);
          doc.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...DARK);
          doc.text(actionLines, C.act.x + 1, y + 3.5);
          doc.text(piloteLines, C.pilote.x + 1, y + 3.5);
          doc.text(act.date_echeance ? new Date(act.date_echeance + "T00:00:00").toLocaleDateString("fr-FR") : "\u2014", C.echeance.x + 1, y + 3.5);
          doc.text(STATUT_LABELS[act.statut] ?? act.statut, C.statut.x + 1, y + 3.5);
          doc.text(indLines, C.ind.x + 1, y + 3.5);
          y += rowH;
        }
        y += 5;
      }
      y += 4;
    }

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(`Page ${i} / ${totalPages}`, PAGE_W / 2, 290, { align: "center" });
      doc.text(`G\u00E9n\u00E9r\u00E9 le ${dateStr}`, PAGE_W - MARGIN, 290, { align: "right" });
    }

    doc.save(`PACQ_Strategique_${dateStr.replace(/\//g, "-")}.pdf`);
    toast.success("Export PDF g\u00E9n\u00E9r\u00E9 !");
    setExporting(null);
  };

  const exportExcel = async () => {
    setExporting("excel");
    toast("G\u00E9n\u00E9ration en cours\u2026");
    const { allObjs, allActs, allInds, profiles } = await fetchAllForExport();

    const piloteName = (id: string | null) =>
      id ? (profiles.find((p) => p.user_id === id)?.full_name ?? "Inconnu") : "";

    const STATUT_LABELS: Record<string, string> = { en_cours: "En cours", realise: "R\u00E9alis\u00E9", abandonne: "Abandonn\u00E9" };

    const wb = XLSX.utils.book_new();

    // ── Onglet Synthèse ──
    const syntheseRows = THEMATIQUES_ESSMS.map((t) => {
      const tObjs = allObjs.filter((o) => o.thematique === t.id);
      const tActs = allActs.filter((a) => tObjs.some((o) => o.id === a.objectif_id));
      const realises = tActs.filter((a) => a.statut === "realise").length;
      return {
        "Th\u00E9matique": t.label,
        "Nb objectifs": tObjs.length,
        "Nb actions total": tActs.length,
        "Nb actions r\u00E9alis\u00E9es": realises,
        "% avancement": tActs.length > 0 ? Math.round((realises / tActs.length) * 100) + "%" : "\u2014",
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(syntheseRows), "Synth\u00E8se");

    // ── Onglet Actions (toutes) ──
    const actionsRows = allActs.map((a) => {
      const obj = allObjs.find((o) => o.id === a.objectif_id);
      const t = THEMATIQUES_ESSMS.find((t) => t.id === obj?.thematique);
      return {
        "Th\u00E9matique": t?.label ?? "\u2014",
        "Objectif": obj?.titre ?? "\u2014",
        "Action": a.titre,
        "Description": a.description ?? "",
        "Pilote": piloteName(a.pilote_id),
        "Date \u00E9ch\u00E9ance": a.date_echeance ? new Date(a.date_echeance + "T00:00:00").toLocaleDateString("fr-FR") : "",
        "Statut": STATUT_LABELS[a.statut] ?? a.statut,
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(actionsRows), "Actions");

    // ── Un onglet par thématique ──
    for (const t of THEMATIQUES_ESSMS) {
      const tObjs = allObjs.filter((o) => o.thematique === t.id);
      const tActs = allActs.filter((a) => tObjs.some((o) => o.id === a.objectif_id));
      const rows = tActs.map((a) => {
        const obj = allObjs.find((o) => o.id === a.objectif_id);
        const row: Record<string, string | number> = {
          "Objectif": obj?.titre ?? "\u2014",
          "Action": a.titre,
          "Description": a.description ?? "",
          "Pilote": piloteName(a.pilote_id),
          "Date \u00E9ch\u00E9ance": a.date_echeance ? new Date(a.date_echeance + "T00:00:00").toLocaleDateString("fr-FR") : "",
          "Statut": STATUT_LABELS[a.statut] ?? a.statut,
        };
        ANNEES_INDICATEURS.forEach((annee) => {
          const ind = allInds.find((i) => i.action_id === a.id && i.annee === annee);
          row[String(annee)] = ind?.commentaire ?? "";
        });
        return row;
      });
      const sheetName = t.label.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
    }

    const dateFile = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `PACQ_Strategique_${dateFile}.xlsx`);
    toast.success("Export Excel g\u00E9n\u00E9r\u00E9 !");
    setExporting(null);
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
            <h1 className="text-xl font-display font-bold text-foreground">PACQS Stratégique</h1>
            <p className="text-xs text-muted-foreground">Plan d'amélioration continue de la qualité et de la sécurité — Projet d'établissement</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={exportPDF}
            disabled={!!exporting}
          >
            {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exporter PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            onClick={exportExcel}
            disabled={!!exporting}
          >
            {exporting === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Exporter Excel
          </Button>
          <Button onClick={openCreateObj} className="gap-2 shadow-warm">
            <Plus className="w-4 h-4" /> Ajouter un objectif
          </Button>
        </div>
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
                                            {act.source && (
                                              <Badge variant="outline" className="text-[11px] bg-violet-50 text-violet-700 border-violet-200">
                                                {act.source}
                                              </Badge>
                                            )}
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
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-1.5">
                <Label>Source <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                <Select value={actForm.source || "none"} onValueChange={v => setActForm({ ...actForm, source: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sans source</SelectItem>
                    {SOURCES_PACQS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
