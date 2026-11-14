export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  android?: {
    adjustMarginsForEdgeToEdge?: 'auto' | 'force' | 'disable';
  };
  server?: {
    androidScheme?: string;
    cleartext?: boolean;
    [key: string]: any;
  };
  plugins?: Record<string, any>;
}

const config: CapacitorConfig = {
  appId: 'com.talkofthetown.pos',
  appName: 'Talk of the Town POS',
  webDir: 'dist',
  // Keep the entire WebView above Android gesture/three-button navigation.
  // Capacitor 7 does not enable this by default on every supported device.
  android: {
    adjustMarginsForEdgeToEdge: 'force'
  },
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#800000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#800000'
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK'
    }
  }
};

export default config;
