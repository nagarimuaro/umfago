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

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    setErrorMsg('');
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setErrorMsg('Semua kolom wajib diisi.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Kata sandi minimal 8 karakter.');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, phone, password);
      router.replace('/(tabs)');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Pendaftaran gagal');
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
              Daftar Penumpang Baru
            </DSText>
            <DSText variant="bodyMd" color={Palette.secondary}>
              Pendaftaran khusus akun Pengguna / Penumpang
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
                Nama Lengkap
              </DSText>
              <TextInput
                style={styles.input}
                placeholder="Ahmad Fauzi"
                placeholderTextColor={Palette.secondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <DSText variant="labelMd" style={styles.label}>
                Alamat Email
              </DSText>
              <TextInput
                style={styles.input}
                placeholder="nama@email.com"
                placeholderTextColor={Palette.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <DSText variant="labelMd" style={styles.label}>
                Nomor Handphone (WhatsApp)
              </DSText>
              <TextInput
                style={styles.input}
                placeholder="081234567890"
                placeholderTextColor={Palette.secondary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <DSText variant="labelMd" style={styles.label}>
                Kata Sandi (min. 8 karakter)
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
              label={loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
              variant="primary"
              size="lg"
              disabled={loading}
              onPress={handleRegister}
              style={styles.submitBtn}
            />
          </View>

          {/* Footer Nav */}
          <View style={styles.footer}>
            <DSText variant="bodyMd" color={Palette.secondary}>
              Sudah punya akun?
            </DSText>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <DSText variant="bodyMd" style={styles.loginLink}>
                Masuk di sini
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  loginLink: {
    color: Palette.primary,
    fontWeight: '700',
  },
});
