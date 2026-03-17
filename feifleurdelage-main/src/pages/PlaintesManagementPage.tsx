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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { generatePlaintePdf } from "@/lib/pdfGenerator";
import { QRCodeSVG } from "qrcode.react";
import {
  MessageSquareWarning, Calendar, User, FileText, ChevronRight, Trash2, ClipboardCheck,
  Search, MessageCircle, FileDown, QrCode, Printer, ExternalLink, Sparkles, Loader2, CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SuggestionIA = {
  titre: string;
  description: string;
  priorite: "haute" | "moyenne" | "faible";
  thematique_pacq: string;
  objectif_pacq: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const QR_URL = "https://fe-ifleurdelage-test.vercel.app/plainte-externe";

const STATUTS_PLAINTE = [
  { value: "nouveau",   label: "Nouveau",    color: "bg-blue-100 text-blue-800" },
  { value: "en_cours",  label: "En cours",   color: "bg-yellow-100 text-yellow-800" },
  { value: "traite",    label: "Traité",     color: "bg-green-100 text-green-800" },
];

const PRIORITE_IA_COLORS: Record<string, string> = {
  haute: "bg-red-100 text-red-700",
  moyenne: "bg-yellow-100 text-yellow-700",
  faible: "bg-green-100 text-green-700",
};

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
  analyse: string | null;
  plan_action: string | null;
  actions_correctives: string | null;
  retour_declarant: string | null;
  managed_by: string | null;
  managed_at: string | null;
  date_cloture: string | null;
  source: string | null;
};

const PlaintesManagementPage = () => {
  const { user, isAdmin, isResponsable, userServices } = useAuth();
  const agents = useAgents();
  const [plaintesList, setPlaintesList] = useState<PlainteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>("tous");
  const [filterSource, setFilterSource] = useState<string>("toutes");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedPlainte, setSelectedPlainte] = useState<PlainteRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulaire de gestion
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

  // Section IA
  const [iaSuggestions, setIaSuggestions] = useState<SuggestionIA[]>([]);
  const [loadingIA, setLoadingIA] = useState(false);
  const [iaPacqTarget, setIaPacqTarget] = useState<SuggestionIA | null>(null);
  const [iaPacqResponsable, setIaPacqResponsable] = useState("");
  const [iaPacqDateEcheance, setIaPacqDateEcheance] = useState("");
  const [iaPacqSaving, setIaPacqSaving] = useState(false);

  // ── Data loading ───────────────────────────────────────────────────────────

  const fetchPlaintes = async () => {
    setLoading(true);
    let query = supabase
      .from("plaintes")
      .select("*")
      .order("created_at", { ascending: false });
    if (filterStatut !== "tous") query = query.eq("statut", filterStatut);
    if (filterSource === "interne") query = query.or("source.eq.interne,source.is.null");
    if (filterSource === "externe") query = query.eq("source", "externe");

    if (isResponsable && !isAdmin && userServices.length > 0) {
      query = query.in("service", userServices);
    }

    const { data, error } = await query;
    if (error) setFetchError(error.message + (error.details ? ` — ${error.details}` : ""));
    else setFetchError(null);
    setPlaintesList((data as PlainteRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPlaintes(); }, [filterStatut, filterSource]);

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
    // IA reset
    setIaSuggestions([]);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

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

  // ── Delete ─────────────────────────────────────────────────────────────────

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

  // ── PDF ────────────────────────────────────────────────────────────────────

  const handleDownloadPdf = (plainte: PlainteRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const gestionnaire = agents.find((a) => a.id === plainte.managed_by);
    const pdf = generatePlaintePdf({
      ...plainte,
      gestionnaire_nom: gestionnaire?.full_name,
    });
    pdf.save(`Plainte_COMPLET_${plainte.id.slice(0, 8)}_${plainte.date_plainte}.pdf`);
  };

  // ── IA ─────────────────────────────────────────────────────────────────────

  const callIAPlainte = async () => {
    if (!selectedPlainte) return;
    setLoadingIA(true);
    setIaSuggestions([]);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "Tu es un expert qualité dans un EHPAD français. Tu proposes des actions correctives concrètes et des objectifs qualité associés selon le référentiel HAS/AVS ESSMS. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.",
          messages: [{
            role: "user",
            content: `Voici une plainte ou réclamation dans un EHPAD :

Motif : ${selectedPlainte.objet}
Description : ${selectedPlainte.description}
Demandeur : ${selectedPlainte.demandeur}
Service : ${selectedPlainte.service || "Non précisé"}

Propose 3 actions correctives adaptées à cette plainte.
Pour chaque action, indique l'objectif PACQ stratégique associé parmi ces thématiques HAS/AVS : "La personne et ses droits", "L'accompagnement à l'autonomie", "L'accompagnement à la santé", "Les interactions avec l'environnement", "Le management et les ressources humaines", "La gestion et la qualité".
Réponds avec ce JSON exact :
{
"actions": [
{
"titre": "...",
"description": "...",
"priorite": "haute|moyenne|faible",
"thematique_pacq": "...",
"objectif_pacq": "..."
}
]
}`,
          }],
        }),
      });
      if (!response.ok) throw new Error(`Erreur API ${response.status}`);
      const data = await response.json();
      const text = data.content[0].text;
      const parsed = JSON.parse(text);
      setIaSuggestions(parsed.actions ?? []);
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
    if (!iaPacqTarget || !iaPacqDateEcheance || !user || !selectedPlainte) return;
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
      plainte_id: selectedPlainte.id,
      user_id: user.id,
    });
    if (error) toast.error("Erreur création PACQ : " + error.message);
    else { toast.success("Action créée dans le PACQ ✓"); setIaPacqTarget(null); }
    setIaPacqSaving(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Gestion des Réclamations</h1>
          <p className="text-muted-foreground">Traitez et suivez les plaintes et réclamations enregistrées</p>
        </div>
        <Button variant="outline" className="gap-2 shrink-0" onClick={() => setQrDialogOpen(true)}>
          <QrCode className="w-4 h-4" /> QR Code
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant={filterStatut === "tous" ? "default" : "outline"} size="sm" onClick={() => setFilterStatut("tous")}>
          Toutes ({plaintesList.length})
        </Button>
        {STATUTS_PLAINTE.map((s) => (
          <Button key={s.value} variant={filterStatut === s.value ? "default" : "outline"} size="sm" onClick={() => setFilterStatut(s.value)}>
            {s.label}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Source :</span>
          {(["toutes", "interne", "externe"] as const).map(src => (
            <Button
              key={src}
              size="sm"
              variant={filterSource === src ? "default" : "outline"}
              onClick={() => setFilterSource(src)}
              className={src === "externe" && filterSource !== "externe"
                ? "border-orange-300 text-orange-600 hover:bg-orange-50"
                : ""}
            >
              {src === "toutes" ? "Toutes" : src === "interne" ? "Interne" : "Externe"}
            </Button>
          ))}
        </div>
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
              <Card key={plainte.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(plainte)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={statutInfo.color}>{statutInfo.label}</Badge>
                        <Badge variant="secondary">{plainte.demandeur}</Badge>
                        {plainte.source === "externe" && (
                          <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-xs gap-1">
                            <ExternalLink className="w-3 h-3" /> Externe
                          </Badge>
                        )}
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

      {/* ── QR Code Dialog ── */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <QrCode className="w-5 h-5 text-primary" />
              QR Code — Plainte externe
            </DialogTitle>
          </DialogHeader>
          <div id="qr-print-area" className="flex flex-col items-center gap-4 py-2">
            <div className="p-4 bg-white rounded-2xl border border-border shadow-sm">
              <QRCodeSVG value={QR_URL} size={200} level="M" includeMargin={false} />
            </div>
            <div className="w-full rounded-lg bg-muted/60 px-3 py-2.5 text-center">
              <p className="text-[11px] text-muted-foreground mb-0.5">Lien direct</p>
              <p className="text-xs font-mono text-foreground break-all">{QR_URL}</p>
            </div>
            <div className="w-full rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
              <p className="font-semibold mb-1">Comment l'utiliser ?</p>
              <ul className="space-y-0.5 list-disc list-inside text-blue-700">
                <li>Affichez ce QR Code à l'accueil</li>
                <li>En salle à manger ou dans les chambres</li>
                <li>Les résidents et familles scannent avec leur téléphone</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                const area = document.getElementById("qr-print-area");
                if (!area) return;
                const win = window.open("", "_blank");
                win?.document.write(`
                  <html><head><title>QR Code — Plainte Externe — EHPAD La Fleur de l'Âge</title>
                  <style>
                    body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 32px; background: #faf7f3; }
                    .title { font-size: 20px; font-weight: bold; margin-bottom: 4px; color: #c46b48; }
                    .sub { font-size: 13px; color: #666; margin-bottom: 24px; }
                    .url { font-family: monospace; font-size: 12px; color: #333; margin-top: 16px; word-break: break-all; max-width: 300px; text-align: center; }
                    .instructions { margin-top: 20px; font-size: 12px; color: #555; text-align: center; max-width: 280px; line-height: 1.7; }
                  </style></head><body>
                  <div class="title">EHPAD La Fleur de l'Âge</div>
                  <div class="sub">Déposer une plainte ou réclamation</div>
                  ${area.innerHTML}
                  <div class="instructions">Scannez ce QR Code avec votre smartphone<br>pour accéder au formulaire confidentiel</div>
                  </body></html>`);
                win?.document.close();
                win?.print();
              }}
            >
              <Printer className="w-4 h-4" /> Imprimer
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => setQrDialogOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    {selectedPlainte.source === "externe" && (
                      <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-xs gap-1">
                        <ExternalLink className="w-3 h-3" /> Externe — QR Code
                      </Badge>
                    )}
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

              {/* ── Formulaire de gestion ── */}
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
                  <Label htmlFor="analyse">Analyse de la réclamation</Label>
                  <Textarea
                    id="analyse"
                    value={editAnalyse}
                    onChange={(e) => setEditAnalyse(e.target.value)}
                    placeholder="Analyse des causes, facteurs, contexte de la réclamation..."
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
                      onClick={callIAPlainte}
                    >
                      {loadingIA ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> L'IA analyse la réclamation…</>
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
                              <ClipboardCheck className="w-3 h-3" /> Ajouter au PACQ
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

                {/* ── Section PACQ ── */}
                <div className="rounded-xl border-l-4 border-l-emerald-400 border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-800">Créer une action dans le PACQ</p>
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
                  <Button variant="outline" size="icon" title="Télécharger le PDF complet" onClick={(e) => handleDownloadPdf(selectedPlainte, e)}>
                    <FileDown className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedPlainte(null)}>Annuler</Button>
                  {isAdmin && (
                    <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} title="Supprimer cette réclamation">
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

      {/* ── Dialog IA → PACQ ── */}
      <Dialog open={!!iaPacqTarget} onOpenChange={(o) => !o && setIaPacqTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base">
              <Sparkles className="w-4 h-4 text-primary" />
              Ajouter au PACQ opérationnel
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

export default PlaintesManagementPage;
