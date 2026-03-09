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
import { generateFeiPdf } from "@/lib/pdfGenerator";
import { FileText, Save, MapPin, AlertTriangle, Calendar, ClipboardList, Shield } from "lucide-react";

const FEI_TYPES = [
  "Chute",
  "Erreur médicamenteuse",
  "Fugue",
  "Agressivité",
  "Maltraitance",
  "Infection",
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

const FeiFormPage = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date_evenement: new Date().toISOString().split("T")[0],
    lieu: "",
    description: "",
    gravite: 1,
    type_fei: "",
    actions_correctives: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const feiData = {
      ...form,
      user_id: user.id,
      declarant_nom: profile?.full_name || user.email || "Inconnu",
    };

    const { data, error } = await supabase.from("fei").insert(feiData).select().single();

    if (error) {
      toast.error("Erreur lors de l'enregistrement : " + error.message);
      setLoading(false);
      return;
    }

    const pdf = generateFeiPdf(data);
    pdf.save(`FEI_${data.id.slice(0, 8)}_${form.date_evenement}.pdf`);

    toast.success("FEI enregistrée et PDF généré !");
    setForm({
      date_evenement: new Date().toISOString().split("T")[0],
      lieu: "",
      description: "",
      gravite: 1,
      type_fei: "",
      actions_correctives: "",
    });
    setLoading(false);
  };

  const graviteColors = [
    "bg-success/20 text-success border-success/30",
    "bg-warning/20 text-warning border-warning/30",
    "bg-warning/30 text-warning border-warning/40",
    "bg-destructive/20 text-destructive border-destructive/30",
    "bg-destructive/30 text-destructive border-destructive/40",
  ];

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
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-warm">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Fiche d'Événement Indésirable
            </h1>
            <p className="text-muted-foreground text-sm">
              Remplissez tous les champs pour déclarer un EI
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
                    <Label htmlFor="date">Date de l'événement</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.date_evenement}
                      onChange={(e) => setForm({ ...form, date_evenement: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type d'événement</Label>
                    <Select
                      value={form.type_fei}
                      onValueChange={(v) => setForm({ ...form, type_fei: v })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FEI_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Localisation */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-accent/30 border-b border-border/50 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent-foreground" />
                <span className="text-sm font-semibold text-foreground">Localisation</span>
              </div>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <Label htmlFor="lieu">Lieu</Label>
                  <Input
                    id="lieu"
                    value={form.lieu}
                    onChange={(e) => setForm({ ...form, lieu: e.target.value })}
                    placeholder="Ex: Chambre 12, couloir étage 2, salle commune..."
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Gravité */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-destructive/5 border-b border-border/50 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-semibold text-foreground">Gravité</span>
              </div>
              <CardContent className="p-5">
                <Label className="mb-3 block">Niveau de gravité (1 = mineure, 5 = critique)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, gravite: g })}
                      className={`w-11 h-11 rounded-xl font-bold text-sm transition-all border-2 ${
                        form.gravite === g
                          ? graviteColors[g - 1] + " scale-110 shadow-md"
                          : "bg-secondary text-secondary-foreground border-transparent hover:bg-accent"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Description */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-secondary/50 border-b border-border/50 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">Description</span>
              </div>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <Label htmlFor="description">Description de l'événement</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Décrivez l'événement en détail..."
                    rows={4}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section: Actions correctives */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-warm overflow-hidden">
              <div className="px-5 py-3 bg-success/10 border-b border-border/50 flex items-center gap-2">
                <Shield className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-foreground">Actions correctives</span>
              </div>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <Label htmlFor="actions">Actions correctives entreprises</Label>
                  <Textarea
                    id="actions"
                    value={form.actions_correctives}
                    onChange={(e) => setForm({ ...form, actions_correctives: e.target.value })}
                    placeholder="Décrivez les actions entreprises ou à entreprendre..."
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
              disabled={loading || !form.type_fei}
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

export default FeiFormPage;
