import { Platform } from 'react-native';

// Standard local fallback for development: Android Emulator uses 10.0.2.2, iOS uses localhost
const getLocalDevApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }
  return 'http://localhost:4000';
};

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getLocalDevApiUrl();
export const SITE_NAME = 'Hackeando El Sistema';
export const SITE_TAGLINE = 'Periodismo Digital Independiente';
