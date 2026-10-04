export type StatusBarStyle = 'light' | 'dark';

export interface ThemeColors {
  text: string;
  textMuted: string;
  background: string;
  cardBackground: string;
  border: string;
  primary: string;
  primaryHover: string;
  accent: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  badgeOpinionBg: string;
  badgeOpinionText: string;
  headerBackground: string;
  inputBackground: string;
  statusBar: StatusBarStyle;
}

export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    text: '#0F172A',
    textMuted: '#64748B',
    background: '#F8FAFC',
    cardBackground: '#FFFFFF',
    border: '#E2E8F0',
    primary: '#DC2626', // HES Red
    primaryHover: '#B91C1C',
    accent: '#2563EB',
    tint: '#DC2626',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#DC2626',
    badgeOpinionBg: '#FEF2F2',
    badgeOpinionText: '#DC2626',
    headerBackground: '#FFFFFF',
    inputBackground: '#F1F5F9',
    statusBar: 'dark',
  },
  dark: {
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    background: '#090D16', // Sleek dark
    cardBackground: '#1E293B',
    border: '#334155',
    primary: '#EF4444',
    primaryHover: '#DC2626',
    accent: '#3B82F6',
    tint: '#EF4444',
    tabIconDefault: '#64748B',
    tabIconSelected: '#EF4444',
    badgeOpinionBg: '#451A1A',
    badgeOpinionText: '#FCA5A5',
    headerBackground: '#0F172A',
    inputBackground: '#1E293B',
    statusBar: 'light',
  },
};
