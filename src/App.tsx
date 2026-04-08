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
import DashboardDeposit from "./pages/DashboardDeposit";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { WebAppMeta } from "./components/WebAppMeta";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WebAppMeta />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/trader" element={<DashboardTrader />} />
          <Route path="/dashboard/bots" element={<DashboardBots />} />
          <Route path="/dashboard/bot-builder" element={<DashboardBotBuilder />} />
          <Route path="/dashboard/analysis" element={<DashboardAnalysis />} />
          <Route path="/dashboard/strategy" element={<DashboardStrategy />} />
          <Route path="/dashboard/portfolio" element={<DashboardPortfolio />} />
          <Route path="/dashboard/charts" element={<DashboardCharts />} />
          <Route path="/dashboard/tutorial" element={<DashboardTutorial />} />
          <Route path="/dashboard/risk" element={<DashboardRisk />} />
          <Route path="/dashboard/deposit" element={<DashboardDeposit />} />
          <Route path="/adminking" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
