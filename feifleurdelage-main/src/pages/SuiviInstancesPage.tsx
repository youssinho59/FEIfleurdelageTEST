import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Printer, CalendarRange, FileText, MessageSquareWarning, Loader2, Info } from "lucide-react";

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
};

const INSTANCE_COLS = [
  { field: "cse_date" as const,   label: "CSE",   thColor: "text-blue-600 bg-blue-50/60",   inputRing: "focus:ring-blue-400",   cellBg: "bg-blue-50/20" },
  { field: "cvs_date" as const,   label: "CVS",   thColor: "text-purple-600 bg-purple-50/60", inputRing: "focus:ring-purple-400", cellBg: "bg-purple-50/20" },
  { field: "codir_date" as const, label: "CODIR", thColor: "text-emerald-600 bg-emerald-50/60", inputRing: "focus:ring-emerald-400", cellBg: "bg-emerald-50/20" },
];

const SuiviInstancesPage = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [rows, setRows] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSet, setSavingSet] = useState<Set<string>>(new Set());

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
    let suiviData: Array<{ id: string; fei_id: string | null; plainte_id: string | null; cse_date: string | null; cvs_date: string | null; codir_date: string | null }> = [];
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
        };
      }),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setRows(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(selectedYear);
  }, [selectedYear, fetchData]);

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
    colgroup col.col-type  { width: 13%; }
    colgroup col.col-date  { width: 9%; }
    colgroup col.col-decl  { width: 14%; }
    colgroup col.col-desc  { width: 31%; }
    colgroup col.col-inst  { width: 11%; }
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
      <col class="col-desc"> <col class="col-inst"> <col class="col-inst"> <col class="col-inst">
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
              Dates de présentation des FEI et Plaintes en <strong>CSE</strong>, <strong>CVS</strong> et <strong>CODIR</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Sélecteur d'année */}
          <div className="flex items-center gap-1.5">
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
          </div>

          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2 h-9">
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
        </div>
      </div>

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
    </div>
  );
};

export default SuiviInstancesPage;
