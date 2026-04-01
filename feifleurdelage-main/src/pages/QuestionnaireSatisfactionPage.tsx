import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flower2, CheckCircle2, Star, RotateCcw, ChevronRight, ChevronLeft } from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const SERVICES = ["Administration", "Cuisine", "Technique", "Lingerie", "Animation", "Soins/Hôtellerie"];

const REPONDANT_OPTIONS = [
  { value: "resident", label: "Résident(e)" },
  { value: "famille",  label: "Membre de la famille" },
  { value: "visiteur", label: "Visiteur" },
  { value: "autre",    label: "Autre" },
];

const CRITERES = [
  { key: "note_accueil",       label: "Accueil et amabilité du personnel" },
  { key: "note_soins",         label: "Qualité des soins" },
  { key: "note_restauration",  label: "Restauration" },
  { key: "note_proprete",      label: "Propreté et hygiène" },
  { key: "note_communication", label: "Communication et information" },
] as const;

const EMPTY_FORM = {
  repondant: "",
  nom_prenom: "",
  service: "",
  date_sejour: "",
  note_accueil: 0,
  note_soins: 0,
  note_restauration: 0,
  note_proprete: 0,
  note_communication: 0,
  note_globale: 0,
  points_positifs: "",
  points_ameliorer: "",
  suggestions: "",
};

// ─── Star Rating ──────────────────────────────────────────────────────────────

const StarRating = ({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "md" | "lg";
}) => {
  const [hovered, setHovered] = useState(0);
  const sz = size === "lg" ? "w-9 h-9" : "w-7 h-7";
  const active = hovered || value;
  return (
    <div className="flex gap-1.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          className="transition-transform hover:scale-110 active:scale-95"
          aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
        >
          <Star
            className={sz}
            fill={star <= active ? "#FBBF24" : "none"}
            stroke={star <= active ? "#F59E0B" : "#D1D5DB"}
          />
        </button>
      ))}
    </div>
  );
};

const StarDisplay = ({ value }: { value: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className="w-4 h-4"
        fill={star <= value ? "#FBBF24" : "none"}
        stroke={star <= value ? "#F59E0B" : "#D1D5DB"}
      />
    ))}
  </div>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const PageHeader = () => (
  <div className="w-full py-6 px-5 text-center" style={{ background: "linear-gradient(135deg, #c46b48 0%, #d4956e 100%)" }}>
    <div className="flex items-center justify-center gap-2.5 mb-2">
      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
        <Flower2 className="w-5 h-5 text-white" />
      </div>
      <p className="text-white/90 font-semibold text-sm">EHPAD La Fleur de l'Âge</p>
    </div>
    <h1 className="text-xl font-bold text-white leading-tight">Avis — Satisfaction résidents</h1>
    <p className="text-white/75 text-sm mt-1">Votre avis nous aide à améliorer nos services</p>
  </div>
);

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2 justify-center py-4">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="flex items-center gap-2">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i + 1 === current
              ? "bg-[#c46b48] text-white shadow-md scale-110"
              : i + 1 < current
              ? "bg-emerald-500 text-white"
              : "bg-gray-200 text-gray-400"
          }`}
        >
          {i + 1 < current ? "✓" : i + 1}
        </div>
        {i < total - 1 && (
          <div className={`w-8 h-0.5 rounded-full transition-all ${i + 1 < current ? "bg-emerald-500" : "bg-gray-200"}`} />
        )}
      </div>
    ))}
    <span className="text-xs text-gray-500 ml-1">Étape {current}/{total}</span>
  </div>
);

// ─── Component principal ──────────────────────────────────────────────────────

export default function QuestionnaireSatisfactionPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof EMPTY_FORM>(key: K) => (value: (typeof EMPTY_FORM)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canGoNext = () => {
    if (step === 2) {
      return CRITERES.every((c) => form[c.key] > 0);
    }
    if (step === 3) return form.note_globale > 0;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.note_globale) { setError("La note globale est obligatoire."); return; }
    setSubmitting(true);
    setError(null);

    const { error: dbError } = await supabase.from("questionnaire_satisfaction").insert({
      source: "externe",
      repondant: form.repondant || null,
      nom_prenom: form.nom_prenom.trim() || null,
      date_sejour: form.date_sejour || null,
      service: form.service || null,
      note_accueil: form.note_accueil || null,
      note_soins: form.note_soins || null,
      note_restauration: form.note_restauration || null,
      note_proprete: form.note_proprete || null,
      note_communication: form.note_communication || null,
      note_globale: form.note_globale,
      points_positifs: form.points_positifs.trim() || null,
      points_ameliorer: form.points_ameliorer.trim() || null,
      suggestions: form.suggestions.trim() || null,
    });

    if (dbError) {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setStep(1);
    setSubmitted(false);
    setError(null);
  };

  // ── Confirmation screen ─────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <PageHeader />
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-5 max-w-sm"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Merci pour votre retour !</h2>
              <p className="text-gray-500 text-sm mt-2">Votre avis a bien été enregistré. Il nous aidera à améliorer la qualité de nos services.</p>
            </div>
            <Button onClick={reset} variant="outline" className="gap-2 w-full border-[#c46b48] text-[#c46b48] hover:bg-[#c46b48]/5">
              <RotateCcw className="w-4 h-4" />
              Donner un autre avis
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PageHeader />
      <StepIndicator current={step} total={3} />

      <div className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">

            {/* ── Étape 1 — Qui êtes-vous ? ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
                  <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#c46b48]/10 text-[#c46b48] text-xs font-bold flex items-center justify-center">1</span>
                    Qui êtes-vous ?
                  </h2>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Vous êtes</Label>
                    <Select value={form.repondant || "none"} onValueChange={(v) => set("repondant")(v === "none" ? "" : v)}>
                      <SelectTrigger className="h-11 rounded-xl border-gray-200">
                        <SelectValue placeholder="Sélectionner…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non précisé</SelectItem>
                        {REPONDANT_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Nom et prénom <span className="text-gray-400 font-normal">(optionnel)</span>
                    </Label>
                    <Input
                      value={form.nom_prenom}
                      onChange={(e) => set("nom_prenom")(e.target.value)}
                      placeholder="Ex : Marie Dupont"
                      className="h-11 rounded-xl border-gray-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Service concerné <span className="text-gray-400 font-normal">(optionnel)</span>
                    </Label>
                    <Select value={form.service || "none"} onValueChange={(v) => set("service")(v === "none" ? "" : v)}>
                      <SelectTrigger className="h-11 rounded-xl border-gray-200">
                        <SelectValue placeholder="Tous services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non précisé</SelectItem>
                        {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Date de séjour ou de visite <span className="text-gray-400 font-normal">(optionnel)</span>
                    </Label>
                    <Input
                      type="date"
                      value={form.date_sejour}
                      onChange={(e) => set("date_sejour")(e.target.value)}
                      className="h-11 rounded-xl border-gray-200"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full h-12 rounded-xl gap-2 text-base font-semibold"
                  style={{ background: "#c46b48" }}
                >
                  Suivant <ChevronRight className="w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {/* ── Étape 2 — Évaluations par critère ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-6">
                  <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#c46b48]/10 text-[#c46b48] text-xs font-bold flex items-center justify-center">2</span>
                    Vos évaluations
                  </h2>
                  <p className="text-sm text-gray-500 -mt-2">Notez chaque critère de 1 (très insatisfait) à 5 (très satisfait).</p>

                  {CRITERES.map((c) => (
                    <div key={c.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">{c.label}</Label>
                        {form[c.key] > 0 && (
                          <span className="text-xs font-bold text-[#c46b48]">{form[c.key]}/5</span>
                        )}
                      </div>
                      <StarRating
                        value={form[c.key]}
                        onChange={(v) => set(c.key)(v as never)}
                      />
                      {form[c.key] === 0 && (
                        <p className="text-[11px] text-red-400">Requis</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl gap-2">
                    <ChevronLeft className="w-4 h-4" /> Retour
                  </Button>
                  <Button
                    type="button"
                    onClick={() => canGoNext() && setStep(3)}
                    disabled={!canGoNext()}
                    className="flex-1 h-12 rounded-xl gap-2 font-semibold"
                    style={{ background: "#c46b48" }}
                  >
                    Suivant <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Étape 3 — Note globale & commentaires ── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
                  <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#c46b48]/10 text-[#c46b48] text-xs font-bold flex items-center justify-center">3</span>
                    Note globale & commentaires
                  </h2>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Note globale <span className="text-red-500">*</span>
                    </Label>
                    <StarRating value={form.note_globale} onChange={(v) => set("note_globale")(v)} size="lg" />
                    {form.note_globale === 0 && (
                      <p className="text-[11px] text-red-400">La note globale est obligatoire</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Points positifs <span className="text-gray-400 font-normal">(optionnel)</span>
                    </Label>
                    <Textarea
                      value={form.points_positifs}
                      onChange={(e) => set("points_positifs")(e.target.value)}
                      placeholder="Ce qui vous a particulièrement satisfait…"
                      rows={3}
                      className="resize-none rounded-xl border-gray-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Points à améliorer <span className="text-gray-400 font-normal">(optionnel)</span>
                    </Label>
                    <Textarea
                      value={form.points_ameliorer}
                      onChange={(e) => set("points_ameliorer")(e.target.value)}
                      placeholder="Ce qui pourrait être amélioré…"
                      rows={3}
                      className="resize-none rounded-xl border-gray-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Suggestions <span className="text-gray-400 font-normal">(optionnel)</span>
                    </Label>
                    <Textarea
                      value={form.suggestions}
                      onChange={(e) => set("suggestions")(e.target.value)}
                      placeholder="Vos idées et propositions…"
                      rows={3}
                      className="resize-none rounded-xl border-gray-200"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl gap-2">
                    <ChevronLeft className="w-4 h-4" /> Retour
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || form.note_globale === 0}
                    className="flex-1 h-12 rounded-xl gap-2 font-semibold"
                    style={{ background: "#c46b48" }}
                  >
                    {submitting ? "Envoi…" : "Envoyer mon avis"}
                    {!submitting && <CheckCircle2 className="w-5 h-5" />}
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
