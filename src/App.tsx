import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/useTheme";
import Layout from "@/components/layout/Layout";
import HomePage from "@/pages/HomePage";
import ScrollToTop from "./components/ScrollToTop";
import BackToTop from "./components/shared/BackToTop";

// Lazy-loaded pages — only downloaded when the user navigates to them
const GuidesPage = lazy(() => import("@/pages/GuidesPage"));
const DownloadPage = lazy(() => import("@/pages/DownloadPage"));
const NewsPage = lazy(() => import("@/pages/NewsPage"));
const PostDetailPage = lazy(() => import("@/pages/PostDetailPage"));
const EventsPage = lazy(() => import("@/pages/EventsPage"));

const CommunityPage = lazy(() => import("@/pages/CommunityPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const CreatePostPage = lazy(() => import("@/pages/CreatePostPage"));
const MyPostsPage = lazy(() => import("@/pages/MyPostsPage"));
const DepositPage = lazy(() => import("@/pages/DepositPage"));
const TopServerPage = lazy(() => import("@/pages/TopServerPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const WelcomePopup = lazy(() => import("./components/WelcomePopup"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // Data stays fresh for 2 minutes
      gcTime: 1000 * 60 * 10,   // Cache kept for 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Minimal loading spinner for Suspense fallback
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

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
          <Suspense fallback={null}>
            <WelcomePopup />
          </Suspense>
          <Routes>
            {/* Auth page - no layout */}
            <Route path="/auth" element={<Suspense fallback={<PageLoader />}><AuthPage /></Suspense>} />
            {/* Admin page - own layout */}
            <Route path="/admin" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><AdminPage /></Suspense></Layout>} />
            <Route path="/create-post" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><CreatePostPage /></Suspense></Layout>} />
            <Route path="/my-posts" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><MyPostsPage /></Suspense></Layout>} />
            <Route path="/deposit" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><DepositPage /></Suspense></Layout>} />
            {/* Public pages with layout */}
            <Route path="/" element={<Layout isDark={isDark} onToggleTheme={toggle}><HomePage /></Layout>} />
            <Route path="/guides" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><GuidesPage /></Suspense></Layout>} />
            <Route path="/download" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><DownloadPage /></Suspense></Layout>} />
            <Route path="/news" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><NewsPage /></Suspense></Layout>} />
            <Route path="/news/:id/:slug" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><PostDetailPage /></Suspense></Layout>} />
            <Route path="/news/:id" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><PostDetailPage /></Suspense></Layout>} />
            <Route path="/events" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><EventsPage /></Suspense></Layout>} />

            <Route path="/community" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><CommunityPage /></Suspense></Layout>} />
            <Route path="/top-server" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><TopServerPage /></Suspense></Layout>} />
            <Route path="*" element={<Layout isDark={isDark} onToggleTheme={toggle}><Suspense fallback={<PageLoader />}><NotFound /></Suspense></Layout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
