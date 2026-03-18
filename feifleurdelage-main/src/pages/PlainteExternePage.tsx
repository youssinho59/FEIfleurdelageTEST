import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLAINTE_CATEGORIES } from "@/lib/plaintesCategories";
import { Flower2, CheckCircle2, MessageSquareWarning, RotateCcw } from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const QUI_TYPES = ["Résident(e)", "Famille / Proche", "Visiteur", "Personnel", "Autre"];

const SERVICES = [
  "Administration", "Cuisine", "Technique",
  "Lingerie", "Animation", "Soins/Hôtellerie", "Entretien",
];

// UUID sentinelle pour les soumissions anonymes (non lié à un compte utilisateur)
const ANON_USER_ID = "00000000-0000-0000-0000-000000000000";

const EMPTY_FORM = {
  nom_prenom: "",
  contact:    "",
  date:       "",
  qui:        "",
  service:    "",
  objet:      "",
  description: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlainteExternePage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.objet || !form.description.trim()) return;
    setSubmitting(true);
    setError(null);

    // Composition du champ precisions : contact si fourni
    const precisions = form.contact.trim()
      ? `Contact : ${form.contact.trim()}`
      : null;

    const { error: dbError } = await supabase.from("plaintes").insert({
      user_id:      ANON_USER_ID,
      declarant_nom: form.nom_prenom.trim() || "Anonyme",
      demandeur:     form.qui || "Externe",
      date_plainte:  form.date || new Date().toISOString().split("T")[0],
      service:       form.service || null,
      objet:         form.objet,
      precisions,
      description:   form.description.trim(),
      statut:        "nouveau",
      source:        "externe",
    });

    if (dbError) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      console.error(dbError);
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  // ── Écran de confirmation ────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf7f3] to-[#f5ede4] flex flex-col">
        <PageHeader />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center space-y-5"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                Merci pour votre signalement
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Votre plainte a bien été enregistrée. Elle sera traitée dans les
                meilleurs délais par l'équipe de direction de l'établissement.
              </p>
            </div>
            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-xs text-green-800 text-left">
              <p className="font-semibold mb-1">Ce que vous pouvez attendre :</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Accusé de réception sous 48 h (si contact fourni)</li>
                <li>Traitement par le responsable qualité</li>
                <li>Réponse apportée dans les meilleurs délais</li>
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); }}
            >
              <RotateCcw className="w-4 h-4" />
              Soumettre une autre plainte
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Formulaire ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf7f3] to-[#f5ede4]">
      <PageHeader />

      <main className="px-4 py-8 max-w-lg mx-auto space-y-5 pb-16">

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800"
        >
          <p className="font-semibold mb-0.5">Formulaire confidentiel</p>
          <p className="text-xs leading-relaxed text-amber-700">
            Vos réponses sont confidentielles et traitées uniquement par la
            direction de l'établissement. Les champs marqués <span className="font-bold">*</span> sont obligatoires.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Qui vous êtes (optionnel) ── */}
          <FormCard title="Vous êtes…" delay={0.1}>
            <div className="space-y-1.5">
              <Label className="text-sm">Qui êtes-vous ? <Optional /></Label>
              <Select value={form.qui} onValueChange={set("qui")}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {QUI_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Nom et prénom <Optional /></Label>
              <Input
                value={form.nom_prenom}
                onChange={e => set("nom_prenom")(e.target.value)}
                placeholder="Votre nom (optionnel)"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Email ou téléphone <Optional /></Label>
              <Input
                value={form.contact}
                onChange={e => set("contact")(e.target.value)}
                placeholder="Pour être recontacté(e) si vous le souhaitez"
                autoComplete="email"
              />
            </div>
          </FormCard>

          {/* ── L'événement ── */}
          <FormCard title="L'événement" delay={0.15}>
            <div className="space-y-1.5">
              <Label className="text-sm">Date de l'événement <Optional /></Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => set("date")(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Service concerné <Optional /></Label>
              <Select value={form.service} onValueChange={set("service")}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </FormCard>

          {/* ── La plainte ── */}
          <FormCard title="Votre plainte" delay={0.2}>
            <div className="space-y-1.5">
              <Label className="text-sm">
                Motif de la plainte <span className="text-destructive">*</span>
              </Label>
              <Select value={form.objet} onValueChange={set("objet")} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie…" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {PLAINTE_CATEGORIES.map(famille => (
                    <SelectGroup key={famille.famille}>
                      <SelectLabel
                        className="text-[11px] font-bold uppercase tracking-widest px-2 py-1.5"
                        style={{ color: famille.color }}
                      >
                        {famille.famille}
                      </SelectLabel>
                      {famille.items.map(cat => (
                        <SelectItem key={cat} value={cat} className="pl-5">{cat}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                Description détaillée <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={form.description}
                onChange={e => set("description")(e.target.value)}
                placeholder="Décrivez la situation : ce qui s'est passé, le contexte, les personnes concernées…"
                rows={5}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {form.description.length} caractère{form.description.length > 1 ? "s" : ""}
                {form.description.length < 20 && form.description.length > 0 && (
                  <span className="text-orange-500 ml-1">— merci de développer davantage</span>
                )}
              </p>
            </div>
          </FormCard>

          {/* ── Erreur ── */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Soumission ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl gap-2"
              style={{ background: "linear-gradient(135deg, #c46b48, #e07a57)" }}
              disabled={submitting || !form.objet || form.description.trim().length < 5}
            >
              <MessageSquareWarning className="w-5 h-5" />
              {submitting ? "Envoi en cours…" : "Soumettre ma plainte"}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Vos données sont confidentielles et protégées.
            </p>
          </motion.div>

        </form>
      </main>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <header
      className="px-5 py-5 flex flex-col items-center text-center gap-3"
      style={{ background: "linear-gradient(135deg, #c46b48 0%, #d4815f 60%, #e0987a 100%)" }}
    >
      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
        <Flower2 className="w-7 h-7 text-white" />
      </div>
      <div>
        <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
          EHPAD La Fleur de l'Âge
        </p>
        <h1 className="text-white text-xl font-bold leading-tight">
          Déposer une plainte
          <br />
          ou réclamation
        </h1>
        <p className="text-white/70 text-xs mt-1.5">
          Formulaire confidentiel
        </p>
      </div>
    </header>
  );
}

function FormCard({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl bg-white shadow-sm border border-border/50 overflow-hidden"
    >
      <div className="px-5 py-3 bg-muted/30 border-b border-border/50">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </motion.div>
  );
}

function Optional() {
  return (
    <span className="text-muted-foreground font-normal text-xs ml-1">(optionnel)</span>
  );
}
