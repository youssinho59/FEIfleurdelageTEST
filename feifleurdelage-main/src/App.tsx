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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return <AppLayout>{children}</AppLayout>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

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
      <Route path="/gestion-fei" element={<ProtectedRoute adminOnly><FeiManagementPage /></ProtectedRoute>} />
      <Route path="/gestion-reclamations" element={<ProtectedRoute adminOnly><PlaintesManagementPage /></ProtectedRoute>} />
      <Route path="/agents" element={<ProtectedRoute adminOnly><AgentsManagementPage /></ProtectedRoute>} />
      <Route path="/plan-actions" element={<ProtectedRoute adminOnly><PlanActionsCorrectives /></ProtectedRoute>} />
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
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
