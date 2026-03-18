import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Building2, Plus, Pencil, Trash2, AlertTriangle, CheckCircle2,
  Wrench, ClipboardCheck, Package, Calendar, Phone, MapPin,
  Filter, Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Equipement = {
  id: string;
  nom: string;
  categorie: "batiment" | "equipement_medical" | "equipement_technique" | "vehicule" | "informatique" | "autre";
  localisation: string | null;
  marque: string | null;
  modele: string | null;
  numero_serie: string | null;
  date_mise_en_service: string | null;
  fournisseur: string | null;
  contact_fournisseur: string | null;
  statut: "operationnel" | "en_panne" | "en_maintenance" | "hors_service";
  observations: string | null;
  created_by: string | null;
  created_at: string;
};

type Maintenance = {
  id: string;
  equipement_id: string;
  type_maintenance: "preventive" | "corrective" | "reglementaire" | "controle";
  titre: string;
  description: string | null;
  prestataire: string | null;
  date_planifiee: string | null;
  date_realisation: string | null;
  cout: number | null;
  statut: "planifie" | "en_cours" | "realise" | "en_retard";
  periodicite: "mensuelle" | "trimestrielle" | "semestrielle" | "annuelle" | "biannuelle" | "ponctuelle" | null;
  prochaine_echeance: string | null;
  document_nom: string | null;
  created_by: string | null;
  created_at: string;
};

type ControleReglementaire = {
  id: string;
  titre: string;
  type_controle: "securite_incendie" | "electrique" | "ascenseur" | "gaz" | "climatisation" | "eau_potable" | "legionelles" | "amiante" | "autre";
  organisme_verificateur: string | null;
  periodicite: string | null;
  derniere_realisation: string | null;
  prochaine_echeance: string | null;
  statut: "a_planifier" | "planifie" | "realise" | "en_retard" | "non_conforme";
  resultat: "conforme" | "non_conforme" | "reserves" | null;
  observations: string | null;
  document_nom: string | null;
  created_by: string | null;
  created_at: string;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIE_LABELS: Record<Equipement["categorie"], string> = {
  batiment:            "Bâtiment",
  equipement_medical:  "Équipement médical",
  equipement_technique:"Équipement technique",
  vehicule:            "Véhicule",
  informatique:        "Informatique",
  autre:               "Autre",
};

const EQUIP_STATUT_CONFIG: Record<Equipement["statut"], { label: string; color: string }> = {
  operationnel:    { label: "Opérationnel",    color: "bg-emerald-100 text-emerald-700" },
  en_panne:        { label: "En panne",        color: "bg-red-100 text-red-700" },
  en_maintenance:  { label: "En maintenance",  color: "bg-amber-100 text-amber-700" },
  hors_service:    { label: "Hors service",    color: "bg-slate-100 text-slate-600" },
};

const MAINT_STATUT_CONFIG: Record<Maintenance["statut"], { label: string; color: string }> = {
  planifie:    { label: "Planifié",    color: "bg-slate-100 text-slate-600" },
  en_cours:    { label: "En cours",    color: "bg-blue-100 text-blue-700" },
  realise:     { label: "Réalisé",     color: "bg-emerald-100 text-emerald-700" },
  en_retard:   { label: "En retard",   color: "bg-red-100 text-red-700" },
};

const MAINT_TYPE_CONFIG: Record<Maintenance["type_maintenance"], { label: string; color: string }> = {
  preventive:     { label: "Préventive",    color: "bg-blue-100 text-blue-700" },
  corrective:     { label: "Corrective",    color: "bg-amber-100 text-amber-700" },
  reglementaire:  { label: "Réglementaire", color: "bg-purple-100 text-purple-700" },
  controle:       { label: "Contrôle",      color: "bg-teal-100 text-teal-700" },
};

const CTRL_STATUT_CONFIG: Record<ControleReglementaire["statut"], { label: string; color: string }> = {
  a_planifier:  { label: "À planifier",  color: "bg-slate-100 text-slate-600" },
  planifie:     { label: "Planifié",     color: "bg-blue-100 text-blue-700" },
  realise:      { label: "Réalisé",      color: "bg-emerald-100 text-emerald-700" },
  en_retard:    { label: "En retard",    color: "bg-red-100 text-red-700" },
  non_conforme: { label: "Non conforme", color: "bg-red-100 text-red-700" },
};

const CTRL_RESULTAT_CONFIG: Record<NonNullable<ControleReglementaire["resultat"]>, { label: string; color: string }> = {
  conforme:     { label: "Conforme",     color: "bg-emerald-100 text-emerald-700" },
  non_conforme: { label: "Non conforme", color: "bg-red-100 text-red-700" },
  reserves:     { label: "Réserves",     color: "bg-amber-100 text-amber-700" },
};

const TYPE_CONTROLE_LABELS: Record<ControleReglementaire["type_controle"], string> = {
  securite_incendie: "Sécurité incendie",
  electrique:        "Électrique",
  ascenseur:         "Ascenseur",
  gaz:               "Gaz",
  climatisation:     "Climatisation/VMC",
  eau_potable:       "Eau potable",
  legionelles:       "Légionelles",
  amiante:           "Amiante",
  autre:             "Autre",
};

const PERIODICITE_LABELS: Record<string, string> = {
  mensuelle:      "Mensuelle",
  trimestrielle:  "Trimestrielle",
  semestrielle:   "Semestrielle",
  annuelle:       "Annuelle",
  biannuelle:     "Biannuelle",
  ponctuelle:     "Ponctuelle",
};

const CONTROLES_STANDARDS = [
  { titre: "Vérification sécurité incendie", type_controle: "securite_incendie" as const, periodicite: "annuelle" },
  { titre: "Vérification électrique", type_controle: "electrique" as const, periodicite: "annuelle" },
  { titre: "Contrôle ascenseur", type_controle: "ascenseur" as const, periodicite: "semestrielle" },
  { titre: "Contrôle légionelles", type_controle: "legionelles" as const, periodicite: "trimestrielle" },
  { titre: "Qualité eau potable", type_controle: "eau_potable" as const, periodicite: "annuelle" },
  { titre: "Diagnostic amiante", type_controle: "amiante" as const, periodicite: "ponctuelle" },
  { titre: "Climatisation et VMC", type_controle: "climatisation" as const, periodicite: "annuelle" },
];

const EMPTY_EQUIP_FORM = {
  nom: "",
  categorie: "" as Equipement["categorie"] | "",
  localisation: "",
  marque: "",
  modele: "",
  numero_serie: "",
  date_mise_en_service: "",
  fournisseur: "",
  contact_fournisseur: "",
  statut: "operationnel" as Equipement["statut"],
  observations: "",
};

const EMPTY_MAINT_FORM = {
  equipement_id: "",
  type_maintenance: "" as Maintenance["type_maintenance"] | "",
  titre: "",
  description: "",
  prestataire: "",
  date_planifiee: "",
  date_realisation: "",
  cout: "",
  statut: "planifie" as Maintenance["statut"],
  periodicite: "" as Maintenance["periodicite"] | "",
  prochaine_echeance: "",
  document_nom: "",
};

const EMPTY_CTRL_FORM = {
  titre: "",
  type_controle: "" as ControleReglementaire["type_controle"] | "",
  organisme_verificateur: "",
  periodicite: "",
  derniere_realisation: "",
  prochaine_echeance: "",
  statut: "a_planifier" as ControleReglementaire["statut"],
  resultat: "" as ControleReglementaire["resultat"] | "",
  observations: "",
  document_nom: "",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariant = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const isMaintenanceEnRetard = (m: Maintenance) =>
  m.statut !== "realise" && m.date_planifiee !== null && new Date(m.date_planifiee) < new Date(new Date().toDateString());

const calcProchaine = (dateRealisation: string, periodicite: string): string => {
  const d = new Date(dateRealisation);
  const months: Record<string, number> = {
    mensuelle: 1, trimestrielle: 3, semestrielle: 6,
    annuelle: 12, biannuelle: 24, ponctuelle: 0,
  };
  const m = months[periodicite];
  if (!m) return dateRealisation;
  d.setMonth(d.getMonth() + m);
  return d.toISOString().split("T")[0];
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BatimentPage() {
  const { user, isAdmin, isResponsable } = useAuth();

  const [activeTab, setActiveTab] = useState<"equipements" | "maintenances" | "controles">("equipements");
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [controles, setControles] = useState<ControleReglementaire[]>([]);
  const [loadingEquip, setLoadingEquip] = useState(true);
  const [loadingMaint, setLoadingMaint] = useState(true);
  const [loadingCtrl, setLoadingCtrl] = useState(true);

  // Filtres
  const [filterCategorie, setFilterCategorie] = useState("tous");
  const [filterMaintType, setFilterMaintType] = useState("tous");
  const [filterMaintStatut, setFilterMaintStatut] = useState("tous");
  const [filterMaintEquip, setFilterMaintEquip] = useState("tous");

  // Équipement dialog
  const [equipDialogOpen, setEquipDialogOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState<Equipement | null>(null);
  const [equipForm, setEquipForm] = useState(EMPTY_EQUIP_FORM);
  const [savingEquip, setSavingEquip] = useState(false);
  const [deleteEquipTarget, setDeleteEquipTarget] = useState<Equipement | null>(null);
  const [deletingEquip, setDeletingEquip] = useState(false);

  // Maintenance dialog
  const [maintDialogOpen, setMaintDialogOpen] = useState(false);
  const [editingMaint, setEditingMaint] = useState<Maintenance | null>(null);
  const [maintForm, setMaintForm] = useState(EMPTY_MAINT_FORM);
  const [savingMaint, setSavingMaint] = useState(false);
  const [deleteMaintTarget, setDeleteMaintTarget] = useState<Maintenance | null>(null);
  const [deletingMaint, setDeletingMaint] = useState(false);

  // Contrôle dialog
  const [ctrlDialogOpen, setCtrlDialogOpen] = useState(false);
  const [editingCtrl, setEditingCtrl] = useState<ControleReglementaire | null>(null);
  const [ctrlForm, setCtrlForm] = useState(EMPTY_CTRL_FORM);
  const [savingCtrl, setSavingCtrl] = useState(false);
  const [deleteCtrlTarget, setDeleteCtrlTarget] = useState<ControleReglementaire | null>(null);
  const [deletingCtrl, setDeletingCtrl] = useState(false);

  // Enregistrer contrôle dialog
  const [enregistrerCtrlDialogOpen, setEnregistrerCtrlDialogOpen] = useState(false);
  const [enregistrerCtrlTarget, setEnregistrerCtrlTarget] = useState<ControleReglementaire | null>(null);
  const [enregistrerForm, setEnregistrerForm] = useState({
    date_realisation: "",
    resultat: "" as ControleReglementaire["resultat"] | "",
    organisme_verificateur: "",
    observations: "",
    prochaine_echeance: "",
  });
  const [savingEnregistrer, setSavingEnregistrer] = useState(false);
  const [initializingControles, setInitializingControles] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchEquipements = async () => {
    setLoadingEquip(true);
    const { data, error } = await supabase.from("batiment_equipements").select("*").order("nom");
    if (error) toast.error("Erreur : " + error.message);
    else setEquipements((data as Equipement[]) || []);
    setLoadingEquip(false);
  };

  const fetchMaintenances = async () => {
    setLoadingMaint(true);
    const { data, error } = await supabase.from("batiment_maintenances").select("*").order("date_planifiee", { ascending: true });
    if (error) toast.error("Erreur : " + error.message);
    else setMaintenances((data as Maintenance[]) || []);
    setLoadingMaint(false);
  };

  const fetchControles = async () => {
    setLoadingCtrl(true);
    const { data, error } = await supabase.from("batiment_controles_reglementaires").select("*").order("prochaine_echeance", { ascending: true });
    if (error) toast.error("Erreur : " + error.message);
    else setControles((data as ControleReglementaire[]) || []);
    setLoadingCtrl(false);
  };

  useEffect(() => {
    fetchEquipements();
    fetchMaintenances();
    fetchControles();
  }, []);

  // ── KPI ────────────────────────────────────────────────────────────────────

  const totalEquipements = equipements.length;
  const equipementsProblemes = equipements.filter(e => e.statut === "en_panne" || e.statut === "en_maintenance").length;
  const maintEnRetard = maintenances.filter(isMaintenanceEnRetard).length;
  const today = new Date().toISOString().split("T")[0];
  const controlesAlerte = controles.filter(c =>
    c.statut === "en_retard" || c.statut === "non_conforme" ||
    (c.prochaine_echeance !== null && c.prochaine_echeance <= today && c.statut !== "realise")
  ).length;

  // ── Filtered ───────────────────────────────────────────────────────────────

  const filteredEquip = equipements.filter(e => filterCategorie === "tous" || e.categorie === filterCategorie);

  const filteredMaint = maintenances
    .filter(m => {
      if (filterMaintType !== "tous" && m.type_maintenance !== filterMaintType) return false;
      if (filterMaintStatut !== "tous" && m.statut !== filterMaintStatut) return false;
      if (filterMaintEquip !== "tous" && m.equipement_id !== filterMaintEquip) return false;
      return true;
    });

  const canWrite = isAdmin || isResponsable;

  // ── Équipement handlers ────────────────────────────────────────────────────

  const openCreateEquip = () => {
    setEditingEquip(null);
    setEquipForm(EMPTY_EQUIP_FORM);
    setEquipDialogOpen(true);
  };

  const openEditEquip = (e: Equipement) => {
    setEditingEquip(e);
    setEquipForm({
      nom: e.nom,
      categorie: e.categorie,
      localisation: e.localisation || "",
      marque: e.marque || "",
      modele: e.modele || "",
      numero_serie: e.numero_serie || "",
      date_mise_en_service: e.date_mise_en_service || "",
      fournisseur: e.fournisseur || "",
      contact_fournisseur: e.contact_fournisseur || "",
      statut: e.statut,
      observations: e.observations || "",
    });
    setEquipDialogOpen(true);
  };

  const handleSaveEquip = async () => {
    if (!user) return;
    if (!equipForm.nom.trim() || !equipForm.categorie) {
      toast.error("Le nom et la catégorie sont obligatoires.");
      return;
    }
    setSavingEquip(true);
    const payload = {
      nom: equipForm.nom.trim(),
      categorie: equipForm.categorie as Equipement["categorie"],
      localisation: equipForm.localisation.trim() || null,
      marque: equipForm.marque.trim() || null,
      modele: equipForm.modele.trim() || null,
      numero_serie: equipForm.numero_serie.trim() || null,
      date_mise_en_service: equipForm.date_mise_en_service || null,
      fournisseur: equipForm.fournisseur.trim() || null,
      contact_fournisseur: equipForm.contact_fournisseur.trim() || null,
      statut: equipForm.statut,
      observations: equipForm.observations.trim() || null,
    };
    const { error } = editingEquip
      ? await supabase.from("batiment_equipements").update(payload).eq("id", editingEquip.id)
      : await supabase.from("batiment_equipements").insert({ ...payload, created_by: user.id });
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success(editingEquip ? "Équipement mis à jour." : "Équipement ajouté.");
      setEquipDialogOpen(false);
      fetchEquipements();
    }
    setSavingEquip(false);
  };

  const handleDeleteEquip = async () => {
    if (!deleteEquipTarget) return;
    setDeletingEquip(true);
    const { error } = await supabase.from("batiment_equipements").delete().eq("id", deleteEquipTarget.id);
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success("Équipement supprimé.");
      setDeleteEquipTarget(null);
      fetchEquipements();
      fetchMaintenances();
    }
    setDeletingEquip(false);
  };

  // ── Maintenance handlers ───────────────────────────────────────────────────

  const openCreateMaint = () => {
    setEditingMaint(null);
    setMaintForm(EMPTY_MAINT_FORM);
    setMaintDialogOpen(true);
  };

  const openEditMaint = (m: Maintenance) => {
    setEditingMaint(m);
    setMaintForm({
      equipement_id: m.equipement_id,
      type_maintenance: m.type_maintenance,
      titre: m.titre,
      description: m.description || "",
      prestataire: m.prestataire || "",
      date_planifiee: m.date_planifiee || "",
      date_realisation: m.date_realisation || "",
      cout: m.cout !== null ? String(m.cout) : "",
      statut: m.statut,
      periodicite: m.periodicite || "",
      prochaine_echeance: m.prochaine_echeance || "",
      document_nom: m.document_nom || "",
    });
    setMaintDialogOpen(true);
  };

  const handleSaveMaint = async () => {
    if (!user) return;
    if (!maintForm.equipement_id || !maintForm.type_maintenance || !maintForm.titre.trim()) {
      toast.error("L'équipement, le type et le titre sont obligatoires.");
      return;
    }
    setSavingMaint(true);
    const payload = {
      equipement_id: maintForm.equipement_id,
      type_maintenance: maintForm.type_maintenance as Maintenance["type_maintenance"],
      titre: maintForm.titre.trim(),
      description: maintForm.description.trim() || null,
      prestataire: maintForm.prestataire.trim() || null,
      date_planifiee: maintForm.date_planifiee || null,
      date_realisation: maintForm.date_realisation || null,
      cout: maintForm.cout ? Number(maintForm.cout) : null,
      statut: maintForm.statut,
      periodicite: (maintForm.periodicite as Maintenance["periodicite"]) || null,
      prochaine_echeance: maintForm.prochaine_echeance || null,
      document_nom: maintForm.document_nom.trim() || null,
    };
    const { error } = editingMaint
      ? await supabase.from("batiment_maintenances").update(payload).eq("id", editingMaint.id)
      : await supabase.from("batiment_maintenances").insert({ ...payload, created_by: user.id });
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success(editingMaint ? "Maintenance mise à jour." : "Maintenance planifiée.");
      setMaintDialogOpen(false);
      fetchMaintenances();
    }
    setSavingMaint(false);
  };

  const handleDeleteMaint = async () => {
    if (!deleteMaintTarget) return;
    setDeletingMaint(true);
    const { error } = await supabase.from("batiment_maintenances").delete().eq("id", deleteMaintTarget.id);
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success("Maintenance supprimée.");
      setDeleteMaintTarget(null);
      fetchMaintenances();
    }
    setDeletingMaint(false);
  };

  const handleMarquerRealisee = async (m: Maintenance) => {
    const dateRealisation = new Date().toISOString().split("T")[0];
    const prochaine = m.periodicite && m.periodicite !== "ponctuelle"
      ? calcProchaine(dateRealisation, m.periodicite)
      : null;
    const { error } = await supabase.from("batiment_maintenances").update({
      statut: "realise",
      date_realisation: dateRealisation,
      prochaine_echeance: prochaine,
    }).eq("id", m.id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Maintenance marquée réalisée."); fetchMaintenances(); }
  };

  // ── Contrôle handlers ─────────────────────────────────────────────────────

  const openCreateCtrl = () => {
    setEditingCtrl(null);
    setCtrlForm(EMPTY_CTRL_FORM);
    setCtrlDialogOpen(true);
  };

  const openEditCtrl = (c: ControleReglementaire) => {
    setEditingCtrl(c);
    setCtrlForm({
      titre: c.titre,
      type_controle: c.type_controle,
      organisme_verificateur: c.organisme_verificateur || "",
      periodicite: c.periodicite || "",
      derniere_realisation: c.derniere_realisation || "",
      prochaine_echeance: c.prochaine_echeance || "",
      statut: c.statut,
      resultat: c.resultat || "",
      observations: c.observations || "",
      document_nom: c.document_nom || "",
    });
    setCtrlDialogOpen(true);
  };

  const handleSaveCtrl = async () => {
    if (!user) return;
    if (!ctrlForm.titre.trim() || !ctrlForm.type_controle) {
      toast.error("Le titre et le type de contrôle sont obligatoires.");
      return;
    }
    setSavingCtrl(true);
    const payload = {
      titre: ctrlForm.titre.trim(),
      type_controle: ctrlForm.type_controle as ControleReglementaire["type_controle"],
      organisme_verificateur: ctrlForm.organisme_verificateur.trim() || null,
      periodicite: ctrlForm.periodicite.trim() || null,
      derniere_realisation: ctrlForm.derniere_realisation || null,
      prochaine_echeance: ctrlForm.prochaine_echeance || null,
      statut: ctrlForm.statut,
      resultat: (ctrlForm.resultat as ControleReglementaire["resultat"]) || null,
      observations: ctrlForm.observations.trim() || null,
      document_nom: ctrlForm.document_nom.trim() || null,
    };
    const { error } = editingCtrl
      ? await supabase.from("batiment_controles_reglementaires").update(payload).eq("id", editingCtrl.id)
      : await supabase.from("batiment_controles_reglementaires").insert({ ...payload, created_by: user.id });
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success(editingCtrl ? "Contrôle mis à jour." : "Contrôle ajouté.");
      setCtrlDialogOpen(false);
      fetchControles();
    }
    setSavingCtrl(false);
  };

  const handleDeleteCtrl = async () => {
    if (!deleteCtrlTarget) return;
    setDeletingCtrl(true);
    const { error } = await supabase.from("batiment_controles_reglementaires").delete().eq("id", deleteCtrlTarget.id);
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success("Contrôle supprimé.");
      setDeleteCtrlTarget(null);
      fetchControles();
    }
    setDeletingCtrl(false);
  };

  const openEnregistrerCtrl = (c: ControleReglementaire) => {
    setEnregistrerCtrlTarget(c);
    setEnregistrerForm({
      date_realisation: new Date().toISOString().split("T")[0],
      resultat: "",
      organisme_verificateur: c.organisme_verificateur || "",
      observations: "",
      prochaine_echeance: c.periodicite && c.periodicite !== "ponctuelle"
        ? calcProchaine(new Date().toISOString().split("T")[0], c.periodicite)
        : "",
    });
    setEnregistrerCtrlDialogOpen(true);
  };

  const handleEnregistrerCtrl = async () => {
    if (!enregistrerCtrlTarget || !enregistrerForm.date_realisation) {
      toast.error("La date de réalisation est obligatoire.");
      return;
    }
    setSavingEnregistrer(true);
    const { error } = await supabase.from("batiment_controles_reglementaires").update({
      derniere_realisation: enregistrerForm.date_realisation,
      statut: "realise",
      resultat: (enregistrerForm.resultat as ControleReglementaire["resultat"]) || null,
      organisme_verificateur: enregistrerForm.organisme_verificateur.trim() || null,
      observations: enregistrerForm.observations.trim() || null,
      prochaine_echeance: enregistrerForm.prochaine_echeance || null,
    }).eq("id", enregistrerCtrlTarget.id);
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success("Contrôle enregistré.");
      setEnregistrerCtrlDialogOpen(false);
      fetchControles();
    }
    setSavingEnregistrer(false);
  };

  const handleInitControles = async () => {
    if (!user) return;
    setInitializingControles(true);
    const inserts = CONTROLES_STANDARDS.map(c => ({
      titre: c.titre,
      type_controle: c.type_controle,
      periodicite: c.periodicite,
      statut: "a_planifier" as const,
      created_by: user.id,
    }));
    const { error } = await supabase.from("batiment_controles_reglementaires").insert(inserts);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("7 contrôles réglementaires EHPAD initialisés."); fetchControles(); }
    setInitializingControles(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Gestion du Bâtiment</h1>
            <p className="text-xs text-muted-foreground">Équipements, maintenances et contrôles réglementaires</p>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Équipements",          sub: "enregistrés",             value: totalEquipements,    icon: Package,       accent: "border-l-[#c46b48]", iconBg: "bg-[#c46b48]/10", iconColor: "text-[#c46b48]",   numColor: "text-[#c46b48]" },
          { label: "En panne/maintenance", sub: "nécessitent attention",   value: equipementsProblemes,icon: AlertTriangle,  accent: "border-l-amber-400",  iconBg: "bg-amber-50",     iconColor: "text-amber-500",   numColor: "text-amber-600" },
          { label: "Maintenances retard",  sub: "dépassé l'échéance",      value: maintEnRetard,        icon: Wrench,        accent: "border-l-red-400",    iconBg: "bg-red-50",       iconColor: "text-red-500",     numColor: "text-red-600" },
          { label: "Contrôles alertes",    sub: "en retard / non conformes",value: controlesAlerte,    icon: ClipboardCheck,accent: "border-l-purple-400",  iconBg: "bg-purple-50",    iconColor: "text-purple-500",  numColor: "text-purple-600" },
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

      {/* Alerte contrôles */}
      {controlesAlerte > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {controlesAlerte} contrôle{controlesAlerte > 1 ? "s" : ""} réglementaire{controlesAlerte > 1 ? "s" : ""} nécessite{controlesAlerte > 1 ? "nt" : ""} votre attention
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Des contrôles sont en retard ou non conformes. Consultez l'onglet "Contrôles réglementaires".
            </p>
          </div>
        </motion.div>
      )}

      {/* Onglets */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {(["equipements", "maintenances", "controles"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold font-body transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "equipements" ? "Équipements" : tab === "maintenances" ? "Maintenances" : "Contrôles réglementaires"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ─── Onglet Équipements ────────────────────────────────────────────── */}
        {activeTab === "equipements" && (
          <motion.div key="equipements" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={filterCategorie} onValueChange={setFilterCategorie}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes catégories</SelectItem>
                  {Object.entries(CATEGORIE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canWrite && (
                <Button onClick={openCreateEquip} className="ml-auto gap-2 shadow-warm">
                  <Plus className="w-4 h-4" /> Ajouter un équipement
                </Button>
              )}
            </div>

            {loadingEquip ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredEquip.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-3">
                <Package className="w-12 h-12 mx-auto opacity-20" />
                <p className="font-medium">Aucun équipement trouvé</p>
                {canWrite && <p className="text-sm">Ajoutez votre premier équipement.</p>}
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="grid sm:grid-cols-2 gap-4">
                {filteredEquip.map(e => {
                  const stat = EQUIP_STATUT_CONFIG[e.statut];
                  return (
                    <motion.div key={e.id} variants={itemVariant}>
                      <div className="rounded-xl border border-border bg-card shadow-sm p-5 h-full">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-[11px] border-0 ${stat.color}`}>{stat.label}</Badge>
                              <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                                {CATEGORIE_LABELS[e.categorie]}
                              </span>
                            </div>
                            <h3 className="font-semibold text-foreground text-sm">{e.nom}</h3>
                          </div>
                          {canWrite && (
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEditEquip(e)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-destructive" onClick={() => setDeleteEquipTarget(e)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {e.localisation && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {e.localisation}
                            </div>
                          )}
                          {(e.marque || e.modele) && (
                            <div className="flex items-center gap-1.5">
                              <Info className="w-3 h-3 shrink-0" />
                              {[e.marque, e.modele].filter(Boolean).join(" — ")}
                            </div>
                          )}
                          {e.fournisseur && (
                            <div className="flex items-center gap-1.5">
                              <Package className="w-3 h-3 shrink-0" />
                              {e.fournisseur}
                            </div>
                          )}
                          {e.contact_fournisseur && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 shrink-0" />
                              {e.contact_fournisseur}
                            </div>
                          )}
                          {e.date_mise_en_service && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 shrink-0" />
                              Mis en service le {new Date(e.date_mise_en_service).toLocaleDateString("fr-FR")}
                            </div>
                          )}
                        </div>
                        {e.observations && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">{e.observations}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── Onglet Maintenances ──────────────────────────────────────────── */}
        {activeTab === "maintenances" && (
          <motion.div key="maintenances" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-card/50">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={filterMaintType} onValueChange={setFilterMaintType}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les types</SelectItem>
                  {Object.entries(MAINT_TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterMaintStatut} onValueChange={setFilterMaintStatut}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous statuts</SelectItem>
                  {Object.entries(MAINT_STATUT_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterMaintEquip} onValueChange={setFilterMaintEquip}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Équipement" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous équipements</SelectItem>
                  {equipements.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canWrite && (
                <Button onClick={openCreateMaint} className="ml-auto gap-2 shadow-warm">
                  <Plus className="w-4 h-4" /> Planifier une maintenance
                </Button>
              )}
            </div>

            {loadingMaint ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredMaint.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-3">
                <Wrench className="w-12 h-12 mx-auto opacity-20" />
                <p className="font-medium">Aucune maintenance trouvée</p>
                {canWrite && <p className="text-sm">Planifiez votre première maintenance.</p>}
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {filteredMaint.map(m => {
                  const retard = isMaintenanceEnRetard(m);
                  const typeConf = MAINT_TYPE_CONFIG[m.type_maintenance];
                  const statConf = MAINT_STATUT_CONFIG[m.statut];
                  const equip = equipements.find(e => e.id === m.equipement_id);
                  return (
                    <motion.div key={m.id} variants={itemVariant}>
                      <div className={`rounded-xl border shadow-sm p-5 ${retard ? "border-red-200 bg-red-50/30" : "border-border bg-card"}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {retard && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
                                  <AlertTriangle className="w-3 h-3" />En retard
                                </span>
                              )}
                              <Badge variant="outline" className={`text-[11px] border-0 ${typeConf.color}`}>{typeConf.label}</Badge>
                              <Badge variant="outline" className={`text-[11px] border-0 ${statConf.color}`}>{statConf.label}</Badge>
                              {m.periodicite && (
                                <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                                  {PERIODICITE_LABELS[m.periodicite] || m.periodicite}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-foreground text-sm mb-1">{m.titre}</h3>
                            {equip && (
                              <p className="text-xs text-primary font-medium mb-1">{equip.nom}</p>
                            )}
                            {m.description && (
                              <p className="text-xs text-muted-foreground mb-2">{m.description}</p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {m.date_planifiee && (
                                <span className={`flex items-center gap-1.5 ${retard ? "text-red-600 font-semibold" : ""}`}>
                                  <Calendar className="w-3 h-3" />
                                  Prévue le {new Date(m.date_planifiee).toLocaleDateString("fr-FR")}
                                </span>
                              )}
                              {m.date_realisation && (
                                <span className="flex items-center gap-1.5 text-emerald-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Réalisée le {new Date(m.date_realisation).toLocaleDateString("fr-FR")}
                                </span>
                              )}
                              {m.prochaine_echeance && (
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3" />
                                  Prochaine : {new Date(m.prochaine_echeance).toLocaleDateString("fr-FR")}
                                </span>
                              )}
                              {m.prestataire && (
                                <span className="flex items-center gap-1.5">
                                  <Wrench className="w-3 h-3" />
                                  {m.prestataire}
                                </span>
                              )}
                              {m.cout !== null && (
                                <span>{m.cout.toFixed(2)} €</span>
                              )}
                            </div>
                          </div>
                          {canWrite && (
                            <div className="flex flex-col gap-2 shrink-0">
                              {m.statut !== "realise" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 whitespace-nowrap"
                                  onClick={() => handleMarquerRealisee(m)}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Marquer réalisée
                                </Button>
                              )}
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEditMaint(m)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-destructive" onClick={() => setDeleteMaintTarget(m)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
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

        {/* ─── Onglet Contrôles réglementaires ─────────────────────────────── */}
        {activeTab === "controles" && (
          <motion.div key="controles" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            {canWrite && (
              <div className="flex flex-wrap gap-2 justify-end">
                {controles.length === 0 && (
                  <Button
                    variant="outline"
                    onClick={handleInitControles}
                    disabled={initializingControles}
                    className="gap-2 text-sm"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    {initializingControles ? "Initialisation…" : "Initialiser les contrôles EHPAD"}
                  </Button>
                )}
                <Button onClick={openCreateCtrl} className="gap-2 shadow-warm">
                  <Plus className="w-4 h-4" /> Ajouter un contrôle
                </Button>
              </div>
            )}

            {loadingCtrl ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : controles.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-3">
                <ClipboardCheck className="w-12 h-12 mx-auto opacity-20" />
                <p className="font-medium">Aucun contrôle réglementaire</p>
                {canWrite && (
                  <p className="text-sm">
                    Utilisez "Initialiser les contrôles EHPAD" pour créer les contrôles standards.
                  </p>
                )}
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {controles.map(c => {
                  const statConf = CTRL_STATUT_CONFIG[c.statut];
                  const enAlerte = c.statut === "en_retard" || c.statut === "non_conforme" ||
                    (c.prochaine_echeance !== null && c.prochaine_echeance <= today && c.statut !== "realise");
                  return (
                    <motion.div key={c.id} variants={itemVariant}>
                      <div className={`rounded-xl border shadow-sm p-5 ${enAlerte ? "border-red-200 bg-red-50/30" : "border-border bg-card"}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="outline" className={`text-[11px] border-0 ${statConf.color}`}>{statConf.label}</Badge>
                              <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                                {TYPE_CONTROLE_LABELS[c.type_controle]}
                              </span>
                              {c.resultat && CTRL_RESULTAT_CONFIG[c.resultat] && (
                                <Badge variant="outline" className={`text-[11px] border-0 ${CTRL_RESULTAT_CONFIG[c.resultat].color}`}>
                                  {CTRL_RESULTAT_CONFIG[c.resultat].label}
                                </Badge>
                              )}
                              {enAlerte && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
                                  <AlertTriangle className="w-3 h-3" />Alerte
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-foreground text-sm mb-1">{c.titre}</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {c.periodicite && (
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3" />
                                  Périodicité : {PERIODICITE_LABELS[c.periodicite] || c.periodicite}
                                </span>
                              )}
                              {c.derniere_realisation && (
                                <span className="flex items-center gap-1.5 text-emerald-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Dernière réalisation : {new Date(c.derniere_realisation).toLocaleDateString("fr-FR")}
                                </span>
                              )}
                              {c.prochaine_echeance && (
                                <span className={`flex items-center gap-1.5 ${enAlerte ? "text-red-600 font-semibold" : ""}`}>
                                  <Calendar className="w-3 h-3" />
                                  Prochaine échéance : {new Date(c.prochaine_echeance).toLocaleDateString("fr-FR")}
                                </span>
                              )}
                              {c.organisme_verificateur && (
                                <span className="flex items-center gap-1.5">
                                  <Info className="w-3 h-3" />
                                  {c.organisme_verificateur}
                                </span>
                              )}
                            </div>
                            {c.observations && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">{c.observations}</p>
                            )}
                          </div>
                          {canWrite && (
                            <div className="flex flex-col gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs whitespace-nowrap"
                                onClick={() => openEnregistrerCtrl(c)}
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                Enregistrer le contrôle
                              </Button>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEditCtrl(c)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-destructive" onClick={() => setDeleteCtrlTarget(c)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
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

      {/* ─── Dialog Équipement ────────────────────────────────────────────────── */}
      <Dialog open={equipDialogOpen} onOpenChange={setEquipDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {editingEquip ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingEquip ? "Modifier l'équipement" : "Ajouter un équipement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom <span className="text-destructive">*</span></Label>
                <Input value={equipForm.nom} onChange={e => setEquipForm({ ...equipForm, nom: e.target.value })} placeholder="Nom de l'équipement" />
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie <span className="text-destructive">*</span></Label>
                <Select value={equipForm.categorie} onValueChange={v => setEquipForm({ ...equipForm, categorie: v as Equipement["categorie"] })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Localisation</Label>
                <Input value={equipForm.localisation} onChange={e => setEquipForm({ ...equipForm, localisation: e.target.value })} placeholder="Bâtiment A, salle 12…" />
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={equipForm.statut} onValueChange={v => setEquipForm({ ...equipForm, statut: v as Equipement["statut"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EQUIP_STATUT_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Marque</Label>
                <Input value={equipForm.marque} onChange={e => setEquipForm({ ...equipForm, marque: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Modèle</Label>
                <Input value={equipForm.modele} onChange={e => setEquipForm({ ...equipForm, modele: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Numéro de série</Label>
                <Input value={equipForm.numero_serie} onChange={e => setEquipForm({ ...equipForm, numero_serie: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de mise en service</Label>
                <Input type="date" value={equipForm.date_mise_en_service} onChange={e => setEquipForm({ ...equipForm, date_mise_en_service: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fournisseur</Label>
                <Input value={equipForm.fournisseur} onChange={e => setEquipForm({ ...equipForm, fournisseur: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact fournisseur</Label>
                <Input value={equipForm.contact_fournisseur} onChange={e => setEquipForm({ ...equipForm, contact_fournisseur: e.target.value })} placeholder="Téléphone, email…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observations</Label>
              <Textarea value={equipForm.observations} onChange={e => setEquipForm({ ...equipForm, observations: e.target.value })} rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEquipDialogOpen(false)} disabled={savingEquip}>Annuler</Button>
            <Button onClick={handleSaveEquip} disabled={savingEquip} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingEquip ? "Enregistrement…" : editingEquip ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Maintenance ───────────────────────────────────────────────── */}
      <Dialog open={maintDialogOpen} onOpenChange={setMaintDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {editingMaint ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingMaint ? "Modifier la maintenance" : "Planifier une maintenance"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Équipement <span className="text-destructive">*</span></Label>
              <Select value={maintForm.equipement_id} onValueChange={v => setMaintForm({ ...maintForm, equipement_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un équipement" /></SelectTrigger>
                <SelectContent>
                  {equipements.map(e => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select value={maintForm.type_maintenance} onValueChange={v => setMaintForm({ ...maintForm, type_maintenance: v as Maintenance["type_maintenance"] })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MAINT_TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={maintForm.statut} onValueChange={v => setMaintForm({ ...maintForm, statut: v as Maintenance["statut"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MAINT_STATUT_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Titre <span className="text-destructive">*</span></Label>
              <Input value={maintForm.titre} onChange={e => setMaintForm({ ...maintForm, titre: e.target.value })} placeholder="Intitulé de la maintenance" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={maintForm.description} onChange={e => setMaintForm({ ...maintForm, description: e.target.value })} rows={2} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prestataire</Label>
                <Input value={maintForm.prestataire} onChange={e => setMaintForm({ ...maintForm, prestataire: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Coût (€)</Label>
                <Input type="number" step="0.01" value={maintForm.cout} onChange={e => setMaintForm({ ...maintForm, cout: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date planifiée</Label>
                <Input type="date" value={maintForm.date_planifiee} onChange={e => setMaintForm({ ...maintForm, date_planifiee: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de réalisation</Label>
                <Input type="date" value={maintForm.date_realisation} onChange={e => setMaintForm({ ...maintForm, date_realisation: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Périodicité</Label>
                <Select value={maintForm.periodicite || "none"} onValueChange={v => setMaintForm({ ...maintForm, periodicite: v === "none" ? "" : v as Maintenance["periodicite"] })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Ponctuelle</SelectItem>
                    {Object.entries(PERIODICITE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prochaine échéance</Label>
                <Input type="date" value={maintForm.prochaine_echeance} onChange={e => setMaintForm({ ...maintForm, prochaine_echeance: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Document (nom du fichier)</Label>
              <Input value={maintForm.document_nom} onChange={e => setMaintForm({ ...maintForm, document_nom: e.target.value })} placeholder="rapport_maintenance_2026.pdf" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMaintDialogOpen(false)} disabled={savingMaint}>Annuler</Button>
            <Button onClick={handleSaveMaint} disabled={savingMaint} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingMaint ? "Enregistrement…" : editingMaint ? "Mettre à jour" : "Planifier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Contrôle ──────────────────────────────────────────────────── */}
      <Dialog open={ctrlDialogOpen} onOpenChange={setCtrlDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {editingCtrl ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingCtrl ? "Modifier le contrôle" : "Ajouter un contrôle réglementaire"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre <span className="text-destructive">*</span></Label>
              <Input value={ctrlForm.titre} onChange={e => setCtrlForm({ ...ctrlForm, titre: e.target.value })} placeholder="Intitulé du contrôle" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type de contrôle <span className="text-destructive">*</span></Label>
                <Select value={ctrlForm.type_controle} onValueChange={v => setCtrlForm({ ...ctrlForm, type_controle: v as ControleReglementaire["type_controle"] })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONTROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={ctrlForm.statut} onValueChange={v => setCtrlForm({ ...ctrlForm, statut: v as ControleReglementaire["statut"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CTRL_STATUT_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Organisme vérificateur</Label>
                <Input value={ctrlForm.organisme_verificateur} onChange={e => setCtrlForm({ ...ctrlForm, organisme_verificateur: e.target.value })} placeholder="Bureau Veritas, Apave…" />
              </div>
              <div className="space-y-1.5">
                <Label>Périodicité</Label>
                <Select value={ctrlForm.periodicite || "none"} onValueChange={v => setCtrlForm({ ...ctrlForm, periodicite: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Non définie</SelectItem>
                    {Object.entries(PERIODICITE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dernière réalisation</Label>
                <Input type="date" value={ctrlForm.derniere_realisation} onChange={e => setCtrlForm({ ...ctrlForm, derniere_realisation: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Prochaine échéance</Label>
                <Input type="date" value={ctrlForm.prochaine_echeance} onChange={e => setCtrlForm({ ...ctrlForm, prochaine_echeance: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Résultat</Label>
              <Select value={ctrlForm.resultat || "none"} onValueChange={v => setCtrlForm({ ...ctrlForm, resultat: v === "none" ? "" : v as ControleReglementaire["resultat"] })}>
                <SelectTrigger><SelectValue placeholder="Résultat du dernier contrôle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Non renseigné</SelectItem>
                  <SelectItem value="conforme">Conforme</SelectItem>
                  <SelectItem value="non_conforme">Non conforme</SelectItem>
                  <SelectItem value="reserves">Réserves</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observations</Label>
              <Textarea value={ctrlForm.observations} onChange={e => setCtrlForm({ ...ctrlForm, observations: e.target.value })} rows={2} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label>Document (nom du fichier)</Label>
              <Input value={ctrlForm.document_nom} onChange={e => setCtrlForm({ ...ctrlForm, document_nom: e.target.value })} placeholder="rapport_controle_2026.pdf" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCtrlDialogOpen(false)} disabled={savingCtrl}>Annuler</Button>
            <Button onClick={handleSaveCtrl} disabled={savingCtrl} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingCtrl ? "Enregistrement…" : editingCtrl ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Enregistrer contrôle ─────────────────────────────────────── */}
      <Dialog open={enregistrerCtrlDialogOpen} onOpenChange={setEnregistrerCtrlDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              Enregistrer le contrôle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {enregistrerCtrlTarget && (
              <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{enregistrerCtrlTarget.titre}</p>
                <p>{TYPE_CONTROLE_LABELS[enregistrerCtrlTarget.type_controle]}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Date de réalisation <span className="text-destructive">*</span></Label>
              <Input type="date" value={enregistrerForm.date_realisation} onChange={e => setEnregistrerForm({ ...enregistrerForm, date_realisation: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Résultat</Label>
              <Select value={enregistrerForm.resultat || "none"} onValueChange={v => setEnregistrerForm({ ...enregistrerForm, resultat: v === "none" ? "" : v as ControleReglementaire["resultat"] })}>
                <SelectTrigger><SelectValue placeholder="Résultat du contrôle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Non renseigné</SelectItem>
                  <SelectItem value="conforme">Conforme</SelectItem>
                  <SelectItem value="non_conforme">Non conforme</SelectItem>
                  <SelectItem value="reserves">Réserves</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Organisme vérificateur</Label>
              <Input value={enregistrerForm.organisme_verificateur} onChange={e => setEnregistrerForm({ ...enregistrerForm, organisme_verificateur: e.target.value })} placeholder="Bureau Veritas, Apave…" />
            </div>
            <div className="space-y-1.5">
              <Label>Prochaine échéance</Label>
              <Input type="date" value={enregistrerForm.prochaine_echeance} onChange={e => setEnregistrerForm({ ...enregistrerForm, prochaine_echeance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Observations</Label>
              <Textarea value={enregistrerForm.observations} onChange={e => setEnregistrerForm({ ...enregistrerForm, observations: e.target.value })} rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEnregistrerCtrlDialogOpen(false)} disabled={savingEnregistrer}>Annuler</Button>
            <Button onClick={handleEnregistrerCtrl} disabled={savingEnregistrer} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingEnregistrer ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AlertDialogs suppression ─────────────────────────────────────────── */}
      <AlertDialog open={!!deleteEquipTarget} onOpenChange={o => !o && setDeleteEquipTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />Supprimer cet équipement ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteEquipTarget?.nom}"</strong> et toutes ses maintenances associées seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingEquip}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEquip} disabled={deletingEquip} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingEquip ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteMaintTarget} onOpenChange={o => !o && setDeleteMaintTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />Supprimer cette maintenance ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La maintenance <strong>"{deleteMaintTarget?.titre}"</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMaint}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMaint} disabled={deletingMaint} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingMaint ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCtrlTarget} onOpenChange={o => !o && setDeleteCtrlTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />Supprimer ce contrôle ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le contrôle <strong>"{deleteCtrlTarget?.titre}"</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCtrl}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCtrl} disabled={deletingCtrl} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingCtrl ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
