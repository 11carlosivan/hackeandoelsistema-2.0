import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { fetchJobBySlug, uploadResumeFile, applyToJob, Job } from '@/services/api';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  FileText,
  Upload,
  CheckCircle,
  X,
  Send,
  Users,
} from 'lucide-react-native';

export default function JobDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const { toast, showModal } = useNotification();
  const router = useRouter();


  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal de Postulación
  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchJobBySlug(slug).then((data) => {
        setJob(data);
        setLoading(false);
      });
    }
  }, [slug]);

  useEffect(() => {
    if (user) {
      if (user.displayName) setFullName(user.displayName);
      if (user.email) setEmail(user.email);
    }
  }, [user]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const ext = file.name?.split('.').pop()?.toLowerCase();
        let mime = file.mimeType;

        if (!mime || mime === 'application/octet-stream') {
          if (ext === 'docx') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (ext === 'doc') mime = 'application/msword';
          else if (ext === 'txt') mime = 'text/plain';
          else mime = 'application/pdf';
        }

        setSelectedFile({
          uri: file.uri,
          name: file.name,
          mimeType: mime,
        });
      }
    } catch (err) {
      toast.error('Error', 'No se pudo seleccionar el archivo.');
    }
  };


  const handleApplySubmit = async () => {
    if (!job) return;

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast.warning('Campos obligatorios', 'Por favor ingresa tu nombre, correo y número de teléfono.');
      return;
    }

    if (!selectedFile) {
      toast.warning('Curriculum requerido', 'Debes adjuntar tu curriculum en formato PDF o Word.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Subir CV
      const uploaded = await uploadResumeFile(selectedFile.uri, selectedFile.name, selectedFile.mimeType, token);
      if (!uploaded) {
        throw new Error('Error al subir el curriculum.');
      }

      // 2. Enviar postulación
      const applyRes = await applyToJob(
        job.id,
        {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          resumeUrl: uploaded.resumeUrl,
          resumeFileName: uploaded.resumeFileName,
          coverLetter: coverLetter.trim() || undefined,
        },
        token
      );

      setSubmitting(false);

      if (applyRes.success) {
        setModalVisible(false);
        showModal({
          icon: 'success',
          title: '¡Postulación exitosa!',
          message: 'Tu currículum ha sido enviado a la empresa. Se pondrán en contacto contigo si tu perfil coincide con la vacante.',
          buttons: [{ text: 'Aceptar', style: 'primary', onPress: () => router.back() }],
        });
      } else {
        toast.error('Error', applyRes.error || 'No se pudo procesar la postulación.');
      }
    } catch (err: any) {
      setSubmitting(false);
      toast.error('Error', err.message || 'Ocurrió un error al enviar tu postulación.');
    }
  };


  const formatSalary = () => {
    if (!job) return '';
    if (job.salaryMin && job.salaryMax) {
      return `RD$ ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} / mes`;
    }
    if (job.salaryMin) {
      return `Desde RD$ ${job.salaryMin.toLocaleString()} / mes`;
    }
    if (job.isSalaryNegotiable) {
      return 'A convenir';
    }
    return 'Confidencial';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Detalle de Vacante
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando información del empleo...</Text>
        </View>
      ) : job ? (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Tarjeta de Encabezado */}
            <View style={[styles.mainCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.companyRow}>
                <Building2 size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.companyName, { color: colors.primary }]}>{job.companyName}</Text>
              </View>

              <Text style={[styles.jobTitle, { color: colors.text }]}>{job.title}</Text>

              {/* Badges */}
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: colors.inputBackground }]}>
                  <MapPin size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: colors.text }]}>{job.location}</Text>
                </View>

                <View style={[styles.badge, { backgroundColor: colors.inputBackground }]}>
                  <Clock size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: colors.text }]}>
                    {job.workplaceType === 'REMOTE' ? 'Remoto' : job.workplaceType === 'HYBRID' ? 'Híbrido' : 'Presencial'}
                  </Text>
                </View>

                <View style={[styles.badge, { backgroundColor: colors.inputBackground }]}>
                  <DollarSign size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: colors.text }]}>{formatSalary()}</Text>
                </View>
              </View>

              <View style={[styles.applicantRow, { borderTopColor: colors.border }]}>
                <Users size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.applicantText, { color: colors.textMuted }]}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{job.applicantCount || 0}</Text> personas ya se han postulado
                </Text>
              </View>
            </View>

            {/* Descripción */}
            <View style={[styles.sectionBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>DESCRIPCIÓN DEL PUESTO</Text>
              <Text style={[styles.bodyText, { color: colors.text }]}>{job.description}</Text>
            </View>

            {/* Requisitos */}
            {job.requirements ? (
              <View style={[styles.sectionBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>REQUISITOS</Text>
                <Text style={[styles.bodyText, { color: colors.text }]}>{job.requirements}</Text>
              </View>
            ) : null}

            {/* Beneficios */}
            {job.benefits ? (
              <View style={[styles.sectionBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>BENEFICIOS</Text>
                <Text style={[styles.bodyText, { color: colors.text }]}>{job.benefits}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Botón flotante inferior para Postularse */}
          <View style={[styles.footerBar, { backgroundColor: colors.headerBackground, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
            >
              <FileText size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.applyBtnText}>Postularme / Enviar CV</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.loadingBox}>
          <Text style={{ color: colors.text }}>No se encontró la vacante solicitada.</Text>
        </View>
      )}

      {/* Modal de Postulación con Subida de CV */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Postularme a la vacante</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={[styles.modalSubtitle, { color: colors.primary }]}>{job?.title}</Text>

              <Text style={[styles.label, { color: colors.textMuted }]}>Nombre Completo *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="Ej. Juan Pérez"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>Correo Electrónico *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="juan@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>Teléfono de Contacto (WhatsApp) *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="809-555-1234"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>Carta breve o mensaje (opcional)</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="Breve presentación de por qué eres el candidato ideal..."
                placeholderTextColor={colors.textMuted}
                value={coverLetter}
                onChangeText={setCoverLetter}
                multiline
                numberOfLines={3}
              />

              {/* Selector de CV */}
              <Text style={[styles.label, { color: colors.textMuted }]}>Adjuntar Curriculum (PDF o Word) *</Text>
              <TouchableOpacity
                style={[styles.uploadBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={handlePickDocument}
                activeOpacity={0.8}
              >
                {selectedFile ? (
                  <View style={styles.selectedFileRow}>
                    <CheckCircle size={20} color="#10B981" style={{ marginRight: 8 }} />
                    <Text style={[styles.selectedFileName, { color: colors.text }]} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.uploadPrompt}>
                    <Upload size={22} color={colors.primary} style={{ marginBottom: 6 }} />
                    <Text style={[styles.uploadText, { color: colors.text }]}>Toca aquí para seleccionar tu CV</Text>
                    <Text style={[styles.uploadSub, { color: colors.textMuted }]}>Formatos aceptados: PDF, DOCX</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Botón de Enviar */}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
                onPress={handleApplySubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmBtnText}>Confirmar y Enviar Postulación</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  mainCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '800',
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  applicantText: {
    fontSize: 13,
  },
  sectionBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 14,
  },
  modalForm: {
    paddingBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  uploadBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadPrompt: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  uploadSub: {
    fontSize: 11,
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedFileName: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
