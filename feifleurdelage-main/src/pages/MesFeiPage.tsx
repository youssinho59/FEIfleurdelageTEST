import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Calendar, MapPin, AlertTriangle, MessageCircle, ClipboardCheck, Search } from "lucide-react";

const STATUTS: Record<string, { label: string; color: string }> = {
  nouveau: { label: "Nouveau", color: "bg-blue-100 text-blue-800" },
  en_cours_analyse: { label: "En cours d'analyse", color: "bg-yellow-100 text-yellow-800" },
  actions_en_cours: { label: "Actions en cours", color: "bg-orange-100 text-orange-800" },
  cloture: { label: "Clôturé", color: "bg-green-100 text-green-800" },
  archive: { label: "Archivé", color: "bg-muted text-muted-foreground" },
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
  analyse: string | null;
  plan_action: string | null;
  retour_declarant: string | null;
  date_cloture: string | null;
  managed_at: string | null;
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

const MesFeiPage = () => {
  const { user } = useAuth();
  const [feiList, setFeiList] = useState<FeiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFei, setSelectedFei] = useState<FeiRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchMyFei = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("fei")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setFeiList((data as FeiRecord[]) || []);
      setLoading(false);
    };
    fetchMyFei();
  }, [user]);

  const hasAdminFeedback = (fei: FeiRecord) =>
    fei.analyse || fei.plan_action || fei.retour_declarant;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold">Mes FEI</h1>
        <p className="text-muted-foreground">Historique de vos fiches d'événements indésirables</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : feiList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Vous n'avez pas encore déclaré de FEI</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feiList.map((fei) => {
            const statutInfo = STATUTS[fei.statut] || STATUTS.nouveau;
            const hasFeedback = hasAdminFeedback(fei);
            return (
              <Card
                key={fei.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedFei(fei)}
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
                        {hasFeedback && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                            <MessageCircle className="w-3 h-3" />
                            Retour admin
                          </Badge>
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
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedFei} onOpenChange={(open) => !open && setSelectedFei(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFei && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Détail de la FEI
                </DialogTitle>
              </DialogHeader>

              {/* FEI info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={(STATUTS[selectedFei.statut] || STATUTS.nouveau).color}>
                    {(STATUTS[selectedFei.statut] || STATUTS.nouveau).label}
                  </Badge>
                  <GraviteBadge gravite={selectedFei.gravite} />
                  <Badge variant="secondary">{selectedFei.type_fei}</Badge>
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
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Description :</span>
                  <p className="text-sm mt-1">{selectedFei.description}</p>
                </div>

                {selectedFei.actions_correctives && (
                  <div>
                    <span className="text-sm text-muted-foreground">Actions correctives initiales :</span>
                    <p className="text-sm mt-1">{selectedFei.actions_correctives}</p>
                  </div>
                )}
              </div>

              {/* Admin feedback section */}
              {hasAdminFeedback(selectedFei) && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    <h3 className="font-display font-semibold flex items-center gap-2 text-primary">
                      <ClipboardCheck className="w-4 h-4" />
                      Retour de l'administration
                    </h3>

                    {selectedFei.analyse && (
                      <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Search className="w-3 h-3" /> Analyse
                        </p>
                        <p className="text-sm">{selectedFei.analyse}</p>
                      </div>
                    )}

                    {selectedFei.plan_action && (
                      <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <ClipboardCheck className="w-3 h-3" /> Plan d'action
                        </p>
                        <p className="text-sm">{selectedFei.plan_action}</p>
                      </div>
                    )}

                    {selectedFei.retour_declarant && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1">
                        <p className="text-xs font-medium text-primary flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> Message de l'administration
                        </p>
                        <p className="text-sm">{selectedFei.retour_declarant}</p>
                      </div>
                    )}

                    {selectedFei.date_cloture && (
                      <p className="text-xs text-muted-foreground">
                        Clôturée le {new Date(selectedFei.date_cloture).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="pt-2">
                <Button variant="outline" className="w-full" onClick={() => setSelectedFei(null)}>
                  Fermer
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MesFeiPage;
