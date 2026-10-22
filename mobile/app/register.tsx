import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { ArrowLeft, User, Mail, Lock, Calendar, CheckSquare, Square } from 'lucide-react-native';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { register } = useAuth();
  const { toast } = useNotification();
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      toast.warning('Campos requeridos', 'Por favor completa todos los campos.');
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (!age || isNaN(parsedAge) || parsedAge < 14) {
      toast.warning('Edad requerida', 'Debes ingresar una edad válida (mínimo 14 años).');
      return;
    }

    if (!termsAccepted) {
      toast.warning('Términos requeridos', 'Debes aceptar los Términos y Condiciones y la Política de Privacidad.');
      return;
    }

    if (password.length < 8) {
      toast.warning('Contraseña débil', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.warning('Contraseñas no coinciden', 'La confirmación no coincide con la contraseña.');
      return;
    }

    setLoading(true);
    const result = await register(name, email, password, parsedAge);
    setLoading(false);

    if (result.success) {
      toast.success('Cuenta Creada', '¡Bienvenido a Hackeando El Sistema!');
      if (redirect) {
        router.replace(redirect as any);
      } else {
        router.back();
      }
    } else {
      toast.error('Error de registro', result.error || 'No se pudo crear la cuenta.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Crear Cuenta</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Nombre o Empresa</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <User size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Tu Nombre o Razón Social"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Edad (Años)</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Ej. 25"
              placeholderTextColor={colors.textMuted}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Correo Electrónico</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Mail size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="tuemail@dominio.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Contraseña (mínimo 8 caracteres)</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Lock size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Confirmar Contraseña</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Lock size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          {/* Términos y Condiciones + Responsabilidad de Imágenes */}
          <TouchableOpacity
            style={[styles.termsRow, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.8}
          >
            {termsAccepted ? (
              <CheckSquare size={20} color={colors.primary} style={{ marginRight: 10 }} />
            ) : (
              <Square size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
            )}
            <Text style={[styles.termsText, { color: colors.text }]}>
              Acepto los{' '}
              <Text
                style={{ color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL('https://hackeandoelsistema.net/terminos-de-uso')}
              >
                Términos
              </Text>{' '}
              y la{' '}
              <Text
                style={{ color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL('https://hackeandoelsistema.net/politica-de-privacidad')}
              >
                Privacidad
              </Text>
              . Las imágenes y registros que publique son bajo mi exclusiva responsabilidad.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Registrarme</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace(redirect ? { pathname: '/login', params: { redirect } } as any : '/login')}
            activeOpacity={0.7}
          >
            <Text style={[styles.loginText, { color: colors.textMuted }]}>
              ¿Ya tienes cuenta? <Text style={{ color: colors.primary, fontWeight: '800' }}>Inicia sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  form: {
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  submitBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 13,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
