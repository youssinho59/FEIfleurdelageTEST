import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, ArrowLeft, Calendar, MapPin, AlertTriangle, User, ChevronRight, Filter } from "lucide-react";

const STATUTS = [
  { value: "nouveau", label: "Nouveau", color: "bg-blue-100 text-blue-800" },
  { value: "en_cours_analyse", label: "En cours d'analyse", color: "bg-yellow-100 text-yellow-800" },
  { value: "actions_en_cours", label: "Actions en cours", color: "bg-orange-100 text-orange-800" },
  { value: "cloture", label: "Clôturé", color: "bg-green-100 text-green-800" },
  { value: "archive", label: "Archivé", color: "bg-muted text-muted-foreground" },
];

const getStatutInfo = (statut: string) => STATUTS.find((s) => s.value === statut) || STATUTS[0];

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
  analyse: string | null;
  plan_action: string | null;
  retour_declarant: string | null;
  date_cloture: string | null;
  managed_by: string | null;
  managed_at: string | null;
};

const FeiManagementPage = () => {
  const { user } = useAuth();
  const [feiList, setFeiList] = useState<FeiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<string>("tous");
  const [selectedFei, setSelectedFei] = useState<FeiRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editStatut, setEditStatut] = useState("");
  const [editAnalyse, setEditAnalyse] = useState("");
  const [editPlanAction, setEditPlanAction] = useState("");
  const [editRetour, setEditRetour] = useState("");
  const [editActions, setEditActions] = useState("");

  const fetchFei = async () => {
    setLoading(true);
    let query = supabase
      .from("fei")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterStatut !== "tous") {
      query = query.eq("statut", filterStatut);
    }

    const { data } = await query;
    setFeiList((data as FeiRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFei();
  }, [filterStatut]);

  const openDetail = (fei: FeiRecord) => {
    setSelectedFei(fei);
    setEditStatut(fei.statut);
    setEditAnalyse(fei.analyse || "");
    setEditPlanAction(fei.plan_action || "");
    setEditRetour(fei.retour_declarant || "");
    setEditActions(fei.actions_correctives || "");
  };

  const handleSave = async () => {
    if (!selectedFei || !user) return;
    setSaving(true);

    const updates: Record<string, unknown> = {
      statut: editStatut,
      analyse: editAnalyse || null,
      plan_action: editPlanAction || null,
      retour_declarant: editRetour || null,
      actions_correctives: editActions || null,
      managed_by: user.id,
      managed_at: new Date().toISOString(),
    };

    if (editStatut === "cloture" || editStatut === "archive") {
      updates.date_cloture = new Date().toISOString().split("T")[0];
    }

    const { error } = await supabase
      .from("fei")
      .update(updates)
      .eq("id", selectedFei.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour : " + error.message);
    } else {
      toast.success("FEI mise à jour avec succès");
      setSelectedFei(null);
      fetchFei();
    }
    setSaving(false);
  };

  const countByStatut = (statut: string) =>
    statut === "tous"
      ? feiList.length
      : feiList.filter((f) => f.statut === statut).length;

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

      {/* FEI List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
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
            return (
              <Card
                key={fei.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(fei)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={statutInfo.color}>
                          {statutInfo.label}
                        </Badge>
                        <GraviteBadge gravite={fei.gravite} />
                        <Badge variant="secondary">{fei.type_fei}</Badge>
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
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail / Management Dialog */}
      <Dialog open={!!selectedFei} onOpenChange={(open) => !open && setSelectedFei(null)}>
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
              <Card className="bg-secondary/50">
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{selectedFei.type_fei}</Badge>
                    <GraviteBadge gravite={selectedFei.gravite} />
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
                  <Select value={editStatut} onValueChange={setEditStatut}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="retour">Retour au déclarant</Label>
                  <Textarea
                    id="retour"
                    value={editRetour}
                    onChange={(e) => setEditRetour(e.target.value)}
                    placeholder="Message de retour à communiquer au déclarant..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedFei(null)}>
                    Annuler
                  </Button>
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
    </div>
  );
};

export default FeiManagementPage;
