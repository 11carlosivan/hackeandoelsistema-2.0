import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { useTheme } from '@/context/ThemeContext';
import { fetchSystemStats } from '@/services/api';
import {
  Tv,
  Heart,
  Share2,
  Bookmark,
  Calendar,
  Clock,
  Eye,
  Users,
  Play,
  Radio,
  ExternalLink,
} from 'lucide-react-native';

let WebViewComponent: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebViewComponent = require('react-native-webview').WebView;
} catch {}

const YOUTUBE_CHANNEL_ID = 'UCPO4ECcCtQNLPe11a0k5n2w';
const YOUTUBE_PLAYLIST_ID = `UU${YOUTUBE_CHANNEL_ID.slice(2)}`;

export default function HESLiveScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'previous'>('live');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(1248);
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats().then((data) => {
      if (data?.liveStream) {
        setLiveData(data.liveStream);
      }
      setLoading(false);
    });
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'HES Live - Hackeando el Sistema',
        message: 'Mira la transmisión en vivo de Hackeando el Sistema: https://hackeandoelsistema.net',
      });
    } catch {}
  };

  const handleToggleLike = () => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
  };

  const title = liveData?.title || 'Red Estelar: análisis del panorama político';
  const host = liveData?.host || 'Con Melvin Sena y su equipo';
  const viewers = liveData?.viewersCount || '12.4K';

  const upcomingList = liveData?.schedule || [
    { id: '1', title: 'Economía en tiempo real', time: 'Hoy 8:00 PM', isLive: true },
    { id: '2', title: 'Análisis internacional', time: 'Mañana 7:00 PM', isLive: false },
    { id: '3', title: 'Los temas del día', time: 'Miércoles 7:00 PM', isLive: false },
  ];

  const previousList = liveData?.previousStreams || [
    { id: 'p1', title: 'Debate nacional sobre el presupuesto estatal', duration: '1:14:20', date: 'Ayer', views: '28K' },
    { id: 'p2', title: 'Entrevista exclusiva con líderes del sector productivo', duration: '52:10', date: 'Hace 3 días', views: '35K' },
    { id: 'p3', title: 'HES Especial: Crisis alimentaria y reformas', duration: '1:05:40', date: 'Hace 5 días', views: '41K' },
  ];

  const activePlaylistId = liveData?.playlistId || (liveData?.channelId ? `UU${liveData.channelId.slice(2)}` : YOUTUBE_PLAYLIST_ID);
  const embedUrl = liveData?.videoId && liveData.videoId !== 'live_stream_current'
    ? `https://www.youtube-nocookie.com/embed/${liveData.videoId}?autoplay=1&mute=0&enablejsapi=1`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${activePlaylistId}&autoplay=1&mute=0&enablejsapi=1`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Screen Title Bar */}
        <View style={styles.titleBar}>
          <Tv size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={[styles.screenHeading, { color: colors.text }]}>HES Live</Text>
        </View>

        {/* Video Player Box */}
        <View style={styles.videoPlayerBox}>
          {Platform.OS === 'web' ? (
            <iframe
              src={embedUrl}
              style={{ width: '100%', height: '100%', border: 'none' } as any}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : WebViewComponent ? (
            <WebViewComponent
              source={{ uri: embedUrl }}
              style={styles.webView}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
            />
          ) : (
            <View style={[styles.webView, { alignItems: 'center', justifyContent: 'center' }]}>
              <Tv size={48} color="#DC2626" />
              <Text style={{ color: '#FFFFFF', marginTop: 10, fontWeight: '700' }}>HES Live Streaming</Text>
            </View>
          )}

          {/* Live Overlay Badge */}
          <View style={styles.liveOverlay}>
            <View style={styles.livePill}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveText}>EN VIVO</Text>
            </View>
            <View style={styles.viewerPill}>
              <Users size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.viewerText}>{viewers}</Text>
            </View>
          </View>
        </View>

        {/* Stream Details Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.streamTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.streamHost, { color: colors.textMuted }]}>{host}</Text>

          {/* Action Buttons Row */}
          <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, liked && { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}
              onPress={handleToggleLike}
              activeOpacity={0.7}
            >
              <Heart size={18} color={liked ? '#DC2626' : colors.text} fill={liked ? '#DC2626' : 'transparent'} />
              <Text style={[styles.actionText, { color: liked ? '#DC2626' : colors.text }]}>
                {likesCount.toLocaleString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
              <Share2 size={18} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Compartir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, saved && { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}
              onPress={() => setSaved(!saved)}
              activeOpacity={0.7}
            >
              <Bookmark size={18} color={saved ? '#DC2626' : colors.text} fill={saved ? '#DC2626' : 'transparent'} />
              <Text style={[styles.actionText, { color: saved ? '#DC2626' : colors.text }]}>
                {saved ? 'Guardado' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Tabs (En Vivo, Próximos, Anteriores) */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'live' && styles.activeTabItem]}
            onPress={() => setActiveTab('live')}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'live' ? '#DC2626' : colors.textMuted },
                activeTab === 'live' && styles.activeTabLabel,
              ]}
            >
              En vivo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'upcoming' && styles.activeTabItem]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'upcoming' ? '#DC2626' : colors.textMuted },
                activeTab === 'upcoming' && styles.activeTabLabel,
              ]}
            >
              Próximos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'previous' && styles.activeTabItem]}
            onPress={() => setActiveTab('previous')}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'previous' ? '#DC2626' : colors.textMuted },
                activeTab === 'previous' && styles.activeTabLabel,
              ]}
            >
              Anteriores
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContentArea}>
          {activeTab === 'live' || activeTab === 'upcoming' ? (
            <View style={styles.scheduleList}>
              {upcomingList.map((item: any) => (
                <View
                  key={item.id}
                  style={[styles.scheduleCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                >
                  <View style={styles.scheduleThumbnail}>
                    <Tv size={24} color="#DC2626" />
                  </View>
                  <View style={styles.scheduleInfo}>
                    <View style={styles.scheduleTitleRow}>
                      <Text style={[styles.scheduleTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.isLive && (
                        <View style={styles.liveDot} />
                      )}
                    </View>
                    <View style={styles.scheduleTimeRow}>
                      <Clock size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.scheduleTime, { color: colors.textMuted }]}>
                        {item.time}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.scheduleList}>
              {previousList.map((item: any) => (
                <View
                  key={item.id}
                  style={[styles.scheduleCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                >
                  <View style={[styles.scheduleThumbnail, { backgroundColor: colors.inputBackground }]}>
                    <Play size={20} color={colors.primary} />
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={[styles.scheduleTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.prevMetaRow}>
                      <Text style={[styles.scheduleTime, { color: colors.textMuted }]}>
                        {item.date} &bull; {item.duration} &bull; {item.views} vistas
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  videoPlayerBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  liveOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 5,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  viewerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  viewerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  infoCard: {
    margin: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  streamTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
  },
  streamHost: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  tabItem: {
    paddingVertical: 10,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#DC2626',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeTabLabel: {
    fontWeight: '900',
  },
  tabContentArea: {
    padding: 14,
  },
  scheduleList: {
    gap: 10,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  scheduleThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    marginRight: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginLeft: 6,
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  prevMetaRow: {
    marginTop: 4,
  },
});
