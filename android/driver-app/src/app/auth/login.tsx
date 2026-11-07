import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { colors, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';

export default function DriverLoginScreen() {
  const router = useRouter();
  const { loginDriver } = useDriver();

  const [email, setEmail] = useState('driver.motor@openjek.id');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Alamat email dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginDriver(email.trim(), password);
      if (!res.success) {
        setErrorMsg(res.error || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi gangguan jaringan saat menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMsg('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand & Role Badge */}
          <View style={styles.headerSection}>
            <View style={styles.brandBadgeRow}>
              <View style={styles.logoBox}>
                <FontAwesome5 name="motorcycle" size={24} color={colors.black} />
              </View>
              <View style={styles.roleChip}>
                <View style={styles.roleDot} />
                <Text style={styles.roleChipText}>MITRA DRIVER</Text>
              </View>
            </View>

            <Text style={styles.headline}>Masuk Akun Driver</Text>
            <Text style={styles.subtitle}>
              Masuk ke kokpit operasional UmfaGo untuk mulai menerima order perjalanan dan memantau pendapatan.
            </Text>
          </View>

          {/* Main Login Card (Level 1 Elevated Surface #2D2D2D / #1F2020) */}
          <View style={styles.formCard}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL MITRA TERDAFTAR</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focusedField === 'email' ? colors.primary : colors.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="driver.motor@openjek.id"
                  placeholderTextColor="#8E9479"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>KATA SANDI</Text>
                <Text style={styles.securityTag}>TERENKRIPSI</Text>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === 'password' ? colors.primary : colors.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan kata sandi"
                  placeholderTextColor="#8E9479"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary CTA Button (Lime Green #C8FF00, Black Text #000000) */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              onPress={handleLogin}
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Masuk Sekarang</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.black} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Demo Accounts (Database Seeded Accounts) */}
          <View style={styles.demoSection}>
            <View style={styles.demoHeaderRow}>
              <MaterialIcons name="verified-user" size={15} color={colors.primary} />
              <Text style={styles.demoSectionLabel}>AKUN UJI DATABASE (KLIK UNTUK ISI)</Text>
            </View>

            <View style={styles.demoGrid}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => fillDemoAccount('driver.motor@openjek.id')}
                style={[
                  styles.demoChip,
                  email === 'driver.motor@openjek.id' && styles.demoChipActive,
                ]}
              >
                <View style={styles.demoChipTop}>
                  <FontAwesome5
                    name="motorcycle"
                    size={13}
                    color={email === 'driver.motor@openjek.id' ? colors.primary : colors.onSurface}
                  />
                  <Text style={styles.demoRoleTitle}>Mitra Motor</Text>
                </View>
                <Text style={styles.demoEmailText} numberOfLines={1}>
                  driver.motor@openjek.id
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => fillDemoAccount('driver.mobil@openjek.id')}
                style={[
                  styles.demoChip,
                  email === 'driver.mobil@openjek.id' && styles.demoChipActive,
                ]}
              >
                <View style={styles.demoChipTop}>
                  <Ionicons
                    name="car-sport"
                    size={15}
                    color={email === 'driver.mobil@openjek.id' ? colors.primary : colors.onSurface}
                  />
                  <Text style={styles.demoRoleTitle}>Mitra Mobil</Text>
                </View>
                <Text style={styles.demoEmailText} numberOfLines={1}>
                  driver.mobil@openjek.id
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Secondary Action: Register New Driver */}
          <View style={styles.registerCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.registerTitle}>Belum jadi Mitra Driver?</Text>
              <Text style={styles.registerSub}>
                Daftar mandiri sebagai pengemudi motor atau mobil dalam 2 menit.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/auth/register')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Daftar</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.primary} />
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
    backgroundColor: '#131313',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 40,
    gap: spacing.xl,
  },
  headerSection: {
    gap: spacing.sm,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: rounded.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F2020',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.md,
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  roleChipText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.8,
  },
  headline: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: '#C8C6C5',
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#1F2020',
    borderRadius: rounded.sm,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    gap: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing.md,
    borderRadius: rounded.xs,
  },
  errorText: {
    flex: 1,
    color: '#FFDAD6',
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.6,
  },
  securityTag: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#2D2D2D',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: rounded.xs,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: '#262825',
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
  },
  eyeButton: {
    padding: 4,
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: rounded.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.black,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  demoSection: {
    backgroundColor: '#1B1C1C',
    borderRadius: rounded.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    gap: spacing.md,
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoSectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  demoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  demoChip: {
    flex: 1,
    backgroundColor: '#2D2D2D',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: rounded.xs,
    padding: spacing.md,
    gap: 4,
  },
  demoChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#252B14',
  },
  demoChipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoRoleTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  demoEmailText: {
    color: '#C8C6C5',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  registerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: '#1F2020',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: rounded.sm,
    padding: spacing.lg,
  },
  registerTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  registerSub: {
    color: '#8E9479',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: rounded.xs,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});

