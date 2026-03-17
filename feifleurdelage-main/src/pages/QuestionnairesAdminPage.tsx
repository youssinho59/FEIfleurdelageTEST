import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/hooks/useAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Star as StarIcon, QrCode, Printer, Target, Plus, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, TrendingUp, Users, Calendar,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Questionnaire = {
  id: string;
  source: string | null;
  repondant: string | null;
  nom_prenom: string | null;
  date_sejour: string | null;
  service: string | null;
  note_accueil: number | null;
  note_soins: number | null;
  note_restauration: number | null;
  note_proprete: number | null;
  note_communication: number | null;
  note_globale: number | null;
  points_positifs: string | null;
  points_ameliorer: string | null;
  suggestions: string | null;
  action_corrective_id: string | null;
  created_at: string;
};

type ActionRef = { id: string; titre: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const QR_URL = "https://fe-ifleurdelage-test.vercel.app/questionnaire-satisfaction";

const REPONDANT_LABELS: Record<string, string> = {
  resident: "Résident(e)", famille: "Famille", visiteur: "Visiteur", autre: "Autre",
};

const PIE_COLORS = ["#c46b48", "#d4956e", "#e8b896", "#a85636"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg text-xs space-y-0.5">
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name} : <span className="font-bold">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Star display ─────────────────────────────────────────────────────────────

const StarDisplay = ({ value }: { value: number | null }) => {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarIcon
          key={s}
          className="w-3.5 h-3.5"
          fill={s <= value ? "#FBBF24" : "none"}
          stroke={s <= value ? "#F59E0B" : "#D1D5DB"}
        />
      ))}
      <span className="text-xs font-bold ml-1 text-foreground">{value}/5</span>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuestionnairesAdminPage() {
  const { user } = useAuth();
  const agents = useAgents();

  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [actionsCorrectives, setActionsCorrectives] = useState<ActionRef[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterNote, setFilterNote] = useState(""); // "bad" | "medium" | "good"
  const [filterRepondant, setFilterRepondant] = useState("");

  // Expandable rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // QR dialog
  const [qrOpen, setQrOpen] = useState(false);

  // PACQ create dialog
  const [pacqDialogOpen, setPacqDialogOpen] = useState(false);
  const [pacqTargetId, setPacqTargetId] = useState<string | null>(null);
  const [pacqForm, setPacqForm] = useState({ titre: "", description: "", responsable_id: "", date_echeance: "" });
  const [savingPacq, setSavingPacq] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    const [qRes, aRes] = await Promise.all([
      supabase.from("questionnaire_satisfaction").select("*").order("created_at", { ascending: false }),
      supabase.from("actions_correctives").select("id, titre").order("created_at", { ascending: false }),
    ]);
    setQuestionnaires((qRes.data as Questionnaire[]) || []);
    setActionsCorrectives((aRes.data as ActionRef[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const total = questionnaires.length;
    const withNote = questionnaires.filter((q) => q.note_globale !== null);
    const avgGlobal = withNote.length > 0
      ? withNote.reduce((s, q) => s + (q.note_globale ?? 0), 0) / withNote.length
      : 0;
    const tauxSatisfaction = withNote.length > 0
      ? Math.round((withNote.filter((q) => (q.note_globale ?? 0) >= 4).length / withNote.length) * 100)
      : 0;
    const now = new Date();
    const thisMo = questionnaires.filter((q) => {
      const d = new Date(q.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    return { total, avgGlobal, tauxSatisfaction, thisMo };
  }, [questionnaires]);

  // ── Chart data ────────────────────────────────────────────────────────────────

  const critereData = useMemo(() => {
    const criteres = [
      { key: "note_accueil" as const,       label: "Accueil"        },
      { key: "note_soins" as const,          label: "Soins"          },
      { key: "note_restauration" as const,   label: "Restauration"   },
      { key: "note_proprete" as const,       label: "Propreté"       },
      { key: "note_communication" as const,  label: "Communication"  },
    ];
    return criteres.map(({ key, label }) => {
      const vals = questionnaires.map((q) => q[key]).filter((v): v is number => v !== null);
      const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      return { name: label, "Moyenne": parseFloat(avg.toFixed(2)) };
    });
  }, [questionnaires]);

  const repondantData = useMemo(() => {
    const counts: Record<string, number> = {};
    questionnaires.forEach((q) => {
      const r = q.repondant || "autre";
      counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: REPONDANT_LABELS[key] ?? key,
      value,
    }));
  }, [questionnaires]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    questionnaires.forEach((q) => {
      if (!q.note_globale) return;
      const key = q.created_at.slice(0, 7);
      if (!map[key]) map[key] = { sum: 0, count: 0 };
      map[key].sum += q.note_globale;
      map[key].count++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { sum, count }]) => ({
        month: new Date(key + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        "Note moyenne": parseFloat((sum / count).toFixed(2)),
      }));
  }, [questionnaires]);

  // ── Filtered list ─────────────────────────────────────────────────────────────

  const filteredQ = useMemo(() => {
    return questionnaires.filter((q) => {
      if (filterMonth) {
        if (!q.created_at.startsWith(filterMonth)) return false;
      }
      if (filterNote === "bad" && (q.note_globale ?? 0) > 2) return false;
      if (filterNote === "medium" && q.note_globale !== 3) return false;
      if (filterNote === "good" && (q.note_globale ?? 0) < 4) return false;
      if (filterRepondant && q.repondant !== filterRepondant) return false;
      return true;
    });
  }, [questionnaires, filterMonth, filterNote, filterRepondant]);

  // ── PACQ action ───────────────────────────────────────────────────────────────

  const openPacq = (q: Questionnaire) => {
    const dateFmt = q.date_sejour
      ? new Date(q.date_sejour + "T00:00:00").toLocaleDateString("fr-FR")
      : new Date(q.created_at).toLocaleDateString("fr-FR");
    setPacqTargetId(q.id);
    setPacqForm({
      titre: `Insatisfaction — ${q.service ?? "Général"} — ${dateFmt}`,
      description: [q.points_ameliorer, q.suggestions].filter(Boolean).join(" | ") || "",
      responsable_id: "",
      date_echeance: "",
    });
    setPacqDialogOpen(true);
  };

  const handleSavePacq = async () => {
    if (!pacqForm.titre.trim() || !pacqForm.date_echeance || !user) {
      toast.error("Le titre et la date d'échéance sont obligatoires.");
      return;
    }
    setSavingPacq(true);
    const agent = agents.find((a) => a.id === pacqForm.responsable_id);
    const { data: newAct, error } = await supabase
      .from("actions_correctives")
      .insert({
        titre: pacqForm.titre.trim(),
        description: pacqForm.description.trim() || null,
        responsable: agent?.full_name ?? pacqForm.titre,
        responsable_id: pacqForm.responsable_id || null,
        date_echeance: pacqForm.date_echeance,
        priorite: "haute",
        statut: "a_faire",
        user_id: user.id,
      })
      .select("id")
      .single();
    if (error || !newAct) {
      toast.error("Erreur création action PACQ : " + (error?.message ?? "inconnue"));
      setSavingPacq(false);
      return;
    }
    if (pacqTargetId) {
      await supabase.from("questionnaire_satisfaction").update({ action_corrective_id: newAct.id }).eq("id", pacqTargetId);
    }
    toast.success("Action PACQ créée et liée au questionnaire !");
    setPacqDialogOpen(false);
    await fetchAll();
    setSavingPacq(false);
  };

  // ── Print QR ──────────────────────────────────────────────────────────────────

  const handlePrintQr = () => {
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Code Questionnaire</title>
      <style>body{font-family:Arial;text-align:center;padding:40px}h2{color:#c46b48}p{color:#666;font-size:14px}</style>
      </head><body>
      <h2>EHPAD La Fleur de l'Âge</h2>
      <p>Scannez ce QR code pour accéder au questionnaire de satisfaction</p>
      <div id="qr"></div>
      <p style="margin-top:16px;font-size:12px;word-break:break-all">${QR_URL}</p>
      <script>window.onload=function(){window.print();}</script>
      </body></html>
    `);
    win.document.close();
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
            <StarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Questionnaires de satisfaction</h1>
            <p className="text-xs text-muted-foreground">Analyse des retours et suivi de la qualité perçue</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setQrOpen(true)} className="gap-2 shrink-0">
          <QrCode className="w-4 h-4" /> QR Code
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-primary">{kpi.total}</p>
                <p className="text-[11px] text-muted-foreground">Total réponses</p>
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                <StarIcon className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-yellow-600">{kpi.avgGlobal.toFixed(1)}</p>
                <p className="text-[11px] text-muted-foreground">Note moyenne / 5</p>
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-emerald-600">{kpi.tauxSatisfaction}%</p>
                <p className="text-[11px] text-muted-foreground">Taux satisfaction (≥4)</p>
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-blue-500">{kpi.thisMo}</p>
                <p className="text-[11px] text-muted-foreground">Réponses ce mois</p>
              </div>
            </CardContent></Card>
          </div>

          {/* ── Graphiques ── */}
          {questionnaires.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">

              {/* BarChart — Notes par critère */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="font-display text-base">Notes moyennes par critère</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={critereData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Moyenne" fill="#c46b48" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* PieChart — Répondants */}
              {repondantData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="font-display text-base">Répartition par type de répondant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={180} height={180}>
                        <PieChart>
                          <Pie data={repondantData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}
                            label={({ percent }) => percent > 0.07 ? `${(percent * 100).toFixed(0)}%` : ""}>
                            {repondantData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2">
                        {repondantData.map((d, i) => (
                          <div key={d.name} className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-muted-foreground">{d.name}</span>
                            <span className="font-bold ml-1">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* LineChart — Évolution mensuelle */}
              {monthlyData.length > 1 && (
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="font-display text-base">Évolution de la note moyenne globale</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Line type="monotone" dataKey="Note moyenne" stroke="#c46b48" strokeWidth={2.5} dot={{ r: 4, fill: "#c46b48" }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Liste des réponses ── */}
          <div>
            {/* Filtres */}
            <Card className="mb-4">
              <CardContent className="pt-4 pb-3">
                <div className="flex flex-wrap gap-3 items-center">
                  <Input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="h-8 text-xs w-36"
                    placeholder="Mois"
                  />
                  <Select value={filterNote || "all"} onValueChange={(v) => setFilterNote(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue placeholder="Toutes notes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes notes</SelectItem>
                      <SelectItem value="bad">Note ≤ 2 (Insatisfait)</SelectItem>
                      <SelectItem value="medium">Note = 3</SelectItem>
                      <SelectItem value="good">Note ≥ 4 (Satisfait)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterRepondant || "all"} onValueChange={(v) => setFilterRepondant(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue placeholder="Tous répondants" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous répondants</SelectItem>
                      <SelectItem value="resident">Résident(e)</SelectItem>
                      <SelectItem value="famille">Famille</SelectItem>
                      <SelectItem value="visiteur">Visiteur</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  {(filterMonth || filterNote || filterRepondant) && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterMonth(""); setFilterNote(""); setFilterRepondant(""); }}>
                      Réinitialiser
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{filteredQ.length} réponse{filteredQ.length > 1 ? "s" : ""}</span>
                </div>
              </CardContent>
            </Card>

            {filteredQ.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
                Aucune réponse pour ces filtres
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filteredQ.map((q) => {
                  const isInsatisfait = (q.note_globale ?? 0) <= 2;
                  const linkedAction = actionsCorrectives.find((a) => a.id === q.action_corrective_id);
                  const isExpanded = expanded.has(q.id);
                  const repondantLabel = q.repondant ? (REPONDANT_LABELS[q.repondant] ?? q.repondant) : null;
                  return (
                    <Card key={q.id} className={isInsatisfait ? "border-red-200" : ""}>
                      <CardContent className="p-4">
                        {/* Row header */}
                        <div className="flex items-start gap-3 justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              {isInsatisfait && (
                                <Badge className="bg-red-100 text-red-700 border-red-200 text-xs gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Insatisfait
                                </Badge>
                              )}
                              {repondantLabel && <Badge variant="secondary" className="text-xs">{repondantLabel}</Badge>}
                              {q.service && <Badge variant="outline" className="text-xs">{q.service}</Badge>}
                              <span className="text-xs text-muted-foreground">
                                {new Date(q.created_at).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <StarDisplay value={q.note_globale} />
                              {q.nom_prenom && <span className="text-xs text-muted-foreground">{q.nom_prenom}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isInsatisfait && !linkedAction && (
                              <button
                                onClick={() => openPacq(q)}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Action PACQ
                              </button>
                            )}
                            {linkedAction && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                <Target className="w-3 h-3" /> PACQ ✓
                              </span>
                            )}
                            <button
                              onClick={() => toggleExpand(q.id)}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
                            {/* Notes par critère */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[
                                { label: "Accueil", value: q.note_accueil },
                                { label: "Soins", value: q.note_soins },
                                { label: "Restauration", value: q.note_restauration },
                                { label: "Propreté", value: q.note_proprete },
                                { label: "Communication", value: q.note_communication },
                              ].map(({ label, value }) => value !== null && (
                                <div key={label} className="p-2 rounded-lg bg-muted/50">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                                  <StarDisplay value={value} />
                                </div>
                              ))}
                            </div>
                            {q.points_positifs && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">Points positifs</p>
                                <p className="text-xs text-foreground leading-relaxed">{q.points_positifs}</p>
                              </div>
                            )}
                            {q.points_ameliorer && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 mb-1">Points à améliorer</p>
                                <p className="text-xs text-foreground leading-relaxed">{q.points_ameliorer}</p>
                              </div>
                            )}
                            {q.suggestions && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-1">Suggestions</p>
                                <p className="text-xs text-foreground leading-relaxed">{q.suggestions}</p>
                              </div>
                            )}
                            {linkedAction && (
                              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                <Target className="w-3.5 h-3.5 shrink-0" />
                                Action PACQ liée : <span className="font-medium">{linkedAction.titre}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── QR Code Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <QrCode className="w-4 h-4 text-primary" />
              QR Code — Questionnaire de satisfaction
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-xl border border-border shadow-sm">
              <QRCodeSVG value={QR_URL} size={200} level="M" />
            </div>
            <p className="text-xs text-muted-foreground text-center px-4">
              Scannez ce QR code pour accéder au questionnaire de satisfaction en ligne.
            </p>
            <p className="text-[11px] text-primary/80 break-all text-center px-2">{QR_URL}</p>
            <p className="text-xs text-muted-foreground text-center">
              Placez ce QR code à l'accueil, en salle de repos ou à la sortie.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePrintQr} className="gap-2">
              <Printer className="w-4 h-4" /> Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Créer action PACQ ──────────────────────────────────────────── */}
      <Dialog open={pacqDialogOpen} onOpenChange={setPacqDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Target className="w-4 h-4 text-primary" />
              Créer une action PACQ opérationnel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre <span className="text-destructive">*</span></Label>
              <Input value={pacqForm.titre} onChange={(e) => setPacqForm({ ...pacqForm, titre: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={pacqForm.description} onChange={(e) => setPacqForm({ ...pacqForm, description: e.target.value })} rows={3} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Responsable</Label>
                <Select value={pacqForm.responsable_id || "none"} onValueChange={(v) => setPacqForm({ ...pacqForm, responsable_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigné</SelectItem>
                    {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date d'échéance <span className="text-destructive">*</span></Label>
                <Input type="date" value={pacqForm.date_echeance} onChange={(e) => setPacqForm({ ...pacqForm, date_echeance: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Cette action sera créée avec la priorité <strong>Haute</strong>.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPacqDialogOpen(false)} disabled={savingPacq}>Annuler</Button>
            <Button onClick={handleSavePacq} disabled={savingPacq} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingPacq ? "Création…" : "Créer l'action PACQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
