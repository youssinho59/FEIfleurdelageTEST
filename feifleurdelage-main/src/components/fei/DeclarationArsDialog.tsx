import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Building2, FileDown, Loader2, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";

const NATURES_FAITS = [
  "Sinistre ou événement météorologique",
  "Accident/incident lié à une défaillance technique ou un événement de santé environnementale",
  "Perturbation de l'organisation du travail / des ressources humaines",
  "Accident/incident lié à une erreur ou à un défaut de soin ou de surveillance",
  "Perturbation liée à des difficultés relationnelles avec la famille/les proches/des personnes extérieures",
  "Décès accidentel ou consécutif à un défaut de surveillance",
  "Suicide ou tentative de suicide",
  "Situation de maltraitance envers les usagers",
  "Disparition inquiétante",
  "Comportement violent d'usagers envers d'autres usagers ou envers le personnel / manquement grave au règlement",
  "Actes de malveillance au sein de la structure",
];

const AUTORITES = [
  { key: "ars", label: "ARS" },
  { key: "prefet", label: "Préfet" },
  { key: "ddcs", label: "DDCS-PP" },
  { key: "pcd", label: "Président du conseil départemental" },
];

type DeclarationData = {
  autorites_informees: string[];
  nature_faits: string[];
  circonstances: string;
  nb_victimes_exposees: string;
  consequences_personnes: string;
  consequences_personnel: string;
  consequences_organisation: string;
  secours_intervention: boolean;
  secours_precision: string;
  mesures_victimes: string;
  mesures_continuite: string;
  mesures_autres: string;
  information_familles: string;
  dispositions_usagers: string;
  dispositions_personnel: string;
  dispositions_organisation: string;
  dispositions_structure: string;
  suites_enquete: string;
  suites_plainte: string;
  suites_procureur: string;
  evolutions_previsibles: string;
  impact_mediatique: boolean;
  medias_informes: boolean;
  communication_prevue: boolean;
  communication_precision: string;
};

const DEFAULT_DATA: DeclarationData = {
  autorites_informees: [],
  nature_faits: [],
  circonstances: "",
  nb_victimes_exposees: "",
  consequences_personnes: "",
  consequences_personnel: "",
  consequences_organisation: "",
  secours_intervention: false,
  secours_precision: "",
  mesures_victimes: "",
  mesures_continuite: "",
  mesures_autres: "",
  information_familles: "",
  dispositions_usagers: "",
  dispositions_personnel: "",
  dispositions_organisation: "",
  dispositions_structure: "",
  suites_enquete: "",
  suites_plainte: "",
  suites_procureur: "",
  evolutions_previsibles: "",
  impact_mediatique: false,
  medias_informes: false,
  communication_prevue: false,
  communication_precision: "",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feiId: string;
  feiData: {
    description: string;
    date_evenement: string;
    lieu: string;
    declarant_nom: string;
    service: string | null;
    type_fei: string;
  };
};

const DeclarationArsDialog = ({ open, onOpenChange, feiId, feiData }: Props) => {
  const [data, setData] = useState<DeclarationData>(DEFAULT_DATA);
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && feiId) {
      loadDeclaration();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, feiId]);

  const loadDeclaration = async () => {
    setLoading(true);
    const { data: existing } = await supabase
      .from("fei_declaration")
      .select("*")
      .eq("fei_id", feiId)
      .maybeSingle();

    if (existing) {
      setDeclarationId(existing.id as string);
      setData({
        autorites_informees: (existing.autorites_informees as string[]) || [],
        nature_faits: (existing.nature_faits as string[]) || [],
        circonstances: (existing.circonstances as string) || "",
        nb_victimes_exposees: (existing.nb_victimes_exposees as string) || "",
        consequences_personnes: (existing.consequences_personnes as string) || "",
        consequences_personnel: (existing.consequences_personnel as string) || "",
        consequences_organisation: (existing.consequences_organisation as string) || "",
        secours_intervention: (existing.secours_intervention as boolean) || false,
        secours_precision: (existing.secours_precision as string) || "",
        mesures_victimes: (existing.mesures_victimes as string) || "",
        mesures_continuite: (existing.mesures_continuite as string) || "",
        mesures_autres: (existing.mesures_autres as string) || "",
        information_familles: (existing.information_familles as string) || "",
        dispositions_usagers: (existing.dispositions_usagers as string) || "",
        dispositions_personnel: (existing.dispositions_personnel as string) || "",
        dispositions_organisation: (existing.dispositions_organisation as string) || "",
        dispositions_structure: (existing.dispositions_structure as string) || "",
        suites_enquete: (existing.suites_enquete as string) || "",
        suites_plainte: (existing.suites_plainte as string) || "",
        suites_procureur: (existing.suites_procureur as string) || "",
        evolutions_previsibles: (existing.evolutions_previsibles as string) || "",
        impact_mediatique: (existing.impact_mediatique as boolean) || false,
        medias_informes: (existing.medias_informes as boolean) || false,
        communication_prevue: (existing.communication_prevue as boolean) || false,
        communication_precision: (existing.communication_precision as string) || "",
      });
    } else {
      setDeclarationId(null);
      setData(DEFAULT_DATA);
    }
    setLoading(false);
  };

  const update = <K extends keyof DeclarationData>(key: K, value: DeclarationData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: "autorites_informees" | "nature_faits", item: string) => {
    setData((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...data, fei_id: feiId, updated_at: new Date().toISOString() };

    let error;
    if (declarationId) {
      ({ error } = await supabase.from("fei_declaration").update(payload).eq("id", declarationId));
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("fei_declaration")
        .insert(payload)
        .select()
        .single();
      error = insertError;
      if (inserted) setDeclarationId((inserted as { id: string }).id);
    }

    if (error) {
      toast.error("Erreur lors de la sauvegarde : " + error.message);
    } else {
      toast.success("Déclaration ARS enregistrée");
    }
    setSaving(false);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 18;
    let y = margin;
    const lineH = 5.5;
    const pageH = 275;
    const maxW = 174;

    const checkPage = (needed = lineH) => {
      if (y + needed > pageH) { doc.addPage(); y = margin; }
    };

    const addText = (text: string, bold = false, size = 9.5) => {
      checkPage();
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxW);
      doc.text(lines, margin, y);
      y += lines.length * lineH;
    };

    const section = (title: string) => {
      y += 2;
      checkPage(10);
      doc.setFillColor(196, 107, 72);
      doc.roundedRect(margin - 2, y - 3.5, maxW + 4, 7, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), margin, y + 0.5);
      doc.setTextColor(30, 30, 30);
      y += 6;
    };

    const field = (label: string, value: string) => {
      if (!value?.trim()) return;
      addText(label + " :", true, 8.5);
      addText(value, false, 9);
      y += 1;
    };

    // Header
    doc.setFillColor(196, 107, 72);
    doc.rect(0, 0, 210, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Déclaration d'événement indésirable — ARS", margin, 10);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Décret 2016-1813 — EHPAD La Fleur de l'Âge", margin, 16);
    doc.setTextColor(30, 30, 30);
    y = 26;

    addText(`Date de déclaration : ${new Date().toLocaleDateString("fr-FR")}`, false, 8.5);
    y += 2;

    section("Événement concerné");
    field("Type", feiData.type_fei);
    field("Date de l'événement", new Date(feiData.date_evenement + "T00:00:00").toLocaleDateString("fr-FR"));
    field("Lieu", feiData.lieu);
    field("Déclarant", feiData.declarant_nom);
    if (feiData.service) field("Service", feiData.service);
    field("Description", feiData.description);

    if (data.autorites_informees.length > 0) {
      section("Autorités informées");
      addText(data.autorites_informees.join(" · "), false, 9);
    }

    if (data.nature_faits.length > 0) {
      section("Nature des faits");
      data.nature_faits.forEach((n) => addText("• " + n, false, 8.5));
    }

    if (data.circonstances) { section("Circonstances et déroulement"); addText(data.circonstances, false, 9); }
    if (data.nb_victimes_exposees) { section("Victimes / Personnes exposées"); addText(data.nb_victimes_exposees, false, 9); }

    if (data.consequences_personnes || data.consequences_personnel || data.consequences_organisation) {
      section("Conséquences constatées");
      field("Pour les personnes prises en charge", data.consequences_personnes);
      field("Pour les personnels", data.consequences_personnel);
      field("Pour l'organisation", data.consequences_organisation);
    }

    if (data.secours_intervention) {
      section("Intervention des secours");
      addText("Oui" + (data.secours_precision ? ` — ${data.secours_precision}` : ""), false, 9);
    }

    if (data.mesures_victimes || data.mesures_continuite || data.mesures_autres) {
      section("Mesures immédiates");
      field("Protection / accompagnement des victimes", data.mesures_victimes);
      field("Continuité de la prise en charge", data.mesures_continuite);
      field("Autres mesures", data.mesures_autres);
    }

    if (data.information_familles) { section("Information des familles"); addText(data.information_familles, false, 9); }

    if (data.dispositions_usagers || data.dispositions_personnel || data.dispositions_organisation || data.dispositions_structure) {
      section("Dispositions prises ou envisagées");
      field("Usagers / résidents", data.dispositions_usagers);
      field("Personnel", data.dispositions_personnel);
      field("Organisation du travail", data.dispositions_organisation);
      field("Structure", data.dispositions_structure);
    }

    if (data.suites_enquete || data.suites_plainte || data.suites_procureur) {
      section("Suites administratives ou judiciaires");
      field("Enquête police / gendarmerie", data.suites_enquete);
      field("Dépôt de plainte", data.suites_plainte);
      field("Signalement procureur", data.suites_procureur);
    }

    if (data.evolutions_previsibles) { section("Évolutions prévisibles"); addText(data.evolutions_previsibles, false, 9); }

    if (data.impact_mediatique || data.medias_informes || data.communication_prevue || data.communication_precision) {
      section("Répercussions médiatiques");
      addText(`Impact médiatique possible : ${data.impact_mediatique ? "Oui" : "Non"}`, false, 9);
      addText(`Médias déjà informés : ${data.medias_informes ? "Oui" : "Non"}`, false, 9);
      addText(`Communication effectuée ou prévue : ${data.communication_prevue ? "Oui" : "Non"}`, false, 9);
      if (data.communication_precision) field("Précision", data.communication_precision);
    }

    const dateStr = new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");
    doc.save(`Declaration_ARS_FEI_${feiId.slice(0, 8)}_${dateStr}.pdf`);
  };

  const OuiNon = ({
    label, value, onChange,
  }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center gap-4">
      <Label className="text-sm w-56 shrink-0">{label}</Label>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Checkbox id={`${label}-oui`} checked={value} onCheckedChange={() => onChange(true)} />
          <label htmlFor={`${label}-oui`} className="text-sm cursor-pointer">Oui</label>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox id={`${label}-non`} checked={!value} onCheckedChange={() => onChange(false)} />
          <label htmlFor={`${label}-non`} className="text-sm cursor-pointer">Non</label>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Building2 className="w-5 h-5 text-red-600" />
            Déclaration ARS officielle
            <span className="text-xs font-normal text-muted-foreground">(Décret 2016-1813)</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 py-1">
            {/* Établissement — pré-rempli */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Établissement / Événement concerné</p>
              <p><span className="text-muted-foreground">Établissement :</span> EHPAD La Fleur de l'Âge</p>
              <p><span className="text-muted-foreground">Type FEI :</span> {feiData.type_fei}</p>
              <p>
                <span className="text-muted-foreground">Date :</span>{" "}
                {new Date(feiData.date_evenement + "T00:00:00").toLocaleDateString("fr-FR")}
                {" — "}
                <span className="text-muted-foreground">Lieu :</span> {feiData.lieu}
              </p>
              <p>
                <span className="text-muted-foreground">Déclarant :</span> {feiData.declarant_nom}
                {feiData.service ? ` — ${feiData.service}` : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{feiData.description}</p>
            </div>

            {/* Autorités informées */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Autorités informées
              </Label>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {AUTORITES.map((a) => (
                  <div key={a.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`autorite-${a.key}`}
                      checked={data.autorites_informees.includes(a.label)}
                      onCheckedChange={() => toggleArrayItem("autorites_informees", a.label)}
                    />
                    <label htmlFor={`autorite-${a.key}`} className="text-sm cursor-pointer">{a.label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Nature des faits */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nature des faits
              </Label>
              <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
                {NATURES_FAITS.map((n, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Checkbox
                      id={`nature-${i}`}
                      checked={data.nature_faits.includes(n)}
                      onCheckedChange={() => toggleArrayItem("nature_faits", n)}
                      className="mt-0.5 shrink-0"
                    />
                    <label htmlFor={`nature-${i}`} className="text-sm cursor-pointer leading-snug">{n}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Circonstances */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Circonstances et déroulement des faits
              </Label>
              <Textarea
                value={data.circonstances}
                onChange={(e) => update("circonstances", e.target.value)}
                placeholder="Date / heure des faits et de la constatation, déroulement chronologique..."
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Victimes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre de personnes victimes ou exposées
              </Label>
              <Input
                value={data.nb_victimes_exposees}
                onChange={(e) => update("nb_victimes_exposees", e.target.value)}
                placeholder="Ex : 2 résidents, 1 agent..."
                className="text-sm h-8"
              />
            </div>

            {/* Conséquences */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conséquences constatées
              </Label>
              <div className="space-y-2 pl-3 border-l-2 border-muted">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pour la / les personnes prises en charge</Label>
                  <Textarea value={data.consequences_personnes} onChange={(e) => update("consequences_personnes", e.target.value)} rows={2} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pour les personnels</Label>
                  <Textarea value={data.consequences_personnel} onChange={(e) => update("consequences_personnel", e.target.value)} rows={2} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pour l'organisation et le fonctionnement de la structure</Label>
                  <Textarea value={data.consequences_organisation} onChange={(e) => update("consequences_organisation", e.target.value)} rows={2} className="text-sm" />
                </div>
              </div>
            </div>

            {/* Secours */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Demande d'intervention des secours
              </Label>
              <OuiNon label="Intervention des secours ?" value={data.secours_intervention} onChange={(v) => update("secours_intervention", v)} />
              {data.secours_intervention && (
                <Input
                  value={data.secours_precision}
                  onChange={(e) => update("secours_precision", e.target.value)}
                  placeholder="Pompiers, SAMU, police, gendarmerie..."
                  className="text-sm h-8"
                />
              )}
            </div>

            {/* Mesures immédiates */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mesures immédiates prises
              </Label>
              <div className="space-y-2 pl-3 border-l-2 border-muted">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pour protéger / accompagner / soutenir les victimes</Label>
                  <Textarea value={data.mesures_victimes} onChange={(e) => update("mesures_victimes", e.target.value)} rows={2} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pour assurer la continuité de la prise en charge</Label>
                  <Textarea value={data.mesures_continuite} onChange={(e) => update("mesures_continuite", e.target.value)} rows={2} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">À l'égard des autres personnes ou du personnel</Label>
                  <Textarea value={data.mesures_autres} onChange={(e) => update("mesures_autres", e.target.value)} rows={2} className="text-sm" />
                </div>
              </div>
            </div>

            {/* Information familles */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Information des personnes concernées, familles et proches
              </Label>
              <Textarea value={data.information_familles} onChange={(e) => update("information_familles", e.target.value)} rows={2} className="text-sm" />
            </div>

            {/* Dispositions */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dispositions prises ou envisagées
              </Label>
              <div className="space-y-2 pl-3 border-l-2 border-muted">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Concernant les usagers / résidents</Label>
                  <Textarea value={data.dispositions_usagers} onChange={(e) => update("dispositions_usagers", e.target.value)} rows={2} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Concernant le personnel</Label>
                  <Textarea value={data.dispositions_personnel} onChange={(e) => update("dispositions_personnel", e.target.value)} rows={2} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Concernant l'organisation du travail</Label>
                  <Textarea value={data.dispositions_organisation} onChange={(e) => update("dispositions_organisation", e.target.value)} rows={2} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Concernant la structure</Label>
                  <Textarea value={data.dispositions_structure} onChange={(e) => update("dispositions_structure", e.target.value)} rows={2} className="text-sm" />
                </div>
              </div>
            </div>

            {/* Suites judiciaires */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Suites administratives ou judiciaires
              </Label>
              <div className="space-y-2 pl-3 border-l-2 border-muted">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Enquête police / gendarmerie (coordonnées + date)</Label>
                  <Input value={data.suites_enquete} onChange={(e) => update("suites_enquete", e.target.value)} className="text-sm h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Dépôt de plainte</Label>
                  <Input value={data.suites_plainte} onChange={(e) => update("suites_plainte", e.target.value)} className="text-sm h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Signalement au procureur de la République</Label>
                  <Input value={data.suites_procureur} onChange={(e) => update("suites_procureur", e.target.value)} className="text-sm h-8" />
                </div>
              </div>
            </div>

            {/* Évolutions */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Évolutions prévisibles ou difficultés attendues
              </Label>
              <Textarea value={data.evolutions_previsibles} onChange={(e) => update("evolutions_previsibles", e.target.value)} rows={2} className="text-sm" />
            </div>

            {/* Médias */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Répercussions médiatiques
              </Label>
              <div className="space-y-2.5 pl-3 border-l-2 border-muted">
                <OuiNon label="Impact médiatique possible ?" value={data.impact_mediatique} onChange={(v) => update("impact_mediatique", v)} />
                <OuiNon label="Médias déjà informés ?" value={data.medias_informes} onChange={(v) => update("medias_informes", v)} />
                <OuiNon label="Communication effectuée ou prévue ?" value={data.communication_prevue} onChange={(v) => update("communication_prevue", v)} />
                {data.communication_prevue && (
                  <Textarea
                    value={data.communication_precision}
                    onChange={(e) => update("communication_precision", e.target.value)}
                    placeholder="Précision sur la communication effectuée ou prévue..."
                    rows={2}
                    className="text-sm"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
            <FileDown className="w-3.5 h-3.5" />
            Exporter la déclaration PDF
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {saving ? "Enregistrement..." : "Enregistrer la déclaration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeclarationArsDialog;
