import { Platform } from 'react-native';

// Default to live VPS backend
const DEFAULT_PRODUCTION_API_URL = 'https://hackeandoelsistema.net';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_PRODUCTION_API_URL).replace(/\/+$/, '');
export const SITE_NAME = 'Hackeando El Sistema';
export const SITE_TAGLINE = 'Periodismo Digital Independiente';
