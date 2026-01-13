import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.60c7b8f386684357ad06906250207efe',
  appName: 'MATCH Golf',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#0A2F23'
    },
    KeepAwake: {}
  }
};

export default config;
