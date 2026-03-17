import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import FeiFormPage from "@/pages/FeiFormPage";
import PlaintesFormPage from "@/pages/PlaintesFormPage";
import StatsPage from "@/pages/StatsPage";
import FeiManagementPage from "@/pages/FeiManagementPage";
import PlaintesManagementPage from "@/pages/PlaintesManagementPage";
import MesFeiPage from "@/pages/MesFeiPage";
import AgentsManagementPage from "@/pages/AgentsManagementPage";
import PlanActionsCorrectives from "@/pages/PlanActionsCorrectives";
import MesActionsCorrectives from "@/pages/MesActionsCorrectives";
import SuiviInstancesPage from "@/pages/SuiviInstancesPage";
import PacqStrategiquePage from "@/pages/PacqStrategiquePage";
import MesPacqStrategiquePage from "@/pages/MesPacqStrategiquePage";
import ClasseurAdminPage from "@/pages/ClasseurAdminPage";
import ClasseurAgentPage from "@/pages/ClasseurAgentPage";
import PlainteExternePage from "@/pages/PlainteExternePage";
import AuditsPage from "@/pages/AuditsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({
  children,
  adminOnly = false,
  adminOrResponsable = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  adminOrResponsable?: boolean;
}) => {
  const { user, isAdmin, isResponsable, loading, userDataLoading } = useAuth();

  // Attendre la session initiale
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Pour les pages avec restriction de rôle, attendre que les rôles soient chargés
  // pour éviter la redirection prématurée (race condition admin)
  if (userDataLoading && (adminOnly || adminOrResponsable)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (adminOrResponsable && !isAdmin && !isResponsable) return <Navigate to="/" replace />;

  return <AppLayout>{children}</AppLayout>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  // Bloquer uniquement pendant la vérification de session (lecture localStorage)
  // userDataLoading est géré au niveau de chaque ProtectedRoute
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-warm">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/fei" element={<ProtectedRoute><FeiFormPage /></ProtectedRoute>} />
      <Route path="/mes-fei" element={<ProtectedRoute><MesFeiPage /></ProtectedRoute>} />
      <Route path="/plaintes" element={<ProtectedRoute><PlaintesFormPage /></ProtectedRoute>} />
      <Route path="/statistiques" element={<ProtectedRoute adminOnly><StatsPage /></ProtectedRoute>} />
      <Route path="/gestion-fei" element={<ProtectedRoute adminOrResponsable><FeiManagementPage /></ProtectedRoute>} />
      <Route path="/gestion-reclamations" element={<ProtectedRoute adminOrResponsable><PlaintesManagementPage /></ProtectedRoute>} />
      <Route path="/agents" element={<ProtectedRoute adminOnly><AgentsManagementPage /></ProtectedRoute>} />
      <Route path="/plan-actions" element={<ProtectedRoute adminOnly><PlanActionsCorrectives /></ProtectedRoute>} />
      <Route path="/mes-actions" element={<ProtectedRoute><MesActionsCorrectives /></ProtectedRoute>} />
      <Route path="/suivi-instances" element={<ProtectedRoute adminOnly><SuiviInstancesPage /></ProtectedRoute>} />
      <Route path="/pacq-strategique" element={<ProtectedRoute adminOrResponsable><PacqStrategiquePage /></ProtectedRoute>} />
      <Route path="/mes-pacq-strategique" element={<ProtectedRoute><MesPacqStrategiquePage /></ProtectedRoute>} />
      <Route path="/classeur-admin" element={<ProtectedRoute adminOrResponsable><ClasseurAdminPage /></ProtectedRoute>} />
      <Route path="/audits" element={<ProtectedRoute adminOrResponsable><AuditsPage /></ProtectedRoute>} />
      <Route path="/classeur" element={<ProtectedRoute><ClasseurAgentPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/*
           * Route TOTALEMENT publique — hors AuthProvider et hors AppRoutes.
           * Aucune vérification de session, aucun loading, aucune redirection possible.
           */}
          <Route path="/plainte-externe" element={<PlainteExternePage />} />

          {/* Toutes les autres routes passent par AuthProvider */}
          <Route
            path="*"
            element={
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
