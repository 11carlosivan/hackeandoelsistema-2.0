import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { ArrowLeft, User, Mail, Lock } from 'lucide-react-native';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { register } = useAuth();
  const { toast } = useNotification();
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      toast.warning('Campos requeridos', 'Por favor completa todos los campos.');
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
    const result = await register(name, email, password);
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
});
