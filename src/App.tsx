import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { PushPromptProvider } from "./contexts/PushPromptContext";

const Index         = lazy(() => import("./pages/Index"));
const IndexOld      = lazy(() => import("./pages/IndexOld"));
const Pray          = lazy(() => import("./pages/Pray"));
const Submit        = lazy(() => import("./pages/Submit"));
const Auth          = lazy(() => import("./pages/Auth"));
const DailyGospel   = lazy(() => import("./pages/DailyGospel"));
const DivinePromise = lazy(() => import("./pages/DivinePromise"));
const NotFound      = lazy(() => import("./pages/NotFound"));
const Profile       = lazy(() => import("./pages/Profile"));
const Community     = lazy(() => import("./pages/Community"));
const Tree          = lazy(() => import("./pages/Tree"));
const PrayerChain   = lazy(() => import("./pages/PrayerChain"));
const Messages      = lazy(() => import("./pages/Messages"));
const Friends       = lazy(() => import("./pages/Friends"));
const Novenas       = lazy(() => import("./pages/Novenas"));
const NovenaPrayer  = lazy(() => import("./pages/NovenaPrayer"));
const RosarySelection = lazy(() => import("./pages/RosarySelection"));
const RosaryPrayer  = lazy(() => import("./pages/RosaryPrayer"));
const Terco         = lazy(() => import("./pages/Terco"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PushPromptProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen relative">
              <TopBar />
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/"                  element={<Index />} />
                  <Route path="/old"               element={<IndexOld />} />
                  <Route path="/pray"              element={<Pray />} />
                  <Route path="/submit"            element={<Submit />} />
                  <Route path="/auth"              element={<Auth />} />
                  <Route path="/daily-gospel"      element={<DailyGospel />} />
                  <Route path="/divine-promise"    element={<DivinePromise />} />
                  <Route path="/profile"           element={<Profile />} />
                  <Route path="/community"         element={<Community />} />
                  <Route path="/tree"              element={<Tree />} />
                  <Route path="/prayer-chain"      element={<PrayerChain />} />
                  <Route path="/rosary-selection"  element={<RosarySelection />} />
                  <Route path="/rosary/:type"      element={<RosaryPrayer />} />
                  <Route path="/messages"          element={<Messages />} />
                  <Route path="/friends"           element={<Friends />} />
                  <Route path="/novenas"           element={<Novenas />} />
                  <Route path="/novena/:id"        element={<NovenaPrayer />} />
                  <Route path="/terco"             element={<Terco />} />
                  <Route path="*"                  element={<NotFound />} />
                </Routes>
              </Suspense>
              <BottomNav />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </PushPromptProvider>
    </QueryClientProvider>
  );
};

export default App;
