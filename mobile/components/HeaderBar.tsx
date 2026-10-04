import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react-native';

export const HeaderBar: React.FC = () => {
  const { colors, isDark, setThemeMode } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
      <View style={styles.logoRow}>
        <Image
          source={require('@/assets/images/isotipo.png')}
          style={styles.isotipoImage}
          resizeMode="contain"
        />
        <View style={styles.textLogoContainer}>
          <Text style={[styles.mainBrandText, { color: colors.text }]}>
            HACKEANDO<Text style={{ color: colors.primary }}>ELSISTEMA</Text>
          </Text>
          <Text style={[styles.subBrandText, { color: colors.textMuted }]}>
            PERIODISMO DIGITAL INDEPENDIENTE
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.themeBtn, { backgroundColor: colors.inputBackground }]}
        onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
        activeOpacity={0.7}
      >
        {isDark ? (
          <Sun size={18} color="#F59E0B" />
        ) : (
          <Moon size={18} color="#6366F1" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  logoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  isotipoImage: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  textLogoContainer: {
    justifyContent: 'center',
  },
  mainBrandText: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 20,
  },
  subBrandText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  themeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
