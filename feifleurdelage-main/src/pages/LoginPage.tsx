import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flower2, User, Shield, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

const LoginPage = () => {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("agent");
  const [showPassword, setShowPassword] = useState(false);

  const normalize = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const handleAgentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fakeEmail = `${normalize(prenom)}.${normalize(nom)}@agent.internal`;
    const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
    if (error) {
      toast.error("Identifiants incorrects");
    } else {
      toast.success("Connexion réussie !");
    }
    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Identifiants incorrects");
    } else {
      toast.success("Connexion réussie !");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 gradient-warm" />
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-accent/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-warm mb-4">
            <Flower2 className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            La Fleur de l'Âge
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            Espace Qualité
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl border border-border bg-card shadow-warm backdrop-blur-sm p-8"
        >
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setPassword(""); setShowPassword(false); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl bg-muted p-1">
              <TabsTrigger
                value="agent"
                className="rounded-lg font-body font-semibold text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Agent
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="rounded-lg font-body font-semibold text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Administrateur
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agent">
              <form onSubmit={handleAgentLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-foreground font-body font-semibold">Nom</Label>
                  <Input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="DUPONT"
                    required
                    className="h-12 rounded-xl bg-muted/50 border-border focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom" className="text-foreground font-body font-semibold">Prénom</Label>
                  <Input
                    id="prenom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Jean"
                    required
                    className="h-12 rounded-xl bg-muted/50 border-border focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-agent" className="text-foreground font-body font-semibold">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password-agent"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="h-12 rounded-xl bg-muted/50 border-border focus:border-primary pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl font-body font-bold text-base gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-warm"
                  disabled={loading}
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-body font-semibold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@ehpad-lafleurdelage.fr"
                    required
                    className="h-12 rounded-xl bg-muted/50 border-border focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-admin" className="text-foreground font-body font-semibold">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password-admin"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="h-12 rounded-xl bg-muted/50 border-border focus:border-primary pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl font-body font-bold text-base gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-warm"
                  disabled={loading}
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-6 font-body"
        >
          EHPAD La Fleur de l'Âge · Espace Qualité
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
