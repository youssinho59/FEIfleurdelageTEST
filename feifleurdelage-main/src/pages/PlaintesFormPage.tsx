import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { generatePlaintePdf } from "@/lib/pdfGenerator";
import { MessageSquareWarning, Save, Calendar, User, FileText, MessageCircle } from "lucide-react";

const DEMANDEUR_TYPES = [
  "Résident",
  "Famille",
  "Personnel",
  "Visiteur",
  "Autre",
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const PlaintesFormPage = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date_plainte: new Date().toISOString().split("T")[0],
    demandeur: "",
    objet: "",
    description: "",
    reponse_apportee: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const plainteData = {
      ...form,
      user_id: user.id,
      declarant_nom: profile?.full_name || user.email || "Inconnu",
    };

    const { data, error } = await supabase.from("plaintes").insert(plainteData).select().single();

    if (error) {
      toast.error("Erreur lors de l'enregistrement : " + error.message);
      setLoading(false);
      return;
    }

    const pdf = generatePlaintePdf(data);
    pdf.save(`Plainte_${data.id.slice(0, 8)}_${form.date_plainte}.pdf`);

    toast.success("Plainte enregistrée et PDF généré !");
    setForm({
      date_plainte: new Date().toISOString().split("T")[0],
      demandeur: "",
      objet: "",
      description: "",
      reponse_apportee: "",
    });
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-warm">
            <MessageSquareWarning className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Plainte / Réclamation
            </h1>
            <p className="text-muted-foreground text-sm">
              Enregistrez une plainte ou une réclamation
            </p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
          {/* Section: Identification */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-primary/5 border-b border-border/50 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Identification</span>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.date_plainte}
                      onChange={(e) => setForm({ ...form, date_plainte: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demandeur">Demandeur</Label>
                    <Select
                      value={form.demandeur}
                      onValueChange={(v) => setForm({ ...form, demandeur: v })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type de demandeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEMANDEUR_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Objet */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-accent/30 border-b border-border/50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-foreground" />
                <span className="text-sm font-semibold text-foreground">Objet</span>
              </div>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <Label htmlFor="objet">Objet de la plainte</Label>
                  <Input
                    id="objet"
                    value={form.objet}
                    onChange={(e) => setForm({ ...form, objet: e.target.value })}
                    placeholder="Objet de la plainte ou réclamation..."
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Description */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-secondary/50 border-b border-border/50 flex items-center gap-2">
                <User className="w-4 h-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">Description détaillée</span>
              </div>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Décrivez la situation en détail..."
                    rows={4}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Réponse */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-success/10 border-b border-border/50 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-foreground">Réponse apportée</span>
              </div>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <Label htmlFor="reponse">Réponse ou mesures prises</Label>
                  <Textarea
                    id="reponse"
                    value={form.reponse_apportee}
                    onChange={(e) => setForm({ ...form, reponse_apportee: e.target.value })}
                    placeholder="Réponse ou mesures prises..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit */}
          <motion.div variants={item} className="pt-2">
            <Button
              type="submit"
              className="w-full gap-2 h-12 text-base font-semibold rounded-xl shadow-warm"
              disabled={loading || !form.demandeur}
            >
              <Save className="w-5 h-5" />
              {loading ? "Enregistrement..." : "Enregistrer et générer le PDF"}
            </Button>
          </motion.div>
        </motion.div>
      </form>
    </div>
  );
};

export default PlaintesFormPage;
