import { useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { generateFeiPdf } from "@/lib/pdfGenerator";
import { FileText, Save, MapPin, AlertTriangle, Calendar, ClipboardList, Shield, ChevronRight, ChevronLeft, Check, Info } from "lucide-react";

const FEI_TYPES = ["Chute", "Erreur médicamenteuse", "Fugue", "Agressivité", "Maltraitance", "Infection", "Autre"];

const GRAVITE_CONFIG = [
  { level: 1, label: "Mineure", description: "Aucune conséquence significative", color: "border-emerald-400 bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  { level: 2, label: "Modérée", description: "Conséquences légères et réversibles", color: "border-yellow-400 bg-yellow-50 text-yellow-700", dot: "bg-yellow-400" },
  { level: 3, label: "Importante", description: "Conséquences notables nécessitant suivi", color: "border-orange-400 bg-orange-50 text-orange-700", dot: "bg-orange-400" },
  { level: 4, label: "Grave", description: "Conséquences sérieuses sur la santé", color: "border-red-400 bg-red-50 text-red-700", dot: "bg-red-400" },
  { level: 5, label: "Critique", description: "Mise en danger immédiate de la vie", color: "border-red-700 bg-red-100 text-red-800", dot: "bg-red-700" },
];

const STEPS = [
  { id: 1, label: "Identification", icon: Calendar },
  { id: 2, label: "Localisation & Gravité", icon: MapPin },
  { id: 3, label: "Description", icon: ClipboardList },
  { id: 4, label: "Actions", icon: Shield },
];

const FeiFormPage = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    date_evenement: new Date().toISOString().split("T")[0],
    lieu: "",
    description: "",
    gravite: 0,
    type_fei: "",
    actions_correctives: "",
  });

  const canNext = () => {
    if (step === 1) return form.date_evenement && form.type_fei;
    if (step === 2) return form.lieu && form.gravite > 0;
    if (step === 3) return form.description.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    const feiData = { ...form, user_id: user.id, declarant_nom: profile?.full_name || user.email || "Inconnu" };
    const { data, error } = await supabase.from("fei").insert(feiData).select().single();
    if (error) { toast.error("Erreur : " + error.message); setLoading(false); return; }

    const pdf = generateFeiPdf(data);
    const fileName = `FEI_${data.id.slice(0, 8)}_${form.date_evenement}.pdf`;
    pdf.save(fileName);

    // Notification email avec PDF en pièce jointe
    try {
      const pdfBytes = new Uint8Array(pdf.output("arraybuffer") as ArrayBuffer);
      let binary = "";
      for (let i = 0; i < pdfBytes.byteLength; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      const pdfBase64 = btoa(binary);

      const { error: emailError } = await supabase.functions.invoke("send-email-notification", {
        body: {
          subject: `Nouvelle FEI — ${data.type_fei} — ${new Date(data.date_evenement).toLocaleDateString("fr-FR")}`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #c46b48; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0;">EHPAD La Fleur de l'Âge</h2>
                <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0;">Nouvelle Fiche d'Événement Indésirable</p>
              </div>
              <div style="background: #faf7f3; padding: 24px; border: 1px solid #dcd2c8; border-top: none; border-radius: 0 0 8px 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Type d'événement</td><td style="padding: 6px 0; font-weight: bold;">${data.type_fei}</td></tr>
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Date</td><td style="padding: 6px 0;">${new Date(data.date_evenement).toLocaleDateString("fr-FR")}</td></tr>
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Lieu</td><td style="padding: 6px 0;">${data.lieu}</td></tr>
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Gravité</td><td style="padding: 6px 0;">${data.gravite}/5</td></tr>
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Déclarant</td><td style="padding: 6px 0;">${data.declarant_nom}</td></tr>
                </table>
                <p style="color: #6b6b6b; font-size: 13px; margin-top: 16px;">Le document PDF complet est joint à cet email.</p>
                <hr style="border: none; border-top: 1px solid #dcd2c8; margin: 16px 0;">
                <p style="color: #aaa; font-size: 11px; margin: 0;">Document confidentiel — EHPAD La Fleur de l'Âge — Système Qualité</p>
              </div>
            </div>`,
          pdfBase64,
          fileName,
        },
      });
      if (emailError) {
        console.error("Échec de la notification email FEI :", emailError);
        toast.error("FEI enregistrée, mais l'email n'a pas pu être envoyé : " + emailError.message);
      } else {
        toast.success("FEI enregistrée, PDF généré et email envoyé !");
      }
    } catch (emailErr) {
      console.error("Échec de la notification email FEI :", emailErr);
      toast.error("FEI enregistrée, mais erreur lors de l'envoi email.");
    }

    setForm({ date_evenement: new Date().toISOString().split("T")[0], lieu: "", description: "", gravite: 0, type_fei: "", actions_correctives: "" });
    setStep(1);
    setLoading(false);
  };

  const selectedGravite = GRAVITE_CONFIG.find((g) => g.level === form.gravite);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        {/* Title row */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-foreground">Fiche d'Événement Indésirable</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="text-primary font-semibold">{STEPS[step - 1].label}</span>
              {" · "}Étape {step} sur {STEPS.length}
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-start">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  {/* Circle */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${done
                      ? "bg-primary border-primary text-white shadow-sm"
                      : active
                        ? "bg-background border-primary text-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
                        : "bg-muted/50 border-border text-muted-foreground"
                    }`}>
                    {done
                      ? <Check className="w-4 h-4" />
                      : active
                        ? <Icon className="w-4 h-4" />
                        : <span className="text-xs font-bold">{s.id}</span>
                    }
                  </div>
                  {/* Label */}
                  <span className={`text-[10px] font-semibold text-center leading-tight max-w-[64px] hidden sm:block transition-colors duration-300
                    ${active ? "text-primary" : done ? "text-primary/50" : "text-muted-foreground/50"}`}>
                    {s.label}
                  </span>
                </div>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mt-[18px] mx-2">
                    <div className={`h-0.5 rounded-full transition-all duration-500 ${done ? "bg-primary" : "bg-border"}`} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </motion.div>

      {/* Définition FEI */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex gap-3"
      >
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold text-blue-800">Qu'est-ce qu'une FEI ?</p>
          <p className="text-blue-700/80 leading-relaxed">
            Une <strong>Fiche d'Événement Indésirable</strong> signale tout incident ou accident survenu à un résident, un visiteur ou un professionnel au sein de l'établissement — qu'il y ait ou non des conséquences.
          </p>
          <p className="text-blue-700/70 text-xs">
            Exemples : chute, erreur médicamenteuse, fugue, acte d'agressivité, infection, maltraitance…
          </p>
          <p className="text-blue-600/80 text-xs font-medium border-t border-blue-200 pt-1.5 mt-1.5">
            Si le signalement concerne une <strong>insatisfaction ou un mécontentement</strong> exprimé par un résident ou sa famille, utilisez plutôt le formulaire <strong>Plainte / Réclamation</strong>.
          </p>
        </div>
      </motion.div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-warm space-y-5"
        >
          {step === 1 && (
            <>
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Identification de l'événement</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Date de l'événement</Label>
                  <Input type="date" value={form.date_evenement} onChange={(e) => setForm({ ...form, date_evenement: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Type d'événement</Label>
                  <Select value={form.type_fei} onValueChange={(v) => setForm({ ...form, type_fei: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez un type" /></SelectTrigger>
                    <SelectContent>
                      {FEI_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Localisation & Gravité</h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Lieu de l'événement</Label>
                  <Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} placeholder="Ex: Chambre 12, couloir étage 2..." required />
                </div>
                <div className="space-y-3">
                  <Label className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Niveau de gravité</Label>
                  <div className="space-y-2">
                    {GRAVITE_CONFIG.map((g) => (
                      <button
                        key={g.level}
                        type="button"
                        onClick={() => setForm({ ...form, gravite: g.level })}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${form.gravite === g.level ? g.color + " shadow-sm" : "border-border bg-background hover:bg-muted/50"}`}
                      >
                        <div className={`w-3 h-3 rounded-full shrink-0 ${form.gravite === g.level ? g.dot : "bg-border"}`} />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm">{g.level}. {g.label}</span>
                          <p className="text-xs opacity-70 mt-0.5">{g.description}</p>
                        </div>
                        {form.gravite === g.level && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  {selectedGravite && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${selectedGravite.color}`}>
                      <div className={`w-2 h-2 rounded-full ${selectedGravite.dot}`} />
                      Gravité sélectionnée : {selectedGravite.label}
                    </motion.div>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Description de l'événement</h2>
              <div className="space-y-2">
                <Label>Décrivez l'événement en détail</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Qui, quoi, quand, comment... Décrivez les faits objectivement." rows={6} required className="resize-none" />
                <p className="text-xs text-muted-foreground text-right">{form.description.length} caractères</p>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2"><Shield className="w-4 h-4 text-success" /> Actions correctives</h2>
              <div className="space-y-2">
                <Label>Actions entreprises ou à entreprendre <span className="text-muted-foreground">(optionnel)</span></Label>
                <Textarea value={form.actions_correctives} onChange={(e) => setForm({ ...form, actions_correctives: e.target.value })} placeholder="Décrivez les mesures prises immédiatement et les actions préventives envisagées..." rows={5} className="resize-none" />
              </div>
              {/* Récap */}
              <div className="rounded-xl bg-muted/40 p-4 space-y-2 text-sm">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-3">Récapitulatif</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Type :</span> <span className="font-medium">{form.type_fei}</span></div>
                  <div><span className="text-muted-foreground">Date :</span> <span className="font-medium">{new Date(form.date_evenement).toLocaleDateString("fr-FR")}</span></div>
                  <div><span className="text-muted-foreground">Lieu :</span> <span className="font-medium">{form.lieu}</span></div>
                  <div><span className="text-muted-foreground">Gravité :</span> <span className={`font-semibold ${GRAVITE_CONFIG[form.gravite - 1]?.color.split(" ")[2]}`}>{GRAVITE_CONFIG[form.gravite - 1]?.label}</span></div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-4 gap-3">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> Précédent
        </Button>
        {step < STEPS.length ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-2">
            Suivant <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading || !canNext()} className="gap-2 shadow-warm">
            <Save className="w-4 h-4" />
            {loading ? "Enregistrement..." : "Enregistrer et générer le PDF"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FeiFormPage;
