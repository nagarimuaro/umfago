import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ds/button';
import { DSText } from '@/components/ds/ds-text';
import { Brand, Palette, Radius, Spacing } from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('penumpang@openjek.id');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Email dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <DSText variant="headlineLg" color={Brand.ink}>
                OJ
              </DSText>
            </View>
            <DSText variant="headlineLg" style={styles.title}>
              Masuk UmfaGo
            </DSText>
            <DSText variant="bodyMd" color={Palette.secondary}>
              {/* Khusus akun Pengguna / Penumpang OpenJek */}
            </DSText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <DSText variant="labelSm" color={Palette.error}>
                  {errorMsg}
                </DSText>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <DSText variant="labelMd" style={styles.label}>
                Email Terdaftar
              </DSText>
              <TextInput
                style={styles.input}
                placeholder="penumpang@openjek.id"
                placeholderTextColor={Palette.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <DSText variant="labelMd" style={styles.label}>
                Kata Sandi
              </DSText>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Palette.secondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Button
              label={loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
              variant="primary"
              size="lg"
              disabled={loading}
              onPress={handleLogin}
              style={styles.submitBtn}
            />
          </View>

          {/* Quick Demo Fill */}
          <View style={styles.demoCard}>
            <DSText variant="labelSm" color={Palette.secondary}>
              Akun Uji Database:
            </DSText>
            <TouchableOpacity
              onPress={() => {
                setEmail('penumpang@openjek.id');
                setPassword('password123');
              }}>
              <DSText variant="bodySm" color={Palette.primary} style={styles.demoLink}>
                Gunakan Penumpang Demo (penumpang@openjek.id)
              </DSText>
            </TouchableOpacity>
          </View>

          {/* Footer Nav */}
          <View style={styles.footer}>
            <DSText variant="bodyMd" color={Palette.secondary}>
              Belum punya akun?
            </DSText>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <DSText variant="bodyMd" style={styles.registerLink}>
                Daftar baru
              </DSText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.surface,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Brand.ctaAction,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontWeight: '800',
  },
  form: {
    gap: Spacing.md,
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: Radius.base,
    backgroundColor: Palette.errorContainer,
    borderWidth: 1,
    borderColor: Palette.error,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    color: Palette.onSurface,
  },
  input: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Palette.surfaceContainerHigh,
    color: Palette.onSurface,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
  demoCard: {
    padding: Spacing.md,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  demoLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  registerLink: {
    color: Palette.primary,
    fontWeight: '700',
  },
});
