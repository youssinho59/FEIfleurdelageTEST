import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  TrendingUp, Upload, FileText, BarChart3, Search,
  Download, Loader2, ChevronLeft, ChevronRight, Sparkles,
  Euro, ArrowUpDown, Trash2, RefreshCw, FileDown,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  buildAndSavePdf, captureById, pdfPage, pdfKpis, pdfSectionTitle,
  pdfTextBlock, pdfTable, pdfImage, C, esc,
} from "@/lib/pdfExportUtils";

// ── Worker pdfjs ──────────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ── Types ─────────────────────────────────────────────────────────────────────

type Mandat = {
  id: string;
  annee: number;
  n_bordereau: number;
  n_piece: number;
  tiers: string | null;
  objet: string | null;
  compte: string | null;
  montant_ht: number | null;
  montant_ttc: number | null;
  date_emission: string | null;
  retour_tresorerie: string | null;
  groupe_fonctionnel: string | null;
  libelle_compte: string | null;
  categorie: string | null;
  import_id?: string | null;
};

type MandatImport = {
  id: string;
  nom_fichier: string;
  annee: number | null;
  nb_lignes: number | null;
  montant_total: number | null;
  imported_at: string;
};

type CompteRef = {
  compte: string;
  libelle: string;
  groupe_fonctionnel: string;
  categorie: string;
};

type ParsedRow = {
  n_bordereau: number;
  n_piece: number;
  tiers: string;
  objet: string;
  compte: string;
  montant_ht: number | null;
  montant_ttc: number | null;
  date_emission: string | null;
  retour_tresorerie: string | null;
  isDuplicate?: boolean;
  isInvalid?: boolean;
};

type MonthlyPoint = {
  month: string;
  GF1: number;
  GF2: number;
  GF3: number;
  total: number;
};

// ── Constantes ────────────────────────────────────────────────────────────────

const GF_COLORS = { GF1: "#3b82f6", GF2: "#22c55e", GF3: "#f97316" };
const GF_LABELS = {
  GF1: "GF1 — Soins & hébergement",
  GF2: "GF2 — Personnel & dépendance",
  GF3: "GF3 — Structure & gestion",
};
const PAGE_SIZE = 25;
const MONTANT_MAX = 9_999_999;
const HEADER_KEYWORDS = ["bordereau", "piece", "pièce", "tiers", "objet", "compte", "montant", "emission", "retour", "total", "sous-total", "report"];

// ── Mapping groupe fonctionnel par compte EPRD EHPAD ─────────────────────────

function getGroupeFonctionnel(compte: string): string {
  const c = compte.toString().trim();
  if (!c) return "Non classé";

  if (c === "multi" || c.toLowerCase().includes("salaire") || c.toLowerCase().includes("cotisation"))
    return "GF2";

  const prefix3 = c.substring(0, Math.min(3, c.length));
  const num = parseInt(prefix3);
  if (isNaN(num)) return "Non classé";

  // GF3 — Structure (comptes de bilan / financement / immobilisations)
  if (c.startsWith("1") || c.startsWith("2")) return "GF3";
  if (num === 635 || num === 671 || num === 681) return "GF3";
  if ((num >= 160 && num <= 169) || (num >= 211 && num <= 218)) return "GF3";

  // GF1 — Soins (financé ARS/CPAM)
  if ((num >= 611 && num <= 616) || (num >= 621 && num <= 622)) return "GF1";
  if (c.startsWith("6411") || c.startsWith("6413") || c.startsWith("6414")) return "GF1";
  if (num === 651) return "GF1";
  if ((num >= 602 && num <= 604)) return "GF1";

  // GF2 — Personnel & dépendance
  if (num === 652) return "GF2";
  if (c.startsWith("6412") || c.startsWith("6415") || c.startsWith("6416")) return "GF2";
  if ((num >= 606 && num <= 608)) return "GF2";
  if (num === 613 || num === 614 || num === 615) return "GF2";
  if (num === 623 || num === 625 || num === 626 || num === 627 || num === 628) return "GF2";
  if (num === 631 || num === 633 || num === 641) return "GF2";

  return "Non classé";
}

// ── Utilitaires PDF ───────────────────────────────────────────────────────────

function parseMontant(s: string): number | null {
  const clean = s.replace(/[\s\u00a0]/g, "").replace("€", "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function parseDate(s: string): string | null {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function isHeaderOrTotal(line: string): boolean {
  const lower = line.toLowerCase();
  return HEADER_KEYWORDS.some(k => lower.includes(k)) || /^page\s+\d/i.test(line);
}

async function extractPageRows(page: any): Promise<string[]> {
  const textContent = await page.getTextContent();
  const items = (textContent.items as Array<{ str: string; transform: number[] }>)
    .filter(i => i.str.trim().length > 0);

  const byY = new Map<number, Array<{ x: number; str: string }>>();
  for (const item of items) {
    const y = Math.round(item.transform[5] / 2) * 2;
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y)!.push({ x: item.transform[4], str: item.str });
  }

  return Array.from(byY.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, items]) =>
      items
        .sort((a, b) => a.x - b.x)
        .map(i => i.str)
        .join(" ")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter(l => l.length > 0);
}

function parseMandatLine(line: string): ParsedRow | null {
  const trimmed = line.trim();

  const startMatch = trimmed.match(/^(\d{1,6})\s+(\d{1,6})\s+/);
  if (!startMatch) return null;

  const dateMatch = trimmed.match(/(\d{2}\/\d{2}\/\d{4})(.*)?$/);
  if (!dateMatch) return null;

  const n_bordereau = parseInt(startMatch[1], 10);
  const n_piece = parseInt(startMatch[2], 10);
  const date_emission = parseDate(dateMatch[1]);
  const retour_tresorerie = dateMatch[2]?.trim() || null;

  const afterStart = trimmed.substring(startMatch[0].length);
  const dateIdx = afterStart.indexOf(dateMatch[1]);
  if (dateIdx < 0) return null;
  const middle = afterStart.substring(0, dateIdx).trim();

  const amountRegex = /(\d[\d\u00a0\s]*,\d{2})\s*€?\s*/g;
  const allAmounts: Array<{ value: number; idx: number; len: number }> = [];
  let am: RegExpExecArray | null;
  while ((am = amountRegex.exec(middle)) !== null) {
    const v = parseMontant(am[1]);
    if (v !== null) allAmounts.push({ value: v, idx: am.index, len: am[0].length });
  }

  if (allAmounts.length < 2) return null;

  const htEntry = allAmounts[allAmounts.length - 2];
  const ttcEntry = allAmounts[allAmounts.length - 1];

  const beforeAmounts = middle.substring(0, htEntry.idx).trim();

  const tokens = beforeAmounts.split(/\s+/).filter(t => t.length > 0);
  let compteIdx = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (/^\d{3,7}$/.test(tokens[i]) || tokens[i] === "multi") {
      compteIdx = i;
      break;
    }
  }

  let compte = "";
  let tiersObjet = "";
  if (compteIdx >= 0) {
    compte = tokens[compteIdx];
    tiersObjet = tokens.slice(0, compteIdx).join(" ");
  } else {
    return null;
  }

  const objetKeywords = ["Facture", "Virement", "Règlement", "Remboursement", "Avance", "Acompte", "Salaire", "Paie", "Cotis"];
  let tiers = tiersObjet;
  let objet = "";
  for (const kw of objetKeywords) {
    const kwIdx = tiersObjet.indexOf(kw);
    if (kwIdx > 0) {
      tiers = tiersObjet.substring(0, kwIdx).trim();
      objet = tiersObjet.substring(kwIdx).trim();
      break;
    }
  }

  if (isHeaderOrTotal(tiers + " " + objet)) return null;

  const isInvalid =
    (htEntry.value !== null && htEntry.value > MONTANT_MAX) ||
    (ttcEntry.value !== null && ttcEntry.value > MONTANT_MAX);

  return {
    n_bordereau, n_piece,
    tiers: tiers || tiersObjet,
    objet,
    compte,
    montant_ht: htEntry.value,
    montant_ttc: ttcEntry.value,
    date_emission,
    retour_tresorerie,
    isInvalid,
  };
}

async function parsePDF(file: File): Promise<ParsedRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const results: ParsedRow[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const lines = await extractPageRows(page);
    for (const line of lines) {
      const row = parseMandatLine(line);
      if (row) results.push(row);
    }
  }
  return results;
}

// ── Formatage ─────────────────────────────────────────────────────────────────

const fmtEuro = (v: number) =>
  v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const fmtEuroFull = (v: number) =>
  v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

// ── CSV export ────────────────────────────────────────────────────────────────

function downloadCSV(mandats: Mandat[]) {
  const headers = ["Date", "Bordereau", "Pièce", "Tiers", "Objet", "Compte", "Libellé", "Catégorie", "GF", "HT", "TTC"];
  const rows = mandats.map(m => [
    m.date_emission ?? "",
    m.n_bordereau,
    m.n_piece,
    (m.tiers ?? "").replace(/;/g, ","),
    (m.objet ?? "").replace(/;/g, ","),
    m.compte ?? "",
    m.libelle_compte ?? "",
    m.categorie ?? "",
    m.groupe_fonctionnel ?? "",
    m.montant_ht?.toFixed(2) ?? "",
    m.montant_ttc?.toFixed(2) ?? "",
  ]);
  const csv = "\ufeff" + [headers, ...rows].map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mandats_export_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function PilotageFinancierPage() {
  // ── Import ──────────────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [anneeImport, setAnneeImport] = useState(new Date().getFullYear().toString());
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importStats, setImportStats] = useState<{ new: number; dup: number; invalid: number } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Historique imports ───────────────────────────────────────────────────────
  const [imports, setImports] = useState<MandatImport[]>([]);
  const [importsLoading, setImportsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Dashboard ────────────────────────────────────────────────────────────────
  const [mandats, setMandats] = useState<Mandat[]>([]);
  const [anneesDispo, setAnneesDispo] = useState<number[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [filterAnnees, setFilterAnnees] = useState<string>("tous");
  const [filterGF, setFilterGF] = useState("tous");
  const [recalcLoading, setRecalcLoading] = useState(false);

  // ── Détail ───────────────────────────────────────────────────────────────────
  const [detailMandats, setDetailMandats] = useState<Mandat[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [fDateDebut, setFDateDebut] = useState("");
  const [fDateFin, setFDateFin] = useState("");
  const [fGF, setFGF] = useState("tous");
  const [fCompte, setFCompte] = useState("");
  const [fTiers, setFTiers] = useState("");

  // ── IA ───────────────────────────────────────────────────────────────────────
  const [aiMois, setAiMois] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [aiAnnee, setAiAnnee] = useState(new Date().getFullYear().toString());
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // ── Chargement données dashboard ─────────────────────────────────────────────

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    const { data, error } = await supabase
      .from("mandats")
      .select("id,annee,n_bordereau,n_piece,tiers,objet,compte,montant_ht,montant_ttc,date_emission,retour_tresorerie,groupe_fonctionnel,libelle_compte,categorie,import_id")
      .order("date_emission", { ascending: true });
    if (error) { toast.error("Erreur chargement mandats"); setDashLoading(false); return; }
    const all = (data as Mandat[]) ?? [];
    setMandats(all);
    const annees = [...new Set(all.map(m => m.annee))].sort();
    setAnneesDispo(annees);
    setDashLoading(false);
  }, []);

  const loadDetail = useCallback(async () => {
    setDetailLoading(true);
    let q = supabase
      .from("mandats")
      .select("id,annee,n_bordereau,n_piece,tiers,objet,compte,montant_ht,montant_ttc,date_emission,retour_tresorerie,groupe_fonctionnel,libelle_compte,categorie")
      .order("date_emission", { ascending: false });
    if (fDateDebut) q = q.gte("date_emission", fDateDebut);
    if (fDateFin)   q = q.lte("date_emission", fDateFin);
    if (fGF !== "tous") q = q.eq("groupe_fonctionnel", fGF);
    if (fCompte)    q = q.ilike("compte", `%${fCompte}%`);
    if (fTiers)     q = q.ilike("tiers",  `%${fTiers}%`);
    const { data, error } = await q;
    if (error) { toast.error("Erreur"); setDetailLoading(false); return; }
    setDetailMandats((data as Mandat[]) ?? []);
    setPage(0);
    setDetailLoading(false);
  }, [fDateDebut, fDateFin, fGF, fCompte, fTiers]);

  const loadImports = useCallback(async () => {
    setImportsLoading(true);
    const { data, error } = await supabase
      .from("mandats_imports")
      .select("id,nom_fichier,annee,nb_lignes,montant_total,imported_at")
      .order("imported_at", { ascending: false });
    if (!error) setImports((data as MandatImport[]) ?? []);
    setImportsLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { loadImports(); }, [loadImports]);

  // ── Données dérivées dashboard ────────────────────────────────────────────────

  const filteredMandats = useMemo(() => {
    return mandats.filter(m => {
      if (filterAnnees !== "tous" && m.annee !== parseInt(filterAnnees)) return false;
      if (filterGF !== "tous") {
        if (filterGF === "Non classé") {
          if (m.groupe_fonctionnel && m.groupe_fonctionnel !== "Non classé") return false;
        } else if (m.groupe_fonctionnel !== filterGF) {
          return false;
        }
      }
      return true;
    });
  }, [mandats, filterAnnees, filterGF]);

  const kpis = useMemo(() => {
    const total      = filteredMandats.reduce((s, m) => s + (m.montant_ttc ?? 0), 0);
    const gf1        = filteredMandats.filter(m => m.groupe_fonctionnel === "GF1").reduce((s, m) => s + (m.montant_ttc ?? 0), 0);
    const gf2        = filteredMandats.filter(m => m.groupe_fonctionnel === "GF2").reduce((s, m) => s + (m.montant_ttc ?? 0), 0);
    const gf3        = filteredMandats.filter(m => m.groupe_fonctionnel === "GF3").reduce((s, m) => s + (m.montant_ttc ?? 0), 0);
    const nonclasse  = filteredMandats.filter(m => !m.groupe_fonctionnel || m.groupe_fonctionnel === "Non classé").reduce((s, m) => s + (m.montant_ttc ?? 0), 0);
    return { total, gf1, gf2, gf3, nonclasse };
  }, [filteredMandats]);

  const monthlyData = useMemo((): MonthlyPoint[] => {
    const grouped: Record<string, MonthlyPoint> = {};
    for (const m of filteredMandats) {
      if (!m.date_emission) continue;
      const d = new Date(m.date_emission);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = { month: key, GF1: 0, GF2: 0, GF3: 0, total: 0 };
      const ttc = m.montant_ttc ?? 0;
      const gf = m.groupe_fonctionnel;
      if (gf === "GF1") grouped[key].GF1 += ttc;
      else if (gf === "GF2") grouped[key].GF2 += ttc;
      else if (gf === "GF3") grouped[key].GF3 += ttc;
      grouped[key].total += ttc;
    }
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredMandats]);

  const pieData = useMemo(() => [
    { name: "GF1", value: kpis.gf1, color: GF_COLORS.GF1 },
    { name: "GF2", value: kpis.gf2, color: GF_COLORS.GF2 },
    { name: "GF3", value: kpis.gf3, color: GF_COLORS.GF3 },
  ].filter(d => d.value > 0), [kpis]);

  const top10 = useMemo(() => {
    const byTiers: Record<string, number> = {};
    for (const m of filteredMandats) {
      const t = m.tiers || "—";
      byTiers[t] = (byTiers[t] ?? 0) + (m.montant_ttc ?? 0);
    }
    return Object.entries(byTiers)
      .map(([tiers, total]) => ({ tiers, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredMandats]);

  // ── Import PDF ────────────────────────────────────────────────────────────────

  const handleFile = async (f: File) => {
    if (!f.name.endsWith(".pdf")) { toast.error("Fichier PDF requis"); return; }
    setFile(f);
    setParsedRows([]);
    setImportStats(null);
    setImportLoading(true);
    try {
      const rows = await parsePDF(f);
      const { data: existing } = await supabase
        .from("mandats")
        .select("n_bordereau,n_piece")
        .eq("annee", parseInt(anneeImport));
      const existingSet = new Set(
        ((existing as any[]) ?? []).map((e: any) => `${e.n_bordereau}_${e.n_piece}`)
      );
      const marked = rows.map(r => ({
        ...r,
        isDuplicate: existingSet.has(`${r.n_bordereau}_${r.n_piece}`),
      }));
      setParsedRows(marked);
      const invalidCount = marked.filter(r => r.isInvalid).length;
      const dupCount = marked.filter(r => r.isDuplicate && !r.isInvalid).length;
      const newCount = marked.filter(r => !r.isDuplicate && !r.isInvalid).length;
      setImportStats({ new: newCount, dup: dupCount, invalid: invalidCount });
      toast.success(`${rows.length} lignes détectées dans le PDF`);
    } catch (e: any) {
      toast.error("Erreur parsing PDF : " + e.message);
    }
    setImportLoading(false);
  };

  const importMandats = async () => {
    if (!parsedRows.length || !file) return;
    setImportLoading(true);

    // Charger le référentiel comptes
    const { data: refData, error: refError } = await supabase.from("comptes_referentiel").select("*");
    if (refError) { toast.error("Erreur chargement référentiel : " + refError.message); setImportLoading(false); return; }
    const refMap = new Map<string, CompteRef>(
      ((refData as CompteRef[]) ?? []).map(r => [r.compte.trim(), r])
    );

    const findRef = (compte: string): CompteRef | undefined => {
      const c = compte.trim();
      const exact = refMap.get(c);
      if (exact) return exact;
      for (let len = c.length - 1; len >= 3; len--) {
        const partial = refMap.get(c.substring(0, len));
        if (partial) return partial;
      }
      return undefined;
    };

    const annee = parseInt(anneeImport);
    const toImport = parsedRows.filter(r => !r.isDuplicate && !r.isInvalid);

    if (toImport.length === 0) { toast.info("Aucune nouvelle ligne à importer"); setImportLoading(false); return; }

    // Calculer le montant total des nouvelles lignes
    const montantTotal = toImport.reduce((s, r) => s + (r.montant_ttc ?? 0), 0);

    // Créer l'enregistrement d'import
    const { data: importRecord, error: importErr } = await supabase
      .from("mandats_imports")
      .insert({
        nom_fichier: file.name,
        annee,
        nb_lignes: toImport.length,
        montant_total: montantTotal,
      })
      .select("id")
      .single();

    if (importErr || !importRecord) {
      toast.error("Erreur création import : " + (importErr?.message ?? "unknown"));
      setImportLoading(false);
      return;
    }

    const importId = importRecord.id;

    const payload = toImport.map(r => {
      const ref = findRef(r.compte);
      // Priorité : référentiel → mapping GF → Non classé
      const gf = ref?.groupe_fonctionnel ?? getGroupeFonctionnel(r.compte);
      return {
        annee,
        n_bordereau: r.n_bordereau,
        n_piece: r.n_piece,
        tiers: r.tiers || null,
        objet: r.objet || null,
        compte: r.compte || null,
        montant_ht: r.montant_ht,
        montant_ttc: r.montant_ttc,
        date_emission: r.date_emission,
        retour_tresorerie: r.retour_tresorerie,
        groupe_fonctionnel: gf,
        libelle_compte: ref?.libelle ?? null,
        categorie: ref?.categorie ?? null,
        import_id: importId,
      };
    });

    const { error } = await supabase.from("mandats").upsert(payload, {
      onConflict: "annee,n_bordereau,n_piece",
      ignoreDuplicates: true,
    });

    setImportLoading(false);
    if (error) {
      // Rollback : supprimer l'import créé
      await supabase.from("mandats_imports").delete().eq("id", importId);
      toast.error("Erreur import : " + error.message);
      return;
    }

    toast.success(`${payload.length} mandat(s) importé(s) avec succès`);
    setParsedRows([]);
    setImportStats(null);
    setFile(null);
    loadDashboard();
    loadImports();
  };

  // ── Suppression import ────────────────────────────────────────────────────────

  const deleteImport = async (id: string) => {
    setDeleteLoading(true);
    const { error } = await supabase.from("mandats_imports").delete().eq("id", id);
    setDeleteLoading(false);
    setDeleteConfirm(null);
    if (error) { toast.error("Erreur suppression : " + error.message); return; }
    toast.success("Import et mandats associés supprimés");
    loadImports();
    loadDashboard();
  };

  // ── Recalcul GF ──────────────────────────────────────────────────────────────

  const recalculeGF = async () => {
    setRecalcLoading(true);
    // Récupérer tous les mandats non classés
    const { data, error } = await supabase
      .from("mandats")
      .select("id,compte")
      .eq("groupe_fonctionnel", "Non classé");

    if (error) { toast.error("Erreur : " + error.message); setRecalcLoading(false); return; }
    const rows = (data as { id: string; compte: string | null }[]) ?? [];
    if (rows.length === 0) { toast.info("Aucun mandat 'Non classé' à recalculer"); setRecalcLoading(false); return; }

    // Batch UPDATE par groupes de 50
    const BATCH = 50;
    let updated = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      for (const row of batch) {
        const gf = getGroupeFonctionnel(row.compte ?? "");
        if (gf !== "Non classé") {
          await supabase.from("mandats").update({ groupe_fonctionnel: gf }).eq("id", row.id);
          updated++;
        }
      }
    }

    setRecalcLoading(false);
    toast.success(`${updated} mandat(s) mis à jour sur ${rows.length} non classés`);
    loadDashboard();
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // ── Analyse IA ────────────────────────────────────────────────────────────────

  const generateAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    const annee = parseInt(aiAnnee);
    const moisNum = parseInt(aiMois);
    const prefix = `${aiAnnee}-${aiMois}`;
    const prevMoisDate = new Date(annee, moisNum - 2, 1);
    const prevPrefix = `${prevMoisDate.getFullYear()}-${String(prevMoisDate.getMonth() + 1).padStart(2, "0")}`;

    const moisMandats = mandats.filter(m => m.date_emission?.startsWith(prefix));
    const prevMandats = mandats.filter(m => m.date_emission?.startsWith(prevPrefix));

    const sumByGF = (list: Mandat[]) => ({
      GF1: list.filter(m => m.groupe_fonctionnel === "GF1").reduce((s, m) => s + (m.montant_ttc ?? 0), 0),
      GF2: list.filter(m => m.groupe_fonctionnel === "GF2").reduce((s, m) => s + (m.montant_ttc ?? 0), 0),
      GF3: list.filter(m => m.groupe_fonctionnel === "GF3").reduce((s, m) => s + (m.montant_ttc ?? 0), 0),
      total: list.reduce((s, m) => s + (m.montant_ttc ?? 0), 0),
    });

    const byTiers: Record<string, number> = {};
    for (const m of moisMandats) {
      const t = m.tiers || "Inconnu";
      byTiers[t] = (byTiers[t] ?? 0) + (m.montant_ttc ?? 0);
    }
    const top5 = Object.entries(byTiers).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const summary = {
      periode: `${aiMois}/${aiAnnee}`,
      gf_courant: sumByGF(moisMandats),
      gf_precedent: sumByGF(prevMandats),
      top5_fournisseurs: top5.map(([t, v]) => ({ tiers: t, montant_ttc: v })),
      nb_mandats: moisMandats.length,
    };

    const { data, error } = await supabase.functions.invoke("suggest-actions", {
      body: { context_type: "analyse_financiere", data: summary },
    });

    setAiLoading(false);
    if (error) { toast.error("Erreur IA : " + error.message); return; }
    setAiResult(data?.analyse ?? data?.text ?? JSON.stringify(data, null, 2));
  };

  // ── Génération rapport PDF IA ─────────────────────────────────────────────────

  const generateIAPdf = async () => {
    if (!aiResult) return;
    setPdfLoading(true);
    try {
      const annees = [...new Set(mandats.map(m => m.annee))].sort().join(", ");
      const now = new Date().toLocaleDateString("fr-FR");
      const totalGlobal = mandats.reduce((s, m) => s + (m.montant_ttc ?? 0), 0);

      const fmtK = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

      // Capture graphiques (si onglet dashboard rendu)
      const chartLineImg = await captureById("chart-evolution-mensuelle");
      const chartPieImg = await captureById("chart-repartition-gf");

      // Top 10 comptes global
      const byCompte: Record<string, { montant: number; libelle: string; gf: string }> = {};
      for (const m of mandats) {
        const k = m.compte ?? "—";
        if (!byCompte[k]) byCompte[k] = { montant: 0, libelle: m.libelle_compte ?? "", gf: m.groupe_fonctionnel ?? "" };
        byCompte[k].montant += m.montant_ttc ?? 0;
      }
      const top10Comptes = Object.entries(byCompte)
        .map(([c, v]) => ({ compte: c, ...v }))
        .sort((a, b) => b.montant - a.montant)
        .slice(0, 10);

      // Récap par GF
      const gfRecap = [
        { gf: "GF1", label: GF_LABELS.GF1, montant: kpis.gf1, color: GF_COLORS.GF1 },
        { gf: "GF2", label: GF_LABELS.GF2, montant: kpis.gf2, color: GF_COLORS.GF2 },
        { gf: "GF3", label: GF_LABELS.GF3, montant: kpis.gf3, color: GF_COLORS.GF3 },
      ].filter(g => g.montant > 0);

      const pages: string[] = [];

      // ── Page 1 — Garde + Vue d'ensemble ──────────────────────────────────────
      const kpiSection = pdfKpis([
        { label: "Total TTC", value: fmtK(totalGlobal), color: C.primary },
        { label: "GF1 — Soins", value: fmtK(kpis.gf1), color: GF_COLORS.GF1 },
        { label: "GF2 — Personnel", value: fmtK(kpis.gf2), color: GF_COLORS.GF2 },
        { label: "GF3 — Structure", value: fmtK(kpis.gf3), color: GF_COLORS.GF3 },
      ]);

      const gfRecapTable = pdfTable(
        ["Groupe Fonctionnel", "Montant TTC", "% du total"],
        gfRecap.map(g => [
          esc(g.label),
          fmtK(g.montant),
          totalGlobal > 0 ? `${((g.montant / totalGlobal) * 100).toFixed(1)}%` : "—",
        ])
      );

      let page1Content = `
        ${pdfSectionTitle("Rapport d'Analyse Financière")}
        <div style="padding:0 28px;">
          <div style="background:#FFF7ED;border-radius:8px;padding:14px 16px;border:1px solid #FED7AA;margin-bottom:8px;">
            <div style="font-size:12px;color:#92400E;font-family:Arial,sans-serif;">
              <strong>Période :</strong> ${esc(annees)} &nbsp;|&nbsp; <strong>Généré le :</strong> ${now} &nbsp;|&nbsp; <strong>Mandats :</strong> ${mandats.length}
            </div>
          </div>
        </div>
        ${kpiSection}
        ${pdfSectionTitle("Répartition par Groupe Fonctionnel")}
        ${gfRecapTable}
      `;

      if (chartLineImg) {
        page1Content += pdfSectionTitle("Évolution mensuelle des dépenses");
        page1Content += pdfImage(chartLineImg, "Évolution mensuelle TTC par groupe fonctionnel");
      }

      pages.push(pdfPage(page1Content, "Pilotage Financier", 1, 0));

      // ── Page 2 — Top comptes + Camembert ─────────────────────────────────────
      let page2Content = pdfSectionTitle("Top 10 comptes par montant TTC");
      page2Content += pdfTable(
        ["Compte", "Libellé", "Groupe", "Montant TTC", "% total"],
        top10Comptes.map(r => [
          `<span style="font-family:monospace;">${esc(r.compte)}</span>`,
          esc(r.libelle) || "—",
          esc(r.gf) || "—",
          fmtK(r.montant),
          totalGlobal > 0 ? `${((r.montant / totalGlobal) * 100).toFixed(1)}%` : "—",
        ])
      );

      if (chartPieImg) {
        page2Content += pdfSectionTitle("Répartition globale GF");
        page2Content += pdfImage(chartPieImg, "Répartition des dépenses par groupe fonctionnel");
      }

      pages.push(pdfPage(page2Content, "Pilotage Financier", 2, 0));

      // ── Page 3 — Analyse IA ───────────────────────────────────────────────────
      const iaPeriod = `${aiMois}/${aiAnnee}`;
      const iaContent = `
        ${pdfSectionTitle("Analyse IA")}
        <div style="padding:0 28px;">
          <div style="background:#F5F0EB;border-radius:8px;padding:16px;border-left:4px solid ${C.primary};">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="width:24px;height:24px;background:${C.primary};border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <span style="color:white;font-size:12px;font-family:Arial,sans-serif;">✦</span>
              </div>
              <span style="font-size:11px;font-weight:700;color:${C.primary};font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5px;">
                Analyse générée par IA le ${now} — Période : ${iaPeriod}
              </span>
            </div>
            <div style="font-size:11px;color:#2D2D2D;font-family:Arial,sans-serif;line-height:1.7;white-space:pre-wrap;">${esc(aiResult)}</div>
          </div>
        </div>
      `;
      pages.push(pdfPage(iaContent, "Pilotage Financier", 3, 0));

      // ── Pages 4+ — Détail mandats (paginé par 30) ────────────────────────────
      const sorted = [...mandats].sort((a, b) =>
        (a.date_emission ?? "").localeCompare(b.date_emission ?? "")
      );
      const ROWS_PER_PAGE = 30;
      for (let i = 0; i < sorted.length; i += ROWS_PER_PAGE) {
        const chunk = sorted.slice(i, i + ROWS_PER_PAGE);
        const pageNum = 4 + Math.floor(i / ROWS_PER_PAGE);
        const detailContent = `
          ${pdfSectionTitle(`Détail des mandats — lignes ${i + 1} à ${Math.min(i + ROWS_PER_PAGE, sorted.length)}`)}
          ${pdfTable(
            ["Date", "Bordereau", "Tiers", "Objet", "Compte", "GF", "TTC"],
            chunk.map(m => [
              m.date_emission ? new Date(m.date_emission).toLocaleDateString("fr-FR") : "—",
              String(m.n_bordereau),
              esc(m.tiers?.substring(0, 30) ?? "—"),
              esc(m.objet?.substring(0, 35) ?? "—"),
              `<span style="font-family:monospace;">${esc(m.compte ?? "—")}</span>`,
              esc(m.groupe_fonctionnel ?? "—"),
              m.montant_ttc != null ? fmtK(m.montant_ttc) : "—",
            ]),
            ["8%", "8%", "20%", "25%", "8%", "15%", "10%"]
          )}
        `;
        pages.push(pdfPage(detailContent, "Pilotage Financier — Confidentiel", pageNum, 0));
      }

      // Re-numéroter avec le total correct
      const total = pages.length;
      const renumbered = pages.map((p, i) =>
        p.replace(/, 0\)$/, `, ${total})`).replace(/page ${i + 1} \/ 0/, `${i + 1} / ${total}`)
      );

      await buildAndSavePdf(
        pages,
        `rapport_financier_${annees.replace(/,\s*/g, "-")}_${Date.now()}.pdf`
      );
      toast.success("Rapport PDF généré avec succès");
    } catch (e: any) {
      toast.error("Erreur génération PDF : " + e.message);
    }
    setPdfLoading(false);
  };

  // ── Pagination détail ─────────────────────────────────────────────────────────

  const totalPages = Math.ceil(detailMandats.length / PAGE_SIZE);
  const pagedMandats = detailMandats.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Import à confirmer (delete) ───────────────────────────────────────────────

  const importToDelete = imports.find(i => i.id === deleteConfirm);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Pilotage Financier</h1>
          <p className="text-xs text-muted-foreground">Import et analyse des mandats de dépenses</p>
        </div>
      </motion.div>

      {/* Onglets */}
      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import" className="gap-1.5 text-xs"><Upload className="w-3.5 h-3.5" />Import</TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" />Tableau de bord</TabsTrigger>
          <TabsTrigger value="detail" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" />Détail</TabsTrigger>
          <TabsTrigger value="ia" className="gap-1.5 text-xs"><Sparkles className="w-3.5 h-3.5" />Analyse IA</TabsTrigger>
        </TabsList>

        {/* ── Onglet Import ──────────────────────────────────────────────────────── */}
        <TabsContent value="import" className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Année du fichier</Label>
              <Input
                type="number" min={2020} max={2099} className="h-8 text-xs w-32"
                value={anneeImport}
                onChange={e => { setAnneeImport(e.target.value); setParsedRows([]); setImportStats(null); }}
              />
            </div>
          </div>

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById("pdf-input")?.click()}
            className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors text-center"
          >
            {importLoading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {file ? file.name : "Déposer ou cliquer pour sélectionner un PDF"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Fichier de mandats au format liste tabulaire — cumulatif depuis janvier
              </p>
            </div>
            <input
              id="pdf-input" type="file" accept=".pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {/* Résultats parsing */}
          {importStats && (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                {importStats.new} nouvelle{importStats.new !== 1 ? "s" : ""} ligne{importStats.new !== 1 ? "s" : ""}
              </Badge>
              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                {importStats.dup} doublon{importStats.dup !== 1 ? "s" : ""} ignoré{importStats.dup !== 1 ? "s" : ""}
              </Badge>
              {importStats.invalid > 0 && (
                <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                  {importStats.invalid} ligne{importStats.invalid !== 1 ? "s" : ""} invalide{importStats.invalid !== 1 ? "s" : ""} (montant aberrant)
                </Badge>
              )}
              <Button
                size="sm" className="ml-auto h-8 gap-1.5 text-xs"
                onClick={importMandats}
                disabled={importLoading || importStats.new === 0}
              >
                {importLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Importer {importStats.new} ligne{importStats.new !== 1 ? "s" : ""}
              </Button>
            </div>
          )}

          {/* Aperçu */}
          {parsedRows.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="p-3 bg-muted/40 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Aperçu — {parsedRows.length} lignes détectées
                </p>
              </div>
              <div className="overflow-x-auto max-h-72">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead>Bordereau</TableHead>
                      <TableHead>Pièce</TableHead>
                      <TableHead>Tiers</TableHead>
                      <TableHead>Objet</TableHead>
                      <TableHead>Compte</TableHead>
                      <TableHead className="text-right">HT</TableHead>
                      <TableHead className="text-right">TTC</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 50).map((r, i) => (
                      <TableRow key={i} className={r.isDuplicate || r.isInvalid ? "opacity-40 text-[11px]" : "text-[11px]"}>
                        <TableCell>{r.n_bordereau}</TableCell>
                        <TableCell>{r.n_piece}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{r.tiers}</TableCell>
                        <TableCell className="max-w-[140px] truncate">{r.objet}</TableCell>
                        <TableCell>{r.compte}</TableCell>
                        <TableCell className="text-right">{r.montant_ht?.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{r.montant_ttc?.toFixed(2)}</TableCell>
                        <TableCell>{r.date_emission}</TableCell>
                        <TableCell>
                          {r.isDuplicate && <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">doublon</Badge>}
                          {r.isInvalid && <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">invalide</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedRows.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Affichage limité à 50 lignes — {parsedRows.length - 50} lignes supplémentaires non affichées
                </p>
              )}
            </div>
          )}

          {/* ── Historique des imports ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Historique des imports
              </p>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={loadImports} disabled={importsLoading}>
                <RefreshCw className={`w-3.5 h-3.5 ${importsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {deleteConfirm && importToDelete && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-800 flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400 flex-1">
                  Supprimer <strong>{importToDelete.nom_fichier}</strong> supprimera{" "}
                  <strong>{importToDelete.nb_lignes ?? "?"} mandat(s)</strong>. Confirmer ?
                </p>
                <Button
                  size="sm" variant="destructive" className="h-7 text-xs gap-1"
                  onClick={() => deleteImport(deleteConfirm)}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Supprimer
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeleteConfirm(null)}>
                  Annuler
                </Button>
              </div>
            )}

            {importsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : imports.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Aucun import enregistré
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px] bg-muted/20">
                      <TableHead>Fichier</TableHead>
                      <TableHead>Année</TableHead>
                      <TableHead className="text-right">Nb lignes</TableHead>
                      <TableHead className="text-right">Montant total TTC</TableHead>
                      <TableHead>Date d'import</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imports.map(imp => (
                      <TableRow key={imp.id} className="text-[11px]">
                        <TableCell className="font-medium max-w-[200px] truncate" title={imp.nom_fichier}>
                          {imp.nom_fichier}
                        </TableCell>
                        <TableCell>{imp.annee ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{imp.nb_lignes ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {imp.montant_total != null ? fmtEuroFull(imp.montant_total) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(imp.imported_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirm(imp.id)}
                            title="Supprimer cet import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Onglet Tableau de bord ─────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-5">

          {/* Filtres */}
          <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl border border-border bg-card/50">
            <Select value={filterAnnees} onValueChange={setFilterAnnees}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes années</SelectItem>
                {anneesDispo.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterGF} onValueChange={setFilterGF}>
              <SelectTrigger className="w-52 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les GF</SelectItem>
                <SelectItem value="GF1">GF1 — Soins & hébergement</SelectItem>
                <SelectItem value="GF2">GF2 — Personnel & dépendance</SelectItem>
                <SelectItem value="GF3">GF3 — Structure & gestion</SelectItem>
                <SelectItem value="Non classé">Non classé</SelectItem>
              </SelectContent>
            </Select>
            {dashLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <span className="ml-auto text-xs text-muted-foreground">
              {filteredMandats.length} mandat{filteredMandats.length !== 1 ? "s" : ""}
            </span>
            <Button
              size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
              onClick={recalculeGF}
              disabled={recalcLoading}
              title="Recalcule le groupe fonctionnel pour tous les mandats 'Non classé'"
            >
              {recalcLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Recalculer les GF
            </Button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total TTC", value: kpis.total, accent: "border-l-[#c46b48]", num: "text-[#c46b48]" },
              { label: "GF1 — Soins & hébergement", value: kpis.gf1, accent: "border-l-blue-400", num: "text-blue-600" },
              { label: "GF2 — Personnel & dépendance", value: kpis.gf2, accent: "border-l-emerald-400", num: "text-emerald-600" },
              { label: "GF3 — Structure & gestion", value: kpis.gf3, accent: "border-l-orange-400", num: "text-orange-600" },
            ].map(k => (
              <div key={k.label} className={`rounded-xl border-l-4 ${k.accent} border border-border/60 bg-card px-4 py-4 shadow-sm`}>
                <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                <p className={`text-lg font-display font-bold tabular-nums ${k.num}`}>{fmtEuro(k.value)}</p>
              </div>
            ))}
          </div>
          {kpis.nonclasse > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>{fmtEuro(kpis.nonclasse)}</strong> non rattachés à un GF.{" "}
                Utilisez le bouton <strong>Recalculer les GF</strong> pour tenter un reclassement automatique.
              </span>
            </div>
          )}

          {monthlyData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Euro className="w-12 h-12 mx-auto opacity-20 mb-3" />
              <p>Aucune donnée pour les filtres sélectionnés</p>
            </div>
          ) : (
            <>
              {/* Courbe évolution mensuelle */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Évolution mensuelle des dépenses TTC</CardTitle>
                </CardHeader>
                <CardContent>
                  <div id="chart-evolution-mensuelle">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={v => fmtEuro(v)} tick={{ fontSize: 10 }} width={75} />
                        <Tooltip formatter={(v: number) => fmtEuroFull(v)} labelFormatter={monthLabel} />
                        <Legend formatter={(v) => GF_LABELS[v as keyof typeof GF_LABELS] ?? v} />
                        <Line type="monotone" dataKey="total" stroke="#6b7280" strokeWidth={2} dot={false} name="Total" />
                        <Line type="monotone" dataKey="GF1" stroke={GF_COLORS.GF1} strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="GF2" stroke={GF_COLORS.GF2} strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="GF3" stroke={GF_COLORS.GF3} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* BarChart empilé */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Répartition mensuelle par GF</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={v => fmtEuro(v)} tick={{ fontSize: 10 }} width={70} />
                        <Tooltip formatter={(v: number) => fmtEuroFull(v)} labelFormatter={monthLabel} />
                        <Legend formatter={(v) => v} />
                        <Bar dataKey="GF1" stackId="a" fill={GF_COLORS.GF1} />
                        <Bar dataKey="GF2" stackId="a" fill={GF_COLORS.GF2} />
                        <Bar dataKey="GF3" stackId="a" fill={GF_COLORS.GF3} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* PieChart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Répartition globale GF</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div id="chart-repartition-gf">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmtEuroFull(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-4 mt-2">
                        {pieData.map(d => (
                          <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                            {d.name} — {fmtEuro(d.value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top 10 fournisseurs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Top 10 fournisseurs (TTC)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="pl-4">#</TableHead>
                        <TableHead>Tiers</TableHead>
                        <TableHead className="text-right pr-4">Montant TTC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top10.map((row, i) => (
                        <TableRow key={i} className="text-xs">
                          <TableCell className="pl-4 text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{row.tiers}</TableCell>
                          <TableCell className="text-right pr-4 tabular-nums font-semibold">{fmtEuroFull(row.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Onglet Détail ──────────────────────────────────────────────────────── */}
        <TabsContent value="detail" className="space-y-4">

          {/* Filtres */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl border border-border bg-card/50">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Date début</Label>
              <Input type="date" className="h-8 text-xs" value={fDateDebut} onChange={e => setFDateDebut(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Date fin</Label>
              <Input type="date" className="h-8 text-xs" value={fDateFin} onChange={e => setFDateFin(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Groupe</Label>
              <Select value={fGF} onValueChange={setFGF}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous</SelectItem>
                  {["GF1","GF2","GF3"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Compte</Label>
              <Input className="h-8 text-xs" placeholder="ex. 6063" value={fCompte} onChange={e => setFCompte(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Tiers</Label>
              <Input className="h-8 text-xs" placeholder="Nom fournisseur" value={fTiers} onChange={e => setFTiers(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" className="h-8 gap-1 text-xs flex-1" onClick={loadDetail} disabled={detailLoading}>
                {detailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Filtrer
              </Button>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => downloadCSV(detailMandats)} title="Export CSV" disabled={!detailMandats.length}>
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px] bg-muted/40">
                    <TableHead>Date</TableHead>
                    <TableHead>Bordereau</TableHead>
                    <TableHead>Pièce</TableHead>
                    <TableHead>Tiers</TableHead>
                    <TableHead>Objet</TableHead>
                    <TableHead>Compte</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>GF</TableHead>
                    <TableHead className="text-right">HT</TableHead>
                    <TableHead className="text-right">TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailLoading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : pagedMandats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-10 text-xs text-muted-foreground">
                        Aucun mandat — utilisez les filtres et cliquez sur Filtrer
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedMandats.map(m => (
                      <TableRow key={m.id} className="text-[11px]">
                        <TableCell className="whitespace-nowrap">
                          {m.date_emission ? new Date(m.date_emission).toLocaleDateString("fr-FR") : "—"}
                        </TableCell>
                        <TableCell>{m.n_bordereau}</TableCell>
                        <TableCell>{m.n_piece}</TableCell>
                        <TableCell className="max-w-[120px] truncate" title={m.tiers ?? ""}>{m.tiers ?? "—"}</TableCell>
                        <TableCell className="max-w-[160px] truncate" title={m.objet ?? ""}>{m.objet ?? "—"}</TableCell>
                        <TableCell className="font-mono">{m.compte ?? "—"}</TableCell>
                        <TableCell className="max-w-[130px] truncate" title={m.libelle_compte ?? ""}>{m.libelle_compte ?? "—"}</TableCell>
                        <TableCell>{m.categorie ?? "—"}</TableCell>
                        <TableCell>
                          {m.groupe_fonctionnel ? (
                            <Badge className={`text-[10px] border-0 ${
                              m.groupe_fonctionnel === "GF1" ? "bg-blue-100 text-blue-700" :
                              m.groupe_fonctionnel === "GF2" ? "bg-emerald-100 text-emerald-700" :
                              "bg-orange-100 text-orange-700"
                            }`}>{m.groupe_fonctionnel}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.montant_ht != null ? fmtEuroFull(m.montant_ht) : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{m.montant_ttc != null ? fmtEuroFull(m.montant_ttc) : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  {detailMandats.length} résultat{detailMandats.length !== 1 ? "s" : ""} — page {page + 1} / {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Onglet Analyse IA ──────────────────────────────────────────────────── */}
        <TabsContent value="ia" className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Analyse intelligente des dépenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Sélectionnez un mois pour générer une analyse automatique : évolution par groupe fonctionnel,
                principaux fournisseurs, tendances et recommandations.
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Mois</Label>
                  <Select value={aiMois} onValueChange={setAiMois}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = String(i + 1).padStart(2, "0");
                        const label = new Date(2000, i).toLocaleDateString("fr-FR", { month: "long" });
                        return <SelectItem key={m} value={m}>{label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Année</Label>
                  <Select value={aiAnnee} onValueChange={setAiAnnee}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {anneesDispo.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="h-8 gap-1.5 text-xs"
                  onClick={generateAI}
                  disabled={aiLoading || anneesDispo.length === 0}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Générer l'analyse
                </Button>
                {aiResult && (
                  <Button
                    variant="outline"
                    className="h-8 gap-1.5 text-xs ml-auto"
                    onClick={generateIAPdf}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    Générer rapport PDF
                  </Button>
                )}
              </div>

              {aiResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-muted/30 p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-widest">Analyse IA</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiResult}</p>
                </motion.div>
              )}

              {!aiResult && !aiLoading && anneesDispo.length === 0 && (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  Importez d'abord des mandats pour pouvoir générer une analyse.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
