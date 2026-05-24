import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DashboardBots from "./pages/DashboardBots";
import DashboardBotBuilder from "./pages/DashboardBotBuilder";
import DashboardAnalysis from "./pages/DashboardAnalysis";
import DashboardStrategy from "./pages/DashboardStrategy";
import DashboardPortfolio from "./pages/DashboardPortfolio";
import DashboardCharts from "./pages/DashboardCharts";
import DashboardTutorial from "./pages/DashboardTutorial";
import DashboardRisk from "./pages/DashboardRisk";
import DashboardTrader from "./pages/DashboardTrader";
import DashboardManualTrader from "./pages/DashboardManualTrader";
import DashboardDeposit from "./pages/DashboardDeposit";
import DashboardWithdraw from "./pages/DashboardWithdraw";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DashboardSettings from "./pages/DashboardSettings";
import NotFound from "./pages/NotFound";
import { WebAppMeta } from "./components/WebAppMeta";
import { AuthGuard } from "./components/AuthGuard";

const queryClient = new QueryClient();

// Silent session restore on boot
if (typeof window !== 'undefined') {
  import('./lib/auth-email').then(({ refreshSession, getRefreshToken }) => {
    if (getRefreshToken()) refreshSession().catch(() => {});
  });
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WebAppMeta />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard/settings" element={<AuthGuard><DashboardSettings /></AuthGuard>} />
          <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/dashboard/trader" element={<AuthGuard><DashboardTrader /></AuthGuard>} />
          <Route path="/dashboard/manual-trader" element={<AuthGuard><DashboardManualTrader /></AuthGuard>} />
          <Route path="/dashboard/bots" element={<AuthGuard><DashboardBots /></AuthGuard>} />
          <Route path="/dashboard/bot-builder" element={<AuthGuard><DashboardBotBuilder /></AuthGuard>} />
          <Route path="/dashboard/analysis" element={<AuthGuard><DashboardAnalysis /></AuthGuard>} />
          <Route path="/dashboard/strategy" element={<AuthGuard><DashboardStrategy /></AuthGuard>} />
          <Route path="/dashboard/portfolio" element={<AuthGuard><DashboardPortfolio /></AuthGuard>} />
          <Route path="/dashboard/charts" element={<AuthGuard><DashboardCharts /></AuthGuard>} />
          <Route path="/dashboard/tutorial" element={<AuthGuard><DashboardTutorial /></AuthGuard>} />
          <Route path="/dashboard/risk" element={<AuthGuard><DashboardRisk /></AuthGuard>} />
          <Route path="/dashboard/deposit" element={<AuthGuard><DashboardDeposit /></AuthGuard>} />
          <Route path="/dashboard/withdraw" element={<AuthGuard><DashboardWithdraw /></AuthGuard>} />
          <Route path="/adminking" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
