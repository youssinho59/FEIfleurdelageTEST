import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/hooks/useAgents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  ClipboardList, Calendar, MapPin, User, ChevronRight, Trash2, ClipboardCheck,
  Building2, AlertTriangle, CheckCircle2, FileDown, Sparkles, Loader2, MessageCircle,
} from "lucide-react";
import { generateFeiPdf } from "@/lib/pdfGenerator";
import DeclarationArsDialog from "@/components/fei/DeclarationArsDialog";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Types ────────────────────────────────────────────────────────────────────

type SuggestionIA = {
  titre: string;
  description: string;
  priorite: "haute" | "moyenne" | "faible";
  thematique_pacq: string;
  objectif_pacq: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUTS = [
  { value: "nouveau", label: "Nouveau", color: "bg-blue-100 text-blue-800" },
  { value: "en_cours_analyse", label: "En cours d'analyse", color: "bg-yellow-100 text-yellow-800" },
  { value: "actions_en_cours", label: "Actions en cours", color: "bg-orange-100 text-orange-800" },
  { value: "cloture", label: "Clôturé", color: "bg-green-100 text-green-800" },
  { value: "archive", label: "Archivé", color: "bg-muted text-muted-foreground" },
];

const PRIORITE_IA_COLORS: Record<string, string> = {
  haute: "bg-red-100 text-red-700",
  moyenne: "bg-yellow-100 text-yellow-700",
  faible: "bg-green-100 text-green-700",
};

const getStatutInfo = (statut: string) => STATUTS.find((s) => s.value === statut) || STATUTS[0];

const CategorieBadge = ({ categorie }: { categorie: string }) => {
  if (categorie === "feigs") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
      <AlertTriangle className="w-3 h-3" /> FEIGS
    </span>
  );
  if (categorie === "feig") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
      <AlertTriangle className="w-3 h-3" /> FEIG
    </span>
  );
  return null;
};

const ArsBadge = ({ statut_ars }: { statut_ars: string | null }) => {
  if (!statut_ars) return null;
  if (statut_ars === "declare") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
      <CheckCircle2 className="w-3 h-3" /> Déclaré à l'ARS
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-300 animate-pulse">
      <Building2 className="w-3 h-3" /> À déclarer à l'ARS
    </span>
  );
};

const GraviteBadge = ({ gravite }: { gravite: number }) => {
  const colors = [
    "bg-green-100 text-green-800",
    "bg-lime-100 text-lime-800",
    "bg-yellow-100 text-yellow-800",
    "bg-orange-100 text-orange-800",
    "bg-red-100 text-red-800",
  ];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[gravite - 1]}`}>
      Gravité {gravite}/5
    </span>
  );
};

type FeiRecord = {
  id: string;
  date_evenement: string;
  lieu: string;
  description: string;
  gravite: number;
  type_fei: string;
  actions_correctives: string | null;
  declarant_nom: string;
  statut: string;
  created_at: string;
  user_id: string;
  service: string | null;
  analyse: string | null;
  plan_action: string | null;
  retour_declarant: string | null;
  retour_traitement: string | null;
  date_retour_traitement: string | null;
  retour_cloture: string | null;
  date_retour_cloture: string | null;
  date_cloture: string | null;
  managed_by: string | null;
  managed_at: string | null;
  categorie_fei: string;
  nature_evenement_ars: string | null;
  circonstances_ars: string | null;
  consequences_resident_ars: string | null;
  mesures_prises_ars: string | null;
  date_envoi_ars: string | null;
  statut_ars: string | null;
  retex: boolean;
  retex_contenu: string | null;
};

const FeiManagementPage = () => {
  const { user, isAdmin, isResponsable, userServices } = useAuth();
  const agents = useAgents();
  const [feiList, setFeiList] = useState<FeiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>("tous");
  const [filterDateDebut, setFilterDateDebut] = useState<string>("");
  const [filterDateFin, setFilterDateFin] = useState<string>("");
  const [selectedFei, setSelectedFei] = useState<FeiRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editStatut, setEditStatut] = useState("");
  const [editCategorie, setEditCategorie] = useState("standard");
  const [editAnalyse, setEditAnalyse] = useState("");
  const [editPlanAction, setEditPlanAction] = useState("");
  const [editRetour, setEditRetour] = useState("");
  const [editRetourTraitement, setEditRetourTraitement] = useState("");
  const [editDateRetourTraitement, setEditDateRetourTraitement] = useState("");
  const [editRetourCloture, setEditRetourCloture] = useState("");
  const [editDateRetourCloture, setEditDateRetourCloture] = useState("");
  const [editActions, setEditActions] = useState("");

  // RETEX
  const [editRetex, setEditRetex] = useState(false);
  const [editRetexContenu, setEditRetexContenu] = useState("");

  // ARS dialog
  const [arsDialogOpen, setArsDialogOpen] = useState(false);

  // Section ARS (FEIGS)
  const [editDateEnvoiArs, setEditDateEnvoiArs] = useState("");
  const [editNatureArs, setEditNatureArs] = useState("");
  const [editCirconstancesArs, setEditCirconstancesArs] = useState("");
  const [editConsequencesArs, setEditConsequencesArs] = useState("");
  const [editMesuresprisesArs, setEditMesuresprisesArs] = useState("");

  // Section PACQ
  const [pacqTitre, setPacqTitre] = useState("");
  const [pacqResponsable, setPacqResponsable] = useState("");
  const [pacqDateEcheance, setPacqDateEcheance] = useState("");
  const [pacqPriorite, setPacqPriorite] = useState("moyenne");

  // Section IA
  const [iaSuggestions, setIaSuggestions] = useState<SuggestionIA[]>([]);
  const [loadingIA, setLoadingIA] = useState(false);
  const [iaPacqTarget, setIaPacqTarget] = useState<SuggestionIA | null>(null);
  const [iaPacqResponsable, setIaPacqResponsable] = useState("");
  const [iaPacqDateEcheance, setIaPacqDateEcheance] = useState("");
  const [iaPacqSaving, setIaPacqSaving] = useState(false);

  // ── Data loading ───────────────────────────────────────────────────────────

  const fetchFei = async () => {
    setLoading(true);
    let query = supabase
      .from("fei")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterStatut !== "tous") {
      query = query.eq("statut", filterStatut);
    }
    if (filterDateDebut) {
      query = query.gte("date_evenement", filterDateDebut);
    }
    if (filterDateFin) {
      query = query.lte("date_evenement", filterDateFin);
    }

    if (isResponsable && !isAdmin && userServices.length > 0) {
      query = query.in("service", userServices);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erreur fetchFei:", error);
      setFetchError(error.message + (error.details ? ` — ${error.details}` : "") + (error.hint ? ` (${error.hint})` : ""));
    } else {
      setFetchError(null);
    }
    setFeiList((data as FeiRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFei();
  }, [filterStatut, filterDateDebut, filterDateFin]);

  const openDetail = (fei: FeiRecord) => {
    setSelectedFei(fei);
    setEditStatut(fei.statut);
    setEditCategorie(fei.categorie_fei || "standard");
    setEditAnalyse(fei.analyse || "");
    setEditPlanAction(fei.plan_action || "");
    setEditRetour(fei.retour_declarant || "");
    setEditRetourTraitement(fei.retour_traitement || "");
    setEditDateRetourTraitement(fei.date_retour_traitement || "");
    setEditRetourCloture(fei.retour_cloture || "");
    setEditDateRetourCloture(fei.date_retour_cloture || "");
    setEditActions("");
    setEditRetex(fei.retex || false);
    setEditRetexContenu(fei.retex_contenu || "");
    // ARS
    setEditDateEnvoiArs(fei.date_envoi_ars || "");
    setEditNatureArs(fei.nature_evenement_ars || "");
    setEditCirconstancesArs(fei.circonstances_ars || "");
    setEditConsequencesArs(fei.consequences_resident_ars || "");
    setEditMesuresprisesArs(fei.mesures_prises_ars || "");
    // PACQ
    setPacqTitre(fei.plan_action ? fei.plan_action.slice(0, 120) : "");
    setPacqResponsable("");
    setPacqDateEcheance("");
    setPacqPriorite("moyenne");
    // IA reset
    setIaSuggestions([]);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedFei || !user) return;

    // Evolution 7: block closure if FEIG/FEIGS with ARS and retex_contenu empty
    const isArsCategorie = editCategorie === "feigs" || editCategorie === "feig";
    if (isArsCategorie && (editStatut === "cloture" || editStatut === "archive") && !editRetexContenu.trim()) {
      toast.error("Le champ RETEX (contenu) est obligatoire pour clore une FEIG/FEIGS.");
      return;
    }

    setSaving(true);

    const updates: Record<string, unknown> = {
      statut: editStatut,
      analyse: editAnalyse || null,
      plan_action: editPlanAction || null,
      retour_declarant: editRetour || null,
      retour_traitement: editRetourTraitement || null,
      date_retour_traitement: editDateRetourTraitement || null,
      retour_cloture: editRetourCloture || null,
      date_retour_cloture: editDateRetourCloture || null,
      actions_correctives: editActions || null,
      managed_by: user.id,
      managed_at: new Date().toISOString(),
      retex: editRetex,
      retex_contenu: editRetexContenu || null,
    };

    if (editStatut === "cloture" || editStatut === "archive") {
      updates.date_cloture = new Date().toISOString().split("T")[0];
    }

    updates.categorie_fei = editCategorie;

    if (editCategorie === "feigs" || editCategorie === "feig") {
      updates.date_envoi_ars = editDateEnvoiArs || null;
      updates.statut_ars = editDateEnvoiArs ? "declare" : "a_declarer";
      updates.nature_evenement_ars = editNatureArs || null;
      updates.circonstances_ars = editCirconstancesArs || null;
      updates.consequences_resident_ars = editConsequencesArs || null;
      updates.mesures_prises_ars = editMesuresprisesArs || null;
    } else {
      updates.statut_ars = null;
    }

    const { error } = await supabase
      .from("fei")
      .update(updates)
      .eq("id", selectedFei.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour : " + error.message);
      setSaving(false);
      return;
    }

    if (pacqResponsable && pacqDateEcheance) {
      const selectedAgent = agents.find((a) => a.id === pacqResponsable);
      const { error: pacqError } = await supabase.from("actions_correctives").insert({
        titre: pacqTitre.trim() || `Action corrective — FEI ${selectedFei.type_fei}`,
        description: editActions.trim() || null,
        responsable: selectedAgent?.full_name || "",
        responsable_id: pacqResponsable,
        date_echeance: pacqDateEcheance,
        priorite: pacqPriorite,
        statut: "a_faire",
        fei_id: selectedFei.id,
        user_id: user.id,
      });
      if (pacqError) {
        toast.warning("FEI mise à jour, mais erreur PACQS : " + pacqError.message);
      } else {
        toast.success("FEI mise à jour et action créée dans le PACQS ✓");
      }
    } else {
      toast.success("FEI mise à jour avec succès");
    }

    setSelectedFei(null);
    fetchFei();
    setSaving(false);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!selectedFei) return;
    setDeleting(true);
    const { error } = await supabase.from("fei").delete().eq("id", selectedFei.id);
    if (error) {
      toast.error("Erreur lors de la suppression : " + error.message);
    } else {
      toast.success("FEI supprimée définitivement");
      setDeleteDialogOpen(false);
      setSelectedFei(null);
      fetchFei();
    }
    setDeleting(false);
  };

  // ── PDF ────────────────────────────────────────────────────────────────────

  const countByStatut = (statut: string) =>
    statut === "tous"
      ? feiList.length
      : feiList.filter((f) => f.statut === statut).length;

  const handleDownloadPdf = (fei: FeiRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const gestionnaire = agents.find((a) => a.id === fei.managed_by);
    const pdf = generateFeiPdf({
      ...fei,
      gestionnaire_nom: gestionnaire?.full_name,
    });
    const catPrefix = fei.categorie_fei === "feigs" ? "FEIGS" : fei.categorie_fei === "feig" ? "FEIG" : "FEI";
    pdf.save(`${catPrefix}_COMPLET_${fei.id.slice(0, 8)}_${fei.date_evenement}.pdf`);
  };

  // ── IA ─────────────────────────────────────────────────────────────────────

  const callIAFei = async () => {
    if (!selectedFei) return;
    setLoadingIA(true);
    setIaSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-actions", {
        body: {
          context_type: "fei",
          data: {
            type_fei: selectedFei.type_fei,
            description: selectedFei.description,
            gravite: selectedFei.gravite,
            lieu: selectedFei.lieu,
            service: selectedFei.service,
            actions_correctives: selectedFei.actions_correctives,
          },
        },
      });
      if (error) throw new Error(error.message);
      setIaSuggestions(data?.actions ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Erreur IA : " + message);
    } finally {
      setLoadingIA(false);
    }
  };

  const openIAPacqDialog = (s: SuggestionIA) => {
    setIaPacqTarget(s);
    setIaPacqResponsable("");
    setIaPacqDateEcheance("");
  };

  const handleIAPacqSave = async () => {
    if (!iaPacqTarget || !iaPacqDateEcheance || !user || !selectedFei) return;
    setIaPacqSaving(true);
    const agent = agents.find((a) => a.id === iaPacqResponsable);
    const { error } = await supabase.from("actions_correctives").insert({
      titre: iaPacqTarget.titre,
      description: iaPacqTarget.description,
      responsable: agent?.full_name ?? "",
      responsable_id: iaPacqResponsable || null,
      date_echeance: iaPacqDateEcheance,
      priorite: iaPacqTarget.priorite,
      statut: "a_faire",
      fei_id: selectedFei.id,
      user_id: user.id,
    });
    if (error) toast.error("Erreur création PACQS : " + error.message);
    else { toast.success("Action créée dans le PACQS ✓"); setIaPacqTarget(null); }
    setIaPacqSaving(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Gestion des FEI</h1>
        <p className="text-muted-foreground">Analysez, traitez et clôturez les fiches d'événements indésirables</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterStatut === "tous" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatut("tous")}
        >
          Tous
        </Button>
        {STATUTS.map((s) => (
          <Button
            key={s.value}
            variant={filterStatut === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatut(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Du</Label>
          <Input
            type="date"
            value={filterDateDebut}
            onChange={(e) => setFilterDateDebut(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Au</Label>
          <Input
            type="date"
            value={filterDateFin}
            onChange={(e) => setFilterDateFin(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        {(filterDateDebut || filterDateFin) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { setFilterDateDebut(""); setFilterDateFin(""); }}
          >
            Effacer les dates
          </Button>
        )}
      </div>

      {/* FEI List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : fetchError ? (
        <Card className="border-destructive/50">
          <CardContent className="py-10 text-center space-y-2">
            <p className="text-destructive font-semibold">Erreur de chargement</p>
            <p className="text-sm text-muted-foreground font-mono bg-muted rounded p-2">{fetchError}</p>
          </CardContent>
        </Card>
      ) : feiList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune FEI trouvée{filterStatut !== "tous" ? " avec ce statut" : ""}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feiList.map((fei) => {
            const statutInfo = getStatutInfo(fei.statut);
            const isFeigs = fei.categorie_fei === "feigs";
            const isFeig = fei.categorie_fei === "feig";
            const hasRetour = !!(fei.retour_traitement || fei.retour_cloture);
            return (
              <Card
                key={fei.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  isFeigs
                    ? "border-l-4 border-l-red-500 bg-red-50/30 hover:shadow-red-100"
                    : isFeig
                    ? "border-l-4 border-l-orange-400 bg-orange-50/20"
                    : ""
                }`}
                onClick={() => openDetail(fei)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CategorieBadge categorie={fei.categorie_fei} />
                        <Badge variant="outline" className={statutInfo.color}>
                          {statutInfo.label}
                        </Badge>
                        <GraviteBadge gravite={fei.gravite} />
                        <Badge variant="secondary">{fei.type_fei}</Badge>
                        {fei.service && (
                          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                            {fei.service}
                          </Badge>
                        )}
                        {(isFeigs || isFeig) && <ArsBadge statut_ars={fei.statut_ars} />}
                        {hasRetour && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            <MessageCircle className="w-3 h-3" /> Retour effectué
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{fei.description}</p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(fei.date_evenement).toLocaleDateString("fr-FR")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {fei.lieu}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {fei.declarant_nom}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleDownloadPdf(fei, e)}
                        title="Télécharger le PDF complet"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Supprimer définitivement cette FEI ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. La FEI et toutes ses données associées (analyse, plan d'action, retour déclarant) seront définitivement supprimées de la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail / Management Dialog */}
      <Dialog open={!!selectedFei} onOpenChange={(open) => { if (!open) { setSelectedFei(null); setArsDialogOpen(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFei && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Gestion de la FEI
                </DialogTitle>
              </DialogHeader>

              {/* FEI Summary */}
              <Card className={`${selectedFei.categorie_fei === "feigs" ? "bg-red-50/40 border-red-200" : selectedFei.categorie_fei === "feig" ? "bg-orange-50/30 border-orange-200" : "bg-secondary/50"}`}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CategorieBadge categorie={selectedFei.categorie_fei} />
                    <Badge variant="secondary">{selectedFei.type_fei}</Badge>
                    <GraviteBadge gravite={selectedFei.gravite} />
                    {(selectedFei.categorie_fei === "feigs" || selectedFei.categorie_fei === "feig") && <ArsBadge statut_ars={selectedFei.statut_ars} />}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date : </span>
                      {new Date(selectedFei.date_evenement).toLocaleDateString("fr-FR")}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lieu : </span>
                      {selectedFei.lieu}
                    </div>
                    {selectedFei.service && (
                      <div>
                        <span className="text-muted-foreground">Service : </span>
                        <span className="font-medium">{selectedFei.service}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Déclarant : </span>
                      {selectedFei.declarant_nom}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Description : </span>
                    <p className="text-sm mt-1">{selectedFei.description}</p>
                  </div>
                  {selectedFei.actions_correctives && (
                    <div>
                      <span className="text-sm text-muted-foreground">Actions correctives initiales : </span>
                      <p className="text-sm mt-1">{selectedFei.actions_correctives}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Management Form */}
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={editStatut}
                    onValueChange={(v) => {
                      setEditStatut(v);
                      if (v === "cloture") {
                        toast.info("N'oubliez pas d'effectuer un retour au déclarant avant de clore définitivement.");
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUTS.filter(s => isAdmin || (s.value !== "cloture" && s.value !== "archive")).map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isAdmin && (
                    <p className="text-xs text-muted-foreground">Les statuts Clôturé et Archivé sont réservés aux administrateurs.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Catégorie FEI</Label>
                  <Select value={editCategorie} onValueChange={setEditCategorie}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="feig">FEIG — Événement grave</SelectItem>
                      <SelectItem value="feigs">FEIGS — Événement grave sanitaire (ARS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Champ RETEX */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 py-1">
                    <Checkbox
                      id="retex-toggle"
                      checked={editRetex}
                      onCheckedChange={(v) => setEditRetex(!!v)}
                    />
                    <label htmlFor="retex-toggle" className="text-sm font-medium cursor-pointer">
                      Faire l'objet d'un RETEX
                    </label>
                    <span className="text-xs text-muted-foreground">(Retour d'EXpérience)</span>
                  </div>
                  {(editCategorie === "feig" || editCategorie === "feigs") && (
                    <div>
                      <Textarea
                        value={editRetexContenu}
                        onChange={(e) => setEditRetexContenu(e.target.value)}
                        placeholder="Contenu du RETEX — obligatoire pour clore une FEIG/FEIGS…"
                        rows={3}
                        className={!editRetexContenu.trim() && (editStatut === "cloture" || editStatut === "archive") ? "border-destructive focus:border-destructive" : ""}
                      />
                      {!editRetexContenu.trim() && (editStatut === "cloture" || editStatut === "archive") && (
                        <p className="text-xs text-destructive mt-1">Ce champ est obligatoire pour clore une FEIG/FEIGS.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="analyse">Analyse de l'événement</Label>
                  <Textarea
                    id="analyse"
                    value={editAnalyse}
                    onChange={(e) => setEditAnalyse(e.target.value)}
                    placeholder="Analyse des causes, facteurs contributifs, circonstances..."
                    rows={3}
                  />
                </div>

                {/* ── Suggestions IA ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Suggestions IA
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-7 text-xs border-primary/30 text-primary hover:bg-primary/5 shrink-0"
                      disabled={loadingIA}
                      onClick={callIAFei}
                    >
                      {loadingIA ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> L'IA analyse la FEI…</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> Suggérer des actions via IA</>
                      )}
                    </Button>
                  </div>
                  {iaSuggestions.length > 0 && (
                    <div className="space-y-2">
                      {iaSuggestions.map((s, i) => (
                        <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground leading-snug">{s.titre}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${PRIORITE_IA_COLORS[s.priorite] ?? ""}`}>
                              {s.priorite}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-primary/30 text-primary">
                            {s.thematique_pacq}
                          </span>
                          <div className="flex gap-2 pt-0.5">
                            <Button
                              type="button"
                              size="sm"
                              className="h-6 text-[10px] gap-1 px-2"
                              onClick={() => openIAPacqDialog(s)}
                            >
                              <ClipboardCheck className="w-3 h-3" /> Ajouter au PACQS
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] gap-1 px-2"
                              onClick={() => setEditAnalyse((prev) => prev ? `${prev}\n\n${s.titre} : ${s.description}` : `${s.titre} : ${s.description}`)}
                            >
                              Copier dans Analyse
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actions_correctives">Actions correctives mises en place</Label>
                  <Textarea
                    id="actions_correctives"
                    value={editActions}
                    onChange={(e) => setEditActions(e.target.value)}
                    placeholder="Mesures concrètes mises en œuvre..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan_action">Plan d'action</Label>
                  <Textarea
                    id="plan_action"
                    value={editPlanAction}
                    onChange={(e) => setEditPlanAction(e.target.value)}
                    placeholder="Actions correctives et préventives, échéances, responsables..."
                    rows={3}
                  />
                </div>

                {isAdmin && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-primary" /> Retours au déclarant
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Retour au traitement</Label>
                    <Textarea
                      value={editRetourTraitement}
                      onChange={(e) => setEditRetourTraitement(e.target.value)}
                      placeholder="Message de suivi communiqué au déclarant en cours de traitement…"
                      rows={2}
                    />
                    <Input
                      type="date"
                      value={editDateRetourTraitement}
                      onChange={(e) => setEditDateRetourTraitement(e.target.value)}
                      className="h-8 text-sm w-48"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Retour à la clôture</Label>
                    <Textarea
                      value={editRetourCloture}
                      onChange={(e) => setEditRetourCloture(e.target.value)}
                      placeholder="Message de clôture communiqué au déclarant…"
                      rows={2}
                    />
                    <Input
                      type="date"
                      value={editDateRetourCloture}
                      onChange={(e) => setEditDateRetourCloture(e.target.value)}
                      className="h-8 text-sm w-48"
                    />
                  </div>
                </div>
                )}

                {/* ── Section ARS (FEIG et FEIGS) ── */}
                {(editCategorie === "feigs" || editCategorie === "feig") && (
                  <div className="rounded-xl border-l-4 border-l-red-500 border border-red-200 bg-red-50/50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-semibold text-red-800">
                        {editCategorie === "feigs" ? "Déclaration ARS — FEIGS" : "Déclaration ARS — FEIG"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-red-700 font-semibold uppercase tracking-wider">Nature de l'événement</Label>
                      <Textarea value={editNatureArs} onChange={(e) => setEditNatureArs(e.target.value)} placeholder="Nature et type de l'événement grave sériel..." rows={2} className="text-sm border-red-200 focus:border-red-400" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-red-700 font-semibold uppercase tracking-wider">Circonstances</Label>
                      <Textarea value={editCirconstancesArs} onChange={(e) => setEditCirconstancesArs(e.target.value)} placeholder="Circonstances dans lesquelles l'événement s'est produit..." rows={2} className="text-sm border-red-200 focus:border-red-400" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-red-700 font-semibold uppercase tracking-wider">Conséquences pour le résident</Label>
                      <Textarea value={editConsequencesArs} onChange={(e) => setEditConsequencesArs(e.target.value)} placeholder="Conséquences observées pour le(s) résident(s) concerné(s)..." rows={2} className="text-sm border-red-200 focus:border-red-400" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-red-700 font-semibold uppercase tracking-wider">Mesures prises</Label>
                      <Textarea value={editMesuresprisesArs} onChange={(e) => setEditMesuresprisesArs(e.target.value)} placeholder="Mesures immédiates prises pour protéger les résidents..." rows={2} className="text-sm border-red-200 focus:border-red-400" />
                    </div>
                    <div className="border-t border-red-200 pt-3 space-y-1.5">
                      <Label className="text-xs text-red-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Date d'envoi à l'ARS
                        <span className="text-red-400 font-normal">(laisser vide si pas encore envoyé)</span>
                      </Label>
                      <Input type="date" value={editDateEnvoiArs} onChange={(e) => setEditDateEnvoiArs(e.target.value)} className="h-8 text-sm border-red-200 focus:border-red-400" />
                      <p className="text-[11px] text-red-400">
                        {editDateEnvoiArs
                          ? `Statut : Déclaré à l'ARS le ${new Date(editDateEnvoiArs).toLocaleDateString("fr-FR")}`
                          : "Statut : À déclarer à l'ARS"}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Déclaration ARS officielle — toute catégorie ── */}
                <div className="rounded-lg border border-red-100 bg-red-50/30 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-red-800">Déclaration ARS officielle</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Formulaire complet selon le Décret 2016-1813 — disponible pour toute FEI
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setArsDialogOpen(true)}
                    className="gap-1.5 shrink-0 border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Ouvrir la déclaration
                  </Button>
                </div>

                {/* ── Section PACQ ── */}
                <div className="rounded-xl border-l-4 border-l-emerald-400 border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-800">Créer une action dans le PACQS</p>
                    <span className="text-[10px] text-emerald-500 ml-1">(optionnel — remplissez responsable + échéance)</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-emerald-700">Titre de l'action</Label>
                    <Input value={pacqTitre} onChange={(e) => setPacqTitre(e.target.value)} placeholder="Intitulé de l'action corrective…" className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-emerald-700">Responsable <span className="text-destructive">*</span></Label>
                      <Select value={pacqResponsable} onValueChange={setPacqResponsable}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sélectionner un agent" /></SelectTrigger>
                        <SelectContent>
                          {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-emerald-700">Date d'échéance <span className="text-destructive">*</span></Label>
                      <Input type="date" value={pacqDateEcheance} onChange={(e) => setPacqDateEcheance(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-emerald-700">Priorité</Label>
                    <Select value={pacqPriorite} onValueChange={setPacqPriorite}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="haute">🔴 Haute</SelectItem>
                        <SelectItem value="moyenne">🟡 Moyenne</SelectItem>
                        <SelectItem value="faible">🟢 Faible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                  <Button variant="outline" size="icon" title="Télécharger le PDF complet" onClick={(e) => handleDownloadPdf(selectedFei, e)}>
                    <FileDown className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedFei(null)}>Annuler</Button>
                  {isAdmin && (
                    <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} title="Supprimer définitivement cette FEI">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {selectedFei.managed_at && (
                  <p className="text-xs text-muted-foreground text-center">
                    Dernière modification le {new Date(selectedFei.managed_at).toLocaleDateString("fr-FR")} à{" "}
                    {new Date(selectedFei.managed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog Déclaration ARS officielle ── */}
      {selectedFei && (
        <DeclarationArsDialog
          open={arsDialogOpen}
          onOpenChange={setArsDialogOpen}
          feiId={selectedFei.id}
          feiData={{
            description: selectedFei.description,
            date_evenement: selectedFei.date_evenement,
            lieu: selectedFei.lieu,
            declarant_nom: selectedFei.declarant_nom,
            service: selectedFei.service,
            type_fei: selectedFei.type_fei,
            created_at: selectedFei.created_at,
            actions_correctives: selectedFei.actions_correctives,
            categorie_fei: selectedFei.categorie_fei,
            consequences_resident_ars: selectedFei.consequences_resident_ars,
          }}
        />
      )}

      {/* ── Dialog IA → PACQ ── */}
      <Dialog open={!!iaPacqTarget} onOpenChange={(o) => !o && setIaPacqTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base">
              <Sparkles className="w-4 h-4 text-primary" />
              Ajouter au PACQS opérationnel
            </DialogTitle>
          </DialogHeader>
          {iaPacqTarget && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/60 px-3 py-2.5 space-y-1">
                <p className="text-xs font-semibold text-foreground">{iaPacqTarget.titre}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{iaPacqTarget.description}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${PRIORITE_IA_COLORS[iaPacqTarget.priorite] ?? ""}`}>
                  Priorité : {iaPacqTarget.priorite}
                </span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Responsable</Label>
                <Select value={iaPacqResponsable || "none"} onValueChange={(v) => setIaPacqResponsable(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sélectionner un agent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigné</SelectItem>
                    {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date d'échéance <span className="text-destructive">*</span></Label>
                <Input type="date" value={iaPacqDateEcheance} onChange={(e) => setIaPacqDateEcheance(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIaPacqTarget(null)} disabled={iaPacqSaving}>Annuler</Button>
            <Button size="sm" onClick={handleIAPacqSave} disabled={iaPacqSaving || !iaPacqDateEcheance} className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {iaPacqSaving ? "Création…" : "Créer l'action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeiManagementPage;
