import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  ShieldCheck,
  Building,
  UserCheck,
  FileText,
  ExternalLink,
  MessageCircle,
} from 'lucide-react-native';

export default function ContactScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}?subject=Contacto%20desde%20App%20Móvil`);
  };

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`);
  };

  const handleWebPress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header bar */}
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.inputBackground }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Contacto & Editorial</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner Institucional */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.indicatorDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              TRANSPARENCIA EDITORIAL & CONTACTO
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Hackeando El Sistema</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Medio de periodismo digital independiente y análisis de actualidad sociopolítica y tecnología con sede en República Dominicana.
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <UserCheck size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={styles.infoTextCol}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Dirección General & Editorial</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>Melvin Sena</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Building size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={styles.infoTextCol}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Organización Editorial</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>Hackeando El Sistema Digital Media</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={styles.infoTextCol}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Sede y Cobertura</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>Santo Domingo, República Dominicana</Text>
            </View>
          </View>
        </View>

        {/* Canales de Contacto Directo */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>CANALES OFICIALES DE ATENCIÓN</Text>

        {/* Email Desarrollador y Contacto Oficial */}
        <TouchableOpacity
          style={[styles.channelCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => handleEmailPress('maquithe1@gmail.com')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#261719' : '#FEE2E2' }]}>
            <Mail size={20} color={colors.primary} />
          </View>
          <View style={styles.channelTextCol}>
            <Text style={[styles.channelLabel, { color: colors.textMuted }]}>Contacto Oficial del Desarrollador</Text>
            <Text style={[styles.channelValue, { color: colors.text, fontWeight: '800' }]}>maquithe1@gmail.com</Text>
            <Text style={[styles.channelHint, { color: colors.primary }]}>Tocar para redactar correo al desarrollador</Text>
          </View>
          <ExternalLink size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Email General */}
        <TouchableOpacity
          style={[styles.channelCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => handleEmailPress('contacto@hackeandoelsistema.net')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#261719' : '#FEE2E2' }]}>
            <Mail size={20} color={colors.primary} />
          </View>
          <View style={styles.channelTextCol}>
            <Text style={[styles.channelLabel, { color: colors.textMuted }]}>Contacto General y Soporte</Text>
            <Text style={[styles.channelValue, { color: colors.text }]}>contacto@hackeandoelsistema.net</Text>
            <Text style={[styles.channelHint, { color: colors.primary }]}>Tocar para redactar correo</Text>
          </View>
          <ExternalLink size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Email Prensa */}
        <TouchableOpacity
          style={[styles.channelCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => handleEmailPress('prensa@hackeandoelsistema.net')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1E2330' : '#E0E7FF' }]}>
            <Mail size={20} color="#3B82F6" />
          </View>
          <View style={styles.channelTextCol}>
            <Text style={[styles.channelLabel, { color: colors.textMuted }]}>Redacción, Prensa & Filtraciones</Text>
            <Text style={[styles.channelValue, { color: colors.text }]}>prensa@hackeandoelsistema.net</Text>
            <Text style={[styles.channelHint, { color: '#3B82F6' }]}>Tocar para enviar nota o comunicado</Text>
          </View>
          <ExternalLink size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Teléfono / WhatsApp */}
        <TouchableOpacity
          style={[styles.channelCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => handlePhonePress('+18094317570')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#13281C' : '#DCFCE7' }]}>
            <Phone size={20} color="#16A34A" />
          </View>
          <View style={styles.channelTextCol}>
            <Text style={[styles.channelLabel, { color: colors.textMuted }]}>Línea Telefónica & Redacción</Text>
            <Text style={[styles.channelValue, { color: colors.text }]}>+1 (809) 431-7570</Text>
            <Text style={[styles.channelHint, { color: '#16A34A' }]}>Tocar para llamar a la redacción</Text>
          </View>
          <ExternalLink size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Portal Web */}
        <TouchableOpacity
          style={[styles.channelCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => handleWebPress('https://hackeandoelsistema.net/contacto')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#231F2A' : '#F3E8FF' }]}>
            <Globe size={20} color="#9333EA" />
          </View>
          <View style={styles.channelTextCol}>
            <Text style={[styles.channelLabel, { color: colors.textMuted }]}>Página Web Oficial de Contacto</Text>
            <Text style={[styles.channelValue, { color: colors.text }]}>hackeandoelsistema.net/contacto</Text>
            <Text style={[styles.channelHint, { color: '#9333EA' }]}>Tocar para abrir en el navegador</Text>
          </View>
          <ExternalLink size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Declaración de Política de Noticias y Verificación */}
        <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 24 }]}>
          CUMPLIMIENTO & POLÍTICA DE NOTICIAS
        </Text>
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.policyHeader}>
            <ShieldCheck size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.policyTitle, { color: colors.text }]}>Compromiso Periodístico y Ética</Text>
          </View>
          <Text style={[styles.policyText, { color: colors.textMuted }]}>
            1. <Text style={{ fontWeight: '700', color: colors.text }}>Autoría y Fuentes:</Text> Todos nuestros artículos indican con claridad el autor o la unidad editorial que los redactó, así como las fuentes consultadas y la fecha de publicación.
          </Text>
          <Text style={[styles.policyText, { color: colors.textMuted, marginTop: 8 }]}>
            2. <Text style={{ fontWeight: '700', color: colors.text }}>Derecho a Réplica y Corrección:</Text> Si consideras que alguna información requiere rectificación o deseas solicitar tu derecho a réplica, escríbenos a <Text style={{ color: colors.primary }}>prensa@hackeandoelsistema.net</Text> con la documentación correspondiente.
          </Text>
          <Text style={[styles.policyText, { color: colors.textMuted, marginTop: 8 }]}>
            3. <Text style={{ fontWeight: '700', color: colors.text }}>Independencia Editorial:</Text> Los contenidos expresados en los artículos de opinión corresponden a sus firmantes y reflejan una pluralidad de perspectivas ciudadanas.
          </Text>
        </View>

        {/* Enlaces Legales */}
        <View style={styles.legalLinksRow}>
          <TouchableOpacity
            style={styles.legalBtn}
            onPress={() => handleWebPress('https://hackeandoelsistema.net/politica-de-privacidad')}
          >
            <Text style={[styles.legalText, { color: colors.primary }]}>Política de Privacidad</Text>
          </TouchableOpacity>
          <Text style={[styles.legalDot, { color: colors.textMuted }]}>•</Text>
          <TouchableOpacity
            style={styles.legalBtn}
            onPress={() => handleWebPress('https://hackeandoelsistema.net/terminos-de-uso')}
          >
            <Text style={[styles.legalText, { color: colors.primary }]}>Términos de Servicio</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.appVersionText, { color: colors.textMuted }]}>
          Hackeando El Sistema App &bull; Versión 1.0.3 &bull; Santo Domingo, RD
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  channelTextCol: {
    flex: 1,
    marginRight: 8,
  },
  channelLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  channelValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  channelHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  policyText: {
    fontSize: 12,
    lineHeight: 17,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  legalBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  legalText: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 12,
  },
  appVersionText: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 16,
  },
});
