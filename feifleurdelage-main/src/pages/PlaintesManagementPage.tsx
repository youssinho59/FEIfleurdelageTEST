import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { MessageSquareWarning, Calendar, User, FileText, ChevronRight, Trash2 } from "lucide-react";

const STATUTS_PLAINTE = [
  { value: "nouveau", label: "Nouveau", color: "bg-blue-100 text-blue-800" },
  { value: "en_cours", label: "En cours", color: "bg-yellow-100 text-yellow-800" },
  { value: "traite", label: "Traité", color: "bg-green-100 text-green-800" },
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
};

const PlaintesManagementPage = () => {
  const [plaintesList, setPlaintesList] = useState<PlainteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>("tous");
  const [selectedPlainte, setSelectedPlainte] = useState<PlainteRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPlaintes = async () => {
    setLoading(true);
    let query = supabase
      .from("plaintes")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterStatut !== "tous") {
      query = query.eq("statut", filterStatut);
    }

    const { data, error } = await query;
    if (error) {
      setFetchError(error.message + (error.details ? ` — ${error.details}` : ""));
    } else {
      setFetchError(null);
    }
    setPlaintesList((data as PlainteRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlaintes();
  }, [filterStatut]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Gestion des Réclamations</h1>
        <p className="text-muted-foreground">Consultez et supprimez les plaintes et réclamations enregistrées</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterStatut === "tous" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatut("tous")}
        >
          Toutes ({plaintesList.length})
        </Button>
        {STATUTS_PLAINTE.map((s) => (
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
            return (
              <Card
                key={plainte.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedPlainte(plainte)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={statutInfo.color}>
                          {statutInfo.label}
                        </Badge>
                        <Badge variant="secondary">{plainte.demandeur}</Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{plainte.objet}</p>
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
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
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
              Supprimer définitivement cette réclamation ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. La réclamation et toutes ses données seront définitivement supprimées de la base de données.
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedPlainte} onOpenChange={(open) => !open && setSelectedPlainte(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPlainte && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <MessageSquareWarning className="w-5 h-5" />
                  Détail de la réclamation
                </DialogTitle>
              </DialogHeader>

              <Card className="bg-secondary/50">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={getStatutInfo(selectedPlainte.statut).color}>
                      {getStatutInfo(selectedPlainte.statut).label}
                    </Badge>
                    <Badge variant="secondary">{selectedPlainte.demandeur}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date : </span>
                      {new Date(selectedPlainte.date_plainte).toLocaleDateString("fr-FR")}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Déclarant : </span>
                      {selectedPlainte.declarant_nom}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium flex items-center gap-1 mb-1">
                      <FileText className="w-3 h-3" /> Objet
                    </span>
                    <p className="text-sm">{selectedPlainte.objet}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium mb-1 block">Description</span>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedPlainte.description}</p>
                  </div>
                  {selectedPlainte.reponse_apportee && (
                    <div>
                      <span className="text-sm font-medium mb-1 block">Réponse apportée</span>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedPlainte.reponse_apportee}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setSelectedPlainte(null)} className="flex-1">
                  Fermer
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer définitivement
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlaintesManagementPage;
