import { Link } from "react-router-dom";
import { FileText, MessageSquareWarning, BarChart3, ClipboardList, History, ArrowRight, Flower2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

type QuickAction = {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  adminOnly?: boolean;
};

const actions: QuickAction[] = [
  {
    to: "/fei",
    icon: FileText,
    title: "Fiche EI",
    description: "Déclarez un événement indésirable",
    gradient: "from-primary to-accent",
  },
  {
    to: "/plaintes",
    icon: MessageSquareWarning,
    title: "Plaintes & Réclamations",
    description: "Enregistrez une plainte ou réclamation",
    gradient: "from-accent to-[hsl(45,70%,65%)]",
  },
  {
    to: "/mes-fei",
    icon: History,
    title: "Mes FEI",
    description: "Suivez vos déclarations et les retours admin",
    gradient: "from-[hsl(142,60%,40%)] to-[hsl(160,50%,45%)]",
  },
  {
    to: "/gestion-fei",
    icon: ClipboardList,
    title: "Gestion des FEI",
    description: "Analysez et traitez les fiches",
    gradient: "from-primary/80 to-primary",
    adminOnly: true,
  },
  {
    to: "/agents",
    icon: Users,
    title: "Agents",
    description: "Gérez les comptes agents",
    gradient: "from-[hsl(220,50%,55%)] to-[hsl(240,45%,60%)]",
    adminOnly: true,
  },
  {
    to: "/statistiques",
    icon: BarChart3,
    title: "Statistiques",
    description: "Consultez les analyses et rapports",
    gradient: "from-secondary-foreground/70 to-secondary-foreground",
    adminOnly: true,
  },
];

const Dashboard = () => {
  const { isAdmin, profile } = useAuth();

  const visibleActions = actions.filter((a) => !a.adminOnly || isAdmin);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl gradient-primary p-8 md:p-12 text-primary-foreground"
      >
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <Flower2 className="w-full h-full" strokeWidth={0.5} />
        </div>
        <div className="relative z-10">
          <p className="text-primary-foreground/70 text-sm font-medium uppercase tracking-wider mb-1">
            Espace Qualité
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            {greeting}{profile?.full_name ? `, ${profile.full_name}` : ""} 👋
          </h1>
          <p className="text-primary-foreground/80 text-lg font-body max-w-lg">
            Bienvenue sur votre espace de gestion qualité de l'EHPAD La Fleur de l'Âge.
          </p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">
          Accès rapide
        </h2>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visibleActions.map((action) => (
            <motion.div key={action.to} variants={item}>
              <Link to={action.to} className="group block h-full">
                <div className="relative h-full rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-warm hover:-translate-y-1 overflow-hidden">
                  {/* Gradient accent bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${action.gradient} opacity-70 group-hover:opacity-100 transition-opacity`}
                  />

                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm`}
                    >
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>

                  <h3 className="font-display font-semibold text-foreground mb-1">
                    {action.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
