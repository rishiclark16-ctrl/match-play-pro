import { Suspense, lazy, useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthGuard } from "@/components/AuthGuard";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { BottomNav } from "@/components/BottomNav";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { Capacitor } from '@capacitor/core';
import { setStatusBarDefault } from '@/lib/statusBar';
import { lockSafeAreaInsets } from '@/lib/safeArea';
import { useDeepLinks } from '@/hooks/useDeepLinks';
import NotFound from "./pages/NotFound";
import { SplashScreen } from "@/components/ui/splash-screen";

// Lazy load all pages for better initial load
const Home = lazy(() => import("./pages/Home"));
const NewRound = lazy(() => import("./pages/NewRound"));
const JoinRound = lazy(() => import("./pages/JoinRound"));
const Scorecard = lazy(() => import("./pages/Scorecard"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const RoundComplete = lazy(() => import("./pages/RoundComplete"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Friends = lazy(() => import("./pages/Friends"));
const Groups = lazy(() => import("./pages/Groups"));
const Stats = lazy(() => import("./pages/Stats"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Support = lazy(() => import("./pages/Support"));

const queryClient = new QueryClient();

// Inner component that uses router hooks
function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

  // Handle deep links from native app
  useDeepLinks();

  // Initialize native status bar styling and lock safe area insets on app start
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setStatusBarDefault();
      // Lock safe area insets to prevent iOS WebView shifting bug
      lockSafeAreaInsets();
    }
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Toaster />
      <Sonner
        position="top-center"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          },
        }}
      />
      <Routes>
        {/* Auth page - public */}
        <Route
          path="/auth"
          element={
            <Suspense fallback={<PageSkeleton variant="default" />}>
              <Auth />
            </Suspense>
          }
        />

        {/* Protected routes - require authentication */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <Suspense fallback={<PageSkeleton variant="default" />}>
                <Home />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route
          path="/new-round"
          element={
            <AuthGuard>
              <Suspense fallback={<PageSkeleton variant="default" />}>
                <NewRound />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route
          path="/join"
          element={
            <AuthGuard>
              <Suspense fallback={<PageSkeleton variant="default" />}>
                <JoinRound />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route
          path="/round/:id"
          element={
            <AuthGuard>
              <Suspense fallback={<PageSkeleton variant="scorecard" />}>
                <Scorecard />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route
          path="/round/:id/leaderboard"
          element={
            <AuthGuard>
              <Suspense fallback={<PageSkeleton variant="list" />}>
                <Leaderboard />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route
          path="/round/:id/complete"
          element={
            <AuthGuard>
              <Suspense fallback={<PageSkeleton variant="default" />}>
                <RoundComplete />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthGuard>
              <Suspense fallback={<PageSkeleton variant="default" />}>
                <Profile />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route
          path="/friends"
          element={
            <AuthGuard>
              <Suspense fallback={<PageSkeleton variant="list" />}>
                <Friends />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route
          path="/groups"
          element={
            <AuthGuard>
              <Suspense fallback={<PageSkeleton variant="list" />}>
                <Groups />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route
          path="/stats"
          element={
            <AuthGuard>
              <Suspense fallback={<PageSkeleton variant="default" />}>
                <Stats />
              </Suspense>
            </AuthGuard>
          }
        />
        {/* Public legal pages - no auth required */}
        <Route
          path="/privacy-policy"
          element={
            <Suspense fallback={<PageSkeleton variant="default" />}>
              <PrivacyPolicy />
            </Suspense>
          }
        />
        <Route
          path="/terms-of-service"
          element={
            <Suspense fallback={<PageSkeleton variant="default" />}>
              <TermsOfService />
            </Suspense>
          }
        />
        <Route
          path="/support"
          element={
            <Suspense fallback={<PageSkeleton variant="default" />}>
              <Support />
            </Suspense>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
}

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <OfflineProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </OfflineProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
