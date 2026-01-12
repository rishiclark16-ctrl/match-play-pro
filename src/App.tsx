import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Lazy load heavier pages for better initial load
const NewRound = lazy(() => import("./pages/NewRound"));
const Scorecard = lazy(() => import("./pages/Scorecard"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const RoundComplete = lazy(() => import("./pages/RoundComplete"));
const Auth = lazy(() => import("./pages/Auth"));

const queryClient = new QueryClient();

const App = () => (
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
            <Route path="/" element={<Home />} />
            <Route 
              path="/auth" 
              element={
                <Suspense fallback={<PageSkeleton variant="default" />}>
                  <Auth />
                </Suspense>
              } 
            />
            <Route 
              path="/new-round" 
              element={
                <Suspense fallback={<PageSkeleton variant="default" />}>
                  <NewRound />
                </Suspense>
              } 
            />
            <Route 
              path="/round/:id" 
              element={
                <Suspense fallback={<PageSkeleton variant="scorecard" />}>
                  <Scorecard />
                </Suspense>
              } 
            />
            <Route 
              path="/round/:id/leaderboard" 
              element={
                <Suspense fallback={<PageSkeleton variant="list" />}>
                  <Leaderboard />
                </Suspense>
              } 
            />
            <Route 
              path="/round/:id/complete" 
              element={
                <Suspense fallback={<PageSkeleton variant="default" />}>
                  <RoundComplete />
                </Suspense>
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

export default App;
