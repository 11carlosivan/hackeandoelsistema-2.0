import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { fetchCompanyJobs, fetchJobApplicants, Job, JobApplicationItem } from '@/services/api';
import {
  ArrowLeft,
  Briefcase,
  Users,
  MapPin,
  Clock,
  Download,
  Mail,
  Phone,
  FileText,
  X,
  ExternalLink,
  PlusCircle,
} from 'lucide-react-native';

export default function MyJobsScreen() {
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Candidatos
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<JobApplicationItem[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadMyJobs = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await fetchCompanyJobs(token);
    setJobs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMyJobs();
  }, [token]);

  const handleOpenApplicants = async (job: Job) => {
    if (!token) return;
    setSelectedJob(job);
    setModalVisible(true);
    setLoadingApplicants(true);

    const result = await fetchJobApplicants(job.id, token);
    if (result) {
      setApplicants(result.applications || []);
    } else {
      setApplicants([]);
    }
    setLoadingApplicants(false);
  };

  const handleOpenResume = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Enlace no soportado', 'No se puede abrir el archivo directamente en este dispositivo.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir el currículum.');
    }
  };

  const renderStatusBadge = (status: string) => {
    let bg = '#FEF3C7';
    let text = '#B45309';
    let label = 'Pendiente';

    if (status === 'REVIEWING') {
      bg = '#DBEAFE';
      text = '#1D4ED8';
      label = 'En Revisión';
    } else if (status === 'SHORTLISTED') {
      bg = '#D1FAE5';
      text = '#047857';
      label = 'Preseleccionado';
    } else if (status === 'REJECTED') {
      bg = '#FEE2E2';
      text = '#B91C1C';
      label = 'Descartado';
    } else if (status === 'HIRED') {
      bg = '#DCFCE7';
      text = '#15803D';
      label = 'Contratado';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusBadgeText, { color: text }]}>{label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Vacantes Publicadas</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/job/create' as any)}
          activeOpacity={0.7}
        >
          <PlusCircle size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.subtext, { color: colors.textMuted }]}>Cargando vacantes publicadas...</Text>
        </View>
      ) : !token ? (
        <View style={styles.centerBox}>
          <Briefcase size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
          <Text style={[styles.title, { color: colors.text }]}>Inicia Sesión</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            Inicia sesión con tu cuenta de empresa para gestionar tus vacantes y candidatos.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.centerBox}>
          <Briefcase size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
          <Text style={[styles.title, { color: colors.text }]}>No tienes vacantes publicadas</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            Publica tu primera oferta de empleo para empezar a recibir candidatos.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/job/create' as any)}
          >
            <Text style={styles.primaryBtnText}>Publicar Vacante</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.jobCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.jobTitle, { color: colors.text }]}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{item.workplaceType}</Text>
                </View>
              </View>

              <Text style={[styles.companyName, { color: colors.textMuted }]}>{item.companyName}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MapPin size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.location}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

              <View style={styles.cardActions}>
                <View style={styles.applicantCountRow}>
                  <Users size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.applicantCountText, { color: colors.text }]}>
                    {item.applicantCount || 0} {item.applicantCount === 1 ? 'Candidato' : 'Candidatos'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.reviewBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleOpenApplicants(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reviewBtnText}>Ver Candidatos</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal de Candidatos */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  {selectedJob?.title}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  {applicants.length} {applicants.length === 1 ? 'postulación' : 'postulaciones registradas'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingApplicants ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.subtext, { color: colors.textMuted, marginTop: 12 }]}>Cargando postulaciones...</Text>
              </View>
            ) : applicants.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Users size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={[styles.modalEmptyTitle, { color: colors.text }]}>Aún no hay postulaciones</Text>
                <Text style={[styles.subtext, { color: colors.textMuted }]}>
                  Los candidatos que apliquen a esta vacante aparecerán aquí con su currículum adjunto.
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.applicantsList}>
                {applicants.map((app) => (
                  <View
                    key={app.id}
                    style={[styles.applicantCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <View style={styles.applicantTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.applicantName, { color: colors.text }]}>{app.fullName}</Text>
                        <Text style={[styles.applicantDate, { color: colors.textMuted }]}>
                          Postulado el {new Date(app.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {renderStatusBadge(app.status)}
                    </View>

                    <View style={styles.contactRow}>
                      <View style={styles.contactItem}>
                        <Mail size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={[styles.contactText, { color: colors.textMuted }]}>{app.email}</Text>
                      </View>
                      <View style={styles.contactItem}>
                        <Phone size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={[styles.contactText, { color: colors.textMuted }]}>{app.phone}</Text>
                      </View>
                    </View>

                    {app.coverLetter ? (
                      <View style={[styles.coverLetterBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                        <Text style={[styles.coverLetterLabel, { color: colors.textMuted }]}>Carta de Presentación:</Text>
                        <Text style={[styles.coverLetterText, { color: colors.text }]}>{app.coverLetter}</Text>
                      </View>
                    ) : null}

                    {/* Botón Descargar Currículum */}
                    {app.resumeUrl ? (
                      <TouchableOpacity
                        style={[styles.cvButton, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                        onPress={() => handleOpenResume(app.resumeUrl)}
                        activeOpacity={0.7}
                      >
                        <FileText size={16} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.cvButtonText, { color: colors.primary }]} numberOfLines={1}>
                          {app.resumeFileName || 'Ver Currículum Vitae (PDF)'}
                        </Text>
                        <ExternalLink size={14} color={colors.primary} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            )}
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
  addBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  jobCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applicantCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicantCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reviewBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  applicantsList: {
    padding: 16,
  },
  applicantCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  applicantTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: '700',
  },
  applicantDate: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contactRow: {
    gap: 6,
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 13,
  },
  coverLetterBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  coverLetterLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  coverLetterText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  cvButtonText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
