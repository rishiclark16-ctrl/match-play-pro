import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthGuard } from "@/components/AuthGuard";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Capacitor } from '@capacitor/core';
import { setStatusBarDark } from '@/lib/statusBar';
import NotFound from "./pages/NotFound";

// Lazy load all pages for better initial load
const Home = lazy(() => import("./pages/Home"));
const NewRound = lazy(() => import("./pages/NewRound"));
const Scorecard = lazy(() => import("./pages/Scorecard"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const RoundComplete = lazy(() => import("./pages/RoundComplete"));
const Auth = lazy(() => import("./pages/Auth"));

const queryClient = new QueryClient();

const App = () => {
  // Initialize native status bar styling on app start
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setStatusBarDark();
    }
  }, []);

  return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
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
        <BrowserRouter>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
