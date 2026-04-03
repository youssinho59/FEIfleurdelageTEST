import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Plus, Sparkles, FileDown, Trash2, Pencil, Loader2,
  AlertTriangle, ShieldAlert, Target, CheckCircle2, Zap,
} from "lucide-react";
import { generateCartographiePdf } from "@/lib/pdfGenerator";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Maltraitances",
  "Chutes des résidents",
  "Locaux et équipements",
  "Risques infectieux",
  "Circuit du médicament",
  "Ressources humaines",
  "Risques financiers",
  "Cybersécurité / RGPD",
  "Sécurité du bâtiment",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Risque = {
  id: string;
  categorie: string;
  intitule_risque: string;
  descriptif: string | null;
  facteurs_favorisants: string | null;
  mesures_en_place: string | null;
  probabilite: number;
  gravite: number;
  criticite_brute: number;
  niveau_maitrise: number;
  criticite_residuelle: number;
  proposition_amelioration: string | null;
  date_evaluation: string;
  created_at: string;
  created_by: string | null;
};

type FormData = {
  intitule_risque: string;
  descriptif: string;
  facteurs_favorisants: string;
  mesures_en_place: string;
  probabilite: number;
  gravite: number;
  niveau_maitrise: number;
  proposition_amelioration: string;
};

type AISuggestion = {
  intitule: string;
  descriptif: string;
  facteurs_favorisants: string;
  mesures_en_place: string;
  probabilite: number;
  gravite: number;
  niveau_maitrise: number;
  proposition_amelioration: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCriticiteColor(cr: number): "green" | "orange" | "red" {
  if (cr <= 24) return "green";
  if (cr <= 74) return "orange";
  return "red";
}

function getCriticiteBadge(cr: number) {
  const color = getCriticiteColor(cr);
  const label = color === "green" ? "Maîtrisé" : color === "orange" ? "Modéré" : "Critique";
  const classes =
    color === "green"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : color === "orange"
      ? "bg-orange-100 text-orange-800 border-orange-200"
      : "bg-red-100 text-red-800 border-red-200";
  return { label, classes };
}

function getCriticiteDotColor(cr: number) {
  if (cr <= 24) return "#10b981";
  if (cr <= 74) return "#f97316";
  return "#ef4444";
}

const EMPTY_FORM: FormData = {
  intitule_risque: "",
  descriptif: "",
  facteurs_favorisants: "",
  mesures_en_place: "",
  probabilite: 3,
  gravite: 3,
  niveau_maitrise: 3,
  proposition_amelioration: "",
};

// ─── 5×5 Matrix component ─────────────────────────────────────────────────────

function RisqueMatrix({ risques }: { risques: Risque[] }) {
  // Cell background based on probabilite * gravite (criticite brute)
  function cellBg(p: number, g: number) {
    const score = p * g;
    if (score <= 4) return "bg-emerald-50 border-emerald-100";
    if (score <= 9) return "bg-yellow-50 border-yellow-100";
    if (score <= 15) return "bg-orange-50 border-orange-100";
    return "bg-red-50 border-red-100";
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        Matrice des risques (Probabilité × Gravité)
      </h3>
      <div className="flex gap-2">
        {/* Y-axis label */}
        <div className="flex flex-col justify-center items-center w-6">
          <span
            className="text-[10px] text-muted-foreground font-semibold tracking-widest"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            GRAVITÉ →
          </span>
        </div>
        <div className="flex-1">
          {/* Matrix grid: rows = gravite 5→1, cols = probabilite 1→5 */}
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
            {[5, 4, 3, 2, 1].map((g) =>
              [1, 2, 3, 4, 5].map((p) => {
                const cellRisques = risques.filter(
                  (r) => r.probabilite === p && r.gravite === g
                );
                return (
                  <TooltipProvider key={`${g}-${p}`}>
                    <div
                      className={`relative border rounded aspect-square flex flex-wrap items-center justify-center gap-0.5 p-1 min-h-[52px] ${cellBg(p, g)}`}
                    >
                      <span className="absolute top-0.5 left-1 text-[9px] text-muted-foreground/40 font-mono leading-none">
                        {p}×{g}
                      </span>
                      {cellRisques.map((r) => (
                        <Tooltip key={r.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="w-3 h-3 rounded-full cursor-pointer border-2 border-white shadow-sm hover:scale-125 transition-transform"
                              style={{ backgroundColor: getCriticiteDotColor(r.criticite_residuelle) }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px]">
                            <p className="font-semibold text-xs">{r.intitule_risque}</p>
                            <p className="text-xs text-muted-foreground">
                              CR résiduelle : {r.criticite_residuelle} (maîtrise {r.niveau_maitrise}/5)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                );
              })
            )}
          </div>
          {/* X-axis */}
          <div
            className="grid mt-1 gap-1"
            style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
          >
            {[1, 2, 3, 4, 5].map((p) => (
              <div key={p} className="text-center text-[10px] text-muted-foreground">
                {p}
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] text-muted-foreground font-semibold tracking-widest mt-0.5">
            PROBABILITÉ →
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {[
          { color: "#10b981", label: "Maîtrisé (CR ≤ 24)" },
          { color: "#f97316", label: "Modéré (CR 25-74)" },
          { color: "#ef4444", label: "Critique (CR ≥ 75)" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Risque card ──────────────────────────────────────────────────────────────

function RisqueCard({
  risque,
  onEdit,
  onDelete,
  onCreatePacq,
  creatingPacq,
}: {
  risque: Risque;
  onEdit: () => void;
  onDelete: () => void;
  onCreatePacq: () => void;
  creatingPacq: boolean;
}) {
  const { label, classes } = getCriticiteBadge(risque.criticite_residuelle);
  const showPacqBtn = risque.criticite_residuelle >= 25;
  const sousCategorie = risque.categorie.toLowerCase().startsWith("maltraitance") && risque.categorie.includes(" - ")
    ? risque.categorie.replace(/^[^-]+-\s*/i, "").trim()
    : null;

  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {sousCategorie && (
            <span className="inline-block text-[10px] font-semibold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full mb-1">
              {sousCategorie}
            </span>
          )}
          <h4 className="font-semibold text-sm leading-tight">{risque.intitule_risque}</h4>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${classes}`}>
            {label}
          </Badge>
          <button onClick={onEdit} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {risque.descriptif && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{risque.descriptif}</p>
      )}

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
        <span>P: <strong>{risque.probabilite}/5</strong></span>
        <span>G: <strong>{risque.gravite}/5</strong></span>
        <span>M: <strong>{risque.niveau_maitrise}/5</strong></span>
        <span className="ml-auto">CR brute: <strong>{risque.criticite_brute}</strong></span>
        <span>CR résid.: <strong>{risque.criticite_residuelle}</strong></span>
      </div>

      {showPacqBtn && (
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-1 h-7 text-xs gap-1"
          onClick={onCreatePacq}
          disabled={creatingPacq}
        >
          {creatingPacq ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Target className="w-3 h-3" />
          )}
          Créer action dans le PACQ
        </Button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CartographieRisquesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
  const [risques, setRisques] = useState<Risque[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [creatingPacq, setCreatingPacq] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [maltraitanceSousCategorie, setMaltraitanceSousCategorie] = useState("toutes");

  // ── Computed values ──────────────────────────────────────────────────────

  const criticiteBrute = formData.probabilite * formData.gravite;
  const criticiteResiduelle = formData.probabilite * formData.gravite * formData.niveau_maitrise;
  const { label: badgeLabel, classes: badgeClasses } = getCriticiteBadge(criticiteResiduelle);

  // Toutes les sous-catégories distinctes Maltraitance - *
  const maltraitanceSousCategories = [...new Set(
    risques
      .filter(r => r.categorie.toLowerCase().startsWith("maltraitance"))
      .map(r => r.categorie)
  )].sort();

  // Filtre onglet : Maltraitances inclut tout ce qui commence par "maltraitance"
  const tabRisques = activeTab === "Maltraitances"
    ? risques.filter(r => r.categorie.toLowerCase().startsWith("maltraitance"))
    : risques.filter(r => r.categorie === activeTab);

  // ── Fetch ────────────────────────────────────────────────────────────────

  async function fetchRisques() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cartographie_risques")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erreur lors du chargement des risques");
    } else {
      setRisques((data as Risque[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRisques();
  }, []);

  // ── Modal open/close ─────────────────────────────────────────────────────

  function openNew() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setAiSuggestions([]);
    setShowAISuggestions(false);
    setShowModal(true);
  }

  function openEdit(r: Risque) {
    setEditingId(r.id);
    setFormData({
      intitule_risque: r.intitule_risque,
      descriptif: r.descriptif ?? "",
      facteurs_favorisants: r.facteurs_favorisants ?? "",
      mesures_en_place: r.mesures_en_place ?? "",
      probabilite: r.probabilite,
      gravite: r.gravite,
      niveau_maitrise: r.niveau_maitrise,
      proposition_amelioration: r.proposition_amelioration ?? "",
    });
    setAiSuggestions([]);
    setShowAISuggestions(false);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setAiSuggestions([]);
    setShowAISuggestions(false);
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function saveRisque() {
    if (!formData.intitule_risque.trim()) {
      toast.error("L'intitulé du risque est requis");
      return;
    }
    if (!formData.probabilite || !formData.gravite || !formData.niveau_maitrise) {
      toast.error("Les scores Probabilité, Gravité et Maîtrise sont requis");
      return;
    }
    setSaving(true);
    const payload = {
      categorie: activeTab,
      intitule_risque: formData.intitule_risque.trim(),
      descriptif: formData.descriptif || null,
      facteurs_favorisants: formData.facteurs_favorisants || null,
      mesures_en_place: formData.mesures_en_place || null,
      probabilite: formData.probabilite,
      gravite: formData.gravite,
      niveau_maitrise: formData.niveau_maitrise,
      proposition_amelioration: formData.proposition_amelioration || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("cartographie_risques")
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase
        .from("cartographie_risques")
        .insert({ ...payload, created_by: user?.id ?? null }));
    }

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success(editingId ? "Risque mis à jour" : "Risque ajouté");
      closeModal();
      fetchRisques();
    }
    setSaving(false);
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async function deleteRisque(id: string) {
    if (!confirm("Supprimer ce risque ?")) return;
    const { error } = await supabase.from("cartographie_risques").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Risque supprimé");
      setRisques((prev) => prev.filter((r) => r.id !== id));
    }
  }

  // ── AI Suggestions ───────────────────────────────────────────────────────

  async function getAISuggestions() {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-actions", {
        body: {
          context_type: "cartographie_risque",
          data: { categorie: activeTab, etablissement_type: "EHPAD" },
        },
      });
      if (error) throw new Error(error.message);
      const suggestions: AISuggestion[] = data?.risques ?? [];
      if (suggestions.length === 0) throw new Error("Aucune suggestion reçue");
      setAiSuggestions(suggestions);
      setShowAISuggestions(true);
    } catch (err) {
      toast.error("Erreur IA : " + (err instanceof Error ? err.message : "Erreur inconnue"));
    }
    setAiLoading(false);
  }

  function applyAISuggestion(s: AISuggestion) {
    setFormData({
      intitule_risque: s.intitule,
      descriptif: s.descriptif,
      facteurs_favorisants: s.facteurs_favorisants,
      mesures_en_place: s.mesures_en_place,
      probabilite: Math.min(5, Math.max(1, s.probabilite)),
      gravite: Math.min(5, Math.max(1, s.gravite)),
      niveau_maitrise: Math.min(5, Math.max(1, s.niveau_maitrise)),
      proposition_amelioration: s.proposition_amelioration,
    });
    setShowAISuggestions(false);
  }

  // ── Create PACQ Action ───────────────────────────────────────────────────

  async function createPacqAction(r: Risque) {
    setCreatingPacq(r.id);
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 90);
    const { error } = await supabase.from("actions_correctives").insert({
      titre: r.intitule_risque,
      description: r.proposition_amelioration || r.descriptif || "",
      responsable: "À définir",
      date_echeance: echeance.toISOString().split("T")[0],
      priorite: r.criticite_residuelle >= 75 ? "haute" : "moyenne",
      statut: "a_faire",
      source: "Cartographie des risques",
      user_id: user?.id,
    });
    if (error) {
      toast.error("Erreur lors de la création de l'action PACQ");
    } else {
      toast.success("Action créée dans le PACQ Opérationnel");
    }
    setCreatingPacq(null);
  }

  // ── PDF Export ───────────────────────────────────────────────────────────

  async function exportPdf() {
    setExportingPdf(true);
    try {
      generateCartographiePdf(risques, CATEGORIES);
    } catch (err) {
      toast.error("Erreur lors de la génération du PDF");
    }
    setExportingPdf(false);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Cartographie des risques
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Identification, évaluation et maîtrise des risques de l'établissement
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportPdf}
          disabled={exportingPdf || risques.length === 0}
          className="gap-1.5"
        >
          {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Exporter PDF
        </Button>
      </div>

      {/* Tabs by category */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {CATEGORIES.map((cat) => {
            const count = cat === "Maltraitances"
              ? risques.filter(r => r.categorie.toLowerCase().startsWith("maltraitance")).length
              : risques.filter(r => r.categorie === cat).length;
            return (
              <TabsTrigger key={cat} value={cat} className="text-xs px-3 py-1.5 gap-1.5">
                {cat}
                {count > 0 && (
                  <span className="bg-primary/10 text-primary text-[10px] px-1 rounded-full font-semibold">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIES.map((cat) => {
          const catRisques = cat === "Maltraitances"
            ? risques.filter(r => r.categorie.toLowerCase().startsWith("maltraitance"))
            : risques.filter(r => r.categorie === cat);
          const displayRisques = cat === "Maltraitances" && maltraitanceSousCategorie !== "toutes"
            ? catRisques.filter(r => r.categorie === maltraitanceSousCategorie)
            : catRisques;
          return (
            <TabsContent key={cat} value={cat} className="mt-4 space-y-4">
              {/* Filtre sous-catégorie Maltraitances */}
              {cat === "Maltraitances" && maltraitanceSousCategories.length > 1 && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0">Sous-thème :</Label>
                  <Select value={maltraitanceSousCategorie} onValueChange={setMaltraitanceSousCategorie}>
                    <SelectTrigger className="h-8 text-xs w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="toutes">Tous les sous-thèmes ({catRisques.length})</SelectItem>
                      {maltraitanceSousCategories.map(sc => (
                        <SelectItem key={sc} value={sc}>
                          {sc.replace(/^[^-]+-\s*/i, "").trim()} ({catRisques.filter(r => r.categorie === sc).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Add button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {displayRisques.length === 0
                    ? "Aucun risque enregistré pour cette catégorie"
                    : `${displayRisques.length} risque${displayRisques.length > 1 ? "s" : ""} enregistré${displayRisques.length > 1 ? "s" : ""}`}
                </p>
                <Button size="sm" onClick={openNew} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Nouveau risque
                </Button>
              </div>

              {/* Risk cards */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : displayRisques.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center">
                  <ShieldAlert className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Cliquez sur "+ Nouveau risque" pour commencer
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayRisques.map((r) => (
                    <RisqueCard
                      key={r.id}
                      risque={r}
                      onEdit={() => openEdit(r)}
                      onDelete={() => deleteRisque(r.id)}
                      onCreatePacq={() => createPacqAction(r)}
                      creatingPacq={creatingPacq === r.id}
                    />
                  ))}
                </div>
              )}

              {/* Matrix */}
              {displayRisques.length > 0 && <RisqueMatrix risques={displayRisques} />}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              {editingId ? "Modifier le risque" : "Nouveau risque"} — {activeTab}
            </DialogTitle>
          </DialogHeader>

          {/* AI Button */}
          {!editingId && (
            <div className="border border-dashed rounded-lg p-3 bg-muted/30">
              {showAISuggestions ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Suggestions IA — Sélectionnez un risque à charger
                    </p>
                    <button
                      onClick={() => setShowAISuggestions(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {aiSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => applyAISuggestion(s)}
                        className="w-full text-left border rounded-md p-2.5 bg-card hover:bg-primary/5 hover:border-primary/40 transition-colors"
                      >
                        <p className="text-sm font-semibold leading-tight">{s.intitule}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {s.descriptif}
                        </p>
                        <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>P:{s.probabilite}</span>
                          <span>G:{s.gravite}</span>
                          <span>M:{s.niveau_maitrise}</span>
                          <span className="ml-auto">CR résid. {s.probabilite * s.gravite * s.niveau_maitrise}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Laissez l'IA suggérer des risques typiques pour "{activeTab}"
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={getAISuggestions}
                    disabled={aiLoading}
                    className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Compléter avec l'IA
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="intitule">Intitulé du risque *</Label>
              <Input
                id="intitule"
                value={formData.intitule_risque}
                onChange={(e) => setFormData((p) => ({ ...p, intitule_risque: e.target.value }))}
                placeholder="Ex. : Chute lors du transfert lit-fauteuil"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="descriptif">Descriptif</Label>
              <Textarea
                id="descriptif"
                value={formData.descriptif}
                onChange={(e) => setFormData((p) => ({ ...p, descriptif: e.target.value }))}
                rows={2}
                className="mt-1 resize-none"
                placeholder="Description du risque..."
              />
            </div>

            <div>
              <Label htmlFor="facteurs">Facteurs favorisants</Label>
              <Textarea
                id="facteurs"
                value={formData.facteurs_favorisants}
                onChange={(e) => setFormData((p) => ({ ...p, facteurs_favorisants: e.target.value }))}
                rows={2}
                className="mt-1 resize-none"
                placeholder="Facteurs qui contribuent à ce risque..."
              />
            </div>

            <div>
              <Label htmlFor="mesures">Mesures en place</Label>
              <Textarea
                id="mesures"
                value={formData.mesures_en_place}
                onChange={(e) => setFormData((p) => ({ ...p, mesures_en_place: e.target.value }))}
                rows={2}
                className="mt-1 resize-none"
                placeholder="Mesures de prévention déjà mises en œuvre..."
              />
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-3 gap-4">
              {(
                [
                  { key: "probabilite", label: "Probabilité", color: "text-blue-600" },
                  { key: "gravite", label: "Gravité", color: "text-orange-600" },
                  { key: "niveau_maitrise", label: "Maîtrise", color: "text-emerald-600" },
                ] as const
              ).map(({ key, label, color }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{label}</Label>
                    <span className={`text-lg font-bold ${color}`}>{formData[key]}</span>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[formData[key]]}
                    onValueChange={([v]) => setFormData((p) => ({ ...p, [key]: v }))}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1</span>
                    <span>5</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Criticité badge live */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className="text-muted-foreground">
                  Criticité brute : <strong>{criticiteBrute}</strong>
                </span>
                <span className="text-muted-foreground">
                  Criticité résiduelle : <strong>{criticiteResiduelle}</strong>
                </span>
                <Badge variant="outline" className={`${badgeClasses} text-xs`}>
                  {badgeLabel}
                </Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="amelioration">Proposition d'amélioration</Label>
              <Textarea
                id="amelioration"
                value={formData.proposition_amelioration}
                onChange={(e) => setFormData((p) => ({ ...p, proposition_amelioration: e.target.value }))}
                rows={2}
                className="mt-1 resize-none"
                placeholder="Actions correctives ou préventives à envisager..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={saveRisque} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
