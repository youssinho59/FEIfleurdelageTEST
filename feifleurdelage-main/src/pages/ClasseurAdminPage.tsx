import { useState, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FolderOpen, Plus, Trash2, ExternalLink,
  ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Download, Search, Users, FileCheck, BarChart3, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Categorie = { id: string; nom: string; ordre: number };

type Procedure = {
  id: string;
  categorie_id: string;
  titre: string;
  description: string | null;
  pdf_filename: string;
  services: string[];
  created_at: string;
};

type Emargement = { procedure_id: string; user_id: string; emarge_at: string };

type AgentInfo = { user_id: string; full_name: string; services: string[] };

// ─── Constantes ───────────────────────────────────────────────────────────────

const SERVICES_LIST = [
  "Administration", "Cuisine", "Technique",
  "Lingerie", "Animation", "Soins/Hôtellerie",
];

const EMPTY_PROC_FORM = {
  titre: "",
  description: "",
  pdf_filename: "",
  services: [] as string[],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeFilename(raw: string): string {
  const ext = raw.toLowerCase().endsWith(".pdf") ? ".pdf" : "";
  const base = ext ? raw.slice(0, -4) : raw;
  return (
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[''`]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
    + ext
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── PDF colours (mirror pdfGenerator.ts) ────────────────────────────────────

const TC: [number, number, number]   = [196, 107,  72]; // terracotta
const DARK: [number, number, number] = [ 41,  37,  33];
const MUTED_C: [number, number, number] = [140, 130, 120];
const GREEN_C: [number, number, number] = [ 22, 163,  74];
const ORANGE_C: [number, number, number] = [234, 88,  12];
const RED_C: [number, number, number]   = [220,  38,  38];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClasseurAdminPage() {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  // Catégories
  const [newCatNom, setNewCatNom] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  // Accordion procédures
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Dialog ajout procédure
  const [procDialogOpen, setProcDialogOpen] = useState(false);
  const [procDialogCatId, setProcDialogCatId] = useState("");
  const [procForm, setProcForm] = useState(EMPTY_PROC_FORM);
  const [savingProc, setSavingProc] = useState(false);

  // Suivi — données brutes
  const [emargements, setEmargements] = useState<Emargement[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loadingSuivi, setLoadingSuivi] = useState(false);
  const [suiviLoaded, setSuiviLoaded] = useState(false);

  // Suivi — filtres
  const [suiviFilterCat, setSuiviFilterCat] = useState("all");
  const [suiviFilterService, setSuiviFilterService] = useState("all");
  const [suiviFilterIncomplete, setSuiviFilterIncomplete] = useState(false);
  const [suiviSearch, setSuiviSearch] = useState("");

  // Suivi — expansion lignes
  const [suiviExpandedProcs, setSuiviExpandedProcs] = useState<Set<string>>(new Set());

  // Export PDF
  const [exportingPdf, setExportingPdf] = useState(false);

  // ── Chargement catégories + procédures ──────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const [catsRes, procsRes] = await Promise.allSettled([
      supabase.from("classeur_categories").select("id, nom, ordre").order("ordre"),
      supabase.from("classeur_procedures")
        .select("id, categorie_id, titre, description, pdf_filename, services, created_at")
        .order("created_at"),
    ]);
    if (catsRes.status === "fulfilled" && !catsRes.value.error)
      setCategories(catsRes.value.data ?? []);
    if (procsRes.status === "fulfilled" && !procsRes.value.error)
      setProcedures((procsRes.value.data ?? []).map(p => ({ ...p, services: p.services ?? [] })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Chargement suivi (lazy) ──────────────────────────────────────────────────

  const loadSuivi = useCallback(async () => {
    if (suiviLoaded) return;
    setLoadingSuivi(true);
    const [emargRes, agentsRes] = await Promise.allSettled([
      supabase.from("classeur_emargements").select("procedure_id, user_id, emarge_at"),
      supabase.functions.invoke("manage-agent", { body: { action: "list" } }),
    ]);
    if (emargRes.status === "fulfilled" && !emargRes.value.error)
      setEmargements(emargRes.value.data ?? []);
    if (agentsRes.status === "fulfilled" && !agentsRes.value.error) {
      const data = agentsRes.value.data as { agents?: any[] } | null;
      setAgents(
        (data?.agents ?? []).map((a: any) => ({
          user_id: a.user_id,
          full_name: a.full_name,
          services: a.services ?? [],
        }))
      );
    }
    setSuiviLoaded(true);
    setLoadingSuivi(false);
  }, [suiviLoaded]);

  // ── Catégories ──────────────────────────────────────────────────────────────

  const handleAddCat = async () => {
    if (!newCatNom.trim()) return;
    setAddingCat(true);
    const { error } = await supabase
      .from("classeur_categories")
      .insert({ nom: newCatNom.trim(), ordre: categories.length });
    if (error) toast.error("Erreur lors de l'ajout de la catégorie");
    else { setNewCatNom(""); await loadData(); toast.success("Catégorie ajoutée"); }
    setAddingCat(false);
  };

  const handleDeleteCat = async (id: string) => {
    const { error } = await supabase.from("classeur_categories").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else { await loadData(); toast.success("Catégorie supprimée"); }
  };

  // ── Procédures ──────────────────────────────────────────────────────────────

  const openAddProc = (catId: string) => {
    setProcDialogCatId(catId);
    setProcForm(EMPTY_PROC_FORM);
    setProcDialogOpen(true);
  };

  const handleAddProc = async () => {
    if (!procForm.titre.trim() || !procForm.pdf_filename.trim()) return;
    setSavingProc(true);
    const { error } = await supabase.from("classeur_procedures").insert({
      categorie_id: procDialogCatId,
      titre: procForm.titre.trim(),
      description: procForm.description.trim() || null,
      pdf_filename: sanitizeFilename(procForm.pdf_filename.trim()),
      services: procForm.services,
    });
    if (error) toast.error("Erreur lors de l'ajout de la procédure");
    else { setProcDialogOpen(false); await loadData(); toast.success("Procédure ajoutée"); }
    setSavingProc(false);
  };

  const handleDeleteProc = async (id: string) => {
    const { error } = await supabase.from("classeur_procedures").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else { await loadData(); toast.success("Procédure supprimée"); }
  };

  const toggleService = (svc: string) =>
    setProcForm(f => ({
      ...f,
      services: f.services.includes(svc)
        ? f.services.filter(s => s !== svc)
        : [...f.services, svc],
    }));

  const toggleCat = (id: string) =>
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // ── Suivi — helpers dérivés ──────────────────────────────────────────────────

  // Agents pertinents pour une procédure (selon ses services)
  const agentsForProc = (proc: Procedure) =>
    proc.services.length === 0
      ? agents
      : agents.filter(a => a.services.some(s => proc.services.includes(s)));

  // Toggle détail d'une ligne
  const toggleProcExpand = (id: string) =>
    setSuiviExpandedProcs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Services dynamiques présents chez les agents
  const allAgentServices = [...new Set(agents.flatMap(a => a.services))].sort();

  // Colonnes agents (filtrées par service)
  const agentColumns = suiviFilterService === "all"
    ? agents
    : agents.filter(a => a.services.includes(suiviFilterService));

  // Pour une procédure, agents pertinents parmi les colonnes visibles
  const relevantInView = (proc: Procedure) => {
    const procAgents = agentsForProc(proc);
    if (suiviFilterService === "all") return procAgents;
    return procAgents.filter(a => a.services.includes(suiviFilterService));
  };

  // Procédures filtrées pour le tableau
  const suiviProceduresFiltered = procedures.filter(p => {
    if (suiviFilterCat !== "all" && p.categorie_id !== suiviFilterCat) return false;
    if (suiviSearch && !p.titre.toLowerCase().includes(suiviSearch.toLowerCase())) return false;
    if (suiviFilterIncomplete) {
      const relevant = relevantInView(p);
      const emCount = emargements.filter(e =>
        e.procedure_id === p.id && relevant.some(a => a.user_id === e.user_id)
      ).length;
      if (relevant.length === 0 || emCount >= relevant.length) return false;
    }
    return true;
  });

  // ── KPIs (tous agents, toutes procédures, sans filtre) ──────────────────────

  let kpiTotalPossible = 0;
  let kpiTotalDone = 0;
  let kpiCompleteCount = 0;

  for (const proc of procedures) {
    const relevant = agentsForProc(proc);
    const emCount = emargements.filter(e =>
      e.procedure_id === proc.id && relevant.some(a => a.user_id === e.user_id)
    ).length;
    kpiTotalPossible += relevant.length;
    kpiTotalDone += emCount;
    if (relevant.length > 0 && emCount >= relevant.length) kpiCompleteCount++;
  }
  const kpiGlobalRate = kpiTotalPossible > 0
    ? Math.round((kpiTotalDone / kpiTotalPossible) * 100)
    : 0;
  const kpiAgentsZero = agents.filter(a => !emargements.some(e => e.user_id === a.user_id)).length;

  // ── Export PDF ───────────────────────────────────────────────────────────────

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const PAGE_W = 210;
      const MARGIN = 12;
      const CW = PAGE_W - MARGIN * 2;

      // ── En-tête page 1 ────────────────────────────────────────────────────
      const drawHeader = () => {
        doc.setFillColor(...TC);
        doc.roundedRect(0, 0, PAGE_W, 42, 0, 0, "F");
        doc.setFillColor(220, 140, 100);
        doc.rect(0, 38, PAGE_W, 4, "F");

        doc.setFillColor(255, 255, 255);
        doc.circle(22, 21, 9, "F");
        doc.setTextColor(...TC);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("FÂ", 18.5, 24.5);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text("EHPAD La Fleur de l'Âge", 36, 17);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Suivi des émargements — Classeur documentaire", 36, 26);
        doc.setFontSize(8);
        doc.text(
          new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
          36, 34
        );
        doc.setTextColor(...DARK);
      };

      // ── Pied de page (appelé à la fin) ────────────────────────────────────
      const addPageNumbers = () => {
        const total = doc.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
          doc.setPage(i);
          doc.setFontSize(7.5);
          doc.setTextColor(...MUTED_C);
          doc.setFont("helvetica", "normal");
          doc.text(`Page ${i} / ${total}`, PAGE_W / 2, 291, { align: "center" });
          doc.text(
            `Généré le ${new Date().toLocaleDateString("fr-FR")} — EHPAD La Fleur de l'Âge`,
            MARGIN, 291
          );
        }
      };

      drawHeader();

      // ── Sous-titre filtres ────────────────────────────────────────────────
      let y = 54;
      const filterParts: string[] = [];
      if (suiviFilterCat !== "all") {
        const catName = categories.find(c => c.id === suiviFilterCat)?.nom ?? "";
        filterParts.push(`Catégorie : ${catName}`);
      }
      if (suiviFilterService !== "all") filterParts.push(`Service : ${suiviFilterService}`);
      if (suiviFilterIncomplete) filterParts.push("Procédures incomplètes uniquement");
      if (suiviSearch) filterParts.push(`Recherche : « ${suiviSearch} »`);

      if (filterParts.length > 0) {
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED_C);
        doc.setFont("helvetica", "italic");
        doc.text("Filtres : " + filterParts.join(" · "), MARGIN, y);
        y += 7;
      }

      // ── Ligne synthèse KPIs ───────────────────────────────────────────────
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.text(
        `${procedures.length} procédures · Taux global : ${kpiGlobalRate}% · ` +
        `${kpiCompleteCount} complètes · ${kpiAgentsZero} agent${kpiAgentsZero > 1 ? "s" : ""} sans émargement`,
        MARGIN, y
      );
      y += 10;

      // ── En-tête tableau ───────────────────────────────────────────────────
      const COL_W = [70, 35, 20, 16, 16, 29]; // Procédure | Catégorie | Émargés | Total | % | Statut
      const COL_LABELS = ["Procédure", "Catégorie", "Émargés", "Total", "%", "Statut"];

      const drawTableHeader = (startY: number) => {
        doc.setFillColor(245, 240, 235);
        doc.setDrawColor(220, 210, 200);
        doc.setLineWidth(0.2);
        doc.roundedRect(MARGIN, startY, CW, 8, 2, 2, "FD");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...DARK);
        let x = MARGIN + 3;
        COL_LABELS.forEach((lbl, i) => {
          doc.text(lbl, x, startY + 5.5);
          x += COL_W[i];
        });
        return startY + 8;
      };

      y = drawTableHeader(y);

      // ── Lignes ────────────────────────────────────────────────────────────
      let rowAlt = false;

      for (const proc of suiviProceduresFiltered) {
        const relevant = agentsForProc(proc);
        const emsForProc = emargements.filter(e =>
          e.procedure_id === proc.id && relevant.some(a => a.user_id === e.user_id)
        );
        const emCount = emsForProc.length;
        const total = relevant.length;
        const pct = total > 0 ? Math.round((emCount / total) * 100) : 0;
        const catName = categories.find(c => c.id === proc.categorie_id)?.nom ?? "";

        // Saut de page
        if (y > 262) {
          doc.addPage();
          y = 14;
          y = drawTableHeader(y);
          rowAlt = false;
        }

        const ROW_H = 7;
        if (rowAlt) {
          doc.setFillColor(250, 247, 243);
          doc.rect(MARGIN, y, CW, ROW_H, "F");
        }
        rowAlt = !rowAlt;

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK);
        let x = MARGIN + 3;

        // Procédure
        const titleSplit = doc.splitTextToSize(proc.titre, COL_W[0] - 4);
        doc.text(titleSplit[0] + (titleSplit.length > 1 ? "…" : ""), x, y + 4.5);
        x += COL_W[0];
        // Catégorie
        const catSplit = doc.splitTextToSize(catName, COL_W[1] - 2);
        doc.text(catSplit[0], x, y + 4.5);
        x += COL_W[1];
        // Émargés
        doc.text(String(emCount), x, y + 4.5);
        x += COL_W[2];
        // Total
        doc.text(String(total), x, y + 4.5);
        x += COL_W[3];
        // %
        doc.text(`${pct}%`, x, y + 4.5);
        x += COL_W[4];
        // Statut
        let statusLabel = "Non démarré";
        let statusColor: [number, number, number] = RED_C;
        if (pct === 100) { statusLabel = "Complet"; statusColor = GREEN_C; }
        else if (pct > 0) { statusLabel = "En cours"; statusColor = ORANGE_C; }
        doc.setTextColor(...statusColor);
        doc.setFont("helvetica", "bold");
        doc.text(statusLabel, x, y + 4.5);

        // Séparateur
        doc.setDrawColor(230, 222, 213);
        doc.setLineWidth(0.15);
        doc.line(MARGIN, y + ROW_H, MARGIN + CW, y + ROW_H);
        y += ROW_H;

        // ── Détail agents ─────────────────────────────────────────────────
        if (total > 0) {
          const emAgents  = relevant.filter(a => emsForProc.some(e => e.user_id === a.user_id));
          const nonEmAgents = relevant.filter(a => !emsForProc.some(e => e.user_id === a.user_id));

          type DetailLine = { text: string; ok: boolean };
          const lines: DetailLine[] = [
            ...emAgents.map(a => {
              const em = emsForProc.find(e => e.user_id === a.user_id)!;
              return { text: `✓ ${a.full_name} — ${new Date(em.emarge_at).toLocaleDateString("fr-FR")}`, ok: true };
            }),
            ...nonEmAgents.map(a => ({ text: `✗ ${a.full_name}`, ok: false })),
          ];

          // Deux colonnes pour le détail
          const halfW = CW / 2 - 2;
          const leftLines  = lines.filter((_, i) => i % 2 === 0);
          const rightLines = lines.filter((_, i) => i % 2 === 1);

          for (let li = 0; li < leftLines.length; li++) {
            if (y > 265) {
              doc.addPage();
              y = 14;
              y = drawTableHeader(y);
            }
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            const lItem = leftLines[li];
            doc.setTextColor(...(lItem.ok ? GREEN_C : RED_C));
            doc.text(lItem.text, MARGIN + 5, y + 3.5);
            const rItem = rightLines[li];
            if (rItem) {
              doc.setTextColor(...(rItem.ok ? GREEN_C : RED_C));
              doc.text(rItem.text, MARGIN + 5 + halfW, y + 3.5);
            }
            y += 4.5;
          }
          y += 2; // espacement après détail
        }
      }

      addPageNumbers();
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`suivi-emargements-${dateStr}.pdf`);
    } catch (err) {
      toast.error("Erreur lors de la génération du PDF");
      console.error(err);
    }
    setExportingPdf(false);
  };

  // ── Rendu ────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-primary" />
          Classeur documentaire
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestion des procédures et suivi des émargements
        </p>
      </div>

      <Tabs
        defaultValue="procedures"
        onValueChange={val => { if (val === "suivi") loadSuivi(); }}
      >
        <TabsList>
          <TabsTrigger value="procedures">Procédures</TabsTrigger>
          <TabsTrigger value="suivi">Suivi des émargements</TabsTrigger>
        </TabsList>

        {/* ── Onglet Procédures ──────────────────────────────────────────── */}
        <TabsContent value="procedures" className="space-y-6 mt-4">

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Catégories</h2>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1 text-sm"
                  >
                    <span>{cat.nom}</span>
                    <button
                      onClick={() => handleDeleteCat(cat.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Nouvelle catégorie…"
                value={newCatNom}
                onChange={e => setNewCatNom(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddCat()}
                className="max-w-xs h-8 text-sm"
              />
              <Button size="sm" onClick={handleAddCat} disabled={addingCat || !newCatNom.trim()}>
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                Aucune catégorie. Créez-en une pour commencer.
              </p>
            )}
            {categories.map(cat => {
              const procs = procedures.filter(p => p.categorie_id === cat.id);
              const isOpen = expandedCats.has(cat.id);
              return (
                <div key={cat.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => toggleCat(cat.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-semibold text-sm">{cat.nom}</span>
                      <Badge variant="secondary" className="text-xs">{procs.length}</Badge>
                    </div>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                      {procs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune procédure dans cette catégorie.</p>
                      ) : (
                        <div className="space-y-2">
                          {procs.map(proc => (
                            <div
                              key={proc.id}
                              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{proc.titre}</p>
                                {proc.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{proc.description}</p>
                                )}
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {proc.services.length === 0
                                    ? <Badge variant="outline" className="text-xs">Tous les services</Badge>
                                    : proc.services.map(s => (
                                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                                      ))
                                  }
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={`/classeur-documentaire/${encodeURIComponent(proc.pdf_filename)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                    <ExternalLink className="w-3 h-3" /> PDF
                                  </Button>
                                </a>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteProc(proc.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openAddProc(cat.id)}>
                        <Plus className="w-3.5 h-3.5" /> Ajouter une procédure
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Onglet Suivi ───────────────────────────────────────────────── */}
        <TabsContent value="suivi" className="space-y-5 mt-4">
          {loadingSuivi ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* ── KPIs ──────────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  icon={<FolderOpen className="w-5 h-5 text-primary" />}
                  label="Procédures totales"
                  value={String(procedures.length)}
                  sub="dans le classeur"
                  color="bg-primary/10"
                />
                <KpiCard
                  icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
                  label="Taux global"
                  value={`${kpiGlobalRate}%`}
                  sub="d'émargement"
                  color="bg-blue-50"
                />
                <KpiCard
                  icon={<FileCheck className="w-5 h-5 text-green-600" />}
                  label="Procédures complètes"
                  value={String(kpiCompleteCount)}
                  sub="100% émargés"
                  color="bg-green-50"
                />
                <KpiCard
                  icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
                  label="Agents sans émargement"
                  value={String(kpiAgentsZero)}
                  sub="aucune procédure validée"
                  color="bg-orange-50"
                />
              </div>

              {/* ── Filtres + export ──────────────────────────────────────── */}
              <div className="flex flex-wrap items-end gap-3">
                {/* Recherche */}
                <div className="space-y-1 flex-1 min-w-[180px]">
                  <Label className="text-xs text-muted-foreground">Rechercher</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Titre de procédure…"
                      value={suiviSearch}
                      onChange={e => setSuiviSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Filtre catégorie */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Catégorie</Label>
                  <select
                    value={suiviFilterCat}
                    onChange={e => setSuiviFilterCat(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Toutes les catégories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>

                {/* Filtre service */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Service</Label>
                  <select
                    value={suiviFilterService}
                    onChange={e => setSuiviFilterService(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Tous les services</option>
                    {allAgentServices.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Incomplètes seulement */}
                <div className="flex items-center gap-2 pb-0.5">
                  <Checkbox
                    id="filter-incomplete"
                    checked={suiviFilterIncomplete}
                    onCheckedChange={v => setSuiviFilterIncomplete(!!v)}
                  />
                  <label htmlFor="filter-incomplete" className="text-sm cursor-pointer select-none whitespace-nowrap">
                    Incomplètes uniquement
                  </label>
                </div>

                {/* Export PDF */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 ml-auto"
                  onClick={handleExportPdf}
                  disabled={exportingPdf || suiviProceduresFiltered.length === 0}
                >
                  <Download className="w-4 h-4" />
                  {exportingPdf ? "Export…" : "Exporter en PDF"}
                </Button>
              </div>

              {/* ── Tableau croisé ────────────────────────────────────────── */}
              {suiviProceduresFiltered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Aucune procédure pour ces filtres.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          {/* Colonnes fixes */}
                          <th className="sticky left-0 z-10 bg-muted/40 text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground whitespace-nowrap min-w-[200px] max-w-[280px]">
                            Procédure
                          </th>
                          <th className="text-left px-3 py-2.5 font-semibold text-xs text-muted-foreground whitespace-nowrap min-w-[110px]">
                            Catégorie
                          </th>
                          <th className="text-left px-3 py-2.5 font-semibold text-xs text-muted-foreground whitespace-nowrap min-w-[160px]">
                            Progression
                          </th>
                          {/* Colonnes agents */}
                          {agentColumns.map(agent => (
                            <th
                              key={agent.user_id}
                              title={`${agent.full_name}${agent.services.length > 0 ? " — " + agent.services.join(", ") : ""}`}
                              className="text-center px-1 py-2.5 font-semibold text-xs text-muted-foreground min-w-[36px] w-9"
                            >
                              <span className="block w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold mx-auto leading-none">
                                {getInitials(agent.full_name)}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {suiviProceduresFiltered.map((proc, rowIdx) => {
                          const relevant     = agentsForProc(proc);
                          const viewRelevant = relevantInView(proc);
                          const emsForProc   = emargements.filter(e => e.procedure_id === proc.id);
                          const emCount = viewRelevant.filter(a =>
                            emsForProc.some(e => e.user_id === a.user_id)
                          ).length;
                          const total = viewRelevant.length;
                          const pct = total > 0 ? Math.round((emCount / total) * 100) : 0;
                          const catName = categories.find(c => c.id === proc.categorie_id)?.nom ?? "";
                          const expanded = suiviExpandedProcs.has(proc.id);
                          const isComplete = total > 0 && emCount >= total;
                          const isStarted  = emCount > 0;

                          return (
                            <>
                              <tr
                                key={proc.id}
                                onClick={() => toggleProcExpand(proc.id)}
                                className={cn(
                                  "border-b border-border/50 cursor-pointer transition-colors",
                                  rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20",
                                  "hover:bg-primary/5",
                                  expanded && "bg-primary/5"
                                )}
                              >
                                {/* Titre */}
                                <td className="sticky left-0 z-10 px-4 py-3 min-w-[200px] max-w-[280px]"
                                  style={{ background: "inherit" }}
                                >
                                  <div className="flex items-center gap-2">
                                    {expanded
                                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    }
                                    <span className="font-medium text-xs leading-snug line-clamp-2">
                                      {proc.titre}
                                    </span>
                                  </div>
                                </td>

                                {/* Catégorie */}
                                <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                  {catName}
                                </td>

                                {/* Progression */}
                                <td className="px-3 py-3 min-w-[160px]">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-medium">
                                        {emCount} / {total}
                                      </span>
                                      <span className={cn(
                                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                        isComplete
                                          ? "bg-green-100 text-green-700"
                                          : isStarted
                                          ? "bg-orange-100 text-orange-700"
                                          : "bg-red-100 text-red-600"
                                      )}>
                                        {pct}%
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all",
                                          isComplete ? "bg-green-500" : isStarted ? "bg-orange-400" : "bg-red-400"
                                        )}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                {/* Cellules agents */}
                                {agentColumns.map(agent => {
                                  const isRelevant = relevant.some(a => a.user_id === agent.user_id);
                                  const em = emsForProc.find(e => e.user_id === agent.user_id);
                                  return (
                                    <td
                                      key={agent.user_id}
                                      className="text-center px-1 py-3 w-9"
                                      title={
                                        !isRelevant
                                          ? `${agent.full_name} — non concerné`
                                          : em
                                          ? `${agent.full_name} — émargé le ${new Date(em.emarge_at).toLocaleDateString("fr-FR")}`
                                          : `${agent.full_name} — non émargé`
                                      }
                                    >
                                      {!isRelevant ? (
                                        <span className="text-muted-foreground/30 text-xs">—</span>
                                      ) : em ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* ── Ligne détail dépliable ─────────────────── */}
                              {expanded && (
                                <tr
                                  key={`${proc.id}-detail`}
                                  className={cn(
                                    "border-b border-border/50",
                                    rowIdx % 2 === 0 ? "bg-primary/3" : "bg-primary/5"
                                  )}
                                >
                                  <td
                                    colSpan={3 + agentColumns.length}
                                    className="px-4 py-4"
                                  >
                                    <DetailPanel
                                      proc={proc}
                                      relevant={relevant}
                                      emsForProc={emsForProc}
                                    />
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Légende agents en bas */}
                  {agentColumns.length > 0 && (
                    <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
                      <p className="text-xs text-muted-foreground mb-2 font-semibold">
                        <Users className="w-3.5 h-3.5 inline mr-1" />
                        Agents ({agentColumns.length})
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {agentColumns.map(agent => (
                          <span key={agent.user_id} className="text-xs text-muted-foreground">
                            <span className="font-mono font-bold text-foreground">
                              {getInitials(agent.full_name)}
                            </span>
                            {" — "}
                            {agent.full_name}
                            {agent.services.length > 0 && (
                              <span className="text-muted-foreground/60"> ({agent.services.join(", ")})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog ajout procédure ──────────────────────────────────────────── */}
      <Dialog open={procDialogOpen} onOpenChange={setProcDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter une procédure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input
                value={procForm.titre}
                onChange={e => setProcForm(f => ({ ...f, titre: e.target.value }))}
                placeholder="Ex : Procédure d'hygiène des mains"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={procForm.description}
                onChange={e => setProcForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Description courte (optionnel)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nom du fichier PDF *</Label>
              <Input
                value={procForm.pdf_filename}
                onChange={e => setProcForm(f => ({ ...f, pdf_filename: e.target.value }))}
                placeholder="procedure-hygiene.pdf"
              />
              <p className="text-xs text-muted-foreground">
                Déposez le fichier dans{" "}
                <code className="bg-muted px-1 rounded text-[11px]">public/classeur-documentaire/</code>{" "}
                puis saisissez son nom exact ici.
              </p>
              {procForm.pdf_filename.trim() && (() => {
                const cleaned = sanitizeFilename(procForm.pdf_filename.trim());
                const changed = cleaned !== procForm.pdf_filename.trim();
                return (
                  <div className={cn(
                    "flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs",
                    changed
                      ? "bg-amber-50 border border-amber-200 text-amber-800"
                      : "bg-green-50 border border-green-200 text-green-800"
                  )}>
                    <span className="shrink-0 mt-px">{changed ? "⚠" : "✓"}</span>
                    <span>
                      {changed
                        ? <>Nom enregistré : <code className="font-mono font-semibold">{cleaned}</code></>
                        : <>Nom valide — sera enregistré tel quel.</>
                      }
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label>
                Services concernés{" "}
                <span className="text-muted-foreground font-normal">(vide = tous les services)</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES_LIST.map(svc => (
                  <div key={svc} className="flex items-center gap-2">
                    <Checkbox
                      id={`svc-${svc}`}
                      checked={procForm.services.includes(svc)}
                      onCheckedChange={() => toggleService(svc)}
                    />
                    <label htmlFor={`svc-${svc}`} className="text-sm cursor-pointer select-none">
                      {svc}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleAddProc}
              disabled={savingProc || !procForm.titre.trim() || !procForm.pdf_filename.trim()}
            >
              {savingProc ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold font-display leading-tight">{value}</p>
        <p className="text-xs font-semibold text-foreground mt-0.5 truncate">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}

function DetailPanel({
  proc,
  relevant,
  emsForProc,
}: {
  proc: Procedure;
  relevant: AgentInfo[];
  emsForProc: Emargement[];
}) {
  const emarged    = relevant.filter(a => emsForProc.some(e => e.user_id === a.user_id));
  const notEmarged = relevant.filter(a => !emsForProc.some(e => e.user_id === a.user_id));

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Émargés */}
      <div>
        <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Ont émargé ({emarged.length})
        </p>
        {emarged.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucun agent pour l'instant.</p>
        ) : (
          <ul className="space-y-1">
            {emarged.map(agent => {
              const em = emsForProc.find(e => e.user_id === agent.user_id)!;
              return (
                <li key={agent.user_id} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                  <span className="font-medium">{agent.full_name}</span>
                  <span className="text-muted-foreground ml-auto shrink-0">
                    {new Date(em.emarge_at).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    {" "}
                    {new Date(em.emarge_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Non émargés */}
      <div>
        <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5" />
          N'ont pas encore émargé ({notEmarged.length})
        </p>
        {notEmarged.length === 0 ? (
          <p className="text-xs text-green-700 font-medium italic">Tous les agents ont émargé ✓</p>
        ) : (
          <>
            <ul className="space-y-1 mb-3">
              {notEmarged.map(agent => (
                <li key={agent.user_id} className="flex items-center gap-2 text-xs">
                  <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="font-medium">{agent.full_name}</span>
                  {agent.services.length > 0 && (
                    <span className="text-muted-foreground ml-1">{agent.services.join(", ")}</span>
                  )}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 h-7 opacity-60 cursor-not-allowed"
              disabled
              title="Fonctionnalité à venir"
            >
              Relancer les non-émargés
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
