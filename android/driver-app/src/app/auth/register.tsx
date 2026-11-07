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

export default function DriverRegisterScreen() {
  const router = useRouter();
  const { registerDriver, updateDriverProfile, driver } = useDriver();

  const [role, setRole] = useState<'driver_motorcycle' | 'driver_car'>('driver_motorcycle');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    setErrorMsg('');
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setErrorMsg('Nama lengkap, email, nomor WhatsApp, dan kata sandi wajib diisi.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Kata sandi wajib minimal 8 karakter.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerDriver(name.trim(), email.trim(), phone.trim(), password, role);
      if (!res.success) {
        setErrorMsg(res.error || 'Pendaftaran gagal. Email atau nomor telepon mungkin sudah terdaftar.');
      } else {
        if (plateNumber.trim()) {
          updateDriverProfile({
            vehicle: {
              ...driver.vehicle,
              type: role === 'driver_car' ? 'car' : 'motorcycle',
              plateNumber: plateNumber.trim().toUpperCase(),
            },
          });
        }
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi gangguan jaringan saat mendaftarkan akun.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Pendaftaran Mitra Driver</Text>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>TAHAP 1/2</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Headline */}
          <View style={styles.headerSection}>
            <Text style={styles.headline}>Gabung Mitra UmfaGo</Text>
            <Text style={styles.subtitle}>
              Pilih jenis armada Anda dan lengkapi data diri untuk mulai menerima order harian dengan komisi transparan.
            </Text>
          </View>

          {/* Vehicle Role Selector */}
          <View style={styles.roleSection}>
            <Text style={styles.sectionLabel}>PILIH JENIS ARMADA</Text>
            <View style={styles.roleCardsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setRole('driver_motorcycle')}
                style={[
                  styles.roleCard,
                  role === 'driver_motorcycle' && styles.roleCardSelected,
                ]}
              >
                <View style={styles.roleCardHeader}>
                  <View
                    style={[
                      styles.roleIconBox,
                      role === 'driver_motorcycle' && styles.roleIconBoxSelected,
                    ]}
                  >
                    <FontAwesome5
                      name="motorcycle"
                      size={18}
                      color={role === 'driver_motorcycle' ? colors.black : colors.onSurface}
                    />
                  </View>
                  {role === 'driver_motorcycle' && (
                    <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.roleCardTitle}>Mitra Motor</Text>
                <Text style={styles.roleCardDesc}>Ojek Ride, Food & Kurir Kilat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setRole('driver_car')}
                style={[
                  styles.roleCard,
                  role === 'driver_car' && styles.roleCardSelected,
                ]}
              >
                <View style={styles.roleCardHeader}>
                  <View
                    style={[
                      styles.roleIconBox,
                      role === 'driver_car' && styles.roleIconBoxSelected,
                    ]}
                  >
                    <Ionicons
                      name="car-sport"
                      size={20}
                      color={role === 'driver_car' ? colors.black : colors.onSurface}
                    />
                  </View>
                  {role === 'driver_car' && (
                    <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.roleCardTitle}>Mitra Mobil</Text>
                <Text style={styles.roleCardDesc}>UmfaCar 4-6 Penumpang</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Card (Level 1 Elevated Surface #1F2020) */}
          <View style={styles.formCard}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NAMA LENGKAP SESUAI KTP</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'name' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={focusedField === 'name' ? colors.primary : colors.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Budi Santoso"
                  placeholderTextColor="#8E9479"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ALAMAT EMAIL AKTIF</Text>
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
                  placeholder="nama.driver@email.com"
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

            {/* Phone / WhatsApp */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NOMOR HANDPHONE (WHATSAPP)</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'phone' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={focusedField === 'phone' ? colors.primary : colors.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="081234567890"
                  placeholderTextColor="#8E9479"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Vehicle Plate Number */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>NOMOR PLAT KENDARAAN</Text>
                <Text style={styles.optionalTag}>OPSIONAL</Text>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'plate' && styles.inputWrapperFocused,
                ]}
              >
                <MaterialIcons
                  name="pin"
                  size={18}
                  color={focusedField === 'plate' ? colors.primary : colors.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: B 4821 TXR"
                  placeholderTextColor="#8E9479"
                  autoCapitalize="characters"
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  onFocus={() => setFocusedField('plate')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>BUAT KATA SANDI</Text>
                <Text style={styles.optionalTag}>MIN. 8 KARAKTER</Text>
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
                  placeholder="Minimal 8 karakter"
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

            {/* Info Banner KYC */}
            <View style={styles.kycNoteBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={styles.kycNoteText}>
                Setelah akun aktif, Anda dapat mengunggah foto KTP, SIM & STNK di menu Verifikasi KYC.
              </Text>
            </View>

            {/* Primary CTA Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              onPress={handleRegister}
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Daftar Sekarang</Text>
                  <Ionicons name="checkmark-circle" size={18} color={colors.black} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Link to Login */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Sudah memiliki akun Mitra Driver?</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.footerLink}>Masuk di sini</Text>
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
  topBar: {
    height: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: rounded.xs,
    backgroundColor: '#1F2020',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  stepPill: {
    backgroundColor: '#252B14',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.md,
  },
  stepPillText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 44,
    gap: spacing.xl,
  },
  headerSection: {
    gap: 6,
  },
  headline: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#C8C6C5',
    fontSize: 14,
    lineHeight: 20,
  },
  roleSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.6,
  },
  roleCardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#1F2020',
    borderWidth: 1.5,
    borderColor: '#3D3D3D',
    borderRadius: rounded.sm,
    padding: spacing.md,
    gap: 6,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#222815',
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  roleIconBox: {
    width: 38,
    height: 38,
    borderRadius: rounded.xs,
    backgroundColor: '#2D2D2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBoxSelected: {
    backgroundColor: colors.primary,
  },
  roleCardTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  roleCardDesc: {
    color: '#8E9479',
    fontSize: 11,
    lineHeight: 15,
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
  optionalTag: {
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
  kycNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#1B1C1C',
    borderWidth: 1,
    borderColor: '#333824',
    padding: spacing.md,
    borderRadius: rounded.xs,
  },
  kycNoteText: {
    flex: 1,
    color: '#C4CAAC',
    fontSize: 11,
    lineHeight: 16,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  footerText: {
    color: '#C8C6C5',
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

