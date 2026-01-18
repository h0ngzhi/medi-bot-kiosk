import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { ProgrammeAdminProvider } from "@/contexts/ProgrammeAdminContext";
import { PrototypeGate } from "@/components/PrototypeGate";
import { TtsWrapper } from "@/components/TtsWrapper";
import IdleScreen from "./pages/IdleScreen";
import ScanCard from "./pages/ScanCard";
import LanguageSelection from "./pages/LanguageSelection";
import Dashboard from "./pages/Dashboard";
import HealthScreenings from "./pages/HealthScreenings";
import FindCare from "./pages/FindCare";
import CommunityProgrammes from "./pages/CommunityProgrammes";
import Profile from "./pages/Profile";
import ProfileHistory from "./pages/ProfileHistory";
import NotFound from "./pages/NotFound";
import AdminProgrammes from "./pages/AdminProgrammes";
import AdminProgrammesLogin from "./pages/AdminProgrammesLogin";
import AdminAccountManagement from "./pages/AdminAccountManagement";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import AdminSlideshow from "./pages/AdminSlideshow";
import AdminRewards from "./pages/AdminRewards";
import { HealthChatBot } from "@/components/HealthChatBot";


const queryClient = new QueryClient();

const App = () => (
  <PrototypeGate>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ProgrammeAdminProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <TtsWrapper>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<IdleScreen />} />
                  <Route path="/scan" element={<ScanCard />} />
                  <Route path="/language" element={<LanguageSelection />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/health" element={<HealthScreenings />} />
                  <Route path="/findcare" element={<FindCare />} />
                  <Route path="/community" element={<CommunityProgrammes />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/history" element={<ProfileHistory />} />
                  <Route path="/admin/programmes/login" element={<AdminProgrammesLogin />} />
                  <Route path="/admin/programmes" element={<AdminProgrammes />} />
                  <Route path="/admin/programmes/accounts" element={<AdminAccountManagement />} />
                  <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                  <Route path="/admin/slideshow" element={<AdminSlideshow />} />
                  <Route path="/admin/rewards" element={<AdminRewards />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <HealthChatBot />
                
              </BrowserRouter>
            </TtsWrapper>
          </TooltipProvider>
        </ProgrammeAdminProvider>
      </AppProvider>
    </QueryClientProvider>
  </PrototypeGate>
);

export default App;
