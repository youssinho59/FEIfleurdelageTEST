import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FolderOpen, ExternalLink, CheckCircle2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Categorie = { id: string; nom: string; ordre: number };

type Procedure = {
  id: string;
  categorie_id: string;
  titre: string;
  description: string | null;
  pdf_filename: string;
  services: string[];
};

type Emargement = { procedure_id: string; emarge_at: string };

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClasseurAgentPage() {
  const { user, userServices } = useAuth();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [emargements, setEmargements] = useState<Emargement[]>([]);
  const [loading, setLoading] = useState(true);
  const [emargingProc, setEmargingProc] = useState<string | null>(null);

  // ── Chargement ───────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [catsRes, procsRes, emsRes] = await Promise.allSettled([
      supabase.from("classeur_categories").select("id, nom, ordre").order("ordre"),
      supabase.from("classeur_procedures")
        .select("id, categorie_id, titre, description, pdf_filename, services")
        .order("created_at"),
      supabase
        .from("classeur_emargements")
        .select("procedure_id, emarge_at")
        .eq("user_id", user.id),
    ]);
    if (catsRes.status === "fulfilled" && !catsRes.value.error)
      setCategories(catsRes.value.data ?? []);
    if (procsRes.status === "fulfilled" && !procsRes.value.error)
      setProcedures((procsRes.value.data ?? []).map(p => ({ ...p, services: p.services ?? [] })));
    if (emsRes.status === "fulfilled" && !emsRes.value.error)
      setEmargements(emsRes.value.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtrage par service ──────────────────────────────────────────────────────

  // Afficher la procédure si : services[] vide (tous) OU si l'agent est dans un des services
  const isVisible = (proc: Procedure) => {
    if (proc.services.length === 0) return true;
    if (userServices.length === 0) return true; // agent sans service assigné = tout visible
    return proc.services.some(s => userServices.includes(s));
  };

  // Catégories qui ont au moins une procédure visible
  const visibleCategories = categories.filter(cat =>
    procedures.some(p => p.categorie_id === cat.id && isVisible(p))
  );

  // ── Émargement ───────────────────────────────────────────────────────────────

  const handleEmargement = async (procedureId: string) => {
    if (!user) return;
    setEmargingProc(procedureId);
    const { error } = await supabase.from("classeur_emargements").insert({
      procedure_id: procedureId,
      user_id: user.id,
      emarge_at: new Date().toISOString(),
    });
    if (error) {
      // Code 23505 = violation contrainte unique (déjà émargé)
      if (error.code === "23505") {
        await loadData();
      } else {
        toast.error("Erreur lors de la validation");
      }
    } else {
      toast.success("Document marqué comme lu et validé ✓");
      await loadData();
    }
    setEmargingProc(null);
  };

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
          Procédures de l'établissement
        </p>
      </div>

      {/* Contenu */}
      {visibleCategories.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Aucune procédure disponible pour votre service.
          </p>
        </div>
      ) : (
        <Tabs defaultValue={visibleCategories[0].id}>
          <TabsList className="flex-wrap h-auto gap-1">
            {visibleCategories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.nom}
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleCategories.map(cat => {
            const catProcs = procedures.filter(
              p => p.categorie_id === cat.id && isVisible(p)
            );
            return (
              <TabsContent key={cat.id} value={cat.id} className="mt-4 space-y-3">
                {catProcs.map((proc, i) => {
                  const em = emargements.find(e => e.procedure_id === proc.id);
                  return (
                    <motion.div
                      key={proc.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4"
                    >
                      {/* Infos procédure */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{proc.titre}</p>
                        {proc.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {proc.description}
                          </p>
                        )}
                        {em && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Validé le{" "}
                            {new Date(em.emarge_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <a
                          href={`/classeur-documentaire/${encodeURIComponent(proc.pdf_filename)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Consulter le PDF
                          </Button>
                        </a>

                        {em ? (
                          <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs gap-1.5 px-2.5 py-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Lu et validé ✓
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="text-xs gap-1.5 h-8"
                            disabled={emargingProc === proc.id}
                            onClick={() => handleEmargement(proc.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {emargingProc === proc.id
                              ? "Validation…"
                              : "Marquer comme lu et validé"}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
