import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
  Flower2,
  FilePlus,
  FileText,
  MessageSquareWarning,
  BarChart3,
  ClipboardList,
  LogOut,
  Users,
  LayoutDashboard,
  ChevronRight,
  Sun,
  Moon,
  ClipboardCheck,
  CalendarRange,
  Target,
  CheckSquare,
  FolderOpen,
  FolderCog,
  Star,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItemDef = {
  to: string;
  label: string;
  icon: React.ElementType;
};

type NavSection = {
  label?: string; // undefined = no label (first section)
  items: NavItemDef[];
};

// ─── NavItem component ────────────────────────────────────────────────────────

type NavItemProps = {
  item: NavItemDef;
  collapsed: boolean;
  active: boolean;
};

const NavItem = ({ item, collapsed, active }: NavItemProps) => (
  <Link to={item.to}>
    <div
      className={cn(
        "relative flex items-center gap-2.5 px-2 py-2 rounded-md transition-all duration-150 group",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        collapsed && "justify-center"
      )}
    >
      {active && (
        <motion.div
          layoutId="nav-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}

      <item.icon
        className={cn(
          "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
          active && "stroke-[2.5]"
        )}
      />

      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="text-xs font-body font-semibold whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  </Link>
);

// ─── Section separator + label ────────────────────────────────────────────────

const SectionHeader = ({ label, collapsed }: { label: string; collapsed: boolean }) => (
  <>
    <div className="mx-3 my-1 border-t border-border/50" />
    {!collapsed && (
      <div className="px-3 pt-2 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 font-body">
          {label}
        </p>
      </div>
    )}
  </>
);

// ─── AppLayout ────────────────────────────────────────────────────────────────

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, isAdmin, isResponsable, userServices, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  // ── Navigation sections ───────────────────────────────────────────────────

  const agentSections: NavSection[] = [
    {
      items: [
        { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
        { to: "/fei", label: "Saisir une FEI", icon: FilePlus },
        { to: "/mes-fei", label: "Mes FEI", icon: FileText },
        { to: "/plaintes", label: "Plaintes & Réclamations", icon: MessageSquareWarning },
        { to: "/mes-actions", label: "Mes actions correctives", icon: CheckSquare },
        { to: "/mes-pacq-strategique", label: "PACQ Stratégique", icon: Target },
        { to: "/classeur", label: "Classeur documentaire", icon: FolderOpen },
      ],
    },
  ];

  const adminSections: NavSection[] = [
    {
      items: [
        { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
        { to: "/fei", label: "Saisir une FEI", icon: FilePlus },
        { to: "/mes-fei", label: "Mes FEI", icon: FileText },
      ],
    },
    {
      label: "QUALITÉ & RISQUES",
      items: [
        { to: "/gestion-fei", label: "Gestion des FEI", icon: ClipboardList },
        { to: "/gestion-reclamations", label: "Gestion Réclamations", icon: MessageSquareWarning },
        { to: "/audits", label: "Audits & NC", icon: ClipboardCheck },
        { to: "/questionnaires-admin", label: "Questionnaires", icon: Star },
      ],
    },
    {
      label: "PLANS D'ACTION",
      items: [
        { to: "/plan-actions", label: "PACQ Opérationnel", icon: CheckSquare },
        { to: "/pacq-strategique", label: "PACQ Stratégique", icon: Target },
      ],
    },
    {
      label: "DOCUMENTS & RH",
      items: [
        { to: "/classeur", label: "Classeur — Émargement", icon: FolderOpen },
        { to: "/classeur-admin", label: "Classeur — Gestion", icon: FolderCog },
        ...(isAdmin ? [{ to: "/agents", label: "Agents", icon: Users }] : []),
      ],
    },
    {
      label: "PILOTAGE",
      items: [
        ...(isAdmin ? [{ to: "/statistiques", label: "Statistiques", icon: BarChart3 }] : []),
        { to: "/suivi-instances", label: "Suivi des Instances", icon: Building2 },
      ],
    },
  ];

  const sections = isAdmin || isResponsable ? adminSections : agentSections;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col sticky top-0 h-screen border-r border-border bg-card transition-all duration-300 ease-in-out shrink-0",
          collapsed ? "w-[68px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-border overflow-hidden">
          <div className="shrink-0 w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
            <Flower2 className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="font-display text-sm font-bold text-foreground leading-tight whitespace-nowrap">
                  La Fleur de l'Âge
                </p>
                <p className="text-[10px] text-muted-foreground font-body uppercase tracking-widest whitespace-nowrap">
                  Espace Qualité
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {sections.map((section, si) => (
            <div key={si}>
              {section.label && (
                <SectionHeader label={section.label} collapsed={collapsed} />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem key={item.to} item={item} collapsed={collapsed} active={isActive(item.to)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-2 py-3 space-y-1">
          <div className={cn("flex items-center gap-2 px-2 py-1.5 overflow-hidden", collapsed && "justify-center")}>
            <div className="shrink-0 w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold text-white">
              {(profile?.full_name || user?.email || "?")[0].toUpperCase()}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-semibold text-foreground truncate font-body">
                    {profile?.full_name || user?.email}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-body">
                    {isAdmin
                      ? "Administrateur"
                      : isResponsable
                      ? `Responsable${userServices.length > 0 ? ` — ${userServices.join(", ")}` : ""}`
                      : "Agent"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
              collapsed && "justify-center"
            )}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-body font-medium whitespace-nowrap">
                  {theme === "dark" ? "Mode clair" : "Mode sombre"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={signOut}
            className={cn(
              "w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-body font-medium whitespace-nowrap"
                >
                  Déconnexion
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <ChevronRight
              className={cn("w-3.5 h-3.5 transition-transform duration-300", !collapsed && "rotate-180")}
            />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="md:hidden sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <Flower2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display text-sm font-bold">La Fleur de l'Âge</span>
          </Link>
          <button onClick={signOut} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8 max-w-5xl w-full mx-auto">
          {children}
        </main>

        {/* Bottom nav mobile */}
        <nav className="md:hidden sticky bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm flex items-center justify-around px-2 h-16">
          {[
            { to: "/", label: "Accueil", icon: LayoutDashboard },
            { to: "/fei", label: "FEI", icon: FilePlus },
            { to: "/mes-fei", label: "Mes FEI", icon: FileText },
            { to: "/plaintes", label: "Plaintes", icon: MessageSquareWarning },
            { to: "/mes-actions", label: "Actions", icon: CheckSquare },
          ].map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                <span className="text-[9px] font-body font-semibold leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default AppLayout;
