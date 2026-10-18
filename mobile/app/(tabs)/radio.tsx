import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Radio as RadioIcon, Play, Pause, Volume2, VolumeX, Share2, RadioReceiver, Music2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import HeaderBar from '@/components/HeaderBar';

const STREAM_URL = 'https://hackeandoelsistema.net/listen/hes_radio/radio.mp3';
const NOW_PLAYING_URL = 'https://hackeandoelsistema.net/api/nowplaying/hes_radio';

const { width } = Dimensions.get('window');

export default function RadioScreen() {
  const { colors, isDark } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<{ title: string; artist: string }>({
    title: 'Hackeando El Sistema Radio',
    artist: 'Transmisión en Vivo 24/7',
  });

  const soundRef = useRef<Audio.Sound | null>(null);

  // Equalizer animations
  const barAnim1 = useRef(new Animated.Value(15)).current;
  const barAnim2 = useRef(new Animated.Value(25)).current;
  const barAnim3 = useRef(new Animated.Value(40)).current;
  const barAnim4 = useRef(new Animated.Value(20)).current;
  const barAnim5 = useRef(new Animated.Value(30)).current;

  // Pulse animation for LIVE badge
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Audio mode configuration
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    // Live badge pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fetch now playing info
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 25000);

    return () => {
      clearInterval(interval);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Equalizer loop when playing
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (isPlaying) {
      const createBarAnim = (anim: Animated.Value, min: number, max: number, duration: number) => {
        return Animated.sequence([
          Animated.timing(anim, {
            toValue: max,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: min,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]);
      };

      animLoop = Animated.loop(
        Animated.parallel([
          createBarAnim(barAnim1, 8, 48, 450),
          createBarAnim(barAnim2, 12, 60, 380),
          createBarAnim(barAnim3, 10, 52, 520),
          createBarAnim(barAnim4, 14, 58, 420),
          createBarAnim(barAnim5, 8, 44, 490),
        ])
      );
      animLoop.start();
    } else {
      Animated.parallel([
        Animated.timing(barAnim1, { toValue: 12, duration: 300, useNativeDriver: false }),
        Animated.timing(barAnim2, { toValue: 16, duration: 300, useNativeDriver: false }),
        Animated.timing(barAnim3, { toValue: 12, duration: 300, useNativeDriver: false }),
        Animated.timing(barAnim4, { toValue: 18, duration: 300, useNativeDriver: false }),
        Animated.timing(barAnim5, { toValue: 10, duration: 300, useNativeDriver: false }),
      ]).start();
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isPlaying]);

  async function fetchNowPlaying() {
    try {
      const res = await fetch(NOW_PLAYING_URL);
      if (!res.ok) return;
      const data = await res.json();
      const current = data?.now_playing?.song;
      if (current?.title) {
        setNowPlaying({
          title: current.title || 'Hackeando El Sistema Radio',
          artist: current.artist || 'En Vivo',
        });
      }
    } catch {
      // fallback smoothly
    }
  }

  async function togglePlay() {
    try {
      if (isPlaying) {
        setIsLoading(true);
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
        }
        setIsPlaying(false);
        setIsLoading(false);
      } else {
        setIsLoading(true);
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: STREAM_URL },
            { shouldPlay: true, isLooping: false, volume: isMuted ? 0 : 1.0 },
            onPlaybackStatusUpdate
          );
          soundRef.current = sound;
        } else {
          await soundRef.current.playAsync();
        }
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (err) {
      setIsLoading(false);
      setIsPlaying(false);
    }
  }

  function onPlaybackStatusUpdate(status: any) {
    if (!status.isLoaded) {
      if (status.error) {
        setIsPlaying(false);
        setIsLoading(false);
      }
    } else {
      setIsPlaying(status.isPlaying);
      if (status.isBuffering) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
    }
  }

  async function toggleMute() {
    if (!soundRef.current) {
      setIsMuted(!isMuted);
      return;
    }
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    await soundRef.current.setVolumeAsync(nextMute ? 0 : 1.0);
  }

  async function handleShare() {
    try {
      await Share.share({
        title: 'Escucha Hackeando El Sistema Radio en Vivo',
        message: '¡Estoy escuchando Hackeando El Sistema Radio en vivo! Sintoniza aquí: https://hackeandoelsistema.net/listen/hes_radio/radio.mp3',
        url: 'https://hackeandoelsistema.net',
      });
    } catch {}
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <View style={styles.content}>
        {/* Live Status Badge */}
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, { backgroundColor: isDark ? '#2A1717' : '#FEE2E2', borderColor: '#EF4444' }]}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveText}>TRANSMISIÓN EN VIVO</Text>
          </View>
        </View>

        {/* Center Vinyl / Radio Visualizer Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#161922' : '#FFFFFF',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.visualizerCircle, { backgroundColor: isDark ? '#0F1219' : '#F1F5F9' }]}>
            <RadioReceiver size={68} color="#D32F2F" />

            {/* Glowing Accent Ring */}
            {isPlaying && (
              <View style={[styles.glowRing, { borderColor: '#D32F2F40' }]} />
            )}
          </View>

          {/* Equalizer Waveform */}
          <View style={styles.waveformContainer}>
            <Animated.View style={[styles.bar, { height: barAnim1, backgroundColor: '#D32F2F' }]} />
            <Animated.View style={[styles.bar, { height: barAnim2, backgroundColor: '#EF4444' }]} />
            <Animated.View style={[styles.bar, { height: barAnim3, backgroundColor: '#B91C1C' }]} />
            <Animated.View style={[styles.bar, { height: barAnim4, backgroundColor: '#EF4444' }]} />
            <Animated.View style={[styles.bar, { height: barAnim5, backgroundColor: '#D32F2F' }]} />
          </View>

          {/* Station & Song Information */}
          <View style={styles.infoContainer}>
            <Text style={[styles.stationTitle, { color: colors.text }]} numberOfLines={1}>
              {nowPlaying.title}
            </Text>
            <View style={styles.artistRow}>
              <Music2 size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.artistName, { color: colors.textSecondary }]} numberOfLines={1}>
                {nowPlaying.artist}
              </Text>
            </View>
            <Text style={[styles.subText, { color: colors.textMuted }]}>
              HES Radio • Santo Domingo, República Dominicana
            </Text>
          </View>
        </View>

        {/* Player Controls Bar */}
        <View style={styles.controlsRow}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: isDark ? '#1E2330' : '#E2E8F0' }]}
            onPress={toggleMute}
            accessibilityLabel={isMuted ? 'Desactivar silencio' : 'Silenciar'}
          >
            {isMuted ? (
              <VolumeX size={22} color={colors.text} />
            ) : (
              <Volume2 size={22} color={colors.text} />
            )}
          </TouchableOpacity>

          {/* Master Play / Pause Button */}
          <TouchableOpacity
            style={[styles.playButton, isLoading && styles.playButtonLoading]}
            onPress={togglePlay}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : isPlaying ? (
              <Pause size={38} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Play size={38} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: isDark ? '#1E2330' : '#E2E8F0' }]}
            onPress={handleShare}
            accessibilityLabel="Compartir señal"
          >
            <Share2 size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Footnote */}
        <Text style={[styles.footerNotice, { color: colors.textMuted }]}>
          Señal de alta fidelidad continua vía HES Streaming Network
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  liveText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  card: {
    width: width - 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  visualizerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    gap: 8,
    marginBottom: 16,
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
  infoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  stationTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
  },
  subText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  smallBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  playButtonLoading: {
    opacity: 0.8,
  },
  footerNotice: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
