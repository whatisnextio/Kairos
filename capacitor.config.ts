import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.whatisnext.kairos',
  appName: '12K',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#00ff87',
      sound: 'beep.wav',
    },
  },
};

export default config;
