import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { UserPlus, Check, Pencil, RefreshCw, ShieldCheck, User, KeyRound, Calendar, Briefcase } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

const SERVICES = [
  "Administration",
  "Cuisine",
  "Technique",
  "Lingerie",
  "Animation",
  "Soins/Hôtellerie",
];

// Récupère le token JWT depuis localStorage sans passer par le client supabase-js
function getToken(): string {
  try {
    const raw = localStorage.getItem(`sb-${PROJECT_REF}-auth-token`);
    if (!raw) return "";
    return JSON.parse(raw)?.access_token ?? "";
  } catch {
    return "";
  }
}

// Appel direct fetch vers une Edge Function — zéro dépendance à supabase-js
async function callFunction(name: string, body: unknown): Promise<{ data: any; error: string | null }> {
  const token = getToken();
  const url = `${SUPABASE_URL}/functions/v1/${name}`;

  console.log(`[callFunction] → ${url}`, { hasToken: !!token, anonKey: ANON_KEY?.slice(0, 20) + "…" });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log(`[callFunction] ← ${res.status}`, text.slice(0, 500));

  let json: any = null;
  try { json = JSON.parse(text); } catch { return { data: null, error: `Réponse non-JSON (${res.status}): ${text.slice(0, 200)}` }; }

  if (json?.error) return { data: null, error: json.error };
  return { data: json, error: null };
}

type Agent = {
  user_id: string;
  full_name: string;
  email: string;
  identifiant: string;
  role: "admin" | "user" | "responsable";
  service: string | null;
  created_at: string;
};

const RoleBadge = ({ role, service }: { role: string; service?: string | null }) => {
  if (role === "admin") return (
    <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
      <ShieldCheck className="w-3 h-3" /> Administrateur
    </Badge>
  );
  if (role === "responsable") return (
    <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
      <Briefcase className="w-3 h-3" /> Responsable{service ? ` — ${service}` : ""}
    </Badge>
  );
  return (
    <Badge variant="secondary" className="gap-1">
      <User className="w-3 h-3" /> Agent
    </Badge>
  );
};

// ── Création ──────────────────────────────────────────────────────────────────
const CreateForm = ({ onCreated }: { onCreated: () => void }) => {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin" | "responsable">("user");
  const [service, setService] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "responsable" && !service) {
      toast.error("Veuillez sélectionner un service pour le rôle Responsable.");
      return;
    }
    setLoading(true);
    setLastCreated(null);
    try {
      const { data, error } = await callFunction("create-agent", {
        nom,
        prenom,
        password,
        role,
        ...(role === "responsable" ? { service } : {}),
      });
      if (error) {
        toast.error(error);
      } else {
        toast.success(`Agent ${prenom} ${nom} créé avec succès !`);
        setLastCreated(data.identifiant);
        setNom(""); setPrenom(""); setPassword(""); setRole("user"); setService("");
        onCreated();
      }
    } catch (err: any) {
      toast.error("Erreur inattendue : " + err.message);
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Créer un compte
        </CardTitle>
        <CardDescription>L'agent se connectera avec son identifiant (prénom.nom)</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Jean" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="DUPONT" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type d'accès</Label>
            <Select value={role} onValueChange={(v) => { setRole(v as "user" | "admin" | "responsable"); setService(""); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Agent</SelectItem>
                <SelectItem value="responsable">Responsable de service</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "responsable" && (
            <div className="space-y-2">
              <Label>Service <span className="text-destructive">*</span></Label>
              <Select value={service} onValueChange={setService} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
            {loading ? "Création en cours..." : "Créer le compte"}
          </Button>
        </form>

        {lastCreated && (
          <div className="mt-4 p-3 rounded-lg bg-accent/50 border border-accent flex items-start gap-2">
            <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Compte créé avec succès !</p>
              <p className="text-muted-foreground">
                Identifiant : <span className="font-mono font-medium text-foreground">{lastCreated}</span>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Modal édition ─────────────────────────────────────────────────────────────
const EditDialog = ({
  agent,
  onClose,
  onSaved,
}: {
  agent: Agent;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [prenom, setPrenom] = useState(agent.full_name.split(" ")[0] || "");
  const [nom, setNom] = useState(agent.full_name.split(" ").slice(1).join(" ") || "");
  const [role, setRole] = useState<"user" | "admin" | "responsable">(agent.role);
  const [service, setService] = useState<string>(agent.service || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (role === "responsable" && !service) {
      toast.error("Veuillez sélectionner un service pour le rôle Responsable.");
      return;
    }
    setSaving(true);
    const { error } = await callFunction("manage-agent", {
      action: "update",
      userId: agent.user_id,
      fullName: `${prenom.trim()} ${nom.trim()}`,
      nom: nom.trim(),
      prenom: prenom.trim(),
      role,
      ...(role === "responsable" ? { service } : {}),
      ...(password ? { password } : {}),
    });

    if (error) {
      toast.error(error);
    } else {
      toast.success("Profil mis à jour avec succès");
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Modifier le profil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Jean" />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="DUPONT" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type d'accès</Label>
            <Select value={role} onValueChange={(v) => { setRole(v as "user" | "admin" | "responsable"); if (v !== "responsable") setService(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Agent</SelectItem>
                <SelectItem value="responsable">Responsable de service</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "responsable" && (
            <div className="space-y-2">
              <Label>Service <span className="text-destructive">*</span></Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un service" /></SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Nouveau mot de passe
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Laisser vide pour ne pas changer"
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">Laisser vide pour conserver l'actuel</p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">Identifiant actuel :</span> {agent.identifiant}</p>
            <p className="text-[10px]">L'identifiant sera mis à jour si le nom ou prénom change.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
const AgentsManagementPage = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    const { data, error } = await callFunction("manage-agent", { action: "list" });
    if (error) {
      toast.error("Chargement : " + error);
    } else {
      setAgents(data.agents || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Gestion des agents</h1>
        <p className="text-muted-foreground">Créez et gérez les comptes de l'établissement</p>
      </div>

      {/* Tableau des agents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Comptes enregistrés</CardTitle>
            <CardDescription>{agents.length} compte{agents.length > 1 ? "s" : ""} au total</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAgents} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin w-7 h-7 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : agents.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Aucun agent trouvé</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Identifiant</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Créé le
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.user_id}>
                    <TableCell className="font-medium">{agent.full_name || "—"}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground">{agent.identifiant || agent.email}</span>
                    </TableCell>
                    <TableCell><RoleBadge role={agent.role} service={agent.service} /></TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {new Date(agent.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditingAgent(agent)} className="gap-1.5">
                        <Pencil className="w-3.5 h-3.5" />
                        Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Formulaire de création */}
      <CreateForm onCreated={fetchAgents} />

      {/* Modal d'édition */}
      {editingAgent && (
        <EditDialog
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onSaved={fetchAgents}
        />
      )}
    </div>
  );
};

export default AgentsManagementPage;
