import { useState, useEffect, useRef, Fragment } from "react";
import { Link } from "react-router-dom";
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
import { FileText, Save, MapPin, AlertTriangle, Calendar, ClipboardList, Shield, ChevronRight, ChevronLeft, Check, ArrowRight, MessageSquareWarning, Mic, MicOff, Loader2 } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const FEI_TYPES = ["Chute", "Erreur médicamenteuse", "Fugue", "Agressivité", "Maltraitance", "Infection", "Autre"];

const SERVICES = [
  "Administration",
  "Cuisine",
  "Technique",
  "Lingerie",
  "Animation",
  "Soins/Hôtellerie",
  "Entretien",
];

const GRAVITE_CONFIG = [
  { level: 1, label: "Mineure", description: "Aucune conséquence significative", color: "border-emerald-400 bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  { level: 2, label: "Modérée", description: "Conséquences légères et réversibles", color: "border-yellow-400 bg-yellow-50 text-yellow-700", dot: "bg-yellow-400" },
  { level: 3, label: "Importante", description: "Conséquences notables nécessitant suivi", color: "border-orange-400 bg-orange-50 text-orange-700", dot: "bg-orange-400" },
  { level: 4, label: "Grave", description: "Conséquences sérieuses sur la santé", color: "border-red-400 bg-red-50 text-red-700", dot: "bg-red-400" },
  { level: 5, label: "Critique", description: "Mise en danger immédiate de la vie", color: "border-red-700 bg-red-100 text-red-800", dot: "bg-red-700" },
];

const BASE_STEPS = [
  { id: 1, label: "Identification", icon: Calendar },
  { id: 2, label: "Localisation & Gravité", icon: MapPin },
  { id: 3, label: "Description", icon: ClipboardList },
  { id: 4, label: "Actions correctives", icon: Shield },
];

const FeiFormPage = () => {
  const { user, profile, userServices } = useAuth();
  const singleService = userServices.length === 1 ? userServices[0] : null;
  const serviceOptions = userServices.length > 0 ? userServices : SERVICES;
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    date_evenement: new Date().toISOString().split("T")[0],
    lieu: "",
    description: "",
    gravite: 0,
    type_fei: "",
    actions_correctives: "",
    categorie_fei: "standard",
    service: singleService || "",
  });

  // ── Dictée vocale ─────────────────────────────────────────────────────────
  const globalVoice = useSpeechRecognition(); // bandeau global → IA

  // État visuel du bandeau global : idle | recording | analyzing | success
  const [globalStatus, setGlobalStatus] = useState<"idle" | "recording" | "analyzing" | "success">("idle");

  // Ref pour lancer l'appel IA sans dépendance cyclique
  const processGlobalRef = useRef<(text: string) => void>(() => {});

  // ── Traitement global : quand l'enregistrement s'arrête ──────────────────
  useEffect(() => {
    if (globalVoice.isListening) return;            // encore en cours
    if (globalStatus !== "recording") return;       // n'était pas en mode dictée
    const text = globalVoice.transcript.trim();
    if (!text) { setGlobalStatus("idle"); return; }
    setGlobalStatus("analyzing");
    processGlobalRef.current(text);
  }, [globalVoice.isListening]); // eslint-disable-line react-hooks/exhaustive-deps

  processGlobalRef.current = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("suggest-actions", {
        body: { context_type: "voice_fei", data: { transcript: text } },
      });
      if (error) throw error;
      const extracted = data.extracted;
      setForm(prev => ({
        ...prev,
        type_fei:    extracted.type_fei    || prev.type_fei,
        service:     extracted.service     || prev.service,
        lieu:        extracted.lieu        || prev.lieu,
        description: extracted.description || prev.description,
      }));
      setGlobalStatus("success");
      toast.success("Formulaire pré-rempli grâce à la dictée !");
    } catch {
      toast.error("Impossible d'analyser la dictée");
      setGlobalStatus("idle");
    }
  };

  // Auto-dismiss de l'indicateur "succès" après 3 s
  useEffect(() => {
    if (globalStatus !== "success") return;
    const t = setTimeout(() => setGlobalStatus("idle"), 3000);
    return () => clearTimeout(t);
  }, [globalStatus]);

  // ── Handlers global ───────────────────────────────────────────────────────
  const handleStartGlobalDictation = () => {
    setGlobalStatus("recording");
    globalVoice.startListening();
  };
  const handleStopGlobalDictation = () => {
    globalVoice.stopListening();
    // globalStatus reste "recording" → useEffect le passera à "analyzing"
  };

  // ── Dictée par champ — toggle Dicter / Arrêter ───────────────────────────
  const [isRecordingDescription, setIsRecordingDescription] = useState(false);
  const [isRecordingActions, setIsRecordingActions] = useState(false);
  const recognitionDescRef = useRef<any>(null);
  const recognitionActionsRef = useRef<any>(null);

  const toggleDictation = (
    field: "description" | "actions_correctives",
    isRecording: boolean,
    setIsRecording: (v: boolean) => void,
    recognitionRef: React.MutableRefObject<any>
  ) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Dictée non supportée sur ce navigateur (utilisez Chrome ou Edge)");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      if (field === "description") {
        setForm(prev => ({
          ...prev,
          description: prev.description ? prev.description + " " + transcript : transcript,
        }));
      } else {
        setForm(prev => ({
          ...prev,
          actions_correctives: prev.actions_correctives ? prev.actions_correctives + " " + transcript : transcript,
        }));
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") toast.error("Erreur dictée : " + e.error);
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  // ── Formulaire ────────────────────────────────────────────────────────────
  const canNext = () => {
    if (step === 1) return form.date_evenement && form.type_fei && form.service;
    if (step === 2) return form.lieu;
    if (step === 3) return form.description.trim().length > 0;
    if (step === 4) return true;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    const feiData = {
      date_evenement: form.date_evenement,
      lieu: form.lieu,
      description: form.description,
      gravite: form.gravite || null,
      type_fei: form.type_fei,
      actions_correctives: form.actions_correctives || null,
      categorie_fei: "standard",
      service: form.service || null,
      nature_evenement_ars: null,
      circonstances_ars: null,
      consequences_resident_ars: null,
      mesures_prises_ars: null,
      statut_ars: null,
      user_id: user.id,
      declarant_nom: profile?.full_name || user.email || "Inconnu",
    };

    const { data, error } = await supabase.from("fei").insert(feiData).select().single();
    if (error) { toast.error("Erreur : " + error.message); setLoading(false); return; }

    const pdf = generateFeiPdf(data);
    const fileName = `FEI_${data.id.slice(0, 8)}_${form.date_evenement}.pdf`;
    pdf.save(fileName);

    try {
      const pdfBytes = new Uint8Array(pdf.output("arraybuffer") as ArrayBuffer);
      let binary = "";
      for (let i = 0; i < pdfBytes.byteLength; i++) binary += String.fromCharCode(pdfBytes[i]);
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
        toast.error("FEI enregistrée, mais l'email n'a pas pu être envoyé : " + emailError.message);
      } else {
        toast.success("FEI enregistrée, PDF généré et email envoyé !");
      }
    } catch {
      toast.error("FEI enregistrée, mais erreur lors de l'envoi email.");
    }

    setForm({
      date_evenement: new Date().toISOString().split("T")[0],
      lieu: "", description: "", gravite: 0, type_fei: "", actions_correctives: "",
      categorie_fei: "standard",
      service: singleService || "",
    });
    setStep(1);
    setLoading(false);
  };

  const selectedGravite = GRAVITE_CONFIG.find((g) => g.level === form.gravite);
  const isSupported = globalVoice.isSupported;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-foreground">Fiche d'Événement Indésirable</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="text-primary font-semibold">{BASE_STEPS[step - 1].label}</span>
              {" · "}Étape {step} sur {BASE_STEPS.length}
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-start">
          {BASE_STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2 shrink-0">
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
                  <span className={`text-[10px] font-semibold text-center leading-tight max-w-[64px] hidden sm:block transition-colors duration-300
                    ${active ? "text-primary" : done ? "text-primary/50" : "text-muted-foreground/50"}`}>
                    {s.label}
                  </span>
                </div>
                {i < BASE_STEPS.length - 1 && (
                  <div className="flex-1 mt-[18px] mx-2">
                    <div className={`h-0.5 rounded-full transition-all duration-500 ${done ? "bg-primary" : "bg-border"}`} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </motion.div>

      {/* ── Bandeau dictée vocale globale ── */}
      {isSupported && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4 space-y-2"
        >
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Option dictée vocale</p>
                <p className="text-xs text-muted-foreground">Décrivez l'événement à voix haute — les champs se rempliront automatiquement</p>
              </div>
            </div>
            <Button
              type="button"
              variant={globalStatus === "recording" ? "destructive" : "outline"}
              size="sm"
              disabled={globalStatus === "analyzing"}
              onClick={globalStatus === "recording" ? handleStopGlobalDictation : handleStartGlobalDictation}
              className={`gap-2 shrink-0 ${globalStatus === "recording" ? "animate-pulse" : ""}`}
            >
              {globalStatus === "analyzing" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyse…</>
              ) : globalStatus === "recording" ? (
                <><MicOff className="w-4 h-4" /> Arrêter</>
              ) : (
                <><Mic className="w-4 h-4" /> Dicter</>
              )}
            </Button>
          </div>

          {/* Indicateurs d'état */}
          <AnimatePresence mode="wait">
            {globalStatus === "recording" && (
              <motion.div
                key="recording"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                🔴 Enregistrement en cours… Parlez naturellement. Ex : "Monsieur Dupont a chuté dans le couloir ce matin, gravité modérée"
              </motion.div>
            )}
            {globalStatus === "analyzing" && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-700"
              >
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                ⏳ Analyse en cours — Claude extrait les informations de votre dictée…
              </motion.div>
            )}
            {globalStatus === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700"
              >
                <Check className="w-3 h-3 shrink-0" />
                ✅ Formulaire pré-rempli ! Vérifiez et complétez les champs si nécessaire.
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Définition FEI */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50/60 overflow-hidden"
      >
        <div className="flex items-center gap-4 px-5 pt-5 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">Événement indésirable</p>
            <h3 className="text-base font-display font-bold text-blue-900">Qu'est-ce qu'une FEI ?</h3>
          </div>
        </div>

        <div className="px-5 pb-4">
          <p className="text-sm text-blue-800/80 leading-relaxed">
            Une <span className="font-semibold text-blue-900">Fiche d'Événement Indésirable</span> signale tout incident ou accident survenu à un résident, un visiteur ou un professionnel — qu'il y ait ou non des conséquences graves.
          </p>
        </div>

        <div className="mx-5 border-t border-blue-100/80" />
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2.5">Exemples typiques</p>
          <div className="flex flex-wrap gap-2">
            {["Chute", "Erreur médicamenteuse", "Fugue", "Agressivité", "Infection", "Maltraitance"].map((ex) => (
              <span key={ex} className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                {ex}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-5 border-t border-blue-100/80" />
        <div className="px-5 py-3.5 flex items-center justify-between">
          <p className="text-xs text-blue-600/70">
            Vous souhaitez signaler une insatisfaction ou un mécontentement ?
          </p>
          <Link
            to="/plaintes"
            className="ml-3 shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm"
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            Plainte / Réclamation
            <ArrowRight className="w-3 h-3" />
          </Link>
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
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Identification de l'événement
              </h2>
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
                <div className="space-y-2">
                  <Label>Service concerné <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.service}
                    onValueChange={(v) => setForm({ ...form, service: v })}
                    disabled={!!singleService}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionnez un service" /></SelectTrigger>
                    <SelectContent>
                      {serviceOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {singleService && (
                    <p className="text-xs text-muted-foreground">Service pré-sélectionné selon votre rôle.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Localisation & Gravité
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Lieu de l'événement</Label>
                  <Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} placeholder="Ex: Chambre 12, couloir étage 2..." required />
                </div>
                <div className="space-y-3">
                  <Label className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" /> Estimation de la gravité</Label>
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
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Description détaillée de l'événement
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Décrivez l'événement en détail</Label>
                  {isSupported && (
                    <Button
                      type="button"
                      variant={isRecordingDescription ? "destructive" : "outline"}
                      size="sm"
                      disabled={globalStatus === "recording" || globalStatus === "analyzing"}
                      className={`h-7 gap-1.5 text-xs shrink-0 ${isRecordingDescription ? "animate-pulse" : "border-primary/30 text-primary hover:bg-primary/5"}`}
                      onClick={() => toggleDictation("description", isRecordingDescription, setIsRecordingDescription, recognitionDescRef)}
                    >
                      {isRecordingDescription ? (
                        <><MicOff className="w-3.5 h-3.5" /> 🔴 Arrêter</>
                      ) : (
                        <><Mic className="w-3.5 h-3.5" /> Dicter</>
                      )}
                    </Button>
                  )}
                </div>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Qui, quoi, quand, comment... Décrivez les faits objectivement."
                  rows={7}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{form.description.length} caractères</p>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-success" /> Actions correctives immédiates
              </h2>
              {/* Récap contextuel */}
              <div className="rounded-xl bg-muted/40 p-4 space-y-2 text-sm">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2">Contexte de l'événement</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Type :</span> <span className="font-medium">{form.type_fei}</span></div>
                  <div><span className="text-muted-foreground">Date :</span> <span className="font-medium">{new Date(form.date_evenement).toLocaleDateString("fr-FR")}</span></div>
                  <div><span className="text-muted-foreground">Lieu :</span> <span className="font-medium">{form.lieu}</span></div>
                  <div><span className="text-muted-foreground">Gravité :</span> <span className={`font-semibold ${form.gravite > 0 ? GRAVITE_CONFIG[form.gravite - 1]?.color.split(" ")[2] : "text-muted-foreground"}`}>{form.gravite > 0 ? GRAVITE_CONFIG[form.gravite - 1]?.label : "Non renseignée"}</span></div>
                  {form.service && (
                    <div><span className="text-muted-foreground">Service :</span> <span className="font-medium">{form.service}</span></div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Mesures prises ou à prendre <span className="text-muted-foreground">(optionnel)</span></Label>
                  {isSupported && (
                    <Button
                      type="button"
                      variant={isRecordingActions ? "destructive" : "outline"}
                      size="sm"
                      disabled={globalStatus === "recording" || globalStatus === "analyzing"}
                      className={`h-7 gap-1.5 text-xs shrink-0 ${isRecordingActions ? "animate-pulse" : "border-primary/30 text-primary hover:bg-primary/5"}`}
                      onClick={() => toggleDictation("actions_correctives", isRecordingActions, setIsRecordingActions, recognitionActionsRef)}
                    >
                      {isRecordingActions ? (
                        <><MicOff className="w-3.5 h-3.5" /> 🔴 Arrêter</>
                      ) : (
                        <><Mic className="w-3.5 h-3.5" /> Dicter</>
                      )}
                    </Button>
                  )}
                </div>
                <Textarea
                  value={form.actions_correctives}
                  onChange={(e) => setForm({ ...form, actions_correctives: e.target.value })}
                  placeholder="Décrivez les mesures prises immédiatement et les actions préventives envisagées..."
                  rows={5}
                  className="resize-none"
                />
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
        {step < BASE_STEPS.length ? (
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
