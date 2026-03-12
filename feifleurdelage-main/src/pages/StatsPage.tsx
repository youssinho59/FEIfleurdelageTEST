import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Download,
  FileText,
  AlertTriangle,
  Users,
  CheckCircle,
  ClipboardList,
  MessageSquareWarning,
  TrendingUp,
  Shield,
  Database,
  Loader2,
  XCircle,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { generateStatsPdf } from "@/lib/pdfGenerator";
import { insertSeedData } from "@/lib/seedData";
import { PLAINTE_CATEGORIES, CATEGORIE_TO_FAMILLE, FAMILLE_COLOR } from "@/lib/plaintesCategories";
import { toast } from "sonner";

// ─── Palette ────────────────────────────────────────────────────────────────
const PIE_COLORS = ["#c46b48", "#d4956e", "#e8b896", "#a85636", "#c98b6e", "#8b5e3c", "#d4a574", "#e8c9a0"];
const GRAVITE_COLORS = ["#22c55e", "#84cc16", "#f59e0b", "#f97316", "#ef4444"];
const STATUT_COLORS: Record<string, string> = {
  nouveau: "#3b82f6",
  en_cours_analyse: "#f59e0b",
  actions_en_cours: "#f97316",
  cloture: "#22c55e",
  archive: "#94a3b8",
};
const PLAINTE_STATUT_COLORS: Record<string, string> = {
  nouveau: "#3b82f6",
  en_cours: "#f59e0b",
  traite: "#22c55e",
};

const GRAVITE_LABELS: Record<number, string> = {
  1: "Mineure",
  2: "Modérée",
  3: "Importante",
  4: "Grave",
  5: "Critique",
};
const STATUT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_cours_analyse: "En analyse",
  actions_en_cours: "Actions en cours",
  cloture: "Clôturé",
  archive: "Archivé",
};

// ─── Custom tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg text-xs space-y-0.5">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name} : <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Custom label for pie ────────────────────────────────────────────────────
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent < 0.07) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 leading-tight">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

// ─── Section header ──────────────────────────────────────────────────────────
const SectionTitle = ({ icon: Icon, title, color = "text-primary" }: { icon: React.ElementType; title: string; color?: string }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon className={`w-4 h-4 ${color}`} />
    <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">{title}</h2>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────
const StatsPage = () => {
  const { isAdmin, user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear - 1}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [feiData, setFeiData] = useState<any[]>([]);
  const [plaintesData, setPlaintesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [feiResult, plaintesResult] = await Promise.all([
      supabase.from("fei").select("*").gte("date_evenement", dateFrom).lte("date_evenement", dateTo).order("date_evenement", { ascending: true }),
      supabase.from("plaintes").select("*").gte("date_plainte", dateFrom).lte("date_plainte", dateTo).order("date_plainte", { ascending: true }),
    ]);
    setFeiData(feiResult.data || []);
    setPlaintesData(plaintesResult.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateFrom, dateTo]);

  // ─── Computed stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalFei = feiData.length;
    const totalGravite = feiData.reduce((s, f) => s + f.gravite, 0);
    const avgGravite = totalFei > 0 ? (totalGravite / totalFei).toFixed(1) : "—";
    const withActions = feiData.filter((f) => f.actions_correctives).length;
    const critiques = feiData.filter((f) => f.gravite >= 4).length;
    const clotures = feiData.filter((f) => f.statut === "cloture" || f.statut === "archive").length;
    const tauxCloture = totalFei > 0 ? Math.round((clotures / totalFei) * 100) : 0;
    const tauxActions = totalFei > 0 ? Math.round((withActions / totalFei) * 100) : 0;

    const byType: Record<string, number> = {};
    const byGravite: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const byStatut: Record<string, number> = {};
    const byDeclarant: Record<string, number> = {};
    const byLieu: Record<string, number> = {};

    feiData.forEach((f) => {
      byType[f.type_fei] = (byType[f.type_fei] || 0) + 1;
      byGravite[f.gravite] = (byGravite[f.gravite] || 0) + 1;
      byStatut[f.statut] = (byStatut[f.statut] || 0) + 1;
      byDeclarant[f.declarant_nom] = (byDeclarant[f.declarant_nom] || 0) + 1;
      byLieu[f.lieu] = (byLieu[f.lieu] || 0) + 1;
    });

    const totalPlaintes = plaintesData.length;
    const plaintesTraitees = plaintesData.filter((p) => p.statut === "traite").length;
    const plaintesEnCours = plaintesData.filter((p) => p.statut === "en_cours" || p.statut === "nouveau").length;
    const tauxResolution = totalPlaintes > 0 ? Math.round((plaintesTraitees / totalPlaintes) * 100) : 0;

    const byDemandeur: Record<string, number> = {};
    const byStatutPlaintes: Record<string, number> = {};
    const byCategorie: Record<string, number> = {};
    const byFamille: Record<string, number> = {};
    plaintesData.forEach((p) => {
      byDemandeur[p.demandeur] = (byDemandeur[p.demandeur] || 0) + 1;
      byStatutPlaintes[p.statut] = (byStatutPlaintes[p.statut] || 0) + 1;
      if (p.objet) {
        byCategorie[p.objet] = (byCategorie[p.objet] || 0) + 1;
        const famille = CATEGORIE_TO_FAMILLE[p.objet] || "Autre";
        byFamille[famille] = (byFamille[famille] || 0) + 1;
      }
    });

    // Monthly evolution
    const monthlyMap: Record<string, { fei: number; plaintes: number }> = {};
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
      while (cursor <= to) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap[key] = { fei: 0, plaintes: 0 };
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
    feiData.forEach((f) => {
      const key = f.date_evenement.slice(0, 7);
      if (monthlyMap[key]) monthlyMap[key].fei++;
    });
    plaintesData.forEach((p) => {
      const key = p.date_plainte.slice(0, 7);
      if (monthlyMap[key]) monthlyMap[key].plaintes++;
    });
    const monthlyData = Object.entries(monthlyMap).map(([key, val]) => ({
      month: new Date(key + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      FEI: val.fei,
      Plaintes: val.plaintes,
    }));

    const declarants = new Set([...feiData.map((f) => f.declarant_nom), ...plaintesData.map((p) => p.declarant_nom)]);

    return {
      totalFei, avgGravite, withActions, critiques, clotures, tauxCloture, tauxActions,
      byType, byGravite, byStatut, byDeclarant, byLieu,
      totalPlaintes, plaintesTraitees, plaintesEnCours, tauxResolution,
      byDemandeur, byStatutPlaintes, byCategorie, byFamille, monthlyData,
      totalDeclarants: declarants.size,
    };
  }, [feiData, plaintesData]);

  // Chart data
  const typeChartData = Object.entries(stats.byType).map(([name, value]) => ({ name, value }));

  const graviteChartData = [1, 2, 3, 4, 5].map((g) => ({
    name: `G${g} · ${GRAVITE_LABELS[g]}`,
    value: stats.byGravite[g] || 0,
    fill: GRAVITE_COLORS[g - 1],
  }));

  const statutChartData = Object.entries(stats.byStatut)
    .map(([key, value]) => ({ name: STATUT_LABELS[key] || key, value, fill: STATUT_COLORS[key] || "#94a3b8" }));

  const declarantChartData = Object.entries(stats.byDeclarant)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const lieuChartData = Object.entries(stats.byLieu)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const demandeurChartData = Object.entries(stats.byDemandeur).map(([name, value]) => ({ name, value }));

  // Répartition par famille (dans l'ordre de la constante)
  const familleChartData = PLAINTE_CATEGORIES
    .map(({ famille, color }) => ({
      name: famille,
      value: stats.byFamille[famille] || 0,
      fill: color,
    }))
    .filter((d) => d.value > 0);

  // Répartition par catégorie — regroupée par famille pour le bar chart
  const categorieChartData = PLAINTE_CATEGORIES.flatMap(({ famille, color, items }) =>
    items
      .filter((cat) => (stats.byCategorie[cat] || 0) > 0)
      .map((cat) => ({
        name: cat,
        value: stats.byCategorie[cat] || 0,
        fill: color,
        famille,
      }))
  ).sort((a, b) => b.value - a.value);

  const statutPlaintesData = Object.entries(stats.byStatutPlaintes).map(([key, value]) => ({
    name: key === "traite" ? "Traité" : key === "en_cours" ? "En cours" : "Nouveau",
    value,
    fill: PLAINTE_STATUT_COLORS[key] || "#94a3b8",
  }));

  // ─── Seed handler ──────────────────────────────────────────────────────────
  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const { feiResult, plaintesResult } = await insertSeedData(user.id);
      if (feiResult.error) {
        toast.error("Erreur FEI : " + feiResult.error.message);
      } else if (plaintesResult.error) {
        toast.error("Erreur Plaintes : " + plaintesResult.error.message);
      } else {
        toast.success("6 FEI et 6 plaintes de démonstration insérées avec succès !");
        fetchData();
      }
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    }
    setSeeding(false);
  };

  const handleExportPdf = () => {
    if (feiData.length === 0) {
      toast.error("Aucune donnée FEI à exporter pour cette période");
      return;
    }
    const pdf = generateStatsPdf(feiData, dateFrom, dateTo);
    pdf.save(`Rapport_FEI_${dateFrom}_${dateTo}.pdf`);
    toast.success("Rapport PDF généré !");
  };

  const isEmpty = feiData.length === 0 && plaintesData.length === 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Statistiques & Analyses</h1>
          <p className="text-muted-foreground text-sm">Tableau de bord qualité · FEI et Plaintes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/gestion-fei">
            <Button variant="outline" size="sm" className="gap-2">
              <ClipboardList className="w-4 h-4" /> Gérer les FEI
            </Button>
          </Link>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding} className="gap-2">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Données démo
            </Button>
          )}
          <Button size="sm" onClick={handleExportPdf} className="gap-2">
            <Download className="w-4 h-4" /> Exporter PDF
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Raccourcis</Label>
              <div className="flex gap-1.5">
                {[currentYear - 1, currentYear].map((y) => (
                  <Button
                    key={y}
                    variant={dateFrom === `${y}-01-01` && dateTo === `${y}-12-31` ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setDateFrom(`${y}-01-01`); setDateTo(`${y}-12-31`); }}
                  >
                    {y}
                  </Button>
                ))}
                <Button
                  variant={dateFrom === `${currentYear - 1}-01-01` && dateTo === `${currentYear}-12-31` ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setDateFrom(`${currentYear - 1}-01-01`); setDateTo(`${currentYear}-12-31`); }}
                >
                  {currentYear - 1}–{currentYear}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from" className="text-xs">Du</Label>
              <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to" className="text-xs">Au</Label>
              <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-sm" />
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isEmpty && !loading ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground space-y-3">
            <BarChart3 className="w-14 h-14 mx-auto opacity-30" />
            <p className="font-medium">Aucune donnée pour cette période</p>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding} className="gap-2 mt-2">
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Insérer des données de démonstration
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              KPI — FEI
          ════════════════════════════════════════════════════════════════════ */}
          <div>
            <SectionTitle icon={FileText} title="Indicateurs FEI" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Total FEI déclarées"
                value={stats.totalFei}
                icon={FileText}
                color="text-primary"
                bg="bg-primary/10"
              />
              <KpiCard
                label="Gravité moyenne"
                value={stats.avgGravite !== "—" ? `${stats.avgGravite}/5` : "—"}
                sub="Sur 5 niveaux"
                icon={AlertTriangle}
                color="text-orange-500"
                bg="bg-orange-500/10"
              />
              <KpiCard
                label="FEI clôturées"
                value={`${stats.tauxCloture}%`}
                sub={`${stats.clotures} sur ${stats.totalFei}`}
                icon={CheckCircle}
                color="text-emerald-500"
                bg="bg-emerald-500/10"
              />
              <KpiCard
                label="FEI critiques (≥4)"
                value={stats.critiques}
                sub={stats.totalFei > 0 ? `${Math.round((stats.critiques / stats.totalFei) * 100)}% du total` : undefined}
                icon={XCircle}
                color="text-destructive"
                bg="bg-destructive/10"
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              KPI — Plaintes
          ════════════════════════════════════════════════════════════════════ */}
          <div>
            <SectionTitle icon={MessageSquareWarning} title="Indicateurs Plaintes & Réclamations" color="text-accent-foreground" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Total plaintes"
                value={stats.totalPlaintes}
                icon={MessageSquareWarning}
                color="text-accent-foreground"
                bg="bg-accent/30"
              />
              <KpiCard
                label="Plaintes en cours"
                value={stats.plaintesEnCours}
                sub="Nouveau + En cours"
                icon={Clock}
                color="text-yellow-600"
                bg="bg-yellow-500/10"
              />
              <KpiCard
                label="Taux de résolution"
                value={`${stats.tauxResolution}%`}
                sub={`${stats.plaintesTraitees} traitées`}
                icon={Shield}
                color="text-emerald-500"
                bg="bg-emerald-500/10"
              />
              <KpiCard
                label="Déclarants actifs"
                value={stats.totalDeclarants}
                sub="FEI + Plaintes"
                icon={Users}
                color="text-blue-500"
                bg="bg-blue-500/10"
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              Évolution mensuelle
          ════════════════════════════════════════════════════════════════════ */}
          {stats.monthlyData.length > 0 && (
            <div>
              <SectionTitle icon={TrendingUp} title="Évolution mensuelle" />
              <Card>
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="font-display text-base">FEI & Plaintes par mois</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={stats.monthlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Line type="monotone" dataKey="FEI" stroke="#c46b48" strokeWidth={2.5} dot={{ r: 4, fill: "#c46b48" }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Plaintes" stroke="#d4956e" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: "#d4956e" }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              Analyse FEI — Charts 2×2
          ════════════════════════════════════════════════════════════════════ */}
          {feiData.length > 0 && (
            <div>
              <SectionTitle icon={BarChart3} title="Analyse détaillée des FEI" />
              <div className="grid gap-5 lg:grid-cols-2">

                {/* Type FEI — Pie */}
                <Card>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="font-display text-base">Répartition par type d'événement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie data={typeChartData} cx="50%" cy="50%" outerRadius={88} dataKey="value" labelLine={false} label={renderPieLabel}>
                            {typeChartData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        {typeChartData.map((d, i) => (
                          <div key={d.name} className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-muted-foreground truncate">{d.name}</span>
                            <span className="ml-auto font-bold text-foreground">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gravité — Bars */}
                <Card>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="font-display text-base">Distribution des niveaux de gravité</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={graviteChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="FEI" radius={[4, 4, 0, 0]}>
                          {graviteChartData.map((d, i) => (
                            <Cell key={i} fill={d.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Statut FEI — Horizontal Bar */}
                <Card>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="font-display text-base">Statut de traitement des FEI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={statutChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="FEI" radius={[0, 4, 4, 0]}>
                          {statutChartData.map((d, i) => (
                            <Cell key={i} fill={d.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {/* Légende statuts */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {statutChartData.map((d) => (
                        <Badge
                          key={d.name}
                          variant="outline"
                          className="text-xs gap-1.5"
                          style={{ borderColor: d.fill, color: d.fill }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.fill }} />
                          {d.name} ({d.value})
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top lieux — Horizontal Bar */}
                <Card>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="font-display text-base">Lieux les plus touchés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lieuChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={lieuChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" name="Incidents" fill="hsl(16, 55%, 52%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Pas de données de lieu</p>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              Top déclarants
          ════════════════════════════════════════════════════════════════════ */}
          {declarantChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Top déclarants (FEI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(150, declarantChartData.length * 38)}>
                  <BarChart data={declarantChartData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Déclarations" fill="hsl(16, 55%, 52%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              Analyse Plaintes
          ════════════════════════════════════════════════════════════════════ */}
          {plaintesData.length > 0 && (
            <div>
              <SectionTitle icon={MessageSquareWarning} title="Analyse des Plaintes & Réclamations" color="text-accent-foreground" />
              <div className="grid gap-5 lg:grid-cols-2">

                {/* Demandeur — Pie */}
                <Card>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="font-display text-base">Plaintes par type de demandeur</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ResponsiveContainer width={190} height={190}>
                        <PieChart>
                          <Pie data={demandeurChartData} cx="50%" cy="50%" outerRadius={82} dataKey="value" labelLine={false} label={renderPieLabel}>
                            {demandeurChartData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1.5">
                        {demandeurChartData.map((d, i) => (
                          <div key={d.name} className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[(i + 2) % PIE_COLORS.length] }} />
                            <span className="text-muted-foreground">{d.name}</span>
                            <span className="ml-auto font-bold text-foreground">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Statut plaintes — Horizontal Bar */}
                <Card>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="font-display text-base">Statut des plaintes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={statutPlaintesData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Plaintes" radius={[0, 4, 4, 0]}>
                          {statutPlaintesData.map((d, i) => (
                            <Cell key={i} fill={d.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {/* Jauge résolution */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Taux de résolution</span>
                        <span className="font-semibold text-foreground">{stats.tauxResolution}%</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${stats.tauxResolution}%`, background: "#22c55e" }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{stats.plaintesTraitees} traitée{stats.plaintesTraitees > 1 ? "s" : ""}</span>
                        <span>{stats.plaintesEnCours} en attente</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* ── Répartition par famille ── */}
              {familleChartData.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <MessageSquareWarning className="w-4 h-4 text-accent-foreground" />
                      Répartition par famille de plainte
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <ResponsiveContainer width={220} height={220}>
                        <PieChart>
                          <Pie
                            data={familleChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={96}
                            innerRadius={40}
                            dataKey="value"
                            labelLine={false}
                            label={renderPieLabel}
                          >
                            {familleChartData.map((d, i) => (
                              <Cell key={i} fill={d.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        {familleChartData.map((d) => (
                          <div key={d.name} className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.fill }} />
                            <span className="text-xs text-muted-foreground flex-1 truncate">{d.name}</span>
                            <span className="text-xs font-bold text-foreground tabular-nums">{d.value}</span>
                            <span className="text-[10px] text-muted-foreground/70 tabular-nums w-8 text-right">
                              {stats.totalPlaintes > 0 ? Math.round((d.value / stats.totalPlaintes) * 100) : 0}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Répartition par catégorie ── */}
              {categorieChartData.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <MessageSquareWarning className="w-4 h-4 text-accent-foreground" />
                      Détail des catégories de plainte
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <div className="flex flex-wrap gap-1.5 px-3 mb-3">
                      {PLAINTE_CATEGORIES.filter((f) => (stats.byFamille[f.famille] || 0) > 0).map((f) => (
                        <span
                          key={f.famille}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                          style={{ background: f.color + "18", color: f.color, border: `1px solid ${f.color}40` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.color }} />
                          {f.famille}
                        </span>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={Math.max(180, categorieChartData.length * 32)}>
                      <BarChart
                        data={categorieChartData}
                        layout="vertical"
                        margin={{ top: 4, right: 40, left: 12, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 11 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg text-xs space-y-0.5">
                                <p className="font-semibold text-foreground">{d.name}</p>
                                <p style={{ color: d.fill }}>{d.famille}</p>
                                <p className="font-bold">{d.value} plainte{d.value > 1 ? "s" : ""}</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="value" name="Plaintes" radius={[0, 4, 4, 0]}>
                          {categorieChartData.map((d, i) => (
                            <Cell key={i} fill={d.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              Actions correctives
          ════════════════════════════════════════════════════════════════════ */}
          {feiData.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Actions correctives renseignées
                  <Badge variant="secondary" className="ml-auto font-normal text-xs">
                    {feiData.filter((f) => f.actions_correctives).length} / {feiData.length} FEI
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {feiData.filter((f) => f.actions_correctives).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucune action corrective renseignée</p>
                ) : (
                  <div className="space-y-3">
                    {feiData.filter((f) => f.actions_correctives).map((f) => (
                      <div key={f.id} className="p-3 rounded-xl bg-secondary/50 border border-border/50">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{f.type_fei}</Badge>
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: GRAVITE_COLORS[f.gravite - 1] + "20", color: GRAVITE_COLORS[f.gravite - 1] }}
                            >
                              G{f.gravite}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(f.date_evenement).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{f.actions_correctives}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default StatsPage;
