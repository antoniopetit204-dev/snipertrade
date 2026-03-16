import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DashboardBots from "./pages/DashboardBots";
import DashboardBotBuilder from "./pages/DashboardBotBuilder";
import DashboardFreeBots from "./pages/DashboardFreeBots";
import DashboardAnalysis from "./pages/DashboardAnalysis";
import DashboardStrategy from "./pages/DashboardStrategy";
import DashboardPortfolio from "./pages/DashboardPortfolio";
import DashboardCharts from "./pages/DashboardCharts";
import DashboardTutorial from "./pages/DashboardTutorial";
import DashboardCopyTrading from "./pages/DashboardCopyTrading";
import DashboardRisk from "./pages/DashboardRisk";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/bots" element={<DashboardBots />} />
          <Route path="/dashboard/bot-builder" element={<DashboardBotBuilder />} />
          <Route path="/dashboard/free-bots" element={<DashboardFreeBots />} />
          <Route path="/dashboard/analysis" element={<DashboardAnalysis />} />
          <Route path="/dashboard/strategy" element={<DashboardStrategy />} />
          <Route path="/dashboard/portfolio" element={<DashboardPortfolio />} />
          <Route path="/dashboard/charts" element={<DashboardCharts />} />
          <Route path="/dashboard/tutorial" element={<DashboardTutorial />} />
          <Route path="/dashboard/copy-trading" element={<DashboardCopyTrading />} />
          <Route path="/dashboard/risk" element={<DashboardRisk />} />
          <Route path="/adminking" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
