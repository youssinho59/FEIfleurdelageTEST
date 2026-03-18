import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { generatePlaintePdf } from "@/lib/pdfGenerator";
import { PLAINTE_CATEGORIES } from "@/lib/plaintesCategories";
import { MessageSquareWarning, Save, Calendar, FileText, MessageCircle, ArrowRight, Briefcase, Mic, MicOff, Loader2 } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const DEMANDEUR_TYPES = [
  "Résident",
  "Famille",
  "Personnel",
  "Visiteur",
  "Autre",
];

const SERVICES = [
  "Administration",
  "Cuisine",
  "Technique",
  "Lingerie",
  "Animation",
  "Soins/Hôtellerie",
  "Entretien",
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const PlaintesFormPage = () => {
  const { user, profile, userServices } = useAuth();
  const singleService = userServices.length === 1 ? userServices[0] : null;
  const serviceOptions = userServices.length > 0 ? userServices : SERVICES;
  const [loading, setLoading] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);

  // ── Voice recognition ─────────────────────────────────────────────────────
  const { isListening, transcript, isSupported, startListening, stopListening } = useSpeechRecognition();
  const [voiceMode, setVoiceMode] = useState<"global" | "description" | null>(null);

  const [form, setForm] = useState({
    date_plainte: new Date().toISOString().split("T")[0],
    demandeur: "",
    service: singleService || "",
    objet: "",
    precisions: "",
    description: "",
    reponse_apportee: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const plainteData = {
      date_plainte: form.date_plainte,
      demandeur: form.demandeur,
      service: form.service || null,
      objet: form.objet,
      precisions: form.precisions || null,
      description: form.description,
      reponse_apportee: form.reponse_apportee || null,
      user_id: user.id,
      declarant_nom: profile?.full_name || user.email || "Inconnu",
    };

    const { data, error } = await supabase.from("plaintes").insert(plainteData).select().single();

    if (error) {
      toast.error("Erreur lors de l'enregistrement : " + error.message);
      setLoading(false);
      return;
    }

    const pdf = generatePlaintePdf(data);
    const fileName = `Plainte_${data.id.slice(0, 8)}_${form.date_plainte}.pdf`;
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
          subject: `Nouvelle Plainte — ${data.objet} — ${new Date(data.date_plainte).toLocaleDateString("fr-FR")}`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #c46b48; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0;">EHPAD La Fleur de l'Âge</h2>
                <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0;">Nouvelle Plainte / Réclamation</p>
              </div>
              <div style="background: #faf7f3; padding: 24px; border: 1px solid #dcd2c8; border-top: none; border-radius: 0 0 8px 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Date</td><td style="padding: 6px 0;">${new Date(data.date_plainte).toLocaleDateString("fr-FR")}</td></tr>
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Demandeur</td><td style="padding: 6px 0; font-weight: bold;">${data.demandeur}</td></tr>
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Catégorie</td><td style="padding: 6px 0;">${data.objet}</td></tr>
                  ${data.precisions ? `<tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Précisions</td><td style="padding: 6px 0;">${data.precisions}</td></tr>` : ""}
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
        console.error("Échec de la notification email Plainte :", emailError);
        toast.error("Plainte enregistrée, mais l'email n'a pas pu être envoyé : " + emailError.message);
      } else {
        toast.success("Plainte enregistrée, PDF généré et email envoyé !");
      }
    } catch (emailErr) {
      console.error("Échec de la notification email Plainte :", emailErr);
      toast.error("Plainte enregistrée, mais erreur lors de l'envoi email.");
    }
    setForm({
      date_plainte: new Date().toISOString().split("T")[0],
      demandeur: "",
      service: singleService || "",
      objet: "",
      precisions: "",
      description: "",
      reponse_apportee: "",
    });
    setLoading(false);
  };

  // Process transcript when recognition stops
  useEffect(() => {
    if (isListening || !voiceMode) return;
    const mode = voiceMode;
    setVoiceMode(null);
    if (!transcript.trim()) return;
    if (mode === "description") {
      setForm(prev => ({ ...prev, description: prev.description ? `${prev.description}\n${transcript.trim()}` : transcript.trim() }));
    } else if (mode === "global") {
      processGlobalDictation(transcript.trim());
    }
  }, [isListening]); // eslint-disable-line react-hooks/exhaustive-deps

  const processGlobalDictation = async (text: string) => {
    setLoadingVoice(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-actions", {
        body: { context_type: "voice_plainte", data: { transcript: text } },
      });
      if (error) throw error;
      const extracted = data.extracted;
      setForm(prev => ({
        ...prev,
        description: extracted.description || prev.description,
      }));
      toast.success("Description pré-remplie grâce à la dictée !");
    } catch {
      toast.error("Impossible d'analyser la dictée");
    }
    setLoadingVoice(false);
  };

  const handleStartGlobalDictation = () => { setVoiceMode("global"); startListening(); };
  const handleStopGlobalDictation = () => { stopListening(); };
  const handleToggleDescriptionDictation = () => {
    if (isListening && voiceMode === "description") { stopListening(); }
    else { setVoiceMode("description"); startListening(); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-warm">
            <MessageSquareWarning className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Plainte / Réclamation
            </h1>
            <p className="text-muted-foreground text-sm">
              Enregistrez une plainte ou une réclamation
            </p>
          </div>
        </div>
      </motion.div>

      {/* Définition Plainte / Réclamation */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50/60 overflow-hidden"
      >
        {/* Header coloré */}
        <div className="flex items-center gap-4 px-5 pt-5 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0">
            <MessageSquareWarning className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">Insatisfaction / Mécontentement</p>
            <h3 className="text-base font-display font-bold text-amber-900">Qu'est-ce qu'une plainte ou réclamation ?</h3>
          </div>
        </div>

        {/* Définition */}
        <div className="px-5 pb-4">
          <p className="text-sm text-amber-800/80 leading-relaxed">
            Une <span className="font-semibold text-amber-900">plainte ou réclamation</span> exprime l'insatisfaction d'un résident, d'un membre de sa famille, d'un visiteur ou d'un professionnel vis-à-vis d'une prestation, d'un comportement ou du fonctionnement de l'établissement.
          </p>
        </div>

        {/* Séparateur + Exemples */}
        <div className="mx-5 border-t border-amber-100/80" />
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2.5">Exemples typiques</p>
          <div className="flex flex-wrap gap-2">
            {["Qualité des repas", "Comportement du personnel", "Conditions d'accueil", "Délai de prise en charge", "Propreté des locaux"].map((ex) => (
              <span key={ex} className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                {ex}
              </span>
            ))}
          </div>
        </div>

        {/* Lien vers l'autre formulaire */}
        <div className="mx-5 border-t border-amber-100/80" />
        <div className="px-5 py-3.5 flex items-center justify-between">
          <p className="text-xs text-amber-600/70">
            Vous souhaitez signaler un incident ou un accident ?
          </p>
          <Link
            to="/fei"
            className="ml-3 shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 transition-colors px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            Saisir une FEI
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </motion.div>

      {/* ── Bandeau dictée vocale ── */}
      {isSupported && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-5 space-y-2"
        >
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Option dictée vocale</p>
                <p className="text-xs text-muted-foreground">Décrivez la situation à voix haute — la description sera remplie automatiquement</p>
              </div>
            </div>
            <Button
              type="button"
              variant={isListening && voiceMode === "global" ? "destructive" : "outline"}
              size="sm"
              disabled={loadingVoice || (isListening && voiceMode !== "global")}
              onClick={isListening && voiceMode === "global" ? handleStopGlobalDictation : handleStartGlobalDictation}
              className={`gap-2 shrink-0 ${isListening && voiceMode === "global" ? "animate-pulse" : ""}`}
            >
              {loadingVoice ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyse…</>
              ) : isListening && voiceMode === "global" ? (
                <><MicOff className="w-4 h-4" /> Arrêter</>
              ) : (
                <><Mic className="w-4 h-4" /> Dicter</>
              )}
            </Button>
          </div>
          {isListening && voiceMode === "global" && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              Enregistrement en cours… Parlez naturellement. Ex : "La famille de Mme Martin se plaint de la qualité des repas servis le soir"
            </div>
          )}
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
          {/* Section: Identification */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-primary/5 border-b border-border/50 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Identification</span>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.date_plainte}
                      onChange={(e) => setForm({ ...form, date_plainte: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demandeur">Demandeur</Label>
                    <Select
                      value={form.demandeur}
                      onValueChange={(v) => setForm({ ...form, demandeur: v })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type de demandeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEMANDEUR_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Catégorie (remplace Objet) */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-accent/30 border-b border-border/50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-foreground" />
                <span className="text-sm font-semibold text-foreground">Qualification de la plainte</span>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objet">Catégorie <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.objet}
                    onValueChange={(v) => setForm({ ...form, objet: v })}
                    required
                  >
                    <SelectTrigger id="objet">
                      <SelectValue placeholder="Sélectionnez une catégorie…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {PLAINTE_CATEGORIES.map((famille) => (
                        <SelectGroup key={famille.famille}>
                          <SelectLabel
                            className="text-[11px] font-bold uppercase tracking-widest px-2 py-1.5"
                            style={{ color: famille.color }}
                          >
                            {famille.famille}
                          </SelectLabel>
                          {famille.items.map((cat) => (
                            <SelectItem key={cat} value={cat} className="pl-5">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precisions">
                    Précisions <span className="text-muted-foreground text-xs">(optionnel)</span>
                  </Label>
                  <Input
                    id="precisions"
                    value={form.precisions}
                    onChange={(e) => setForm({ ...form, precisions: e.target.value })}
                    placeholder="Complétez si nécessaire…"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Réponse immédiate apportée */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-success/10 border-b border-border/50 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-foreground">Réponse immédiate apportée</span>
              </div>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <Label htmlFor="reponse">Mesures prises ou réponse donnée <span className="text-muted-foreground">(optionnel)</span></Label>
                  <Textarea
                    id="reponse"
                    value={form.reponse_apportee}
                    onChange={(e) => setForm({ ...form, reponse_apportee: e.target.value })}
                    placeholder="Décrivez la réponse ou les mesures prises immédiatement suite à cette réclamation..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Description */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-secondary/50 border-b border-border/50 flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">Description détaillée</span>
              </div>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="description">Description complète de la situation</Label>
                    {isSupported && (
                      <Button
                        type="button"
                        variant={isListening && voiceMode === "description" ? "destructive" : "outline"}
                        size="sm"
                        className={`h-7 gap-1.5 text-xs shrink-0 ${isListening && voiceMode === "description" ? "animate-pulse" : "border-primary/30 text-primary hover:bg-primary/5"}`}
                        onClick={handleToggleDescriptionDictation}
                      >
                        {isListening && voiceMode === "description" ? (
                          <><MicOff className="w-3 h-3" /> Arrêter</>
                        ) : (
                          <><Mic className="w-3 h-3" /> Dicter</>
                        )}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Décrivez la situation en détail, le contexte, les personnes concernées..."
                    rows={4}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Service */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-muted/40 border-b border-border/50 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Service</span>
              </div>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <Label htmlFor="service">Service concerné <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.service}
                    onValueChange={(v) => setForm({ ...form, service: v })}
                    disabled={!!singleService}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un service" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {singleService && (
                    <p className="text-xs text-muted-foreground">Service pré-sélectionné selon votre rôle.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit */}
          <motion.div variants={item} className="pt-2">
            <Button
              type="submit"
              className="w-full gap-2 h-12 text-base font-semibold rounded-xl shadow-warm"
              disabled={loading || !form.demandeur || !form.objet || !form.service}
            >
              <Save className="w-5 h-5" />
              {loading ? "Enregistrement..." : "Enregistrer et générer le PDF"}
            </Button>
          </motion.div>
        </motion.div>
      </form>
    </div>
  );
};

export default PlaintesFormPage;
