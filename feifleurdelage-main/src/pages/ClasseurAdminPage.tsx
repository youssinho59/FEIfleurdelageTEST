import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FolderOpen, Plus, Trash2, ExternalLink,
  ChevronDown, ChevronUp, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Categorie = { id: string; nom: string; ordre: number };

type Procedure = {
  id: string;
  categorie_id: string;
  titre: string;
  description: string | null;
  pdf_filename: string;
  services: string[];
  created_at: string;
};

type Emargement = { procedure_id: string; user_id: string; emarge_at: string };

type AgentInfo = { user_id: string; full_name: string; services: string[] };

// ─── Constantes ───────────────────────────────────────────────────────────────

const SERVICES_LIST = [
  "Administration", "Cuisine", "Technique",
  "Lingerie", "Animation", "Soins/Hôtellerie",
];

const EMPTY_PROC_FORM = {
  titre: "",
  description: "",
  pdf_filename: "",
  services: [] as string[],
};

// Normalise un nom de fichier PDF pour l'URL :
// accents supprimés, espaces → underscores, caractères spéciaux supprimés sauf - et _
function sanitizeFilename(raw: string): string {
  const ext = raw.toLowerCase().endsWith(".pdf") ? ".pdf" : "";
  const base = ext ? raw.slice(0, -4) : raw;
  return (
    base
      .normalize("NFD")                        // décompose les caractères accentués
      .replace(/[\u0300-\u036f]/g, "")         // supprime les diacritiques
      .replace(/[''`]/g, "")                   // supprime apostrophes
      .replace(/\s+/g, "_")                    // espaces → underscores
      .replace(/[^a-zA-Z0-9_\-]/g, "")        // supprime tout sauf lettres, chiffres, - et _
      .replace(/_+/g, "_")                     // underscores multiples → un seul
      .replace(/^_|_$/g, "")                   // supprime underscores en début/fin
    + ext
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClasseurAdminPage() {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  // Catégories
  const [newCatNom, setNewCatNom] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  // Accordion
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Dialog ajout procédure
  const [procDialogOpen, setProcDialogOpen] = useState(false);
  const [procDialogCatId, setProcDialogCatId] = useState("");
  const [procForm, setProcForm] = useState(EMPTY_PROC_FORM);
  const [savingProc, setSavingProc] = useState(false);

  // Suivi
  const [emargements, setEmargements] = useState<Emargement[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loadingSuivi, setLoadingSuivi] = useState(false);
  const [suiviLoaded, setSuiviLoaded] = useState(false);
  const [suiviFilterCat, setSuiviFilterCat] = useState("all");
  const [suiviFilterProc, setSuiviFilterProc] = useState("all");

  // ── Chargement catégories + procédures ──────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const [catsRes, procsRes] = await Promise.allSettled([
      supabase.from("classeur_categories").select("id, nom, ordre").order("ordre"),
      supabase.from("classeur_procedures")
        .select("id, categorie_id, titre, description, pdf_filename, services, created_at")
        .order("created_at"),
    ]);
    if (catsRes.status === "fulfilled" && !catsRes.value.error)
      setCategories(catsRes.value.data ?? []);
    if (procsRes.status === "fulfilled" && !procsRes.value.error)
      setProcedures((procsRes.value.data ?? []).map(p => ({ ...p, services: p.services ?? [] })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Chargement suivi (lazy) ──────────────────────────────────────────────────

  const loadSuivi = useCallback(async () => {
    if (suiviLoaded) return;
    setLoadingSuivi(true);
    const [emargRes, agentsRes] = await Promise.allSettled([
      supabase.from("classeur_emargements").select("procedure_id, user_id, emarge_at"),
      supabase.functions.invoke("manage-agent", { body: { action: "list" } }),
    ]);
    if (emargRes.status === "fulfilled" && !emargRes.value.error)
      setEmargements(emargRes.value.data ?? []);
    if (agentsRes.status === "fulfilled" && !agentsRes.value.error) {
      const data = agentsRes.value.data as { agents?: any[] } | null;
      setAgents(
        (data?.agents ?? []).map((a: any) => ({
          user_id: a.user_id,
          full_name: a.full_name,
          services: a.services ?? [],
        }))
      );
    }
    setSuiviLoaded(true);
    setLoadingSuivi(false);
  }, [suiviLoaded]);

  // ── Catégories ──────────────────────────────────────────────────────────────

  const handleAddCat = async () => {
    if (!newCatNom.trim()) return;
    setAddingCat(true);
    const { error } = await supabase
      .from("classeur_categories")
      .insert({ nom: newCatNom.trim(), ordre: categories.length });
    if (error) toast.error("Erreur lors de l'ajout de la catégorie");
    else { setNewCatNom(""); await loadData(); toast.success("Catégorie ajoutée"); }
    setAddingCat(false);
  };

  const handleDeleteCat = async (id: string) => {
    const { error } = await supabase.from("classeur_categories").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else { await loadData(); toast.success("Catégorie supprimée"); }
  };

  // ── Procédures ──────────────────────────────────────────────────────────────

  const openAddProc = (catId: string) => {
    setProcDialogCatId(catId);
    setProcForm(EMPTY_PROC_FORM);
    setProcDialogOpen(true);
  };

  const handleAddProc = async () => {
    if (!procForm.titre.trim() || !procForm.pdf_filename.trim()) return;
    setSavingProc(true);
    const { error } = await supabase.from("classeur_procedures").insert({
      categorie_id: procDialogCatId,
      titre: procForm.titre.trim(),
      description: procForm.description.trim() || null,
      pdf_filename: sanitizeFilename(procForm.pdf_filename.trim()),
      services: procForm.services,
    });
    if (error) toast.error("Erreur lors de l'ajout de la procédure");
    else { setProcDialogOpen(false); await loadData(); toast.success("Procédure ajoutée"); }
    setSavingProc(false);
  };

  const handleDeleteProc = async (id: string) => {
    const { error } = await supabase.from("classeur_procedures").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else { await loadData(); toast.success("Procédure supprimée"); }
  };

  const toggleService = (svc: string) =>
    setProcForm(f => ({
      ...f,
      services: f.services.includes(svc)
        ? f.services.filter(s => s !== svc)
        : [...f.services, svc],
    }));

  const toggleCat = (id: string) =>
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // ── Suivi helpers ────────────────────────────────────────────────────────────

  const agentsForProc = (proc: Procedure) =>
    proc.services.length === 0
      ? agents
      : agents.filter(a => a.services.some(s => proc.services.includes(s)));

  const suiviProcedures = procedures.filter(p => {
    if (suiviFilterCat !== "all" && p.categorie_id !== suiviFilterCat) return false;
    if (suiviFilterProc !== "all" && p.id !== suiviFilterProc) return false;
    return true;
  });

  // ── Rendu ────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-primary" />
          Classeur documentaire
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestion des procédures et suivi des émargements
        </p>
      </div>

      <Tabs
        defaultValue="procedures"
        onValueChange={val => { if (val === "suivi") loadSuivi(); }}
      >
        <TabsList>
          <TabsTrigger value="procedures">Procédures</TabsTrigger>
          <TabsTrigger value="suivi">Suivi des émargements</TabsTrigger>
        </TabsList>

        {/* ── Onglet Procédures ──────────────────────────────────────────── */}
        <TabsContent value="procedures" className="space-y-6 mt-4">

          {/* Section catégories */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Catégories</h2>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1 text-sm"
                  >
                    <span>{cat.nom}</span>
                    <button
                      onClick={() => handleDeleteCat(cat.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Nouvelle catégorie…"
                value={newCatNom}
                onChange={e => setNewCatNom(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddCat()}
                className="max-w-xs h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={handleAddCat}
                disabled={addingCat || !newCatNom.trim()}
              >
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>
          </div>

          {/* Accordéon par catégorie */}
          <div className="space-y-3">
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                Aucune catégorie. Créez-en une pour commencer.
              </p>
            )}
            {categories.map(cat => {
              const procs = procedures.filter(p => p.categorie_id === cat.id);
              const isOpen = expandedCats.has(cat.id);
              return (
                <div key={cat.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => toggleCat(cat.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-semibold text-sm">{cat.nom}</span>
                      <Badge variant="secondary" className="text-xs">{procs.length}</Badge>
                    </div>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                      {procs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Aucune procédure dans cette catégorie.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {procs.map(proc => (
                            <div
                              key={proc.id}
                              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{proc.titre}</p>
                                {proc.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {proc.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {proc.services.length === 0
                                    ? <Badge variant="outline" className="text-xs">Tous les services</Badge>
                                    : proc.services.map(s => (
                                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                                      ))
                                  }
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={`/classeur-documentaire/${encodeURIComponent(proc.pdf_filename)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                    <ExternalLink className="w-3 h-3" /> PDF
                                  </Button>
                                </a>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteProc(proc.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => openAddProc(cat.id)}
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter une procédure
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Onglet Suivi ───────────────────────────────────────────────── */}
        <TabsContent value="suivi" className="space-y-4 mt-4">
          {loadingSuivi ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Filtres */}
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Catégorie</Label>
                  <select
                    value={suiviFilterCat}
                    onChange={e => {
                      setSuiviFilterCat(e.target.value);
                      setSuiviFilterProc("all");
                    }}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Toutes les catégories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Procédure</Label>
                  <select
                    value={suiviFilterProc}
                    onChange={e => setSuiviFilterProc(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Toutes les procédures</option>
                    {procedures
                      .filter(p => suiviFilterCat === "all" || p.categorie_id === suiviFilterCat)
                      .map(p => <option key={p.id} value={p.id}>{p.titre}</option>)
                    }
                  </select>
                </div>
              </div>

              {/* Tableau */}
              {suiviProcedures.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Aucune procédure pour ces filtres.
                </p>
              ) : (
                <div className="space-y-6">
                  {suiviProcedures.map(proc => {
                    const relevant = agentsForProc(proc);
                    const emsForProc = emargements.filter(e => e.procedure_id === proc.id);
                    const count = emsForProc.length;
                    const total = relevant.length;
                    return (
                      <div key={proc.id} className="rounded-xl border border-border bg-card overflow-hidden">
                        {/* En-tête procédure */}
                        <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm">{proc.titre}</p>
                            <p className="text-xs text-muted-foreground">
                              {categories.find(c => c.id === proc.categorie_id)?.nom ?? ""}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs shrink-0",
                              total > 0 && count === total
                                ? "border-green-500 text-green-700"
                                : "border-orange-400 text-orange-600"
                            )}
                          >
                            {count} / {total} émargé{count > 1 ? "s" : ""}
                          </Badge>
                        </div>

                        {/* Lignes agents */}
                        <div className="divide-y divide-border">
                          {relevant.length === 0 ? (
                            <p className="text-xs text-muted-foreground px-4 py-3">
                              Aucun agent concerné.
                            </p>
                          ) : (
                            relevant.map(agent => {
                              const em = emsForProc.find(e => e.user_id === agent.user_id);
                              return (
                                <div
                                  key={agent.user_id}
                                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                                >
                                  <div>
                                    <span className="font-medium">{agent.full_name}</span>
                                    {agent.services.length > 0 && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        {agent.services.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                  {em ? (
                                    <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Émargé — {new Date(em.emarge_at).toLocaleDateString("fr-FR")}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-red-300 text-red-600 text-xs gap-1">
                                      <XCircle className="w-3 h-3" />
                                      Non émargé
                                    </Badge>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog ajout procédure ──────────────────────────────────────────── */}
      <Dialog open={procDialogOpen} onOpenChange={setProcDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter une procédure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input
                value={procForm.titre}
                onChange={e => setProcForm(f => ({ ...f, titre: e.target.value }))}
                placeholder="Ex : Procédure d'hygiène des mains"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={procForm.description}
                onChange={e => setProcForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Description courte (optionnel)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nom du fichier PDF *</Label>
              <Input
                value={procForm.pdf_filename}
                onChange={e => setProcForm(f => ({ ...f, pdf_filename: e.target.value }))}
                placeholder="procedure-hygiene.pdf"
              />
              <p className="text-xs text-muted-foreground">
                Déposez le fichier dans le dossier{" "}
                <code className="bg-muted px-1 rounded text-[11px]">
                  public/classeur-documentaire/
                </code>{" "}
                puis saisissez son nom exact ici.
              </p>
              {procForm.pdf_filename.trim() && (() => {
                const cleaned = sanitizeFilename(procForm.pdf_filename.trim());
                const changed = cleaned !== procForm.pdf_filename.trim();
                return (
                  <div className={cn(
                    "flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs",
                    changed
                      ? "bg-amber-50 border border-amber-200 text-amber-800"
                      : "bg-green-50 border border-green-200 text-green-800"
                  )}>
                    <span className="shrink-0 mt-px">{changed ? "⚠" : "✓"}</span>
                    <span>
                      {changed
                        ? <>Nom enregistré :{" "}<code className="font-mono font-semibold">{cleaned}</code></>
                        : <>Nom valide — sera enregistré tel quel.</>
                      }
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label>
                Services concernés{" "}
                <span className="text-muted-foreground font-normal">(vide = tous les services)</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES_LIST.map(svc => (
                  <div key={svc} className="flex items-center gap-2">
                    <Checkbox
                      id={`svc-${svc}`}
                      checked={procForm.services.includes(svc)}
                      onCheckedChange={() => toggleService(svc)}
                    />
                    <label htmlFor={`svc-${svc}`} className="text-sm cursor-pointer select-none">
                      {svc}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAddProc}
              disabled={savingProc || !procForm.titre.trim() || !procForm.pdf_filename.trim()}
            >
              {savingProc ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
