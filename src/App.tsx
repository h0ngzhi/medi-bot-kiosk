import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import ScanCard from "./pages/ScanCard";
import LanguageSelection from "./pages/LanguageSelection";
import Dashboard from "./pages/Dashboard";
import HealthScreenings from "./pages/HealthScreenings";
import Medications from "./pages/Medications";
import Teleconsult from "./pages/Teleconsult";
import CommunityProgrammes from "./pages/CommunityProgrammes";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ScanCard />} />
            <Route path="/language" element={<LanguageSelection />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/health" element={<HealthScreenings />} />
            <Route path="/medications" element={<Medications />} />
            <Route path="/teleconsult" element={<Teleconsult />} />
            <Route path="/community" element={<CommunityProgrammes />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
