import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.posproz.app',
  appName: 'PosProz',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    // Izin kamera untuk barcode scanner
    Camera: {
      permissions: {
        android: [
          'android.permission.CAMERA',
          'android.permission.FLASHLIGHT'
        ]
      }
    }
  }
};

export default config;
