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
import PostDetailPage from "@/pages/PostDetailPage";
import EventsPage from "@/pages/EventsPage";
import GiftcodePage from "@/pages/GiftcodePage";
import CommunityPage from "@/pages/CommunityPage";
import AuthPage from "@/pages/AuthPage";
import AdminPage from "@/pages/AdminPage";
import CreatePostPage from "@/pages/CreatePostPage";
import MyPostsPage from "@/pages/MyPostsPage";
import DepositPage from "@/pages/DepositPage";
import TopServerPage from "@/pages/TopServerPage";
import NotFound from "./pages/NotFound.tsx";
import ScrollToTop from "./components/ScrollToTop";
import BackToTop from "./components/shared/BackToTop";
import WelcomePopup from "./components/WelcomePopup";

const queryClient = new QueryClient();

const App = () => {
  const { isDark, toggle } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <BackToTop />
          <WelcomePopup />
          <Routes>
            {/* Auth page - no layout */}
            <Route path="/auth" element={<AuthPage />} />
            {/* Admin page - own layout */}
            <Route path="/admin" element={<Layout isDark={isDark} onToggleTheme={toggle}><AdminPage /></Layout>} />
            <Route path="/create-post" element={<Layout isDark={isDark} onToggleTheme={toggle}><CreatePostPage /></Layout>} />
            <Route path="/my-posts" element={<Layout isDark={isDark} onToggleTheme={toggle}><MyPostsPage /></Layout>} />
            <Route path="/deposit" element={<Layout isDark={isDark} onToggleTheme={toggle}><DepositPage /></Layout>} />
            {/* Public pages with layout */}
            <Route path="/" element={<Layout isDark={isDark} onToggleTheme={toggle}><HomePage /></Layout>} />
            <Route path="/about" element={<Layout isDark={isDark} onToggleTheme={toggle}><AboutPage /></Layout>} />
            <Route path="/download" element={<Layout isDark={isDark} onToggleTheme={toggle}><DownloadPage /></Layout>} />
            <Route path="/news" element={<Layout isDark={isDark} onToggleTheme={toggle}><NewsPage /></Layout>} />
            <Route path="/news/:id/:slug" element={<Layout isDark={isDark} onToggleTheme={toggle}><PostDetailPage /></Layout>} />
            <Route path="/news/:id" element={<Layout isDark={isDark} onToggleTheme={toggle}><PostDetailPage /></Layout>} />
            <Route path="/events" element={<Layout isDark={isDark} onToggleTheme={toggle}><EventsPage /></Layout>} />
            <Route path="/giftcode" element={<Layout isDark={isDark} onToggleTheme={toggle}><GiftcodePage /></Layout>} />
            <Route path="/community" element={<Layout isDark={isDark} onToggleTheme={toggle}><CommunityPage /></Layout>} />
            <Route path="/top-server" element={<Layout isDark={isDark} onToggleTheme={toggle}><TopServerPage /></Layout>} />
            <Route path="*" element={<Layout isDark={isDark} onToggleTheme={toggle}><NotFound /></Layout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
