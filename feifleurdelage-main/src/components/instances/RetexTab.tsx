import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2, ChevronDown, ChevronUp, Sparkles, CheckCircle2, RotateCcw, FileDown,
} from "lucide-react";
import jsPDF from "jspdf";

type RetexFei = {
  id: string;
  date_evenement: string;
  declarant_nom: string;
  description: string;
  type_fei: string;
  lieu: string;
  service: string | null;
  categorie_fei: string;
  actions_correctives: string | null;
};

type RetexData = {
  id?: string;
  fei_id: string;
  causes_immediates: string;
  causes_profondes: string;
  facteurs_contributifs: string;
  enseignements: string;
  actions_preventives: string;
  personnes_impliquees: string;
  date_retex: string;
  finalise: boolean;
};

const defaultRetex = (feiId: string): RetexData => ({
  fei_id: feiId,
  causes_immediates: "",
  causes_profondes: "",
  facteurs_contributifs: "",
  enseignements: "",
  actions_preventives: "",
  personnes_impliquees: "",
  date_retex: "",
  finalise: false,
});

const RetexTab = () => {
  const [feis, setFeis] = useState<RetexFei[]>([]);
  const [retexMap, setRetexMap] = useState<Record<string, RetexData>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [generatingCr, setGeneratingCr] = useState<string | null>(null);
  const [crTexts, setCrTexts] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: feiData } = await supabase
      .from("fei")
      .select("id, date_evenement, declarant_nom, description, type_fei, lieu, service, categorie_fei, actions_correctives")
      .eq("retex", true)
      .order("date_evenement", { ascending: false });

    const feiList = (feiData || []) as RetexFei[];
    setFeis(feiList);

    if (feiList.length > 0) {
      const ids = feiList.map((f) => f.id);
      const { data: retexData } = await supabase
        .from("fei_retex")
        .select("*")
        .in("fei_id", ids);

      const map: Record<string, RetexData> = {};
      feiList.forEach((f) => {
        const existing = (retexData || []).find(
          (r: Record<string, unknown>) => r.fei_id === f.id
        );
        if (existing) {
          map[f.id] = {
            id: existing.id as string,
            fei_id: f.id,
            causes_immediates: (existing.causes_immediates as string) || "",
            causes_profondes: (existing.causes_profondes as string) || "",
            facteurs_contributifs: (existing.facteurs_contributifs as string) || "",
            enseignements: (existing.enseignements as string) || "",
            actions_preventives: (existing.actions_preventives as string) || "",
            personnes_impliquees: (existing.personnes_impliquees as string) || "",
            date_retex: (existing.date_retex as string) || "",
            finalise: (existing.finalise as boolean) || false,
          };
        } else {
          map[f.id] = defaultRetex(f.id);
        }
      });
      setRetexMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateRetex = (feiId: string, key: keyof RetexData, value: string | boolean) => {
    setRetexMap((prev) => ({
      ...prev,
      [feiId]: { ...prev[feiId], [key]: value },
    }));
  };

  const handleSave = async (feiId: string) => {
    const data = retexMap[feiId];
    if (!data) return;
    setSaving(feiId);

    const payload = {
      fei_id: data.fei_id,
      causes_immediates: data.causes_immediates || null,
      causes_profondes: data.causes_profondes || null,
      facteurs_contributifs: data.facteurs_contributifs || null,
      enseignements: data.enseignements || null,
      actions_preventives: data.actions_preventives || null,
      personnes_impliquees: data.personnes_impliquees || null,
      date_retex: data.date_retex || null,
      finalise: data.finalise,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (data.id) {
      ({ error } = await supabase.from("fei_retex").update(payload).eq("id", data.id));
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("fei_retex")
        .insert(payload)
        .select()
        .single();
      error = insertError;
      if (inserted) {
        setRetexMap((prev) => ({
          ...prev,
          [feiId]: { ...prev[feiId], id: (inserted as { id: string }).id },
        }));
      }
    }

    if (error) toast.error("Erreur : " + error.message);
    else toast.success("RETEX enregistré");
    setSaving(null);
  };

  const handleGenerateCr = async (fei: RetexFei) => {
    const data = retexMap[fei.id];
    if (!data) return;
    setGeneratingCr(fei.id);
    try {
      const { data: result, error } = await supabase.functions.invoke("suggest-actions", {
        body: {
          context_type: "retex",
          data: {
            type_fei: fei.type_fei,
            description: fei.description,
            lieu: fei.lieu,
            date_evenement: fei.date_evenement,
            actions_correctives: fei.actions_correctives,
            causes_immediates: data.causes_immediates,
            causes_profondes: data.causes_profondes,
            facteurs_contributifs: data.facteurs_contributifs,
            enseignements: data.enseignements,
            actions_preventives: data.actions_preventives,
            personnes_impliquees: data.personnes_impliquees,
          },
        },
      });
      if (error) throw new Error(error.message);
      const text =
        result?.compte_rendu ||
        (result?.actions as Array<{ titre: string; description: string }>)
          ?.map((a) => `${a.titre}\n${a.description}`)
          .join("\n\n") ||
        "Aucun contenu généré. Vérifiez que les champs du RETEX sont bien remplis.";
      setCrTexts((prev) => ({ ...prev, [fei.id]: text }));
    } catch (err: unknown) {
      toast.error("Erreur IA : " + (err instanceof Error ? err.message : "Erreur inconnue"));
    } finally {
      setGeneratingCr(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (feis.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
        <RotateCcw className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-base font-medium">Aucune FEI marquée pour RETEX</p>
        <p className="text-sm mt-1 opacity-70">
          Dans la gestion des FEI, cochez{" "}
          <span className="font-medium">"Faire l'objet d'un RETEX"</span> sur les fiches concernées.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-700 flex items-start gap-2.5">
        <RotateCcw className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
        <p>
          Le <strong>RETEX (Retour d'EXpérience)</strong> permet d'analyser en profondeur les
          événements indésirables pour en tirer des enseignements et améliorer les pratiques.{" "}
          {feis.length} FEI{feis.length > 1 ? " sont" : " est"} marquée{feis.length > 1 ? "s" : ""} pour RETEX.
        </p>
      </div>

      {feis.map((fei) => {
        const retex = retexMap[fei.id] || defaultRetex(fei.id);
        const isExpanded = expanded === fei.id;
        const isSaving = saving === fei.id;
        const isGenerating = generatingCr === fei.id;
        const cr = crTexts[fei.id];

        return (
          <div
            key={fei.id}
            className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-all ${
              retex.finalise
                ? "border-emerald-200 bg-emerald-50/20"
                : "border-border"
            }`}
          >
            {/* En-tête cliquable */}
            <button
              className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors text-left"
              onClick={() => setExpanded(isExpanded ? null : fei.id)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    retex.finalise ? "bg-emerald-100" : "bg-amber-100"
                  }`}
                >
                  <RotateCcw
                    className={`w-4 h-4 ${retex.finalise ? "text-emerald-600" : "text-amber-600"}`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold">{fei.type_fei}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(fei.date_evenement + "T00:00:00").toLocaleDateString("fr-FR")} — {fei.lieu}
                    </span>
                    {fei.service && (
                      <span className="text-xs text-muted-foreground">· {fei.service}</span>
                    )}
                    {retex.finalise && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> RETEX finalisé
                      </span>
                    )}
                    {retex.date_retex && (
                      <span className="text-xs text-muted-foreground">
                        · {new Date(retex.date_retex + "T00:00:00").toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{fei.description}</p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {/* Formulaire RETEX */}
            {isExpanded && (
              <div className="border-t border-border px-5 py-5 space-y-5">

                {/* Faits — rappel de l'événement */}
                <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Faits — Rappel de l'événement
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Déclarant :</span> {fei.declarant_nom}
                  </p>
                  <p className="text-sm leading-relaxed">{fei.description}</p>
                  {fei.actions_correctives && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Actions correctives initiales :</span>{" "}
                      {fei.actions_correctives}
                    </p>
                  )}
                </div>

                {/* Grille 2 colonnes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Causes immédiates
                    </Label>
                    <Textarea
                      value={retex.causes_immediates}
                      onChange={(e) => updateRetex(fei.id, "causes_immediates", e.target.value)}
                      placeholder="Qu'est-ce qui s'est passé directement ?"
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Causes profondes (5 pourquoi / Ishikawa)
                    </Label>
                    <Textarea
                      value={retex.causes_profondes}
                      onChange={(e) => updateRetex(fei.id, "causes_profondes", e.target.value)}
                      placeholder="Pourquoi est-ce arrivé ? Remontez la chaîne causale..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Facteurs contributifs
                    </Label>
                    <Textarea
                      value={retex.facteurs_contributifs}
                      onChange={(e) => updateRetex(fei.id, "facteurs_contributifs", e.target.value)}
                      placeholder="Conditions, environnement, facteurs organisationnels..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Enseignements tirés
                    </Label>
                    <Textarea
                      value={retex.enseignements}
                      onChange={(e) => updateRetex(fei.id, "enseignements", e.target.value)}
                      placeholder="Ce que cet événement nous apprend..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions préventives
                    </Label>
                    <Textarea
                      value={retex.actions_preventives}
                      onChange={(e) => updateRetex(fei.id, "actions_preventives", e.target.value)}
                      placeholder="Pour éviter la récurrence de cet événement..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Personnes impliquées dans le RETEX
                    </Label>
                    <Textarea
                      value={retex.personnes_impliquees}
                      onChange={(e) => updateRetex(fei.id, "personnes_impliquees", e.target.value)}
                      placeholder="Noms et fonctions des participants à l'analyse..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Date + Validation */}
                <div className="flex flex-wrap items-end gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Date du RETEX
                    </Label>
                    <Input
                      type="date"
                      value={retex.date_retex}
                      onChange={(e) => updateRetex(fei.id, "date_retex", e.target.value)}
                      className="h-8 text-sm w-44"
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-0.5">
                    <Checkbox
                      id={`finalise-${fei.id}`}
                      checked={retex.finalise}
                      onCheckedChange={(v) => updateRetex(fei.id, "finalise", !!v)}
                    />
                    <label
                      htmlFor={`finalise-${fei.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      RETEX finalisé
                    </label>
                  </div>
                </div>

                {/* Compte-rendu IA */}
                {cr !== undefined && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Compte-rendu généré par l'IA
                      <span className="text-muted-foreground font-normal">(modifiable)</span>
                    </p>
                    <Textarea
                      value={cr}
                      onChange={(e) => setCrTexts(prev => ({ ...prev, [fei.id]: e.target.value }))}
                      rows={12}
                      className="text-xs leading-relaxed resize-y font-mono bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                        const margin = 18;
                        const maxW = 174;
                        const lineH = 5.5;
                        let y = 28;
                        // En-tête
                        doc.setFillColor(196, 107, 72);
                        doc.rect(0, 0, 210, 20, "F");
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(12);
                        doc.setFont("helvetica", "bold");
                        doc.text("Compte-rendu RETEX", margin, 10);
                        doc.setFontSize(9);
                        doc.setFont("helvetica", "normal");
                        doc.text(`${fei.type_fei} — ${new Date(fei.date_evenement + "T00:00:00").toLocaleDateString("fr-FR")}`, margin, 16);
                        doc.setTextColor(30, 30, 30);
                        // Corps
                        doc.setFontSize(9.5);
                        const lines = doc.splitTextToSize(cr, maxW);
                        lines.forEach((line: string) => {
                          if (y > 272) { doc.addPage(); y = margin; }
                          doc.text(line, margin, y);
                          y += lineH;
                        });
                        // Pied de page
                        doc.setFontSize(8);
                        doc.setTextColor(160, 150, 140);
                        doc.text(`EHPAD La Fleur de l'Âge — Document généré le ${new Date().toLocaleDateString("fr-FR")}`, margin, 287);
                        doc.save(`RETEX_${fei.type_fei.replace(/\s+/g, "_")}_${fei.date_evenement}.pdf`);
                      }}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Télécharger en PDF
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                  <Button
                    size="sm"
                    onClick={() => handleSave(fei.id)}
                    disabled={isSaving}
                    className="gap-1.5"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {isSaving ? "Enregistrement..." : "Enregistrer le RETEX"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateCr(fei)}
                    disabled={isGenerating}
                    className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isGenerating ? "Génération en cours..." : "Générer le compte-rendu IA"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RetexTab;
