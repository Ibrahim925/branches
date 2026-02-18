import type { CapacitorConfig } from '@capacitor/cli';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://branches-azure.vercel.app';
const isDev = process.env.NODE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.branches.familytree',
  appName: 'Branches',
  backgroundColor: '#1E1C19',
  webDir: '../../out',
  server: isDev
    ? {
        url: 'http://localhost:3000',
        cleartext: true,
      }
    : {
        url: appUrl,
      },
  ios: {
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
    scheme: 'branches',
    scrollEnabled: true,
  },
  plugins: {
    App: {
      iosScheme: 'branches',
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 450,
      showSpinner: false,
      backgroundColor: '#1E1C19',
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#F5F1E8',
    },
    Haptics: {},
  },
};

export default config;
