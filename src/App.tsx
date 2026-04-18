import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Pray from "./pages/Pray";
import Submit from "./pages/Submit";
import Auth from "./pages/Auth";
import DailyGospel from "./pages/DailyGospel";
import DivinePromise from "./pages/DivinePromise";
import NotFound from "./pages/NotFound";

import { useEffect } from "react";

import Profile from "./pages/Profile";
import Community from "./pages/Community";
import Tree from "./pages/Tree";
import PrayerChain from "./pages/PrayerChain";
import Messages from "./pages/Messages";
import Friends from "./pages/Friends";
import RosarySelection from "./pages/RosarySelection";
import RosaryPrayer from "./pages/RosaryPrayer";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const backgrounds = [
      '/backgrounds/bg-1.png',
      '/backgrounds/bg-2.png',
      '/backgrounds/bg-3.png',
      '/backgrounds/bg-4.png',
      '/bg-divine-new.png',
      '/bg-tree.png'
    ];
    const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    // Safe property set
    try {
      document.body.style.setProperty('--bg-url', `url(${randomBg})`);
    } catch(e) {}
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen relative pb-28">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pray" element={<Pray />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/daily-gospel" element={<DailyGospel />} />
            <Route path="/divine-promise" element={<DivinePromise />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/community" element={<Community />} />
            <Route path="/tree" element={<Tree />} />
            <Route path="/prayer-chain" element={<PrayerChain />} />
            <Route path="/rosary-selection" element={<RosarySelection />} />
            <Route path="/rosary/:type" element={<RosaryPrayer />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
