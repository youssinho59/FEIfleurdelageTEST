import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Check } from "lucide-react";

const AgentsManagementPage = () => {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastCreated(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-agent", {
        body: { nom, prenom, password },
      });

      if (error) {
        toast.error(error.message || "Erreur lors de la création");
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`Agent ${prenom} ${nom} créé avec succès !`);
        setLastCreated(data.identifiant);
        setNom("");
        setPrenom("");
        setPassword("");
      }
    } catch (err: any) {
      toast.error("Erreur inattendue");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Gestion des agents</h1>
        <p className="text-muted-foreground">Créez des comptes pour les agents de l'établissement</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Créer un agent
          </CardTitle>
          <CardDescription>
            L'agent se connectera avec son nom et prénom comme identifiant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="DUPONT"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input
                id="prenom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Jean"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Création en cours..." : "Créer l'agent"}
            </Button>
          </form>

          {lastCreated && (
            <div className="mt-4 p-3 rounded-lg bg-accent/50 border border-accent flex items-start gap-2">
              <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Agent créé avec succès !</p>
                <p className="text-muted-foreground">
                  Identifiant de connexion : <span className="font-mono font-medium text-foreground">{lastCreated}</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentsManagementPage;
