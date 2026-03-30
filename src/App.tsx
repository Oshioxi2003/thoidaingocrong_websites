import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/useTheme";
import Layout from "@/components/layout/Layout";
import HomePage from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import DownloadPage from "@/pages/DownloadPage";
import NewsPage from "@/pages/NewsPage";
import EventsPage from "@/pages/EventsPage";
import GiftcodePage from "@/pages/GiftcodePage";
import CommunityPage from "@/pages/CommunityPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => {
  const { isDark, toggle } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout isDark={isDark} onToggleTheme={toggle}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/giftcode" element={<GiftcodePage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
