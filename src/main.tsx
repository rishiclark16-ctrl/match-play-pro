import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/posthog";
import { logger } from "./lib/logger";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry error tracking before app renders
initSentry();

// Initialize PostHog analytics
initPostHog();

// Register service worker only on web (not in Capacitor native app)
// Capacitor's WKWebView doesn't support ServiceWorkerRegistration
const isCapacitor = !!(window as unknown as { Capacitor?: unknown }).Capacitor ||
                    window.location.protocol === 'capacitor:';

if (!isCapacitor && 'serviceWorker' in navigator) {
  registerSW({
    onRegistered(registration) {
      if (registration) {
        logger.info('Service Worker registered');
      }
    },
    onRegisterError(error) {
      logger.error('Service Worker registration failed', error);
    },
  });
}

// Global error handlers for uncaught errors
window.addEventListener('error', (event) => {
  // Sentry will catch these automatically, but we can add custom handling
  logger.error('Uncaught error', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  // Sentry will catch these automatically, but we can add custom handling
  logger.error('Unhandled promise rejection', event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
