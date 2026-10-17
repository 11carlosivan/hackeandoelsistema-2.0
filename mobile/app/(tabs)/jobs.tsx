import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { fetchPublicJobs, Job } from '@/services/api';
import { useRouter } from 'expo-router';
import { Briefcase, Search, MapPin, Building2, PlusCircle, Users, Clock } from 'lucide-react-native';

const WORKPLACE_FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Remoto', value: 'REMOTE' },
  { label: 'Híbrido', value: 'HYBRID' },
  { label: 'Presencial', value: 'ONSITE' },
];

export default function JobsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');

  const loadJobs = async () => {
    const data = await fetchPublicJobs({
      q: searchQuery.trim() || undefined,
      workplaceType: selectedFilter || undefined,
    });
    setJobs(data.jobs);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadJobs();
  }, [selectedFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    loadJobs();
  };

  const formatSalary = (job: Job) => {
    try {
      if (job.salaryMin && job.salaryMax) {
        return `RD$ ${Number(job.salaryMin).toLocaleString('en-US')} - ${Number(job.salaryMax).toLocaleString('en-US')}`;
      }
      if (job.salaryMin) {
        return `Desde RD$ ${Number(job.salaryMin).toLocaleString('en-US')}`;
      }
      if (job.isSalaryNegotiable) {
        return 'Salario a convenir';
      }
      return 'Salario confidencial';
    } catch {
      return 'Salario confidencial';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${d.getDate()} ${months[d.getMonth()]}`;
    } catch {
      return '';
    }
  };

  const getWorkplaceBadgeColor = (type?: string) => {
    switch (type) {
      case 'REMOTE':
        return '#10B981'; // green
      case 'HYBRID':
        return '#3B82F6'; // blue
      default:
        return '#F59E0B'; // amber
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      {/* Título de la sección y botones de acción */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <Briefcase size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: colors.text }]}>BOLSA DE EMPLEOS</Text>
        </View>

        <View style={styles.topActionsRow}>
          {user ? (
            <TouchableOpacity
              style={[styles.myJobsBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
              onPress={() => router.push('/job/my-jobs' as any)}
              activeOpacity={0.8}
            >
              <Users size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.myJobsBtnText, { color: colors.primary }]}>Mis Vacantes</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.postJobBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (user) {
                router.push('/job/create' as any);
              } else {
                router.push('/login');
              }
            }}
            activeOpacity={0.8}
          >
            <PlusCircle size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.postJobBtnText}>Publicar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Buscador de empleos */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por cargo, empresa o habilidad..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Filtros de Modalidad (Pills) */}
      <View style={styles.filterRow}>
        {WORKPLACE_FILTERS.map((f) => {
          const isActive = selectedFilter === f.value;
          return (
            <TouchableOpacity
              key={f.label}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? colors.primary : colors.cardBackground,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedFilter(f.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: isActive ? '#FFFFFF' : colors.textMuted, fontWeight: isActive ? '800' : '600' },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista de Empleos */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando vacantes laborales...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.jobCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => router.push(`/job/${item.slug}` as any)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={styles.companyRow}>
                  <Building2 size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.companyName, { color: colors.primary }]}>{item.companyName}</Text>
                </View>
                <View
                  style={[
                    styles.workplaceBadge,
                    { backgroundColor: getWorkplaceBadgeColor(item.workplaceType) + '20', borderColor: getWorkplaceBadgeColor(item.workplaceType) },
                  ]}
                >
                  <Text style={[styles.workplaceText, { color: getWorkplaceBadgeColor(item.workplaceType) }]}>
                    {item.workplaceType === 'REMOTE' ? 'Remoto' : item.workplaceType === 'HYBRID' ? 'Híbrido' : 'Presencial'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.jobTitle, { color: colors.text }]}>{item.title}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MapPin size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Users size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {item.applicantCount || 0} postulantes
                  </Text>
                </View>
              </View>

              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.salaryText, { color: colors.text }]}>{formatSalary(item)}</Text>
                <View style={styles.dateBox}>
                  <Clock size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.dateText, { color: colors.textMuted }]}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Briefcase size={36} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No se encontraron empleos</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Prueba ajustando los filtros de búsqueda o sé la primera empresa en publicar una vacante.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myJobsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  myJobsBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  postJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  postJobBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  jobCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyName: {
    fontSize: 13,
    fontWeight: '800',
  },
  workplaceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  workplaceText: {
    fontSize: 10,
    fontWeight: '800',
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  salaryText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
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
  emptyBox: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
