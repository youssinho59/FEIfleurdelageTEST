import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
  Flower2,
  FileText,
  MessageSquareWarning,
  BarChart3,
  ClipboardList,
  LogOut,
  History,
  Users,
  LayoutDashboard,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const navItems = [
    { to: "/", label: "Tableau de bord", icon: LayoutDashboard, section: "agent" },
    { to: "/fei", label: "Saisir une FEI", icon: FileText, section: "agent" },
    { to: "/mes-fei", label: "Mes FEI", icon: History, section: "agent" },
    { to: "/plaintes", label: "Plaintes & Réclamations", icon: MessageSquareWarning, section: "agent" },
    ...(isAdmin
      ? [
          { to: "/gestion-fei", label: "Gestion FEI", icon: ClipboardList, section: "admin" },
          { to: "/gestion-reclamations", label: "Gestion Réclamations", icon: MessageSquareWarning, section: "admin" },
          { to: "/agents", label: "Agents", icon: Users, section: "admin" },
          { to: "/statistiques", label: "Statistiques", icon: BarChart3, section: "admin" },
        ]
      : []),
  ];

  const agentItems = navItems.filter((i) => i.section === "agent");
  const adminItems = navItems.filter((i) => i.section === "admin");

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

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
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {agentItems.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} active={isActive(item.to)} />
          ))}

          {adminItems.length > 0 && (
            <>
              <div className={cn("pt-4 pb-1 px-2", collapsed && "px-0")}>
                {!collapsed ? (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 font-body">
                    Administration
                  </p>
                ) : (
                  <div className="h-px bg-border mx-1" />
                )}
              </div>
              {adminItems.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} active={isActive(item.to)} />
              ))}
            </>
          )}
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
                    {isAdmin ? "Administrateur" : "Agent"}
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
          {navItems.slice(0, 5).map((item) => {
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
                <span className="text-[9px] font-body font-semibold leading-tight">
                  {item.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

type NavItemProps = {
  item: { to: string; label: string; icon: React.ElementType };
  collapsed: boolean;
  active: boolean;
};

const NavItem = ({ item, collapsed, active }: NavItemProps) => (
  <Link to={item.to}>
    <div
      className={cn(
        "relative flex items-center gap-2.5 px-2 py-2.5 rounded-md transition-all duration-150 group",
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

export default AppLayout;
