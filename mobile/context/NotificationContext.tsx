import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  HelpCircle,
} from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ModalButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'primary';
}

export interface ModalConfig {
  title: string;
  message: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
  buttons?: ModalButton[];
}

interface NotificationContextType {
  showToast: (config: ToastConfig) => void;
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
  showModal: (config: ModalConfig) => void;
  hideModal: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Toast state
  const [toastData, setToastData] = useState<ToastConfig | null>(null);
  const toastAnim = useRef(new Animated.Value(-120)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal dialog state
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(toastAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastData(null);
    });
  }, [toastAnim, toastOpacity]);

  const showToast = useCallback(
    ({ type = 'info', title, message, duration = 3500 }: ToastConfig) => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      setToastData({ type, title, message, duration });

      Animated.parallel([
        Animated.spring(toastAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 9,
        }),
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      toastTimeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [toastAnim, toastOpacity, hideToast]
  );

  const toast = {
    success: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'info', title, message, duration }),
  };

  const showModal = useCallback((config: ModalConfig) => {
    setModalConfig(config);
  }, []);

  const hideModal = useCallback(() => {
    setModalConfig(null);
  }, []);

  // Helper colors and icons for toast
  const getToastColors = (type?: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: isDark ? '#064E3B' : '#ECFDF5',
          border: '#10B981',
          accent: '#10B981',
          iconBg: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
        };
      case 'error':
        return {
          bg: isDark ? '#450A0A' : '#FEF2F2',
          border: '#EF4444',
          accent: '#EF4444',
          iconBg: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
        };
      case 'warning':
        return {
          bg: isDark ? '#451A03' : '#FFFBEB',
          border: '#F59E0B',
          accent: '#F59E0B',
          iconBg: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
        };
      case 'info':
      default:
        return {
          bg: isDark ? '#1E293B' : '#EFF6FF',
          border: '#3B82F6',
          accent: '#3B82F6',
          iconBg: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
        };
    }
  };

  const renderToastIcon = (type?: ToastType, color: string = '#10B981') => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} color={color} />;
      case 'error':
        return <XCircle size={20} color={color} />;
      case 'warning':
        return <AlertTriangle size={20} color={color} />;
      case 'info':
      default:
        return <Info size={20} color={color} />;
    }
  };

  const renderModalIcon = (icon?: ModalConfig['icon']) => {
    switch (icon) {
      case 'success':
        return (
          <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <CheckCircle2 size={30} color="#10B981" />
          </View>
        );
      case 'error':
        return (
          <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <XCircle size={30} color="#EF4444" />
          </View>
        );
      case 'warning':
        return (
          <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <AlertTriangle size={30} color="#F59E0B" />
          </View>
        );
      case 'question':
        return (
          <View style={[styles.modalIconCircle, { backgroundColor: colors.primary + '18' }]}>
            <HelpCircle size={30} color={colors.primary} />
          </View>
        );
      case 'info':
      default:
        return (
          <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Info size={30} color="#3B82F6" />
          </View>
        );
    }
  };

  const toastStyle = toastData ? getToastColors(toastData.type) : null;

  return (
    <NotificationContext.Provider value={{ showToast, toast, showModal, hideModal }}>
      {children}

      {/* Modern Floating Toast Notification */}
      {toastData && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: Math.max(insets.top + 10, 20),
              transform: [{ translateY: toastAnim }],
              opacity: toastOpacity,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hideToast}
            style={[
              styles.toastContent,
              {
                backgroundColor: toastStyle?.bg,
                borderColor: toastStyle?.border,
              },
            ]}
          >
            <View style={[styles.toastIconBox, { backgroundColor: toastStyle?.iconBg }]}>
              {renderToastIcon(toastData.type, toastStyle?.accent)}
            </View>

            <View style={styles.toastTextBox}>
              <Text
                style={[
                  styles.toastTitle,
                  { color: isDark ? '#FFFFFF' : '#111827' },
                ]}
                numberOfLines={1}
              >
                {toastData.title}
              </Text>
              {toastData.message ? (
                <Text
                  style={[
                    styles.toastMessage,
                    { color: isDark ? 'rgba(255, 255, 255, 0.8)' : '#4B5563' },
                  ]}
                  numberOfLines={2}
                >
                  {toastData.message}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity style={styles.toastCloseBtn} onPress={hideToast} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={isDark ? 'rgba(255,255,255,0.6)' : '#6B7280'} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Aesthetic Confirmation & Action Modal */}
      {modalConfig && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={hideModal}
        >
          <Pressable style={styles.modalBackdrop} onPress={hideModal}>
            <Pressable
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {renderModalIcon(modalConfig.icon || 'question')}

              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {modalConfig.title}
              </Text>

              <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
                {modalConfig.message}
              </Text>

              <View style={styles.modalButtonsBox}>
                {(modalConfig.buttons || [{ text: 'Entendido', onPress: hideModal }]).map(
                  (btn, idx) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';
                    const isPrimary = btn.style === 'primary' || (!isCancel && !isDestructive && idx === 0);

                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.8}
                        style={[
                          styles.modalBtn,
                          isCancel && [styles.modalBtnCancel, { borderColor: colors.border }],
                          isDestructive && [styles.modalBtnDestructive],
                          isPrimary && [styles.modalBtnPrimary, { backgroundColor: colors.primary }],
                          !isCancel && !isDestructive && !isPrimary && [
                            styles.modalBtnSecondary,
                            { backgroundColor: colors.inputBackground, borderColor: colors.border },
                          ],
                        ]}
                        onPress={() => {
                          hideModal();
                          if (btn.onPress) btn.onPress();
                        }}
                      >
                        <Text
                          style={[
                            styles.modalBtnText,
                            isCancel && { color: colors.textMuted },
                            isDestructive && { color: '#FFFFFF', fontWeight: 'bold' },
                            isPrimary && { color: '#FFFFFF', fontWeight: 'bold' },
                            !isCancel && !isDestructive && !isPrimary && { color: colors.text },
                          ]}
                        >
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  toastContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  toastIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastTextBox: {
    flex: 1,
    marginRight: 8,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  toastMessage: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 17,
  },
  toastCloseBtn: {
    padding: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: Math.min(width - 48, 400),
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 14,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtonsBox: {
    width: '100%',
    gap: 10,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimary: {
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  modalBtnSecondary: {
    borderWidth: 1,
  },
  modalBtnCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalBtnDestructive: {
    backgroundColor: '#DC2626',
  },
  modalBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
});
