import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.60c7b8f386684357ad06906250207efe',
  appName: 'MATCH Golf',
  webDir: 'dist',
  server: {
    // For development hot-reload from Lovable sandbox
    url: 'https://60c7b8f3-8668-4357-ad06-906250207efe.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#0A2F23'
    },
    KeepAwake: {
      // Keep screen on during active rounds
    }
  }
};

export default config;
