import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ShieldAlert, Plus, Pencil, Trash2, AlertTriangle, CheckCircle2,
  Archive, ChevronRight, Activity, TrendingUp, Shield, Zap,
  Loader2, Sparkles, Lightbulb,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DuerpVersion = {
  id: string;
  annee: number;
  titre: string;
  date_validation: string | null;
  statut: "en_cours" | "valide" | "archive";
  fichier_nom: string | null;
  observations: string | null;
  created_by: string | null;
  created_at: string;
};

type DuerpRisque = {
  id: string;
  version_id: string;
  unite_travail: string;
  situation_dangereuse: string;
  dangers: string | null;
  personnes_exposees: string | null;
  probabilite: number | null;
  gravite: number | null;
  criticite: number | null;
  mesures_existantes: string | null;
  mesures_proposees: string | null;
  priorite: "faible" | "moyenne" | "haute" | "critique";
  action_corrective_id: string | null;
  pacq_action_id: string | null;
  statut: "ouvert" | "en_traitement" | "clos";
  created_by: string | null;
  created_at: string;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const UNITES_TRAVAIL = [
  "Soins", "Cuisine", "Administration", "Technique",
  "Lingerie", "Animation", "Direction", "Entretien",
];

const PROBA_LABELS: Record<number, string> = {
  1: "Rare",
  2: "Peu probable",
  3: "Probable",
  4: "Très probable",
};

const GRAVITE_LABELS: Record<number, string> = {
  1: "Faible",
  2: "Modérée",
  3: "Grave",
  4: "Très grave",
};

const getCriticiteBadge = (criticite: number | null) => {
  if (criticite === null) return { color: "bg-slate-100 text-slate-600", label: "N/A" };
  if (criticite <= 4) return { color: "bg-emerald-100 text-emerald-700", label: String(criticite) };
  if (criticite <= 8) return { color: "bg-amber-100 text-amber-700", label: String(criticite) };
  return { color: "bg-red-100 text-red-700", label: String(criticite) };
};

const VERSION_STATUT_CONFIG: Record<DuerpVersion["statut"], { label: string; color: string }> = {
  en_cours: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  valide:   { label: "Validé",   color: "bg-emerald-100 text-emerald-700" },
  archive:  { label: "Archivé",  color: "bg-slate-100 text-slate-600" },
};

const RISQUE_STATUT_CONFIG: Record<DuerpRisque["statut"], { label: string; color: string }> = {
  ouvert:        { label: "Ouvert",        color: "bg-red-100 text-red-700" },
  en_traitement: { label: "En traitement", color: "bg-blue-100 text-blue-700" },
  clos:          { label: "Clos",          color: "bg-emerald-100 text-emerald-700" },
};

const PRIORITE_RISQUE_CONFIG: Record<DuerpRisque["priorite"], { label: string; color: string }> = {
  faible:   { label: "Faible",   color: "bg-emerald-100 text-emerald-700" },
  moyenne:  { label: "Moyenne",  color: "bg-amber-100 text-amber-700" },
  haute:    { label: "Haute",    color: "bg-orange-100 text-orange-700" },
  critique: { label: "Critique", color: "bg-red-100 text-red-700" },
};

const EMPTY_VERSION_FORM = {
  annee: new Date().getFullYear(),
  titre: "",
  date_validation: "",
  observations: "",
  statut: "en_cours" as DuerpVersion["statut"],
};

const EMPTY_RISQUE_FORM = {
  unite_travail: "",
  situation_dangereuse: "",
  dangers: "",
  personnes_exposees: "",
  probabilite: "" as string,
  gravite: "" as string,
  mesures_existantes: "",
  mesures_proposees: "",
  priorite: "moyenne" as DuerpRisque["priorite"],
  statut: "ouvert" as DuerpRisque["statut"],
};

type AiRisqueProposition = {
  situation_dangereuse: string;
  risques: string;
  dommages: string;
  effectif_expose: number;
  probabilite: number;
  gravite: number;
  criticite: number;
  mesures_existantes: string;
  mesures_proposees: string;
  priorite: string;
};

const PRIORITE_MAP: Record<string, DuerpRisque["priorite"]> = {
  "Faible": "faible",
  "Modérée": "moyenne",
  "Élevée": "haute",
  "Critique": "critique",
};

const PRIORITE_COLOR_AI: Record<string, string> = {
  "Faible":   "bg-emerald-100 text-emerald-700",
  "Modérée":  "bg-amber-100 text-amber-700",
  "Élevée":   "bg-orange-100 text-orange-700",
  "Critique": "bg-red-100 text-red-700",
};

const AI_SYSTEM_PROMPT = `Tu es un expert en prévention des risques professionnels en EHPAD (établissement d'hébergement pour personnes âgées dépendantes).
Tu dois analyser une situation dangereuse et compléter une fiche DUERP.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires.`;

async function callAnthropicApi(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Clé API Anthropic manquante (VITE_ANTHROPIC_API_KEY)");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!response.ok) throw new Error(`Erreur API : ${response.status}`);
  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariant = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DuerpPage() {
  const { user, isAdmin, isResponsable } = useAuth();

  const [activeTab, setActiveTab] = useState<"versions" | "risques">("versions");
  const [versions, setVersions] = useState<DuerpVersion[]>([]);
  const [risques, setRisques] = useState<DuerpRisque[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [loadingRisques, setLoadingRisques] = useState(false);

  // Version dialog
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<DuerpVersion | null>(null);
  const [versionForm, setVersionForm] = useState(EMPTY_VERSION_FORM);
  const [savingVersion, setSavingVersion] = useState(false);
  const [deleteVersionTarget, setDeleteVersionTarget] = useState<DuerpVersion | null>(null);
  const [deletingVersion, setDeletingVersion] = useState(false);

  // Risque dialog
  const [risqueDialogOpen, setRisqueDialogOpen] = useState(false);
  const [editingRisque, setEditingRisque] = useState<DuerpRisque | null>(null);
  const [risqueForm, setRisqueForm] = useState(EMPTY_RISQUE_FORM);
  const [savingRisque, setSavingRisque] = useState(false);
  const [deleteRisqueTarget, setDeleteRisqueTarget] = useState<DuerpRisque | null>(null);
  const [deletingRisque, setDeletingRisque] = useState(false);

  // IA — auto-complétion
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());

  // IA — propositions par unité de travail
  const [propositionsDialogOpen, setPropositionsDialogOpen] = useState(false);
  const [propositionsUnite, setPropositionsUnite] = useState("");
  const [propositionsLoading, setPropositionsLoading] = useState(false);
  const [propositionsData, setPropositionsData] = useState<AiRisqueProposition[]>([]);
  const [propositionsSelection, setPropositionsSelection] = useState<boolean[]>([]);
  const [importingPropositions, setImportingPropositions] = useState(false);

  // Action PACQS dialog
  const [pacqDialogOpen, setPacqDialogOpen] = useState(false);
  const [pacqRisque, setPacqRisque] = useState<DuerpRisque | null>(null);
  const [pacqTitre, setPacqTitre] = useState("");
  const [savingPacq, setSavingPacq] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchVersions = async () => {
    setLoadingVersions(true);
    const { data, error } = await supabase
      .from("duerp_versions")
      .select("*")
      .order("annee", { ascending: false });
    if (error) toast.error("Erreur : " + error.message);
    else setVersions((data as DuerpVersion[]) || []);
    setLoadingVersions(false);
  };

  const fetchRisques = async () => {
    setLoadingRisques(true);
    const { data, error } = await supabase
      .from("duerp_risques")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erreur : " + error.message);
    else setRisques((data as DuerpRisque[]) || []);
    setLoadingRisques(false);
  };

  useEffect(() => {
    fetchVersions();
    fetchRisques();
  }, []);

  // ── Stats globales ─────────────────────────────────────────────────────────

  const totalRisques = risques.length;
  const risquesCritiques = risques.filter(r => (r.criticite ?? 0) > 8).length;
  const risquesEnTraitement = risques.filter(r => r.statut === "en_traitement").length;
  const risquesAvecAction = risques.filter(r => r.action_corrective_id !== null).length;
  const tauxCouverture = totalRisques > 0 ? Math.round((risquesAvecAction / totalRisques) * 100) : 0;

  // ── Risques filtrés par version sélectionnée ──────────────────────────────

  const risquesVersion = risques
    .filter(r => r.version_id === selectedVersionId)
    .sort((a, b) => (b.criticite ?? 0) - (a.criticite ?? 0));

  const risquesVersionCritiques = risquesVersion.filter(r => (r.criticite ?? 0) > 8).length;
  const risquesVersionEnTraitement = risquesVersion.filter(r => r.statut === "en_traitement").length;

  // ── Version handlers ───────────────────────────────────────────────────────

  const openCreateVersion = () => {
    setEditingVersion(null);
    setVersionForm(EMPTY_VERSION_FORM);
    setVersionDialogOpen(true);
  };

  const openEditVersion = (v: DuerpVersion) => {
    setEditingVersion(v);
    setVersionForm({
      annee: v.annee,
      titre: v.titre,
      date_validation: v.date_validation || "",
      observations: v.observations || "",
      statut: v.statut,
    });
    setVersionDialogOpen(true);
  };

  const handleSaveVersion = async () => {
    if (!user) return;
    if (!versionForm.titre.trim()) {
      toast.error("Le titre est obligatoire.");
      return;
    }
    setSavingVersion(true);
    const payload = {
      annee: versionForm.annee,
      titre: versionForm.titre.trim(),
      date_validation: versionForm.date_validation || null,
      observations: versionForm.observations.trim() || null,
      statut: versionForm.statut,
    };
    const { error } = editingVersion
      ? await supabase.from("duerp_versions").update(payload).eq("id", editingVersion.id)
      : await supabase.from("duerp_versions").insert({ ...payload, created_by: user.id });
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success(editingVersion ? "Version mise à jour." : "Version créée.");
      setVersionDialogOpen(false);
      fetchVersions();
    }
    setSavingVersion(false);
  };

  const handleDeleteVersion = async () => {
    if (!deleteVersionTarget) return;
    setDeletingVersion(true);
    const { error } = await supabase.from("duerp_versions").delete().eq("id", deleteVersionTarget.id);
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success("Version supprimée.");
      setDeleteVersionTarget(null);
      if (selectedVersionId === deleteVersionTarget.id) setSelectedVersionId(null);
      fetchVersions();
      fetchRisques();
    }
    setDeletingVersion(false);
  };

  const handleActivateVersion = async (v: DuerpVersion) => {
    const { error } = await supabase.from("duerp_versions").update({ statut: "valide" }).eq("id", v.id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Version validée."); fetchVersions(); }
  };

  const handleArchiveVersion = async (v: DuerpVersion) => {
    const { error } = await supabase.from("duerp_versions").update({ statut: "archive" }).eq("id", v.id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Version archivée."); fetchVersions(); }
  };

  const handleSelectVersion = (v: DuerpVersion) => {
    setSelectedVersionId(v.id);
    setActiveTab("risques");
  };

  // ── Risque handlers ────────────────────────────────────────────────────────

  const openCreateRisque = () => {
    if (!selectedVersionId) return;
    setEditingRisque(null);
    setRisqueForm(EMPTY_RISQUE_FORM);
    setAiFilledFields(new Set());
    setRisqueDialogOpen(true);
  };

  const openEditRisque = (r: DuerpRisque) => {
    setEditingRisque(r);
    setAiFilledFields(new Set());
    setRisqueForm({
      unite_travail: r.unite_travail,
      situation_dangereuse: r.situation_dangereuse,
      dangers: r.dangers || "",
      personnes_exposees: r.personnes_exposees || "",
      probabilite: r.probabilite ? String(r.probabilite) : "",
      gravite: r.gravite ? String(r.gravite) : "",
      mesures_existantes: r.mesures_existantes || "",
      mesures_proposees: r.mesures_proposees || "",
      priorite: r.priorite,
      statut: r.statut,
    });
    setRisqueDialogOpen(true);
  };

  const handleSaveRisque = async () => {
    if (!user || !selectedVersionId) return;
    if (!risqueForm.unite_travail || !risqueForm.situation_dangereuse.trim()) {
      toast.error("L'unité de travail et la situation dangereuse sont obligatoires.");
      return;
    }
    setSavingRisque(true);
    const payload = {
      version_id: selectedVersionId,
      unite_travail: risqueForm.unite_travail,
      situation_dangereuse: risqueForm.situation_dangereuse.trim(),
      dangers: risqueForm.dangers.trim() || null,
      personnes_exposees: risqueForm.personnes_exposees.trim() || null,
      probabilite: risqueForm.probabilite ? Number(risqueForm.probabilite) : null,
      gravite: risqueForm.gravite ? Number(risqueForm.gravite) : null,
      mesures_existantes: risqueForm.mesures_existantes.trim() || null,
      mesures_proposees: risqueForm.mesures_proposees.trim() || null,
      priorite: risqueForm.priorite,
      statut: risqueForm.statut,
    };
    const { error } = editingRisque
      ? await supabase.from("duerp_risques").update(payload).eq("id", editingRisque.id)
      : await supabase.from("duerp_risques").insert({ ...payload, created_by: user.id });
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success(editingRisque ? "Risque mis à jour." : "Risque ajouté.");
      setRisqueDialogOpen(false);
      fetchRisques();
    }
    setSavingRisque(false);
  };

  const handleDeleteRisque = async () => {
    if (!deleteRisqueTarget) return;
    setDeletingRisque(true);
    const { error } = await supabase.from("duerp_risques").delete().eq("id", deleteRisqueTarget.id);
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success("Risque supprimé.");
      setDeleteRisqueTarget(null);
      fetchRisques();
    }
    setDeletingRisque(false);
  };

  // ── Action PACQS handler ───────────────────────────────────────────────────

  const openPacqDialog = (r: DuerpRisque) => {
    setPacqRisque(r);
    setPacqTitre(`[DUERP] ${r.situation_dangereuse}`);
    setPacqDialogOpen(true);
  };

  const handleCreatePacqAction = async () => {
    if (!user || !pacqRisque || !pacqTitre.trim()) return;
    setSavingPacq(true);

    const today = new Date();
    const echeance = new Date(today.setMonth(today.getMonth() + 3)).toISOString().split("T")[0];

    const { data: actionData, error: actionError } = await supabase
      .from("actions_correctives")
      .insert({
        titre: pacqTitre.trim(),
        description: `Issu du DUERP — Unité de travail : ${pacqRisque.unite_travail}. Situation dangereuse : ${pacqRisque.situation_dangereuse}`,
        responsable: "À définir",
        date_echeance: echeance,
        priorite: pacqRisque.priorite === "critique" ? "haute" : pacqRisque.priorite === "haute" ? "haute" : "moyenne",
        statut: "a_faire",
        source: "Cartographie des risques",
        user_id: user.id,
      })
      .select("id")
      .single();

    if (actionError) {
      toast.error("Erreur lors de la création de l'action : " + actionError.message);
      setSavingPacq(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("duerp_risques")
      .update({ action_corrective_id: actionData.id, statut: "en_traitement" })
      .eq("id", pacqRisque.id);

    if (updateError) toast.error("Erreur lors de la liaison : " + updateError.message);
    else {
      toast.success("Action corrective créée et liée au risque.");
      setPacqDialogOpen(false);
      fetchRisques();
    }
    setSavingPacq(false);
  };

  // ── Calcul criticité en temps réel ────────────────────────────────────────

  const probNum = risqueForm.probabilite ? Number(risqueForm.probabilite) : null;
  const gravNum = risqueForm.gravite ? Number(risqueForm.gravite) : null;
  const criticiteLive = probNum !== null && gravNum !== null ? probNum * gravNum : null;

  // ── IA — Auto-complétion risque ───────────────────────────────────────────

  const handleAiComplete = async () => {
    if (!risqueForm.unite_travail || !risqueForm.situation_dangereuse.trim()) return;
    setAiLoading(true);
    try {
      const userPrompt = `Unité de travail : ${risqueForm.unite_travail}\nSituation dangereuse : ${risqueForm.situation_dangereuse}\nComplète la fiche DUERP en JSON avec exactement ces champs :\n{\n"risques": "description des risques identifiés",\n"dommages": "dommages potentiels pour les agents",\n"effectif_expose": nombre entier estimé,\n"probabilite": nombre entre 1 et 4,\n"gravite": nombre entre 1 et 4,\n"criticite": nombre entre 1 et 16 (probabilite × gravite),\n"mesures_existantes": "mesures de prévention déjà en place typiquement dans un EHPAD",\n"mesures_proposees": "actions correctives recommandées",\n"priorite": "Faible" | "Modérée" | "Élevée" | "Critique"\n}`;
      const text = await callAnthropicApi(AI_SYSTEM_PROMPT, userPrompt);
      const json = JSON.parse(text.trim());
      const filled = new Set<string>();
      const updates: Partial<typeof risqueForm> = {};
      if (json.risques) { updates.dangers = json.risques; filled.add("dangers"); }
      if (json.dommages) {
        const eff = json.effectif_expose ? ` (${json.effectif_expose} exposés)` : "";
        updates.personnes_exposees = json.dommages + eff;
        filled.add("personnes_exposees");
      }
      if (json.probabilite) { updates.probabilite = String(Math.min(4, Math.max(1, Number(json.probabilite)))); filled.add("probabilite"); }
      if (json.gravite) { updates.gravite = String(Math.min(4, Math.max(1, Number(json.gravite)))); filled.add("gravite"); }
      if (json.mesures_existantes) { updates.mesures_existantes = json.mesures_existantes; filled.add("mesures_existantes"); }
      if (json.mesures_proposees) { updates.mesures_proposees = json.mesures_proposees; filled.add("mesures_proposees"); }
      if (json.priorite && PRIORITE_MAP[json.priorite]) { updates.priorite = PRIORITE_MAP[json.priorite]; filled.add("priorite"); }
      setRisqueForm(f => ({ ...f, ...updates }));
      setAiFilledFields(filled);
    } catch {
      toast.error("Erreur IA, veuillez réessayer");
    }
    setAiLoading(false);
  };

  // ── IA — Propositions par unité de travail ────────────────────────────────

  const handleGeneratePropositions = async () => {
    if (!propositionsUnite) return;
    setPropositionsLoading(true);
    setPropositionsData([]);
    try {
      const userPrompt = `Unité de travail : ${propositionsUnite}\nGénère une liste de 10 risques professionnels typiques pour cette unité de travail dans un EHPAD.\nRéponds UNIQUEMENT en JSON valide, sans markdown :\n{\n"risques": [\n{\n"situation_dangereuse": "...",\n"risques": "...",\n"dommages": "...",\n"effectif_expose": nombre,\n"probabilite": 1-4,\n"gravite": 1-4,\n"criticite": nombre,\n"mesures_existantes": "...",\n"mesures_proposees": "...",\n"priorite": "Faible|Modérée|Élevée|Critique"\n}\n]\n}`;
      const text = await callAnthropicApi(AI_SYSTEM_PROMPT, userPrompt);
      const json = JSON.parse(text.trim());
      const items: AiRisqueProposition[] = json.risques ?? [];
      setPropositionsData(items);
      setPropositionsSelection(items.map(() => true));
    } catch {
      toast.error("Erreur IA, veuillez réessayer");
    }
    setPropositionsLoading(false);
  };

  const handleImportPropositions = async () => {
    if (!user || !selectedVersionId) return;
    const toImport = propositionsData.filter((_, i) => propositionsSelection[i]);
    if (toImport.length === 0) return;
    setImportingPropositions(true);
    const rows = toImport.map(p => ({
      version_id: selectedVersionId,
      unite_travail: propositionsUnite,
      situation_dangereuse: p.situation_dangereuse,
      dangers: p.risques || null,
      personnes_exposees: p.dommages ? p.dommages + (p.effectif_expose ? ` (${p.effectif_expose} exposés)` : "") : null,
      probabilite: p.probabilite ?? null,
      gravite: p.gravite ?? null,
      criticite: p.criticite ?? null,
      mesures_existantes: p.mesures_existantes || null,
      mesures_proposees: p.mesures_proposees || null,
      priorite: (PRIORITE_MAP[p.priorite] ?? "moyenne") as DuerpRisque["priorite"],
      statut: "ouvert" as const,
      created_by: user.id,
    }));
    const { error } = await supabase.from("duerp_risques").insert(rows);
    if (error) {
      toast.error("Erreur lors de l'import : " + error.message);
    } else {
      toast.success(`${toImport.length} risque${toImport.length > 1 ? "s" : ""} importé${toImport.length > 1 ? "s" : ""} avec succès`);
      setPropositionsDialogOpen(false);
      setPropositionsData([]);
      setPropositionsUnite("");
      fetchRisques();
    }
    setImportingPropositions(false);
  };

  const selectedVersion = versions.find(v => v.id === selectedVersionId) || null;

  const canWrite = isAdmin || isResponsable;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">DUERP</h1>
            <p className="text-xs text-muted-foreground">Document Unique d'Évaluation des Risques Professionnels</p>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total risques",      sub: "tous versionnés",         value: totalRisques,       icon: ShieldAlert,  accent: "border-l-[#c46b48]", iconBg: "bg-[#c46b48]/10", iconColor: "text-[#c46b48]",   numColor: "text-[#c46b48]" },
          { label: "Critiques",          sub: "criticité > 8",           value: risquesCritiques,   icon: AlertTriangle,accent: "border-l-red-400",    iconBg: "bg-red-50",       iconColor: "text-red-500",     numColor: "text-red-600" },
          { label: "En traitement",      sub: "actions en cours",        value: risquesEnTraitement,icon: Activity,     accent: "border-l-blue-400",   iconBg: "bg-blue-50",      iconColor: "text-blue-500",    numColor: "text-blue-600" },
          { label: "Taux couverture",    sub: "risques avec action",     value: `${tauxCouverture}%`,icon: TrendingUp,  accent: "border-l-emerald-400",iconBg: "bg-emerald-50",   iconColor: "text-emerald-500", numColor: "text-emerald-600" },
        ].map(s => (
          <motion.div key={s.label} variants={itemVariant}>
            <div className={`rounded-xl border-l-4 ${s.accent} border border-border/60 bg-card px-5 py-5 flex flex-col gap-3 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <span className={`text-3xl font-display font-bold tabular-nums ${s.numColor}`}>{s.value}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">{s.sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-border">
        {(["versions", "risques"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold font-body transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "versions" ? "Versions DUERP" : "Évaluation des risques"}
          </button>
        ))}
      </div>

      {/* ─── Onglet Versions ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "versions" && (
          <motion.div key="versions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            {canWrite && (
              <div className="flex justify-end">
                <Button onClick={openCreateVersion} className="gap-2 shadow-warm">
                  <Plus className="w-4 h-4" /> Nouvelle version DUERP
                </Button>
              </div>
            )}

            {loadingVersions ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-3">
                <ShieldAlert className="w-12 h-12 mx-auto opacity-20" />
                <p className="font-medium">Aucune version DUERP</p>
                <p className="text-sm">Créez la première version pour commencer l'évaluation des risques.</p>
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {versions.map(v => {
                  const statConfig = VERSION_STATUT_CONFIG[v.statut];
                  const vRisques = risques.filter(r => r.version_id === v.id);
                  return (
                    <motion.div key={v.id} variants={itemVariant}>
                      <div className="rounded-xl border border-border bg-card shadow-sm p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-2xl font-display font-bold text-primary">{v.annee}</span>
                              <Badge variant="outline" className={`text-[11px] border-0 ${statConfig.color}`}>{statConfig.label}</Badge>
                              <span className="text-xs text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                                {vRisques.length} risque{vRisques.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <h3 className="font-semibold text-foreground text-sm mb-1">{v.titre}</h3>
                            {v.date_validation && (
                              <p className="text-xs text-muted-foreground">
                                Validé le {new Date(v.date_validation).toLocaleDateString("fr-FR")}
                              </p>
                            )}
                            {v.observations && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.observations}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={() => handleSelectVersion(v)}
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                              Sélectionner
                            </Button>
                            {canWrite && (
                              <>
                                {v.statut !== "valide" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                    onClick={() => handleActivateVersion(v)}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Activer
                                  </Button>
                                )}
                                {v.statut !== "archive" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs text-slate-600 border-slate-300 hover:bg-slate-50"
                                    onClick={() => handleArchiveVersion(v)}
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                    Archiver
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => openEditVersion(v)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteVersionTarget(v)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── Onglet Risques ─────────────────────────────────────────────────── */}
        {activeTab === "risques" && (
          <motion.div key="risques" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

            {/* Sélecteur de version */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 max-w-xs">
                <Select
                  value={selectedVersionId || ""}
                  onValueChange={v => setSelectedVersionId(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une version DUERP" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.annee} — {v.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canWrite && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => { setPropositionsUnite(""); setPropositionsData([]); setPropositionsDialogOpen(true); }}
                    disabled={!selectedVersionId}
                    className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Lightbulb className="w-4 h-4" /> Propositions IA
                  </Button>
                  <Button
                    onClick={openCreateRisque}
                    disabled={!selectedVersionId}
                    className="gap-2 shadow-warm"
                  >
                    <Plus className="w-4 h-4" /> Ajouter un risque
                  </Button>
                </>
              )}
            </div>

            {/* KPI locaux */}
            {selectedVersionId && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Risques", value: risquesVersion.length, color: "text-foreground" },
                  { label: "Critiques", value: risquesVersionCritiques, color: "text-red-600" },
                  { label: "En traitement", value: risquesVersionEnTraitement, color: "text-blue-600" },
                ].map(kpi => (
                  <div key={kpi.label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
                    <p className={`text-2xl font-display font-bold ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                ))}
              </div>
            )}

            {!selectedVersionId ? (
              <div className="text-center py-16 text-muted-foreground space-y-3">
                <Shield className="w-12 h-12 mx-auto opacity-20" />
                <p className="font-medium">Aucune version sélectionnée</p>
                <p className="text-sm">Sélectionnez une version DUERP pour voir et gérer les risques.</p>
              </div>
            ) : loadingRisques ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : risquesVersion.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-3">
                <ShieldAlert className="w-12 h-12 mx-auto opacity-20" />
                <p className="font-medium">Aucun risque pour cette version</p>
                {canWrite && <p className="text-sm">Cliquez sur "Ajouter un risque" pour commencer.</p>}
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {risquesVersion.map(r => {
                  const critBadge = getCriticiteBadge(r.criticite);
                  const statutConfig = RISQUE_STATUT_CONFIG[r.statut];
                  const prio = PRIORITE_RISQUE_CONFIG[r.priorite];
                  return (
                    <motion.div key={r.id} variants={itemVariant}>
                      <div className="rounded-xl border border-border bg-card shadow-sm p-5">
                        <div className="flex items-start gap-4">
                          {/* Criticité badge */}
                          <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center ${critBadge.color}`}>
                            <span className="text-lg font-display font-bold leading-none">{critBadge.label}</span>
                            <span className="text-[9px] font-body uppercase tracking-wide opacity-70">crit.</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">{r.unite_travail}</span>
                              <Badge variant="outline" className={`text-[11px] border-0 ${statutConfig.color}`}>{statutConfig.label}</Badge>
                              <Badge variant="outline" className={`text-[11px] border-0 ${prio.color}`}>{prio.label}</Badge>
                              {r.action_corrective_id && (
                                <Badge variant="outline" className="text-[11px] border-0 bg-violet-100 text-violet-700">Action liée</Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-foreground text-sm mb-1">{r.situation_dangereuse}</h3>
                            {r.dangers && (
                              <p className="text-xs text-muted-foreground mb-1">
                                <span className="font-medium">Dangers :</span> {r.dangers}
                              </p>
                            )}
                            {r.personnes_exposees && (
                              <p className="text-xs text-muted-foreground mb-1">
                                <span className="font-medium">Personnes exposées :</span> {r.personnes_exposees}
                              </p>
                            )}
                            {(r.probabilite || r.gravite) && (
                              <p className="text-xs text-muted-foreground mb-1">
                                {r.probabilite && <span>Probabilité : {PROBA_LABELS[r.probabilite]}</span>}
                                {r.probabilite && r.gravite && <span className="mx-2">×</span>}
                                {r.gravite && <span>Gravité : {GRAVITE_LABELS[r.gravite]}</span>}
                              </p>
                            )}
                            {r.mesures_existantes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Mesures existantes :</span> {r.mesures_existantes}
                              </p>
                            )}
                            {r.mesures_proposees && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Mesures proposées :</span> {r.mesures_proposees}
                              </p>
                            )}
                          </div>

                          {canWrite && (
                            <div className="flex flex-col gap-2 shrink-0">
                              {r.statut !== "en_traitement" && !r.action_corrective_id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-xs text-violet-700 border-violet-300 hover:bg-violet-50 whitespace-nowrap"
                                  onClick={() => openPacqDialog(r)}
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  Action PACQS
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => openEditRisque(r)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteRisqueTarget(r)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Dialog Version ────────────────────────────────────────────────────── */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {editingVersion ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingVersion ? "Modifier la version DUERP" : "Nouvelle version DUERP"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Année <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={versionForm.annee}
                  onChange={e => setVersionForm({ ...versionForm, annee: Number(e.target.value) })}
                  min={2000}
                  max={2100}
                />
              </div>
              {editingVersion && (
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select value={versionForm.statut} onValueChange={v => setVersionForm({ ...versionForm, statut: v as DuerpVersion["statut"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="valide">Validé</SelectItem>
                      <SelectItem value="archive">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Titre <span className="text-destructive">*</span></Label>
              <Input
                value={versionForm.titre}
                onChange={e => setVersionForm({ ...versionForm, titre: e.target.value })}
                placeholder="Ex : DUERP 2026 — Révision annuelle"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date de validation</Label>
              <Input
                type="date"
                value={versionForm.date_validation}
                onChange={e => setVersionForm({ ...versionForm, date_validation: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observations</Label>
              <Textarea
                value={versionForm.observations}
                onChange={e => setVersionForm({ ...versionForm, observations: e.target.value })}
                placeholder="Contexte, modifications par rapport à la version précédente…"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVersionDialogOpen(false)} disabled={savingVersion}>Annuler</Button>
            <Button onClick={handleSaveVersion} disabled={savingVersion} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingVersion ? "Enregistrement…" : editingVersion ? "Mettre à jour" : "Créer la version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Risque ─────────────────────────────────────────────────────── */}
      <Dialog open={risqueDialogOpen} onOpenChange={setRisqueDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {editingRisque ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingRisque ? "Modifier le risque" : "Ajouter un risque"}
              {selectedVersion && (
                <span className="text-xs font-normal text-muted-foreground ml-1">— {selectedVersion.annee} {selectedVersion.titre}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Unité de travail <span className="text-destructive">*</span></Label>
                <Select value={risqueForm.unite_travail} onValueChange={v => setRisqueForm({ ...risqueForm, unite_travail: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {UNITES_TRAVAIL.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={risqueForm.statut} onValueChange={v => setRisqueForm({ ...risqueForm, statut: v as DuerpRisque["statut"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ouvert">Ouvert</SelectItem>
                    <SelectItem value="en_traitement">En traitement</SelectItem>
                    <SelectItem value="clos">Clos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Situation dangereuse <span className="text-destructive">*</span></Label>
              <Textarea
                value={risqueForm.situation_dangereuse}
                onChange={e => setRisqueForm({ ...risqueForm, situation_dangereuse: e.target.value })}
                placeholder="Description de la situation dangereuse identifiée"
                rows={2}
                className="resize-none"
              />
            </div>
            {/* Bouton IA */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!risqueForm.unite_travail || !risqueForm.situation_dangereuse.trim() || aiLoading}
                onClick={handleAiComplete}
                className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-40"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? "Analyse en cours..." : "✨ Compléter avec l'IA"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dangers / Facteurs de risque</Label>
                <Textarea
                  value={risqueForm.dangers}
                  onChange={e => { setRisqueForm({ ...risqueForm, dangers: e.target.value }); setAiFilledFields(s => { const n = new Set(s); n.delete("dangers"); return n; }); }}
                  placeholder="Agents physiques, chimiques, biologiques…"
                  rows={2}
                  className={`resize-none transition-colors ${aiFilledFields.has("dangers") ? "bg-blue-50 border-blue-200" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Personnes exposées</Label>
                <Textarea
                  value={risqueForm.personnes_exposees}
                  onChange={e => { setRisqueForm({ ...risqueForm, personnes_exposees: e.target.value }); setAiFilledFields(s => { const n = new Set(s); n.delete("personnes_exposees"); return n; }); }}
                  placeholder="Qui est exposé à ce risque ?"
                  rows={2}
                  className={`resize-none transition-colors ${aiFilledFields.has("personnes_exposees") ? "bg-blue-50 border-blue-200" : ""}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Probabilité</Label>
                <Select value={risqueForm.probabilite} onValueChange={v => { setRisqueForm({ ...risqueForm, probabilite: v }); setAiFilledFields(s => { const n = new Set(s); n.delete("probabilite"); return n; }); }}>
                  <SelectTrigger className={aiFilledFields.has("probabilite") ? "bg-blue-50 border-blue-200" : ""}><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} — {PROBA_LABELS[n]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Gravité</Label>
                <Select value={risqueForm.gravite} onValueChange={v => { setRisqueForm({ ...risqueForm, gravite: v }); setAiFilledFields(s => { const n = new Set(s); n.delete("gravite"); return n; }); }}>
                  <SelectTrigger className={aiFilledFields.has("gravite") ? "bg-blue-50 border-blue-200" : ""}><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} — {GRAVITE_LABELS[n]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Criticité (P × G)</Label>
                <div className={`h-10 rounded-md border flex items-center justify-center font-display font-bold text-lg ${getCriticiteBadge(criticiteLive).color}`}>
                  {criticiteLive !== null ? criticiteLive : "—"}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Priorité</Label>
              <Select value={risqueForm.priorite} onValueChange={v => { setRisqueForm({ ...risqueForm, priorite: v as DuerpRisque["priorite"] }); setAiFilledFields(s => { const n = new Set(s); n.delete("priorite"); return n; }); }}>
                <SelectTrigger className={aiFilledFields.has("priorite") ? "bg-blue-50 border-blue-200" : ""}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="faible">Faible</SelectItem>
                  <SelectItem value="moyenne">Moyenne</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="critique">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mesures existantes</Label>
                <Textarea
                  value={risqueForm.mesures_existantes}
                  onChange={e => { setRisqueForm({ ...risqueForm, mesures_existantes: e.target.value }); setAiFilledFields(s => { const n = new Set(s); n.delete("mesures_existantes"); return n; }); }}
                  placeholder="Mesures de prévention déjà en place"
                  rows={2}
                  className={`resize-none transition-colors ${aiFilledFields.has("mesures_existantes") ? "bg-blue-50 border-blue-200" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mesures proposées</Label>
                <Textarea
                  value={risqueForm.mesures_proposees}
                  onChange={e => { setRisqueForm({ ...risqueForm, mesures_proposees: e.target.value }); setAiFilledFields(s => { const n = new Set(s); n.delete("mesures_proposees"); return n; }); }}
                  placeholder="Actions à mettre en œuvre"
                  rows={2}
                  className={`resize-none transition-colors ${aiFilledFields.has("mesures_proposees") ? "bg-blue-50 border-blue-200" : ""}`}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRisqueDialogOpen(false)} disabled={savingRisque}>Annuler</Button>
            <Button onClick={handleSaveRisque} disabled={savingRisque} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingRisque ? "Enregistrement…" : editingRisque ? "Mettre à jour" : "Ajouter le risque"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Action PACQS ──────────────────────────────────────────────── */}
      <Dialog open={pacqDialogOpen} onOpenChange={setPacqDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Zap className="w-4 h-4 text-violet-600" />
              Créer une action PACQS opérationnel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {pacqRisque && (
              <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">{pacqRisque.situation_dangereuse}</p>
                <p>Unité : {pacqRisque.unite_travail} — Criticité : {pacqRisque.criticite ?? "N/A"}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Titre de l'action <span className="text-destructive">*</span></Label>
              <Input
                value={pacqTitre}
                onChange={e => setPacqTitre(e.target.value)}
                placeholder="Intitulé de l'action corrective"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              L'action sera créée dans le PACQS Opérationnel avec une échéance à 3 mois et liée à ce risque.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPacqDialogOpen(false)} disabled={savingPacq}>Annuler</Button>
            <Button onClick={handleCreatePacqAction} disabled={savingPacq || !pacqTitre.trim()} className="gap-2 bg-violet-600 hover:bg-violet-700">
              <Zap className="w-4 h-4" />
              {savingPacq ? "Création…" : "Créer l'action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Suppression version ────────────────────────────────────────── */}
      <AlertDialog open={!!deleteVersionTarget} onOpenChange={o => !o && setDeleteVersionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />Supprimer cette version DUERP ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La version <strong>"{deleteVersionTarget?.annee} — {deleteVersionTarget?.titre}"</strong> et tous ses risques associés seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingVersion}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVersion} disabled={deletingVersion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingVersion ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Dialog Suppression risque ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteRisqueTarget} onOpenChange={o => !o && setDeleteRisqueTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />Supprimer ce risque ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le risque <strong>"{deleteRisqueTarget?.situation_dangereuse}"</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingRisque}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRisque} disabled={deletingRisque} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingRisque ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Dialog Propositions IA ────────────────────────────────────────────── */}
      <Dialog open={propositionsDialogOpen} onOpenChange={o => { setPropositionsDialogOpen(o); if (!o) { setPropositionsData([]); setPropositionsUnite(""); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Propositions IA — Risques par unité de travail
            </DialogTitle>
          </DialogHeader>

          {/* Étape 1 : sélection */}
          <div className="flex items-end gap-3 py-2">
            <div className="flex-1 max-w-xs space-y-1.5">
              <Label>Unité de travail</Label>
              <Select value={propositionsUnite} onValueChange={setPropositionsUnite}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une unité" /></SelectTrigger>
                <SelectContent>
                  {UNITES_TRAVAIL.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGeneratePropositions}
              disabled={!propositionsUnite || propositionsLoading}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {propositionsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {propositionsLoading ? "Génération en cours..." : "Générer"}
            </Button>
          </div>

          {/* Étape 2 : tableau des propositions */}
          {propositionsData.length > 0 && (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={propositionsSelection.every(Boolean)}
                          onCheckedChange={v => setPropositionsSelection(propositionsData.map(() => !!v))}
                        />
                      </TableHead>
                      <TableHead>Situation dangereuse</TableHead>
                      <TableHead>Risques</TableHead>
                      <TableHead>Dommages</TableHead>
                      <TableHead className="w-12 text-center">P</TableHead>
                      <TableHead className="w-12 text-center">G</TableHead>
                      <TableHead className="w-12 text-center">C</TableHead>
                      <TableHead className="w-24">Priorité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propositionsData.map((p, i) => (
                      <TableRow key={i} className={propositionsSelection[i] ? "" : "opacity-40"}>
                        <TableCell>
                          <Checkbox
                            checked={propositionsSelection[i]}
                            onCheckedChange={v => setPropositionsSelection(s => s.map((x, j) => j === i ? !!v : x))}
                          />
                        </TableCell>
                        <TableCell className="text-xs font-medium max-w-[180px]">{p.situation_dangereuse}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px]">{p.risques}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px]">{p.dommages}</TableCell>
                        <TableCell className="text-center text-xs font-bold">{p.probabilite}</TableCell>
                        <TableCell className="text-center text-xs font-bold">{p.gravite}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getCriticiteBadge(p.criticite).color}`}>{p.criticite}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${PRIORITE_COLOR_AI[p.priorite] ?? "bg-slate-100 text-slate-600"}`}>
                            {p.priorite}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setPropositionsDialogOpen(false)} disabled={importingPropositions}>Annuler</Button>
                <Button
                  onClick={handleImportPropositions}
                  disabled={importingPropositions || propositionsSelection.every(v => !v)}
                  className="gap-2 shadow-warm"
                >
                  {importingPropositions ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {importingPropositions ? "Import…" : `Importer la sélection (${propositionsSelection.filter(Boolean).length})`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
