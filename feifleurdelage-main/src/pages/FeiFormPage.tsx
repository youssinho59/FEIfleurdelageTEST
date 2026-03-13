import { useState, Fragment } from "react";
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
import { FileText, Save, MapPin, AlertTriangle, Calendar, ClipboardList, Shield, ChevronRight, ChevronLeft, Check, ArrowRight, MessageSquareWarning, Building2 } from "lucide-react";

const FEI_TYPES = ["Chute", "Erreur médicamenteuse", "Fugue", "Agressivité", "Maltraitance", "Infection", "Autre"];

const SERVICES = [
  "Administration",
  "Cuisine",
  "Technique",
  "Lingerie",
  "Animation",
  "Soins/Hôtellerie",
];

const CATEGORIE_CONFIG = [
  {
    value: "standard",
    label: "FEI Standard",
    description: "Événement indésirable sans caractère grave ou significatif",
    color: "border-blue-300 bg-blue-50 text-blue-700",
    dot: "bg-blue-400",
  },
  {
    value: "feig",
    label: "FEIG — Événement Indésirable Grave",
    description: "Conséquences graves sur la santé du résident, nécessite un suivi renforcé",
    color: "border-orange-400 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  {
    value: "feigs",
    label: "FEIGS — Grave et Significatif",
    description: "Déclaration réglementaire à l'ARS obligatoire",
    color: "border-red-500 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
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
  { id: 3, label: "Actions correctives", icon: Shield },
  { id: 4, label: "Description", icon: ClipboardList },
];

const ARS_STEP = { id: 5, label: "Déclaration ARS", icon: Building2 };

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
    nature_evenement_ars: "",
    circonstances_ars: "",
    consequences_resident_ars: "",
    mesures_prises_ars: "",
  });

  const activeSteps = form.categorie_fei === "feigs" ? [...BASE_STEPS, ARS_STEP] : BASE_STEPS;

  const canNext = () => {
    if (step === 1) return form.date_evenement && form.type_fei && form.categorie_fei && form.service;
    if (step === 2) return form.lieu && form.gravite > 0;
    if (step === 3) return true; // Actions correctives optionnelles
    if (step === 4) return form.description.trim().length > 0;
    if (step === 5) return (
      form.nature_evenement_ars.trim().length > 0 &&
      form.circonstances_ars.trim().length > 0 &&
      form.consequences_resident_ars.trim().length > 0 &&
      form.mesures_prises_ars.trim().length > 0
    );
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    const isFeigs = form.categorie_fei === "feigs";
    const feiData = {
      date_evenement: form.date_evenement,
      lieu: form.lieu,
      description: form.description,
      gravite: form.gravite,
      type_fei: form.type_fei,
      actions_correctives: form.actions_correctives || null,
      categorie_fei: form.categorie_fei,
      service: form.service || null,
      nature_evenement_ars: isFeigs ? (form.nature_evenement_ars || null) : null,
      circonstances_ars: isFeigs ? (form.circonstances_ars || null) : null,
      consequences_resident_ars: isFeigs ? (form.consequences_resident_ars || null) : null,
      mesures_prises_ars: isFeigs ? (form.mesures_prises_ars || null) : null,
      statut_ars: isFeigs ? "a_declarer" : null,
      user_id: user.id,
      declarant_nom: profile?.full_name || user.email || "Inconnu",
    };

    const { data, error } = await supabase.from("fei").insert(feiData).select().single();
    if (error) { toast.error("Erreur : " + error.message); setLoading(false); return; }

    const pdf = generateFeiPdf(data);
    const catPrefix = data.categorie_fei === "feigs" ? "FEIGS" : data.categorie_fei === "feig" ? "FEIG" : "FEI";
    const fileName = `${catPrefix}_${data.id.slice(0, 8)}_${form.date_evenement}.pdf`;
    pdf.save(fileName);

    // Notification email avec PDF en pièce jointe
    try {
      const pdfBytes = new Uint8Array(pdf.output("arraybuffer") as ArrayBuffer);
      let binary = "";
      for (let i = 0; i < pdfBytes.byteLength; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      const pdfBase64 = btoa(binary);

      const catBadge = isFeigs
        ? `<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:bold;">⚠ FEIGS — À déclarer à l'ARS</span>`
        : data.categorie_fei === "feig"
        ? `<span style="background:#ffedd5;color:#9a3412;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:bold;">FEIG — Événement Grave</span>`
        : `<span style="background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:bold;">FEI Standard</span>`;

      const { error: emailError } = await supabase.functions.invoke("send-email-notification", {
        body: {
          subject: `${isFeigs ? "⚠ [FEIGS] " : data.categorie_fei === "feig" ? "[FEIG] " : ""}Nouvelle FEI — ${data.type_fei} — ${new Date(data.date_evenement).toLocaleDateString("fr-FR")}`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: ${isFeigs ? "#991b1b" : data.categorie_fei === "feig" ? "#b45309" : "#c46b48"}; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0;">EHPAD La Fleur de l'Âge</h2>
                <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0;">Nouvelle Fiche d'Événement Indésirable</p>
              </div>
              <div style="background: #faf7f3; padding: 24px; border: 1px solid #dcd2c8; border-top: none; border-radius: 0 0 8px 8px;">
                <div style="margin-bottom:16px;">${catBadge}</div>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Type d'événement</td><td style="padding: 6px 0; font-weight: bold;">${data.type_fei}</td></tr>
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Date</td><td style="padding: 6px 0;">${new Date(data.date_evenement).toLocaleDateString("fr-FR")}</td></tr>
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Lieu</td><td style="padding: 6px 0;">${data.lieu}</td></tr>
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Gravité</td><td style="padding: 6px 0;">${data.gravite}/5</td></tr>
                  <tr><td style="padding: 6px 0; color: #8c8278; font-size: 13px;">Déclarant</td><td style="padding: 6px 0;">${data.declarant_nom}</td></tr>
                </table>
                ${isFeigs ? `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;padding:12px;margin-top:16px;"><p style="color:#991b1b;font-weight:bold;margin:0 0 4px;">Action requise : Déclaration ARS</p><p style="color:#b91c1c;font-size:13px;margin:0;">Cet événement est classifié FEIGS et nécessite une déclaration réglementaire à l'Agence Régionale de Santé.</p></div>` : ""}
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

    setForm({
      date_evenement: new Date().toISOString().split("T")[0],
      lieu: "", description: "", gravite: 0, type_fei: "", actions_correctives: "",
      categorie_fei: "standard",
      service: singleService || "",
      nature_evenement_ars: "", circonstances_ars: "", consequences_resident_ars: "", mesures_prises_ars: "",
    });
    setStep(1);
    setLoading(false);
  };

  const selectedGravite = GRAVITE_CONFIG.find((g) => g.level === form.gravite);
  const selectedCategorie = CATEGORIE_CONFIG.find((c) => c.value === form.categorie_fei);

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
              <span className="text-primary font-semibold">{activeSteps[step - 1].label}</span>
              {" · "}Étape {step} sur {activeSteps.length}
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-start">
          {activeSteps.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            const isArsStep = s.id === 5;
            return (
              <Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${done
                      ? "bg-primary border-primary text-white shadow-sm"
                      : active
                        ? isArsStep
                          ? "bg-background border-red-500 text-red-500 shadow-[0_0_0_4px_rgb(239_68_68/0.12)]"
                          : "bg-background border-primary text-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
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
                    ${active ? (isArsStep ? "text-red-500" : "text-primary") : done ? "text-primary/50" : "text-muted-foreground/50"}`}>
                    {s.label}
                  </span>
                </div>
                {i < activeSteps.length - 1 && (
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
          className={`rounded-2xl border bg-card p-6 shadow-warm space-y-5 ${step === 5 ? "border-red-200 bg-red-50/10" : "border-border"}`}
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
                <div className="space-y-3">
                  <Label className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-primary" /> Catégorie de la FEI
                  </Label>
                  <div className="space-y-2">
                    {CATEGORIE_CONFIG.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm({ ...form, categorie_fei: c.value })}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${form.categorie_fei === c.value ? c.color + " shadow-sm" : "border-border bg-background hover:bg-muted/50"}`}
                      >
                        <div className={`w-3 h-3 rounded-full shrink-0 ${form.categorie_fei === c.value ? c.dot : "bg-border"}`} />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm">{c.label}</span>
                          <p className="text-xs opacity-70 mt-0.5">{c.description}</p>
                        </div>
                        {form.categorie_fei === c.value && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  {form.categorie_fei === "feigs" && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                      <span><strong>FEIGS :</strong> Une étape de déclaration ARS sera requise à la fin du formulaire.</span>
                    </motion.div>
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
                  <div><span className="text-muted-foreground">Gravité :</span> <span className={`font-semibold ${GRAVITE_CONFIG[form.gravite - 1]?.color.split(" ")[2]}`}>{GRAVITE_CONFIG[form.gravite - 1]?.label}</span></div>
                  {form.service && (
                    <div><span className="text-muted-foreground">Service :</span> <span className="font-medium">{form.service}</span></div>
                  )}
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Catégorie :</span>{" "}
                    <span className={`font-semibold ${selectedCategorie?.color.split(" ")[2] || ""}`}>{selectedCategorie?.label}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mesures prises ou à prendre <span className="text-muted-foreground">(optionnel)</span></Label>
                <Textarea value={form.actions_correctives} onChange={(e) => setForm({ ...form, actions_correctives: e.target.value })} placeholder="Décrivez les mesures prises immédiatement et les actions préventives envisagées..." rows={5} className="resize-none" />
              </div>
              {form.categorie_fei === "feigs" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                  <span><strong>Rappel FEIGS :</strong> Un formulaire de déclaration ARS sera requis à l'étape 5.</span>
                </motion.div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Description détaillée de l'événement
              </h2>
              <div className="space-y-2">
                <Label>Décrivez l'événement en détail</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Qui, quoi, quand, comment... Décrivez les faits objectivement." rows={7} required className="resize-none" />
                <p className="text-xs text-muted-foreground text-right">{form.description.length} caractères</p>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-red-900">Déclaration ARS</h2>
                  <p className="text-xs text-red-500 mt-0.5">Formulaire réglementaire — Agence Régionale de Santé</p>
                </div>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50/70 px-4 py-3 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <p>Cet événement est classifié <strong>FEIGS</strong>. La déclaration à l'ARS est <strong>obligatoire</strong>. Tous les champs ci-dessous sont requis.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nature de l'événement <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={form.nature_evenement_ars}
                    onChange={(e) => setForm({ ...form, nature_evenement_ars: e.target.value })}
                    placeholder="Décrivez la nature précise de l'événement indésirable grave et significatif..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Circonstances <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={form.circonstances_ars}
                    onChange={(e) => setForm({ ...form, circonstances_ars: e.target.value })}
                    placeholder="Décrivez le contexte, les circonstances et le déroulement des faits..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conséquences pour le résident <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={form.consequences_resident_ars}
                    onChange={(e) => setForm({ ...form, consequences_resident_ars: e.target.value })}
                    placeholder="Précisez les conséquences médicales, psychologiques et sociales pour le ou les résidents concernés..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mesures prises <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={form.mesures_prises_ars}
                    onChange={(e) => setForm({ ...form, mesures_prises_ars: e.target.value })}
                    placeholder="Décrivez les mesures immédiates et préventives mises en place suite à l'événement..."
                    rows={3}
                    className="resize-none"
                  />
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
        {step < activeSteps.length ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className={`gap-2 ${step === 4 && form.categorie_fei === "feigs" ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : ""}`}
          >
            {step === 4 && form.categorie_fei === "feigs" ? (
              <><Building2 className="w-4 h-4" /> Déclaration ARS <ChevronRight className="w-4 h-4" /></>
            ) : step === 3 && form.categorie_fei === "feigs" ? (
              <>Suivant — Description <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Suivant <ChevronRight className="w-4 h-4" /></>
            )}
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
