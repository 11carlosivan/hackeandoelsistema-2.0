import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  Easing,
  Platform,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Matrix character pool: Katakana-like symbols, hex, binary and hacking glyphs
const MATRIX_CHARS = '01アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF<>/*#{}';

interface ColumnState {
  id: number;
  chars: string[];
  x: number;
  speed: number;
}

const NUM_COLUMNS = Math.floor(width / 22);

export const MatrixLoadingScreen: React.FC<{ onFinish?: () => void; duration?: number }> = ({
  onFinish,
  duration = 2200,
}) => {
  const [columns, setColumns] = useState<ColumnState[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const [statusText, setStatusText] = useState('INICIALIZANDO SISTEMA...');

  // Initialize random columns
  useEffect(() => {
    const cols: ColumnState[] = [];
    for (let i = 0; i < NUM_COLUMNS; i++) {
      const charCount = Math.floor(Math.random() * 12) + 10;
      const chars: string[] = [];
      for (let j = 0; j < charCount; j++) {
        chars.push(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]);
      }
      cols.push({
        id: i,
        chars,
        x: i * 22 + 4,
        speed: Math.floor(Math.random() * 80) + 60,
      });
    }
    setColumns(cols);

    // Dynamic character mutation for matrix rain effect
    const interval = setInterval(() => {
      setColumns((prev) =>
        prev.map((col) => {
          const newChars = [...col.chars];
          const randIdx = Math.floor(Math.random() * newChars.length);
          newChars[randIdx] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          // Shift down
          const last = newChars.pop()!;
          newChars.unshift(last);
          return { ...col, chars: newChars };
        })
      );
    }, 90);

    return () => clearInterval(interval);
  }, []);

  // Animations & sequence
  useEffect(() => {
    // 1. Logo entrance
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Pulse effect on glowing badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Cyber Progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration - 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // Status text transitions
    const t1 = setTimeout(() => setStatusText('CONECTANDO AL SERVIDOR VPS...'), 700);
    const t2 = setTimeout(() => setStatusText('SINCRONIZANDO EDICIÓN DIGITAL...'), 1400);

    // 4. Fade out loading screen
    const finishTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, duration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(finishTimer);
    };
  }, [duration, fadeAnim, logoOpacity, logoScale, onFinish, progressAnim, pulseAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="auto">
      {/* Matrix rain background */}
      <View style={styles.rainBackground}>
        {columns.map((col) => (
          <View key={col.id} style={[styles.matrixColumn, { left: col.x }]}>
            {col.chars.map((char, index) => {
              const isLead = index === 0;
              const opacity = isLead ? 1 : Math.max(0.08, 0.7 - index * 0.05);
              return (
                <Text
                  key={index}
                  style={[
                    styles.matrixChar,
                    {
                      opacity,
                      color: isLead ? '#E6FFFA' : index < 3 ? '#10B981' : '#059669',
                      fontWeight: isLead ? '800' : '500',
                      textShadowColor: isLead ? '#10B981' : 'transparent',
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: isLead ? 8 : 0,
                    },
                  ]}
                >
                  {char}
                </Text>
              );
            })}
          </View>
        ))}
      </View>

      {/* Cyber overlay vignette */}
      <View style={styles.vignetteOverlay} />

      {/* Center content with logo 2.png */}
      <View style={styles.centerCard}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('@/assets/images/logo_2.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Status text */}
        <View style={styles.statusRow}>
          <Animated.View style={[styles.statusDot, { opacity: pulseAnim }]} />
          <Text style={styles.statusLabel}>{statusText}</Text>
        </View>

        {/* Cyberpunk loading bar */}
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>

        <Text style={styles.tagline}>PERIODISMO DIGITAL INDEPENDIENTE</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#050811',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rainBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    opacity: 0.85,
  },
  matrixColumn: {
    position: 'absolute',
    top: -20,
    width: 20,
    flexDirection: 'column',
  },
  matrixChar: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  vignetteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 8, 17, 0.72)',
  },
  centerCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 360,
    width: '90%',
  },
  logoContainer: {
    width: width * 0.72,
    maxWidth: 290,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  statusLabel: {
    color: '#34D399',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  tagline: {
    color: '#6EE7B7',
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    opacity: 0.75,
  },
});
