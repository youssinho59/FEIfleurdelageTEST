import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/hooks/useAgents";
import { AuditGrille } from "@/components/audits/AuditGrille";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ClipboardCheck, Plus, Pencil, Trash2, AlertTriangle, CheckCircle2,
  Clock, Target, Link2, Filter, Calendar, User, ShieldAlert,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Audit = {
  id: string;
  titre: string;
  date_audit: string;
  type_audit: "interne" | "externe" | "certification" | "suivi";
  auditeur: string | null;
  service: string | null;
  statut: "planifie" | "en_cours" | "termine";
  observations: string | null;
  created_by: string | null;
  created_at: string;
};

type NonConformite = {
  id: string;
  audit_id: string | null;
  titre: string;
  description: string | null;
  criticite: "mineure" | "majeure" | "critique";
  statut: "ouverte" | "en_traitement" | "cloturee";
  service: string | null;
  action_corrective_id: string | null;
  created_by: string | null;
  created_at: string;
};

type ActionRef = { id: string; titre: string; statut: string; priorite: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES = ["Administration", "Cuisine", "Technique", "Lingerie", "Animation", "Soins/Hôtellerie"];

const CRITICITE_CONFIG: Record<NonConformite["criticite"], { label: string; color: string; dot: string }> = {
  mineure:  { label: "Mineure",  color: "bg-yellow-100 text-yellow-700 border-yellow-300", dot: "bg-yellow-400"  },
  majeure:  { label: "Majeure",  color: "bg-orange-100 text-orange-700 border-orange-300", dot: "bg-orange-500"  },
  critique: { label: "Critique", color: "bg-red-100 text-red-700 border-red-300",          dot: "bg-red-500"     },
};

const STATUT_NC_CONFIG: Record<NonConformite["statut"], { label: string; color: string }> = {
  ouverte:       { label: "Ouverte",       color: "bg-blue-100 text-blue-700"             },
  en_traitement: { label: "En traitement", color: "bg-amber-100 text-amber-700"            },
  cloturee:      { label: "Clôturée",      color: "bg-emerald-100 text-emerald-700"       },
};

const TYPE_AUDIT_CONFIG: Record<Audit["type_audit"], { label: string; color: string }> = {
  interne:      { label: "Interne",      color: "bg-blue-100 text-blue-700"     },
  externe:      { label: "Externe",      color: "bg-purple-100 text-purple-700" },
  certification:{ label: "Certification",color: "bg-orange-100 text-orange-700" },
  suivi:        { label: "Suivi",        color: "bg-teal-100 text-teal-700"     },
};

const STATUT_AUDIT_CONFIG: Record<Audit["statut"], { label: string; color: string }> = {
  planifie:  { label: "Planifié",  color: "bg-slate-100 text-slate-600"   },
  en_cours:  { label: "En cours",  color: "bg-blue-100 text-blue-700"     },
  termine:   { label: "Terminé",   color: "bg-emerald-100 text-emerald-700" },
};

const criticiteFromPriorite = (c: NonConformite["criticite"]): "haute" | "moyenne" | "faible" =>
  c === "critique" ? "haute" : c === "majeure" ? "moyenne" : "faible";

const EMPTY_AUDIT_FORM = { titre: "", date_audit: "", type_audit: "interne" as Audit["type_audit"], auditeur: "", service: "", statut: "planifie" as Audit["statut"], observations: "" };
const EMPTY_NC_FORM = { audit_id: "", titre: "", description: "", criticite: "mineure" as NonConformite["criticite"], statut: "ouverte" as NonConformite["statut"], service: "", action_corrective_id: "" };
const EMPTY_PACQ_FORM = { titre: "", description: "", responsable_id: "", date_echeance: "", priorite: "moyenne" as "haute" | "moyenne" | "faible" };

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditsPage() {
  const { user } = useAuth();
  const agents = useAgents();

  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [tab, setTab] = useState<"audits" | "nc">("audits");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [ncs, setNcs] = useState<NonConformite[]>([]);
  const [actionsCorrectives, setActionsCorrectives] = useState<ActionRef[]>([]);
  const [loading, setLoading] = useState(true);

  // NC filters
  const [filterAuditId, setFilterAuditId] = useState("");
  const [filterCriticite, setFilterCriticite] = useState("");
  const [filterStatutNc, setFilterStatutNc] = useState("");
  const [filterServiceNc, setFilterServiceNc] = useState("");

  // Audit form dialog
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [auditForm, setAuditForm] = useState(EMPTY_AUDIT_FORM);
  const [savingAudit, setSavingAudit] = useState(false);
  const [deleteAuditId, setDeleteAuditId] = useState<string | null>(null);
  const [deletingAudit, setDeletingAudit] = useState(false);

  // NC form dialog
  const [ncDialogOpen, setNcDialogOpen] = useState(false);
  const [editingNc, setEditingNc] = useState<NonConformite | null>(null);
  const [ncForm, setNcForm] = useState(EMPTY_NC_FORM);
  const [savingNc, setSavingNc] = useState(false);
  const [deleteNcId, setDeleteNcId] = useState<string | null>(null);
  const [deletingNc, setDeletingNc] = useState(false);

  // PACQ create dialog (from NC card or from NC form)
  const [pacqDialogOpen, setPacqDialogOpen] = useState(false);
  const [pacqTargetNcId, setPacqTargetNcId] = useState<string | null>(null); // existing NC
  const [pacqInForm, setPacqInForm] = useState(false); // triggered from NC form
  const [pacqForm, setPacqForm] = useState(EMPTY_PACQ_FORM);
  const [savingPacq, setSavingPacq] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    const [auditsRes, ncsRes, actRes] = await Promise.all([
      supabase.from("audits").select("*").order("date_audit", { ascending: false }),
      supabase.from("non_conformites").select("*").order("created_at", { ascending: false }),
      supabase.from("actions_correctives").select("id, titre, statut, priorite").order("created_at", { ascending: false }),
    ]);
    setAudits((auditsRes.data as Audit[]) || []);
    setNcs((ncsRes.data as NonConformite[]) || []);
    setActionsCorrectives((actRes.data as ActionRef[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Derived / filtered NC list ───────────────────────────────────────────────

  const filteredNcs = useMemo(() => {
    return ncs.filter((nc) => {
      if (filterAuditId && nc.audit_id !== filterAuditId) return false;
      if (filterCriticite && nc.criticite !== filterCriticite) return false;
      if (filterStatutNc && nc.statut !== filterStatutNc) return false;
      if (filterServiceNc && nc.service !== filterServiceNc) return false;
      return true;
    });
  }, [ncs, filterAuditId, filterCriticite, filterStatutNc, filterServiceNc]);

  // ── Audit CRUD ───────────────────────────────────────────────────────────────

  const openCreateAudit = () => {
    setEditingAudit(null);
    setAuditForm(EMPTY_AUDIT_FORM);
    setAuditDialogOpen(true);
  };

  const openEditAudit = (a: Audit) => {
    setEditingAudit(a);
    setAuditForm({
      titre: a.titre, date_audit: a.date_audit, type_audit: a.type_audit,
      auditeur: a.auditeur || "", service: a.service || "",
      statut: a.statut, observations: a.observations || "",
    });
    setAuditDialogOpen(true);
  };

  const handleSaveAudit = async () => {
    if (!auditForm.titre.trim() || !auditForm.date_audit) {
      toast.error("Le titre et la date sont obligatoires.");
      return;
    }
    setSavingAudit(true);
    const payload = {
      titre: auditForm.titre.trim(),
      date_audit: auditForm.date_audit,
      type_audit: auditForm.type_audit,
      auditeur: auditForm.auditeur.trim() || null,
      service: auditForm.service || null,
      statut: auditForm.statut,
      observations: auditForm.observations.trim() || null,
    };
    const { error } = editingAudit
      ? await supabase.from("audits").update(payload).eq("id", editingAudit.id)
      : await supabase.from("audits").insert({ ...payload, created_by: user?.id });
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success(editingAudit ? "Audit mis à jour." : "Audit créé."); setAuditDialogOpen(false); await fetchAll(); }
    setSavingAudit(false);
  };

  const handleDeleteAudit = async () => {
    if (!deleteAuditId) return;
    setDeletingAudit(true);
    const { error } = await supabase.from("audits").delete().eq("id", deleteAuditId);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Audit supprimé."); setDeleteAuditId(null); await fetchAll(); }
    setDeletingAudit(false);
  };

  // ── NC CRUD ──────────────────────────────────────────────────────────────────

  const openCreateNc = (preAuditId?: string) => {
    setEditingNc(null);
    setNcForm({ ...EMPTY_NC_FORM, audit_id: preAuditId || "" });
    setNcDialogOpen(true);
  };

  const openEditNc = (nc: NonConformite) => {
    setEditingNc(nc);
    setNcForm({
      audit_id: nc.audit_id || "",
      titre: nc.titre,
      description: nc.description || "",
      criticite: nc.criticite,
      statut: nc.statut,
      service: nc.service || "",
      action_corrective_id: nc.action_corrective_id || "",
    });
    setNcDialogOpen(true);
  };

  const handleSaveNc = async () => {
    if (!ncForm.titre.trim() || !ncForm.audit_id) {
      toast.error("L'audit source et le titre sont obligatoires.");
      return;
    }
    setSavingNc(true);
    const payload = {
      audit_id: ncForm.audit_id,
      titre: ncForm.titre.trim(),
      description: ncForm.description.trim() || null,
      criticite: ncForm.criticite,
      statut: ncForm.statut,
      service: ncForm.service || null,
      action_corrective_id: ncForm.action_corrective_id || null,
    };
    const { error } = editingNc
      ? await supabase.from("non_conformites").update(payload).eq("id", editingNc.id)
      : await supabase.from("non_conformites").insert({ ...payload, created_by: user?.id });
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success(editingNc ? "Non-conformité mise à jour." : "Non-conformité créée."); setNcDialogOpen(false); await fetchAll(); }
    setSavingNc(false);
  };

  const handleDeleteNc = async () => {
    if (!deleteNcId) return;
    setDeletingNc(true);
    const { error } = await supabase.from("non_conformites").delete().eq("id", deleteNcId);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Non-conformité supprimée."); setDeleteNcId(null); await fetchAll(); }
    setDeletingNc(false);
  };

  // ── PACQ action creation ──────────────────────────────────────────────────────

  const openPacqFromNc = (nc: NonConformite) => {
    setPacqTargetNcId(nc.id);
    setPacqInForm(false);
    setPacqForm({
      titre: nc.titre,
      description: nc.description || "",
      responsable_id: "",
      date_echeance: "",
      priorite: criticiteFromPriorite(nc.criticite),
    });
    setPacqDialogOpen(true);
  };

  const openPacqFromForm = () => {
    setPacqTargetNcId(null);
    setPacqInForm(true);
    setPacqForm({
      titre: ncForm.titre,
      description: ncForm.description,
      responsable_id: "",
      date_echeance: "",
      priorite: criticiteFromPriorite(ncForm.criticite),
    });
    setPacqDialogOpen(true);
  };

  const handleSavePacq = async () => {
    if (!pacqForm.titre.trim() || !pacqForm.date_echeance) {
      toast.error("Le titre et la date d'échéance sont obligatoires.");
      return;
    }
    if (!user) return;
    setSavingPacq(true);
    const responsableAgent = agents.find((a) => a.id === pacqForm.responsable_id);
    const payload = {
      titre: pacqForm.titre.trim(),
      description: pacqForm.description.trim() || null,
      responsable: responsableAgent?.full_name || pacqForm.titre,
      responsable_id: pacqForm.responsable_id || null,
      date_echeance: pacqForm.date_echeance,
      priorite: pacqForm.priorite,
      statut: "a_faire",
      user_id: user.id,
    };
    const { data: newAct, error } = await supabase
      .from("actions_correctives")
      .insert(payload)
      .select("id")
      .single();
    if (error || !newAct) {
      toast.error("Erreur création action PACQS : " + (error?.message ?? "inconnue"));
      setSavingPacq(false);
      return;
    }
    // Link to NC
    if (pacqTargetNcId) {
      await supabase.from("non_conformites").update({ action_corrective_id: newAct.id }).eq("id", pacqTargetNcId);
    }
    if (pacqInForm) {
      setNcForm((prev) => ({ ...prev, action_corrective_id: newAct.id }));
    }
    toast.success("Action PACQS créée et liée à la non-conformité !");
    setPacqDialogOpen(false);
    await fetchAll();
    setSavingPacq(false);
  };

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const auditKpi = useMemo(() => ({
    total: audits.length,
    enCours: audits.filter((a) => a.statut === "en_cours").length,
    termines: audits.filter((a) => a.statut === "termine").length,
  }), [audits]);

  const ncKpi = useMemo(() => ({
    total: ncs.length,
    ouvertes: ncs.filter((n) => n.statut === "ouverte").length,
    enTraitement: ncs.filter((n) => n.statut === "en_traitement").length,
    cloturees: ncs.filter((n) => n.statut === "cloturee").length,
  }), [ncs]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (selectedAuditId) {
    return <AuditGrille auditId={selectedAuditId} onClose={() => setSelectedAuditId(null)} />;
  }

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-warm shrink-0">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Audits & Non-conformités</h1>
            <p className="text-xs text-muted-foreground">Gestion des audits internes et suivi des non-conformités</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-border pb-0">
        {(["audits", "nc"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "audits" ? `Audits (${audits.length})` : `Non-conformités (${ncs.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* ══ ONGLET AUDITS ══ */}
          {tab === "audits" && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-primary">{auditKpi.total}</p>
                    <p className="text-[11px] text-muted-foreground">Total audits</p>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-blue-500">{auditKpi.enCours}</p>
                    <p className="text-[11px] text-muted-foreground">En cours</p>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-emerald-500">{auditKpi.termines}</p>
                    <p className="text-[11px] text-muted-foreground">Terminés</p>
                  </div>
                </CardContent></Card>
              </div>

              {/* Header bouton */}
              <div className="flex justify-end">
                <Button onClick={openCreateAudit} className="gap-2 shadow-warm">
                  <Plus className="w-4 h-4" /> Nouvel audit
                </Button>
              </div>

              {/* Liste audits */}
              {audits.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <ClipboardCheck className="w-10 h-10 mx-auto opacity-20 mb-3" />
                  <p className="font-medium">Aucun audit enregistré</p>
                </CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {audits.map((audit) => {
                    const ncCount = ncs.filter((n) => n.audit_id === audit.id).length;
                    return (
                      <Card key={audit.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="outline" className={`text-xs border ${TYPE_AUDIT_CONFIG[audit.type_audit].color}`}>
                                  {TYPE_AUDIT_CONFIG[audit.type_audit].label}
                                </Badge>
                                <Badge variant="outline" className={`text-xs border ${STATUT_AUDIT_CONFIG[audit.statut].color}`}>
                                  {STATUT_AUDIT_CONFIG[audit.statut].label}
                                </Badge>
                                {audit.service && (
                                  <Badge variant="secondary" className="text-xs">{audit.service}</Badge>
                                )}
                              </div>
                              <h3 className="font-semibold text-foreground text-sm leading-snug">{audit.titre}</h3>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(audit.date_audit + "T00:00:00").toLocaleDateString("fr-FR")}
                                </span>
                                {audit.auditeur && (
                                  <span className="flex items-center gap-1.5">
                                    <User className="w-3 h-3" />{audit.auditeur}
                                  </span>
                                )}
                              </div>
                              {audit.observations && (
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">{audit.observations}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 gap-1.5"
                                onClick={() => setSelectedAuditId(audit.id)}
                              >
                                📋 Grille
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 gap-1.5"
                                onClick={() => {
                                  setFilterAuditId(audit.id);
                                  setTab("nc");
                                }}
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                NC ({ncCount})
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => openEditAudit(audit)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteAuditId(audit.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ ONGLET NON-CONFORMITÉS ══ */}
          {tab === "nc" && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-primary">{ncKpi.total}</p>
                    <p className="text-[11px] text-muted-foreground">Total</p>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-blue-500">{ncKpi.ouvertes}</p>
                    <p className="text-[11px] text-muted-foreground">Ouvertes</p>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-amber-500">{ncKpi.enTraitement}</p>
                    <p className="text-[11px] text-muted-foreground">En traitement</p>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-emerald-500">{ncKpi.cloturees}</p>
                    <p className="text-[11px] text-muted-foreground">Clôturées</p>
                  </div>
                </CardContent></Card>
              </div>

              {/* Filtres */}
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex flex-wrap gap-3 items-center">
                    <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Select value={filterAuditId || "all"} onValueChange={(v) => setFilterAuditId(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs w-44">
                        <SelectValue placeholder="Tous les audits" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les audits</SelectItem>
                        {audits.map((a) => <SelectItem key={a.id} value={a.id}>{a.titre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filterCriticite || "all"} onValueChange={(v) => setFilterCriticite(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue placeholder="Toute criticité" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toute criticité</SelectItem>
                        <SelectItem value="mineure">Mineure</SelectItem>
                        <SelectItem value="majeure">Majeure</SelectItem>
                        <SelectItem value="critique">Critique</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatutNc || "all"} onValueChange={(v) => setFilterStatutNc(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue placeholder="Tout statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tout statut</SelectItem>
                        <SelectItem value="ouverte">Ouverte</SelectItem>
                        <SelectItem value="en_traitement">En traitement</SelectItem>
                        <SelectItem value="cloturee">Clôturée</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterServiceNc || "all"} onValueChange={(v) => setFilterServiceNc(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs w-40">
                        <SelectValue placeholder="Tous les services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les services</SelectItem>
                        {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {(filterAuditId || filterCriticite || filterStatutNc || filterServiceNc) && (
                      <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => {
                        setFilterAuditId(""); setFilterCriticite(""); setFilterStatutNc(""); setFilterServiceNc("");
                      }}>
                        Réinitialiser
                      </Button>
                    )}
                    <Button onClick={() => openCreateNc(filterAuditId || undefined)} className="gap-2 ml-auto shadow-warm" size="sm">
                      <Plus className="w-4 h-4" /> Nouvelle non-conformité
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Liste NC */}
              {filteredNcs.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <ShieldAlert className="w-10 h-10 mx-auto opacity-20 mb-3" />
                  <p className="font-medium">Aucune non-conformité{(filterAuditId || filterCriticite || filterStatutNc || filterServiceNc) ? " pour ces filtres" : ""}</p>
                </CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {filteredNcs.map((nc) => {
                    const criticiteConf = CRITICITE_CONFIG[nc.criticite];
                    const statutConf = STATUT_NC_CONFIG[nc.statut];
                    const sourceAudit = audits.find((a) => a.id === nc.audit_id);
                    const linkedAction = actionsCorrectives.find((a) => a.id === nc.action_corrective_id);
                    return (
                      <Card key={nc.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${criticiteConf.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${criticiteConf.dot}`} />
                                  {criticiteConf.label}
                                </span>
                                <Badge variant="outline" className={`text-xs border ${statutConf.color}`}>
                                  {statutConf.label}
                                </Badge>
                                {nc.service && <Badge variant="secondary" className="text-xs">{nc.service}</Badge>}
                                {sourceAudit && (
                                  <span className="text-[11px] text-muted-foreground">
                                    Audit : <span className="font-medium text-foreground">{sourceAudit.titre}</span>
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold text-foreground text-sm leading-snug">{nc.titre}</h3>
                              {nc.description && (
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{nc.description}</p>
                              )}
                              <div className="mt-2.5">
                                {linkedAction ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    <Target className="w-3 h-3" />
                                    PACQS ✓ — {linkedAction.titre}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => openPacqFromNc(nc)}
                                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Link2 className="w-3 h-3" />
                                    Créer action PACQS
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => openEditNc(nc)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteNcId(nc.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Dialog Audit ─────────────────────────────────────────────────────── */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {editingAudit ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingAudit ? "Modifier l'audit" : "Nouvel audit"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre <span className="text-destructive">*</span></Label>
              <Input value={auditForm.titre} onChange={(e) => setAuditForm({ ...auditForm, titre: e.target.value })} placeholder="Ex : Audit interne soins Q1 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={auditForm.date_audit} onChange={(e) => setAuditForm({ ...auditForm, date_audit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={auditForm.type_audit} onValueChange={(v) => setAuditForm({ ...auditForm, type_audit: v as Audit["type_audit"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interne">Interne</SelectItem>
                    <SelectItem value="externe">Externe</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="suivi">Suivi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Auditeur</Label>
                <Input value={auditForm.auditeur} onChange={(e) => setAuditForm({ ...auditForm, auditeur: e.target.value })} placeholder="Nom de l'auditeur" />
              </div>
              <div className="space-y-1.5">
                <Label>Service</Label>
                <Select value={auditForm.service || "none"} onValueChange={(v) => setAuditForm({ ...auditForm, service: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Tous services" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non spécifié</SelectItem>
                    {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={auditForm.statut} onValueChange={(v) => setAuditForm({ ...auditForm, statut: v as Audit["statut"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planifie">Planifié</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="termine">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observations</Label>
              <Textarea value={auditForm.observations} onChange={(e) => setAuditForm({ ...auditForm, observations: e.target.value })} placeholder="Observations générales…" rows={3} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAuditDialogOpen(false)} disabled={savingAudit}>Annuler</Button>
            <Button onClick={handleSaveAudit} disabled={savingAudit} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingAudit ? "Enregistrement…" : editingAudit ? "Mettre à jour" : "Créer l'audit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog NC ────────────────────────────────────────────────────────── */}
      <Dialog open={ncDialogOpen} onOpenChange={setNcDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {editingNc ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingNc ? "Modifier la non-conformité" : "Nouvelle non-conformité"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Audit source <span className="text-destructive">*</span></Label>
              <Select value={ncForm.audit_id || "none"} onValueChange={(v) => setNcForm({ ...ncForm, audit_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un audit…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sélectionner —</SelectItem>
                  {audits.map((a) => <SelectItem key={a.id} value={a.id}>{a.titre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Titre <span className="text-destructive">*</span></Label>
              <Input value={ncForm.titre} onChange={(e) => setNcForm({ ...ncForm, titre: e.target.value })} placeholder="Intitulé de la non-conformité" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={ncForm.description} onChange={(e) => setNcForm({ ...ncForm, description: e.target.value })} placeholder="Détails, contexte…" rows={3} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Criticité</Label>
                <Select value={ncForm.criticite} onValueChange={(v) => setNcForm({ ...ncForm, criticite: v as NonConformite["criticite"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mineure">Mineure</SelectItem>
                    <SelectItem value="majeure">Majeure</SelectItem>
                    <SelectItem value="critique">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={ncForm.statut} onValueChange={(v) => setNcForm({ ...ncForm, statut: v as NonConformite["statut"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ouverte">Ouverte</SelectItem>
                    <SelectItem value="en_traitement">En traitement</SelectItem>
                    <SelectItem value="cloturee">Clôturée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Select value={ncForm.service || "none"} onValueChange={(v) => setNcForm({ ...ncForm, service: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Non spécifié" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non spécifié</SelectItem>
                  {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Lien PACQ */}
            <div className="space-y-2 pt-1 border-t border-border">
              <Label className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                Lien PACQS opérationnel
                <span className="text-muted-foreground text-xs font-normal">(optionnel)</span>
              </Label>
              <Select
                value={ncForm.action_corrective_id || "none"}
                onValueChange={(v) => setNcForm({ ...ncForm, action_corrective_id: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Lier à une action corrective existante…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {actionsCorrectives.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.titre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!ncForm.action_corrective_id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs border-dashed w-full"
                  onClick={openPacqFromForm}
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  Créer une action dans le PACQS
                </Button>
              )}
              {ncForm.action_corrective_id && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Action PACQS liée
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNcDialogOpen(false)} disabled={savingNc}>Annuler</Button>
            <Button onClick={handleSaveNc} disabled={savingNc} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingNc ? "Enregistrement…" : editingNc ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Créer action PACQ ──────────────────────────────────────────── */}
      <Dialog open={pacqDialogOpen} onOpenChange={setPacqDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Target className="w-4 h-4 text-primary" />
              Créer une action PACQS opérationnel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre <span className="text-destructive">*</span></Label>
              <Input value={pacqForm.titre} onChange={(e) => setPacqForm({ ...pacqForm, titre: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={pacqForm.description} onChange={(e) => setPacqForm({ ...pacqForm, description: e.target.value })} rows={3} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select value={pacqForm.priorite} onValueChange={(v) => setPacqForm({ ...pacqForm, priorite: v as "haute" | "moyenne" | "faible" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="moyenne">Moyenne</SelectItem>
                    <SelectItem value="faible">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date d'échéance <span className="text-destructive">*</span></Label>
                <Input type="date" value={pacqForm.date_echeance} onChange={(e) => setPacqForm({ ...pacqForm, date_echeance: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Responsable</Label>
              <Select value={pacqForm.responsable_id || "none"} onValueChange={(v) => setPacqForm({ ...pacqForm, responsable_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPacqDialogOpen(false)} disabled={savingPacq}>Annuler</Button>
            <Button onClick={handleSavePacq} disabled={savingPacq} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savingPacq ? "Création…" : "Créer l'action PACQS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog suppr audit ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteAuditId} onOpenChange={(o) => !o && setDeleteAuditId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Supprimer cet audit ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              L'audit et toutes ses non-conformités associées seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAudit}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAudit} disabled={deletingAudit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingAudit ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog suppr NC ─────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteNcId} onOpenChange={(o) => !o && setDeleteNcId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Supprimer cette non-conformité ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'éventuelle action PACQ liée ne sera pas supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingNc}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNc} disabled={deletingNc} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingNc ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
