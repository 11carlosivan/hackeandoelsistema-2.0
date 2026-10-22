import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { createCompanyJob } from '@/services/api';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  FileText,
  Award,
  Gift,
  CheckCircle,
} from 'lucide-react-native';

const WORKPLACE_OPTIONS = [
  { label: 'Presencial', value: 'ONSITE' },
  { label: 'Híbrido', value: 'HYBRID' },
  { label: 'Remoto', value: 'REMOTE' },
];

const EMPLOYMENT_OPTIONS = [
  { label: 'Tiempo Completo', value: 'FULL_TIME' },
  { label: 'Medio Tiempo', value: 'PART_TIME' },
  { label: 'Por Contrato', value: 'CONTRACT' },
  { label: 'Pasantía', value: 'INTERNSHIP' },
];

export default function CreateJobScreen() {
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const { toast, showModal } = useNotification();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState(user?.name || '');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [workplaceType, setWorkplaceType] = useState<'ONSITE' | 'HYBRID' | 'REMOTE'>('ONSITE');
  const [employmentType, setEmploymentType] = useState<'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP'>('FULL_TIME');
  const [category, setCategory] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [isSalaryNegotiable, setIsSalaryNegotiable] = useState(false);
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [benefits, setBenefits] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      showModal({
        icon: 'info',
        title: 'Sesión requerida',
        message: 'Debes iniciar sesión para publicar una vacante.',
        buttons: [
          { text: 'Iniciar Sesión', style: 'primary', onPress: () => router.push('/login') },
          { text: 'Cancelar', style: 'cancel' },
        ],
      });
      return;
    }

    if (!title.trim() || !companyName.trim() || !location.trim() || !description.trim()) {
      toast.warning(
        'Campos requeridos',
        'Por favor completa el título, nombre de empresa, ubicación y descripción.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        companyName: companyName.trim(),
        companyWebsite: companyWebsite.trim() || null,
        location: location.trim(),
        workplaceType,
        employmentType,
        category: category.trim() || null,
        salaryMin: salaryMin.trim() ? parseInt(salaryMin, 10) : null,
        salaryMax: salaryMax.trim() ? parseInt(salaryMax, 10) : null,
        salaryCurrency: 'DOP',
        salaryPeriod: 'MONTHLY',
        isSalaryNegotiable,
        description: description.trim(),
        requirements: requirements.trim() || null,
        benefits: benefits.trim() || null,
      };

      const res = await createCompanyJob(payload, token);
      if (res.success && res.job) {
        showModal({
          icon: 'success',
          title: '¡Vacante Publicada!',
          message: 'Tu empleo ha sido publicado exitosamente y ya está visible en la bolsa de trabajo.',
          buttons: [
            {
              text: 'Ver Vacante',
              style: 'primary',
              onPress: () => router.replace(`/job/${res.job?.slug}` as any),
            },
            {
              text: 'Volver a Empleos',
              onPress: () => router.replace('/(tabs)/jobs' as any),
            },
          ],
        });
      } else {
        toast.error('Error al publicar', res.error || 'No se pudo publicar la vacante. Intenta nuevamente.');
      }
    } catch (err: any) {
      toast.error('Error inesperado', err.message || 'Ocurrió un error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Publicar Vacante</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Intro Banner */}
        <View style={[styles.banner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
          <Briefcase size={22} color={colors.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>Portal de Empleo HES</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.textMuted }]}>
              Publica ofertas laborales para nuestra comunidad de lectores y profesionales.
            </Text>
          </View>
        </View>

        {/* Datos Básicos */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>INFORMACIÓN DEL PUESTO</Text>

          <Text style={[styles.label, { color: colors.text }]}>Título de la Vacante *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Ej. Desarrollador React Native Senior"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[styles.label, { color: colors.text }]}>Nombre de la Empresa u Organización *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Ej. 11Ci Digital / Periódico HES"
            placeholderTextColor={colors.textMuted}
            value={companyName}
            onChangeText={setCompanyName}
          />

          <Text style={[styles.label, { color: colors.text }]}>Sitio Web de la Empresa (Opcional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="https://empresa.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
            value={companyWebsite}
            onChangeText={setCompanyWebsite}
          />

          <Text style={[styles.label, { color: colors.text }]}>Ubicación *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Ej. Santo Domingo, Distrito Nacional / Remoto"
            placeholderTextColor={colors.textMuted}
            value={location}
            onChangeText={setLocation}
          />

          <Text style={[styles.label, { color: colors.text }]}>Área o Categoría Profesional</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Ej. Tecnología, Periodismo, Marketing, Legal"
            placeholderTextColor={colors.textMuted}
            value={category}
            onChangeText={setCategory}
          />
        </View>

        {/* Modalidad y Tipo de Jornada */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>MODALIDAD Y JORNADA</Text>

          <Text style={[styles.label, { color: colors.text }]}>Modalidad de Trabajo</Text>
          <View style={styles.segmentedRow}>
            {WORKPLACE_OPTIONS.map((opt) => {
              const active = workplaceType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.inputBackground,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setWorkplaceType(opt.value as any)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? '#FFFFFF' : colors.text, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Tipo de Contrato</Text>
          <View style={styles.optionsWrap}>
            {EMPLOYMENT_OPTIONS.map((opt) => {
              const active = employmentType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.inputBackground,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setEmploymentType(opt.value as any)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? '#FFFFFF' : colors.text, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Salario */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>COMPENSACIÓN SALARIAL (DOP/MES)</Text>

          <View style={styles.salaryRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: colors.text }]}>Mínimo</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="RD$ Min"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={salaryMin}
                onChangeText={setSalaryMin}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.label, { color: colors.text }]}>Máximo</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="RD$ Max"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={salaryMax}
                onChangeText={setSalaryMax}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Salario a convenir / Negociable</Text>
            <Switch
              value={isSalaryNegotiable}
              onValueChange={setIsSalaryNegotiable}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Detalle, Requisitos y Beneficios */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>DESCRIPCIÓN Y REQUISITOS</Text>

          <Text style={[styles.label, { color: colors.text }]}>Descripción del Puesto *</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Describe las responsabilidades principales, misión del cargo y el entorno de trabajo..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Requisitos y Habilidades</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="- Grado académico o experiencia equivalente&#10;- Tecnologías o competencias clave&#10;- Idiomas o años de experiencia requeridos"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={requirements}
            onChangeText={setRequirements}
          />

          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Beneficios Ofrecidos</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="- Seguro médico privado&#10;- Horario flexible o días de trabajo remoto&#10;- Oportunidades de formación"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={benefits}
            onChangeText={setBenefits}
          />
        </View>

        {/* Botón Publicar */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Publicar Vacante Ahora</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 90,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 13,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  salaryRow: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
