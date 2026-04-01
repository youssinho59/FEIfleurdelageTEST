import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Printer, CalendarRange, FileText, MessageSquareWarning, Loader2, Info, MessageSquare, Users, RotateCcw, Target, Plus, Pencil, Trash2 } from "lucide-react";
import { CvsDemandesTab } from "@/components/instances/CvsDemandesTab";
import RetexTab from "@/components/instances/RetexTab";

type InstanceRow = {
  source_id: string;
  source_type: "fei" | "plainte";
  date: string;
  declarant: string;
  description: string;
  type_label: string;
  suivi_id: string | null;
  cse_date: string;
  cvs_date: string;
  codir_date: string;
  retour_analyse: string;
};

const INSTANCE_COLS = [
  { field: "cse_date" as const,   label: "CSE",   thColor: "text-blue-600 bg-blue-50/60",   inputRing: "focus:ring-blue-400",   cellBg: "bg-blue-50/20" },
  { field: "cvs_date" as const,   label: "CVS",   thColor: "text-purple-600 bg-purple-50/60", inputRing: "focus:ring-purple-400", cellBg: "bg-purple-50/20" },
  { field: "codir_date" as const, label: "CODIR", thColor: "text-emerald-600 bg-emerald-50/60", inputRing: "focus:ring-emerald-400", cellBg: "bg-emerald-50/20" },
];

const SuiviInstancesPage = () => {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<"suivi" | "demandes-cvs" | "retex" | "pacq">("suivi");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [rows, setRows] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSet, setSavingSet] = useState<Set<string>>(new Set());
  const [retourDialog, setRetourDialog] = useState<{ sourceId: string; text: string } | null>(null);
  const [savingRetour, setSavingRetour] = useState(false);
  const [retexCount, setRetexCount] = useState<number | null>(null);

  // ── Suivi PACQ instances ──────────────────────────────────────────────────
  type PacqRow = {
    id: string;
    instance: string;
    date: string;
    points_presentes: string | null;
    decisions: string | null;
    prochaine_echeance: string | null;
  };
  const [pacqRows, setPacqRows] = useState<PacqRow[]>([]);
  const [pacqLoading, setPacqLoading] = useState(false);
  const [pacqDialogOpen, setPacqDialogOpen] = useState(false);
  const [editingPacq, setEditingPacq] = useState<PacqRow | null>(null);
  const [pacqForm, setPacqForm] = useState({ instance: "CSE", date: "", points_presentes: "", decisions: "", prochaine_echeance: "" });
  const [savingPacq, setSavingPacq] = useState(false);

  const fetchData = useCallback(async (year: number) => {
    setLoading(true);
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const [feiRes, plaintesRes] = await Promise.all([
      supabase
        .from("fei")
        .select("id, date_evenement, declarant_nom, description, type_fei, categorie_fei")
        .gte("date_evenement", start)
        .lte("date_evenement", end)
        .order("date_evenement"),
      supabase
        .from("plaintes")
        .select("id, date_plainte, declarant_nom, description, objet")
        .gte("date_plainte", start)
        .lte("date_plainte", end)
        .order("date_plainte"),
    ]);

    const feis = (feiRes.data || []) as Array<{ id: string; date_evenement: string; declarant_nom: string; description: string; type_fei: string; categorie_fei: string }>;
    const plaintes = (plaintesRes.data || []) as Array<{ id: string; date_plainte: string; declarant_nom: string; description: string; objet: string }>;

    // Récupération des enregistrements suivi_instances existants
    let suiviData: Array<{ id: string; fei_id: string | null; plainte_id: string | null; cse_date: string | null; cvs_date: string | null; codir_date: string | null; retour_analyse: string | null }> = [];
    const feiIds = feis.map((f) => f.id);
    const plainteIds = plaintes.map((p) => p.id);

    if (feiIds.length > 0 || plainteIds.length > 0) {
      const filters: string[] = [];
      if (feiIds.length > 0) filters.push(`fei_id.in.(${feiIds.join(",")})`);
      if (plainteIds.length > 0) filters.push(`plainte_id.in.(${plainteIds.join(",")})`);
      const { data } = await supabase.from("suivi_instances").select("*").or(filters.join(","));
      suiviData = (data || []) as typeof suiviData;
    }

    const combined: InstanceRow[] = [
      ...feis.map((f) => {
        const suivi = suiviData.find((s) => s.fei_id === f.id);
        const catPrefix = f.categorie_fei === "feigs" ? "FEIGS" : f.categorie_fei === "feig" ? "FEIG" : "";
        return {
          source_id: f.id,
          source_type: "fei" as const,
          date: f.date_evenement,
          declarant: f.declarant_nom,
          description: f.description,
          type_label: catPrefix ? `${catPrefix} — ${f.type_fei}` : f.type_fei,
          suivi_id: suivi?.id ?? null,
          cse_date: suivi?.cse_date ?? "",
          cvs_date: suivi?.cvs_date ?? "",
          codir_date: suivi?.codir_date ?? "",
          retour_analyse: suivi?.retour_analyse ?? "",
        };
      }),
      ...plaintes.map((p) => {
        const suivi = suiviData.find((s) => s.plainte_id === p.id);
        return {
          source_id: p.id,
          source_type: "plainte" as const,
          date: p.date_plainte,
          declarant: p.declarant_nom,
          description: p.description,
          type_label: p.objet,
          suivi_id: suivi?.id ?? null,
          cse_date: suivi?.cse_date ?? "",
          cvs_date: suivi?.cvs_date ?? "",
          codir_date: suivi?.codir_date ?? "",
          retour_analyse: suivi?.retour_analyse ?? "",
        };
      }),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setRows(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(selectedYear);
  }, [selectedYear, fetchData]);

  useEffect(() => {
    supabase.from("fei").select("id", { count: "exact", head: true }).eq("retex", true)
      .then(({ count }) => setRetexCount(count ?? 0));
  }, []);

  const fetchPacq = async () => {
    setPacqLoading(true);
    const { data } = await supabase.from("suivi_pacq_instances").select("*").order("date", { ascending: false });
    setPacqRows((data as PacqRow[]) || []);
    setPacqLoading(false);
  };

  useEffect(() => {
    if (activeTab === "pacq") fetchPacq();
  }, [activeTab]);

  const openPacqDialog = (row?: PacqRow) => {
    if (row) {
      setEditingPacq(row);
      setPacqForm({ instance: row.instance, date: row.date, points_presentes: row.points_presentes || "", decisions: row.decisions || "", prochaine_echeance: row.prochaine_echeance || "" });
    } else {
      setEditingPacq(null);
      setPacqForm({ instance: "CSE", date: new Date().toISOString().split("T")[0], points_presentes: "", decisions: "", prochaine_echeance: "" });
    }
    setPacqDialogOpen(true);
  };

  const savePacqRow = async () => {
    if (!pacqForm.instance || !pacqForm.date) { toast.error("Instance et date sont obligatoires."); return; }
    setSavingPacq(true);
    const payload = {
      instance: pacqForm.instance,
      date: pacqForm.date,
      points_presentes: pacqForm.points_presentes || null,
      decisions: pacqForm.decisions || null,
      prochaine_echeance: pacqForm.prochaine_echeance || null,
      updated_at: new Date().toISOString(),
    };
    if (editingPacq) {
      const { error } = await supabase.from("suivi_pacq_instances").update(payload).eq("id", editingPacq.id);
      if (error) toast.error("Erreur : " + error.message);
      else { toast.success("Ligne mise à jour"); setPacqDialogOpen(false); fetchPacq(); }
    } else {
      const { error } = await supabase.from("suivi_pacq_instances").insert(payload);
      if (error) toast.error("Erreur : " + error.message);
      else { toast.success("Ligne ajoutée"); setPacqDialogOpen(false); fetchPacq(); }
    }
    setSavingPacq(false);
  };

  const deletePacqRow = async (id: string) => {
    const { error } = await supabase.from("suivi_pacq_instances").delete().eq("id", id);
    if (error) toast.error("Erreur suppression : " + error.message);
    else { toast.success("Ligne supprimée"); fetchPacq(); }
  };

  const updateLocalDate = (sourceId: string, field: "cse_date" | "cvs_date" | "codir_date", value: string) => {
    setRows((prev) => prev.map((r) => (r.source_id === sourceId ? { ...r, [field]: value } : r)));
  };

  const saveDate = async (row: InstanceRow, field: "cse_date" | "cvs_date" | "codir_date", value: string) => {
    const key = `${row.source_id}-${field}`;
    setSavingSet((prev) => new Set(prev).add(key));

    try {
      if (row.suivi_id) {
        const { error } = await supabase
          .from("suivi_instances")
          .update({ [field]: value || null, updated_at: new Date().toISOString() })
          .eq("id", row.suivi_id);
        if (error) throw error;
      } else {
        const insert: Record<string, unknown> = {
          [field]: value || null,
          ...(row.source_type === "fei" ? { fei_id: row.source_id } : { plainte_id: row.source_id }),
        };
        const { data, error } = await supabase.from("suivi_instances").insert(insert).select().single();
        if (error) throw error;
        if (data) {
          const newId = (data as { id: string }).id;
          setRows((prev) => prev.map((r) => (r.source_id === row.source_id ? { ...r, suivi_id: newId } : r)));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Erreur lors de la sauvegarde : " + msg);
    } finally {
      setSavingSet((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const saveRetourAnalyse = async () => {
    if (!retourDialog) return;
    const row = rows.find((r) => r.source_id === retourDialog.sourceId);
    if (!row) return;
    setSavingRetour(true);
    try {
      if (row.suivi_id) {
        const { error } = await supabase
          .from("suivi_instances")
          .update({ retour_analyse: retourDialog.text || null, updated_at: new Date().toISOString() })
          .eq("id", row.suivi_id);
        if (error) throw error;
      } else {
        const insert: Record<string, unknown> = {
          retour_analyse: retourDialog.text || null,
          ...(row.source_type === "fei" ? { fei_id: row.source_id } : { plainte_id: row.source_id }),
        };
        const { data, error } = await supabase.from("suivi_instances").insert(insert).select().single();
        if (error) throw error;
        if (data) {
          const newId = (data as { id: string }).id;
          setRows((prev) => prev.map((r) => (r.source_id === row.source_id ? { ...r, suivi_id: newId } : r)));
        }
      }
      setRows((prev) => prev.map((r) => r.source_id === retourDialog.sourceId ? { ...r, retour_analyse: retourDialog.text } : r));
      toast.success("Retour / Analyse sauvegardé");
      setRetourDialog(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Erreur lors de la sauvegarde : " + msg);
    } finally {
      setSavingRetour(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression. Vérifiez les paramètres de votre navigateur.");
      return;
    }

    const tableRows = rows
      .map(
        (row, i) => `
      <tr class="${i % 2 === 0 ? "even" : "odd"}">
        <td class="center">
          ${
            row.source_type === "fei"
              ? `<span class="badge badge-fei">${row.type_label}</span>`
              : `<span class="badge badge-plainte">Plainte</span>`
          }
        </td>
        <td class="center nowrap">${new Date(row.date + "T00:00:00").toLocaleDateString("fr-FR")}</td>
        <td>${escapeHtml(row.declarant)}</td>
        <td class="desc">${escapeHtml(row.description.slice(0, 130))}${row.description.length > 130 ? "…" : ""}</td>
        <td class="center date-cell">${row.cse_date ? new Date(row.cse_date + "T00:00:00").toLocaleDateString("fr-FR") : "—"}</td>
        <td class="center date-cell">${row.cvs_date ? new Date(row.cvs_date + "T00:00:00").toLocaleDateString("fr-FR") : "—"}</td>
        <td class="center date-cell">${row.codir_date ? new Date(row.codir_date + "T00:00:00").toLocaleDateString("fr-FR") : "—"}</td>
        <td class="retour">${row.retour_analyse ? escapeHtml(row.retour_analyse) : ""}</td>
      </tr>`
      )
      .join("");

    const nFei = rows.filter((r) => r.source_type === "fei").length;
    const nPlainte = rows.filter((r) => r.source_type === "plainte").length;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Suivi des Instances ${selectedYear} — EHPAD La Fleur de l'Âge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #1a1a1a; padding: 24px 28px; }
    .header { margin-bottom: 18px; }
    .header h1 { font-size: 17px; font-weight: bold; color: #c46b48; margin-bottom: 3px; }
    .header .subtitle { font-size: 11px; color: #555; margin-bottom: 2px; }
    .header .meta { font-size: 9.5px; color: #888; }
    .divider { border: none; border-top: 2px solid #c46b48; margin: 10px 0 16px; }
    table { width: 100%; border-collapse: collapse; }
    colgroup col.col-type   { width: 12%; }
    colgroup col.col-date   { width: 8%; }
    colgroup col.col-decl   { width: 12%; }
    colgroup col.col-desc   { width: 26%; }
    colgroup col.col-inst   { width: 9%; }
    colgroup col.col-retour { width: 24%; }
    thead tr { background: #c46b48; }
    thead th { padding: 7px 8px; text-align: left; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; color: white; }
    thead th.center { text-align: center; }
    thead th.inst { background: rgba(0,0,0,0.15); text-align: center; }
    tbody tr.even { background: #faf7f3; }
    tbody tr.odd  { background: #ffffff; }
    td { padding: 5.5px 8px; border-bottom: 1px solid #e8e2dc; vertical-align: top; line-height: 1.4; }
    td.center  { text-align: center; }
    td.nowrap  { white-space: nowrap; }
    td.desc    { font-size: 9.5px; color: #444; }
    td.date-cell { font-size: 10px; font-weight: 600; color: #2a2a2a; white-space: nowrap; }
    td.retour    { font-size: 9px; color: #444; white-space: pre-wrap; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 8.5px; font-weight: bold; }
    .badge-fei     { background: #dbeafe; color: #1e40af; }
    .badge-plainte { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 8.5px; color: #aaa; display: flex; justify-content: space-between; }
    .summary { font-size: 9px; color: #777; margin-bottom: 10px; }
    @media print {
      body { padding: 12px 16px; }
      @page { margin: 1.5cm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Suivi des Instances — Année ${selectedYear}</h1>
    <p class="subtitle">EHPAD La Fleur de l'Âge — Dates de présentation en CSE, CVS et CODIR</p>
    <p class="meta">Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
  </div>
  <hr class="divider">
  <p class="summary">${rows.length} événement(s) — ${nFei} FEI · ${nPlainte} Plainte(s)</p>
  <table>
    <colgroup>
      <col class="col-type"> <col class="col-date"> <col class="col-decl">
      <col class="col-desc"> <col class="col-inst"> <col class="col-inst"> <col class="col-inst"> <col class="col-retour">
    </colgroup>
    <thead>
      <tr>
        <th>Type / Événement</th>
        <th class="center">Date</th>
        <th>Déclarant</th>
        <th>Description</th>
        <th class="inst">CSE</th>
        <th class="inst">CVS</th>
        <th class="inst">CODIR</th>
        <th>Retour / Analyse</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">
    <span>Document confidentiel — EHPAD La Fleur de l'Âge — Système Qualité</span>
    <span>Suivi des Instances ${selectedYear}</span>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  const handlePrintSection = (sectionId: string) => {
    const style = document.createElement("style");
    style.id = "temp-print-style";
    style.textContent = `@media print { body > * { display:none!important; } #${sectionId} { display:block!important; position:fixed; top:0; left:0; width:100%; padding:20px; } }`;
    document.head.appendChild(style);
    window.addEventListener("afterprint", () => {
      const s = document.getElementById("temp-print-style");
      if (s) document.head.removeChild(s);
    }, { once: true });
    window.print();
  };

  const handlePrintActive = () => {
    if (activeTab === "suivi") handlePrint();
    else if (activeTab === "demandes-cvs") handlePrintSection("print-cvs");
    else if (activeTab === "retex") handlePrintSection("print-retex");
    else if (activeTab === "pacq") handlePrintSection("print-pacq");
  };

  // Utilitaire d'échappement HTML pour l'impression
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);
  const nFei = rows.filter((r) => r.source_type === "fei").length;
  const nPlainte = rows.filter((r) => r.source_type === "plainte").length;

  return (
    <div className="space-y-6">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0 mt-0.5">
            <CalendarRange className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Suivi des Instances</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeTab === "suivi" && <>Dates de présentation des FEI et Plaintes en <strong>CSE</strong>, <strong>CVS</strong> et <strong>CODIR</strong></>}
              {activeTab === "demandes-cvs" && "Les demandes CVS recensent les requêtes et suggestions exprimées par les résidents et familles en Conseil de la Vie Sociale."}
              {activeTab === "retex" && <>Le <strong>RETEX</strong> (Retour d'EXpérience) analyse en profondeur les événements indésirables pour en tirer des enseignements.{retexCount !== null && <> <strong>{retexCount}</strong> FEI marquée{retexCount > 1 ? "s" : ""} pour RETEX.</>}</>}
              {activeTab === "pacq" && "Suivi des points PACQS présentés en instances (CSE, CVS, CODIR) — décisions et prochaines échéances."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Sélecteur d'année — affiché uniquement sur l'onglet suivi */}
          {activeTab === "suivi" && <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Année</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>}

          <Button onClick={handlePrintActive} variant="outline" size="sm" className="gap-2 h-9">
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* ── Onglets ──────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("suivi")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "suivi"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          Tableau de suivi
        </button>
        <button
          onClick={() => setActiveTab("demandes-cvs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "demandes-cvs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Demandes CVS
        </button>
        <button
          onClick={() => setActiveTab("retex")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "retex"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          RETEX
        </button>
        <button
          onClick={() => setActiveTab("pacq")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pacq"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Target className="w-4 h-4" />
          Suivi PACQ
        </button>
      </div>

      {/* ── Contenu de l'onglet Demandes CVS ─────────────────────── */}
      {activeTab === "demandes-cvs" && <div id="print-cvs"><CvsDemandesTab /></div>}

      {/* ── Contenu de l'onglet RETEX ─────────────────────────────── */}
      {activeTab === "retex" && <div id="print-retex"><RetexTab /></div>}

      {/* ── Contenu de l'onglet Suivi PACQ ────────────────────────── */}
      {activeTab === "pacq" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => openPacqDialog()}>
              <Plus className="w-4 h-4" /> Ajouter une ligne
            </Button>
          </div>
          {pacqLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : pacqRows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun point PACQ enregistré</p>
              <p className="text-sm mt-1 opacity-70">Ajoutez les points présentés en instances.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instance</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Points présentés</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Décisions</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prochaine échéance</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pacqRows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-primary">{row.instance}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(row.date + "T00:00:00").toLocaleDateString("fr-FR")}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px] whitespace-pre-wrap">{row.points_presentes || "—"}</td>
                        <td className="px-4 py-3 text-xs max-w-[220px] whitespace-pre-wrap">{row.decisions || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {row.prochaine_echeance ? new Date(row.prochaine_echeance + "T00:00:00").toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openPacqDialog(row)} className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Modifier">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deletePacqRow(row.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Supprimer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Contenu de l'onglet Tableau de suivi ─────────────────── */}
      {activeTab === "suivi" && <>

      {/* ── Bandeau info ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-700 flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <p>
          Cliquez dans une cellule <strong>CSE</strong>, <strong>CVS</strong> ou <strong>CODIR</strong> pour saisir la date de présentation.
          Les modifications sont <strong>sauvegardées automatiquement</strong> dès que vous quittez le champ.
        </p>
      </div>

      {/* ── Tableau ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center text-muted-foreground">
          <CalendarRange className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="text-base font-medium">Aucun événement pour l'année {selectedYear}</p>
          <p className="text-sm mt-1 opacity-70">Sélectionnez une autre année ou créez des FEI / Plaintes.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 whitespace-nowrap">
                    Type / Événement
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">
                    Déclarant
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">
                    Description
                  </th>
                  {INSTANCE_COLS.map((col) => (
                    <th
                      key={col.field}
                      className={`px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${col.thColor}`}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 whitespace-nowrap">
                    Retour / Analyse
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.source_id}
                    className={`border-b border-border/60 transition-colors hover:bg-muted/20 ${i % 2 !== 0 ? "bg-muted/[0.04]" : ""}`}
                  >
                    {/* Type */}
                    <td className="px-4 py-3 whitespace-nowrap align-top">
                      {row.source_type === "fei" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 leading-tight">
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="max-w-[120px] truncate">{row.type_label}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-700 leading-tight">
                          <MessageSquareWarning className="w-3 h-3 shrink-0" />
                          <span className="max-w-[120px] truncate">{row.type_label}</span>
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap align-top">
                      {new Date(row.date + "T00:00:00").toLocaleDateString("fr-FR")}
                    </td>

                    {/* Déclarant */}
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs font-medium text-foreground">{row.declarant}</span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 align-top max-w-xs">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{row.description}</p>
                    </td>

                    {/* CSE / CVS / CODIR */}
                    {INSTANCE_COLS.map((col) => {
                      const key = `${row.source_id}-${col.field}`;
                      const isSaving = savingSet.has(key);
                      return (
                        <td key={col.field} className={`px-3 py-2.5 text-center align-middle ${col.cellBg}`}>
                          <div className="relative inline-block">
                            <Input
                              type="date"
                              value={row[col.field]}
                              onChange={(e) => updateLocalDate(row.source_id, col.field, e.target.value)}
                              onBlur={(e) => saveDate(row, col.field, e.target.value)}
                              className={`h-7 text-xs px-2 text-center w-[130px] border-transparent bg-white/80 shadow-sm ${col.inputRing} disabled:opacity-50`}
                              disabled={isSaving}
                            />
                            {isSaving && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md pointer-events-none">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Retour / Analyse */}
                    <td className="px-3 py-2.5 align-top min-w-[180px]">
                      {row.retour_analyse ? (
                        <button
                          onClick={() => setRetourDialog({ sourceId: row.source_id, text: row.retour_analyse })}
                          className="text-left w-full group"
                        >
                          <p className="text-xs text-foreground line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">
                            {row.retour_analyse}
                          </p>
                          <span className="text-[10px] text-muted-foreground group-hover:text-primary mt-0.5 inline-flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" /> Modifier
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setRetourDialog({ sourceId: row.source_id, text: "" })}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Ajouter un retour
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pied de tableau ───────────────────────── */}
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-200" />
                {nFei} FEI
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-200" />
                {nPlainte} Plainte{nPlainte > 1 ? "s" : ""}
              </span>
            </span>
            <span className="font-medium">{rows.length} événement{rows.length > 1 ? "s" : ""} — {selectedYear}</span>
          </div>
        </div>
      )}

      </>}

      {/* ── Dialog Suivi PACQ ────────────────────────────────────── */}
      <Dialog open={pacqDialogOpen} onOpenChange={setPacqDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              {editingPacq ? "Modifier la ligne PACQ" : "Ajouter un point PACQ"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Instance <span className="text-destructive">*</span></Label>
                <select
                  value={pacqForm.instance}
                  onChange={(e) => setPacqForm((f) => ({ ...f, instance: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {["CSE", "CVS", "CODIR", "CODIR élargi", "Direction"].map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={pacqForm.date} onChange={(e) => setPacqForm((f) => ({ ...f, date: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Points présentés</Label>
              <Textarea value={pacqForm.points_presentes} onChange={(e) => setPacqForm((f) => ({ ...f, points_presentes: e.target.value }))} placeholder="Points du PACQS présentés lors de cette instance…" rows={3} className="text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Décisions</Label>
              <Textarea value={pacqForm.decisions} onChange={(e) => setPacqForm((f) => ({ ...f, decisions: e.target.value }))} placeholder="Décisions prises, validations, demandes de l'instance…" rows={3} className="text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prochaine échéance</Label>
              <Input type="date" value={pacqForm.prochaine_echeance} onChange={(e) => setPacqForm((f) => ({ ...f, prochaine_echeance: e.target.value }))} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPacqDialogOpen(false)} disabled={savingPacq}>Annuler</Button>
            <Button size="sm" onClick={savePacqRow} disabled={savingPacq} className="gap-1.5">
              {savingPacq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {editingPacq ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Retour / Analyse ───────────────────────────────── */}
      <Dialog open={!!retourDialog} onOpenChange={(open) => { if (!open) setRetourDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Retour / Analyse
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs text-muted-foreground mb-2 block">
              Saisissez le retour ou l'analyse suite à la présentation en instance
            </Label>
            <Textarea
              value={retourDialog?.text ?? ""}
              onChange={(e) => setRetourDialog((prev) => prev ? { ...prev, text: e.target.value } : prev)}
              placeholder="Retour de l'instance, décisions prises, suites données…"
              rows={5}
              className="resize-none text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRetourDialog(null)} disabled={savingRetour}>
              Annuler
            </Button>
            <Button size="sm" onClick={saveRetourAnalyse} disabled={savingRetour} className="gap-1.5">
              {savingRetour ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuiviInstancesPage;
