import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flower2, User, Shield, Eye, EyeOff, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

const LoginPage = () => {
  const { applySession } = useAuth();
  const navigate = useNavigate();
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
    const { data, error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
    if (error || !data.session) {
      toast.error("Identifiants incorrects");
      setLoading(false);
    } else {
      await applySession(data.session);
      toast.success("Connexion réussie !");
      navigate("/", { replace: true });
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      toast.error("Identifiants incorrects");
      setLoading(false);
    } else {
      await applySession(data.session);
      toast.success("Connexion réussie !");
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left panel — decorative */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="hidden lg:flex lg:w-1/2 gradient-primary flex-col justify-between p-12 relative overflow-hidden"
      >
        {/* Background circles */}
        <div className="absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-5%] right-[-5%] w-64 h-64 rounded-full bg-white/8 blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-5">
          <Flower2 className="w-full h-full" strokeWidth={0.3} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Flower2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-display font-bold text-lg leading-tight">La Fleur de l'Âge</p>
            <p className="text-white/60 text-xs font-body uppercase tracking-widest">EHPAD</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80 text-xs font-body">
            <Sparkles className="w-3 h-3" />
            Espace Qualité
          </div>
          <h2 className="text-4xl font-display font-bold text-white leading-tight">
            Gérez la qualité<br />de vos soins<br />simplement.
          </h2>
          <p className="text-white/70 font-body text-sm leading-relaxed max-w-xs">
            Déclarez vos événements indésirables, suivez vos fiches et améliorez continuellement la qualité des soins.
          </p>
        </div>

        {/* Stats bottom */}
        <div className="relative z-10 flex gap-6">
          {[
            { label: "Déclarations", value: "FEI" },
            { label: "Plaintes", value: "P&R" },
            { label: "Statistiques", value: "Stats" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-white font-display font-bold text-lg">{s.value}</p>
              <p className="text-white/50 text-xs font-body">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Flower2 className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-base">La Fleur de l'Âge</p>
              <p className="text-muted-foreground text-xs">Espace Qualité</p>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Connexion</h1>
            <p className="text-muted-foreground text-sm mt-1 font-body">Bienvenue, identifiez-vous pour continuer.</p>
          </div>

          <Tabs value={tab} onValueChange={(v) => { setTab(v); setPassword(""); setShowPassword(false); }}>
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl bg-muted p-1">
              <TabsTrigger value="agent" className="rounded-lg text-sm font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Agent
              </TabsTrigger>
              <TabsTrigger value="admin" className="rounded-lg text-sm font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Administrateur
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agent" className="mt-5">
              <form onSubmit={handleAgentLogin} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nom</Label>
                    <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="DUPONT" required className="h-11 rounded-xl bg-muted/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Prénom</Label>
                    <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Jean" required className="h-11 rounded-xl bg-muted/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mot de passe</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-11 rounded-xl bg-muted/50 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl font-semibold gradient-primary text-white hover:opacity-90 shadow-warm mt-2" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="mt-5">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@ehpad.fr" required className="h-11 rounded-xl bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mot de passe</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-11 rounded-xl bg-muted/50 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl font-semibold gradient-primary text-white hover:opacity-90 shadow-warm mt-2" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground font-body">
            EHPAD La Fleur de l'Âge · Espace Qualité
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
