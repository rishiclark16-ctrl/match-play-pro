import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry error tracking before app renders
initSentry();

// Global error handlers for uncaught errors
window.addEventListener('error', (event) => {
  // Sentry will catch these automatically, but we can add custom handling
  console.error('Uncaught error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  // Sentry will catch these automatically, but we can add custom handling
  console.error('Unhandled promise rejection:', event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
