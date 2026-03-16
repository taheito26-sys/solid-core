import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";

import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import OnboardingPage from "./pages/merchant/OnboardingPage";
import DashboardPage from "./pages/merchant/DashboardPage";
import DirectoryPage from "./pages/merchant/DirectoryPage";
import InvitationsPage from "./pages/merchant/InvitationsPage";
import RelationshipsPage from "./pages/merchant/RelationshipsPage";
import RelationshipWorkspace from "./pages/merchant/RelationshipWorkspace";
import MessagesPage from "./pages/merchant/MessagesPage";
import ApprovalsPage from "./pages/merchant/ApprovalsPage";
import DealsPage from "./pages/merchant/DealsPage";
import AnalyticsPage from "./pages/merchant/AnalyticsPage";
import AuditPage from "./pages/merchant/AuditPage";
import SettingsPage from "./pages/merchant/SettingsPage";
import P2PTrackerPage from "./pages/trading/P2PTrackerPage";
import PortfolioPage from "./pages/trading/PortfolioPage";
import TradesPage from "./pages/trading/TradesPage";
import OrdersPage from "./pages/trading/OrdersPage";
import StockPage from "./pages/trading/StockPage";
import CalendarPage from "./pages/trading/CalendarPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

function ProfileGuard({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (!profile) return <Navigate to="/merchant/onboarding" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            {/* Onboarding */}
            <Route path="/merchant/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />

            {/* App Shell */}
            <Route element={<AuthGuard><ProfileGuard><AppLayout /></ProfileGuard></AuthGuard>}>
              <Route path="/merchant" element={<DashboardPage />} />
              <Route path="/merchant/directory" element={<DirectoryPage />} />
              <Route path="/merchant/invitations" element={<InvitationsPage />} />
              <Route path="/merchant/relationships" element={<RelationshipsPage />} />
              <Route path="/merchant/relationships/:id" element={<RelationshipWorkspace />} />
              <Route path="/merchant/messages" element={<MessagesPage />} />
              <Route path="/merchant/approvals" element={<ApprovalsPage />} />
              <Route path="/merchant/deals" element={<DealsPage />} />
              <Route path="/merchant/analytics" element={<AnalyticsPage />} />
              <Route path="/merchant/audit" element={<AuditPage />} />
              <Route path="/merchant/settings" element={<SettingsPage />} />
              <Route path="/trading/p2p" element={<P2PTrackerPage />} />
              <Route path="/trading/portfolio" element={<PortfolioPage />} />
              <Route path="/trading/trades" element={<TradesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/merchant" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
