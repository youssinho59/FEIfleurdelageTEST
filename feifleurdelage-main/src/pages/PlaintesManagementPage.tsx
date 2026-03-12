import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/hooks/useAgents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { generatePlaintePdf } from "@/lib/pdfGenerator";
import { MessageSquareWarning, Calendar, User, FileText, ChevronRight, Trash2, ClipboardCheck, Search, MessageCircle, FileDown } from "lucide-react";

const STATUTS_PLAINTE = [
  { value: "nouveau",   label: "Nouveau",    color: "bg-blue-100 text-blue-800" },
  { value: "en_cours",  label: "En cours",   color: "bg-yellow-100 text-yellow-800" },
  { value: "traite",    label: "Traité",     color: "bg-green-100 text-green-800" },
];

const getStatutInfo = (statut: string) =>
  STATUTS_PLAINTE.find((s) => s.value === statut) || STATUTS_PLAINTE[0];

type PlainteRecord = {
  id: string;
  date_plainte: string;
  demandeur: string;
  objet: string;
  description: string;
  reponse_apportee: string | null;
  declarant_nom: string;
  statut: string;
  created_at: string;
  user_id: string;
  service: string | null;
  precisions: string | null;
  // Champs gestion admin
  analyse: string | null;
  plan_action: string | null;
  actions_correctives: string | null;
  retour_declarant: string | null;
  managed_by: string | null;
  managed_at: string | null;
  date_cloture: string | null;
};

const PlaintesManagementPage = () => {
  const { user, isAdmin, isResponsable, userService } = useAuth();
  const agents = useAgents();
  const [plaintesList, setPlaintesList] = useState<PlainteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>("tous");
  const [selectedPlainte, setSelectedPlainte] = useState<PlainteRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulaire de gestion (aligné sur FEI)
  const [editStatut, setEditStatut] = useState("");
  const [editAnalyse, setEditAnalyse] = useState("");
  const [editPlanAction, setEditPlanAction] = useState("");
  const [editActions, setEditActions] = useState("");
  const [editRetour, setEditRetour] = useState("");

  // Section PACQ
  const [pacqTitre, setPacqTitre] = useState("");
  const [pacqResponsable, setPacqResponsable] = useState("");
  const [pacqDateEcheance, setPacqDateEcheance] = useState("");
  const [pacqPriorite, setPacqPriorite] = useState("moyenne");

  const fetchPlaintes = async () => {
    setLoading(true);
    let query = supabase
      .from("plaintes")
      .select("*")
      .order("created_at", { ascending: false });
    if (filterStatut !== "tous") query = query.eq("statut", filterStatut);

    // Responsable : filtrer par service uniquement
    if (isResponsable && !isAdmin && userService) {
      query = query.eq("service", userService);
    }

    const { data, error } = await query;
    if (error) setFetchError(error.message + (error.details ? ` — ${error.details}` : ""));
    else setFetchError(null);
    setPlaintesList((data as PlainteRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPlaintes(); }, [filterStatut]);

  const openDetail = (plainte: PlainteRecord) => {
    setSelectedPlainte(plainte);
    setEditStatut(plainte.statut);
    setEditAnalyse(plainte.analyse || "");
    setEditPlanAction(plainte.plan_action || "");
    setEditActions(plainte.actions_correctives || "");
    setEditRetour(plainte.retour_declarant || "");
    setPacqTitre(plainte.plan_action ? plainte.plan_action.slice(0, 120) : "");
    setPacqResponsable("");
    setPacqDateEcheance("");
    setPacqPriorite("moyenne");
  };

  const handleSave = async () => {
    if (!selectedPlainte || !user) return;
    setSaving(true);

    const updates: Record<string, unknown> = {
      statut:              editStatut,
      analyse:             editAnalyse || null,
      plan_action:         editPlanAction || null,
      actions_correctives: editActions || null,
      retour_declarant:    editRetour || null,
      managed_by:          user.id,
      managed_at:          new Date().toISOString(),
    };

    if (editStatut === "traite") {
      updates.date_cloture = new Date().toISOString().split("T")[0];
    }

    const { error } = await supabase.from("plaintes").update(updates).eq("id", selectedPlainte.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour : " + error.message);
      setSaving(false);
      return;
    }

    // Création automatique dans le PACQ si les champs sont renseignés
    if (pacqResponsable && pacqDateEcheance) {
      const selectedAgent = agents.find((a) => a.id === pacqResponsable);
      const { error: pacqError } = await supabase.from("actions_correctives").insert({
        titre:        pacqTitre.trim() || `Action corrective — Plainte : ${selectedPlainte.objet}`,
        description:  editActions.trim() || null,
        responsable:  selectedAgent?.full_name || "",
        responsable_id: pacqResponsable,
        date_echeance: pacqDateEcheance,
        priorite:     pacqPriorite,
        statut:       "a_faire",
        plainte_id:   selectedPlainte.id,
        user_id:      user.id,
      });
      if (pacqError) {
        toast.warning("Plainte mise à jour, mais erreur PACQ : " + pacqError.message);
      } else {
        toast.success("Réclamation mise à jour et action créée dans le PACQ ✓");
      }
    } else {
      toast.success("Réclamation mise à jour avec succès");
    }

    setSelectedPlainte(null);
    fetchPlaintes();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedPlainte) return;
    setDeleting(true);
    const { error } = await supabase.from("plaintes").delete().eq("id", selectedPlainte.id);
    if (error) {
      toast.error("Erreur lors de la suppression : " + error.message);
    } else {
      toast.success("Réclamation supprimée définitivement");
      setDeleteDialogOpen(false);
      setSelectedPlainte(null);
      fetchPlaintes();
    }
    setDeleting(false);
  };

  const handleDownloadPdf = (plainte: PlainteRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const gestionnaire = agents.find((a) => a.id === plainte.managed_by);
    const pdf = generatePlaintePdf({
      ...plainte,
      gestionnaire_nom: gestionnaire?.full_name,
    });
    pdf.save(`Plainte_COMPLET_${plainte.id.slice(0, 8)}_${plainte.date_plainte}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Gestion des Réclamations</h1>
        <p className="text-muted-foreground">Traitez et suivez les plaintes et réclamations enregistrées</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button variant={filterStatut === "tous" ? "default" : "outline"} size="sm" onClick={() => setFilterStatut("tous")}>
          Toutes ({plaintesList.length})
        </Button>
        {STATUTS_PLAINTE.map((s) => (
          <Button key={s.value} variant={filterStatut === s.value ? "default" : "outline"} size="sm" onClick={() => setFilterStatut(s.value)}>
            {s.label}
          </Button>
        ))}
      </div>

      {/* List */}
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
      ) : plaintesList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquareWarning className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune réclamation trouvée{filterStatut !== "tous" ? " avec ce statut" : ""}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plaintesList.map((plainte) => {
            const statutInfo = getStatutInfo(plainte.statut);
            const hasAdminFeedback = plainte.analyse || plainte.plan_action || plainte.retour_declarant;
            return (
              <Card
                key={plainte.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(plainte)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={statutInfo.color}>{statutInfo.label}</Badge>
                        <Badge variant="secondary">{plainte.demandeur}</Badge>
                        {plainte.service && (
                          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                            {plainte.service}
                          </Badge>
                        )}
                        {hasAdminFeedback && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                            <MessageCircle className="w-3 h-3" /> Traitement en cours
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">
                        {plainte.objet}
                        {plainte.precisions && <span className="text-muted-foreground font-normal"> — {plainte.precisions}</span>}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(plainte.date_plainte).toLocaleDateString("fr-FR")}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {plainte.declarant_nom}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleDownloadPdf(plainte, e)}
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Supprimer définitivement cette réclamation ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. La réclamation et toutes ses données seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail / Management Dialog */}
      <Dialog open={!!selectedPlainte} onOpenChange={(open) => !open && setSelectedPlainte(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPlainte && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <MessageSquareWarning className="w-5 h-5" />
                  Gestion de la réclamation
                </DialogTitle>
              </DialogHeader>

              {/* Récap plainte */}
              <Card className="bg-secondary/50">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={getStatutInfo(selectedPlainte.statut).color}>
                      {getStatutInfo(selectedPlainte.statut).label}
                    </Badge>
                    <Badge variant="secondary">{selectedPlainte.demandeur}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Date : </span>{new Date(selectedPlainte.date_plainte).toLocaleDateString("fr-FR")}</div>
                    <div><span className="text-muted-foreground">Déclarant : </span>{selectedPlainte.declarant_nom}</div>
                    {selectedPlainte.service && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Service : </span>
                        <span className="font-medium">{selectedPlainte.service}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium flex items-center gap-1 mb-1"><FileText className="w-3 h-3" /> Catégorie</span>
                    <p className="text-sm font-medium">{selectedPlainte.objet}</p>
                    {selectedPlainte.precisions && (
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedPlainte.precisions}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium mb-1 block">Description</span>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedPlainte.description}</p>
                  </div>
                  {selectedPlainte.reponse_apportee && (
                    <div>
                      <span className="text-sm text-muted-foreground">Réponse initiale (déclarant) : </span>
                      <p className="text-sm mt-1">{selectedPlainte.reponse_apportee}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Formulaire de gestion ──────────────────────────── */}
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={editStatut} onValueChange={setEditStatut}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUTS_PLAINTE.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actions">Actions correctives mises en place</Label>
                  <Textarea
                    id="actions"
                    value={editActions}
                    onChange={(e) => setEditActions(e.target.value)}
                    placeholder="Mesures concrètes mises en œuvre suite à la réclamation..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="analyse">Analyse de la réclamation</Label>
                  <Textarea
                    id="analyse"
                    value={editAnalyse}
                    onChange={(e) => setEditAnalyse(e.target.value)}
                    placeholder="Analyse des causes, facteurs, contexte de la réclamation..."
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

                <div className="space-y-2">
                  <Label htmlFor="retour">Retour au déclarant</Label>
                  <Textarea
                    id="retour"
                    value={editRetour}
                    onChange={(e) => setEditRetour(e.target.value)}
                    placeholder="Message de retour à communiquer au déclarant..."
                    rows={2}
                  />
                </div>

                {/* ── Section PACQ ───────────────────────────────────── */}
                <div className="rounded-xl border-l-4 border-l-emerald-400 border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-800">Créer une action dans le PACQ</p>
                    <span className="text-[10px] text-emerald-500 ml-1">(optionnel — remplissez responsable + échéance)</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-emerald-700">Titre de l'action</Label>
                    <Input
                      value={pacqTitre}
                      onChange={(e) => setPacqTitre(e.target.value)}
                      placeholder="Intitulé de l'action corrective…"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-emerald-700">Responsable <span className="text-destructive">*</span></Label>
                      <Select value={pacqResponsable} onValueChange={setPacqResponsable}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Sélectionner un agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-emerald-700">Date d'échéance <span className="text-destructive">*</span></Label>
                      <Input
                        type="date"
                        value={pacqDateEcheance}
                        onChange={(e) => setPacqDateEcheance(e.target.value)}
                        className="h-8 text-sm"
                      />
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
                  <Button
                    variant="outline"
                    size="icon"
                    title="Télécharger le PDF complet"
                    onClick={(e) => handleDownloadPdf(selectedPlainte, e)}
                  >
                    <FileDown className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedPlainte(null)}>
                    Annuler
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeleteDialogOpen(true)}
                      title="Supprimer cette réclamation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {selectedPlainte.managed_at && (
                  <p className="text-xs text-muted-foreground text-center">
                    Dernière modification le {new Date(selectedPlainte.managed_at).toLocaleDateString("fr-FR")} à{" "}
                    {new Date(selectedPlainte.managed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlaintesManagementPage;
