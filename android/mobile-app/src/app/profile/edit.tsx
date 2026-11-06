
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { Brand, Palette, Radius, Spacing } from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';

export default function EditProfileScreen() {
  const { user, updateProfile, refreshProfile } = useAuth();
  const isKYCVerified = !!user?.is_verified;

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [gender, setGender] = useState(user?.gender || 'Laki-laki');
  const [birthDate, setBirthDate] = useState(user?.birth_date || '');
  const [identityNumber, setIdentityNumber] = useState(user?.identity_number || '');
  const [address, setAddress] = useState(user?.address || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergency_contact || '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setGender(user.gender || 'Laki-laki');
      setBirthDate(user.birth_date || '');
      setIdentityNumber(user.identity_number || '');
      setAddress(user.address || '');
      setEmergencyContact(user.emergency_contact || '');
    }
  }, [user]);

  const handleSave = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!name.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        gender,
        birth_date: birthDate.trim(),
        identity_number: identityNumber.trim(),
        address: address.trim(),
        emergency_contact: emergencyContact.trim(),
      });
      setSuccessMsg('Data profil berhasil diperbarui.');
      setTimeout(() => {
        router.back();
      }, 700);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        {/* Header App Bar */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-back"
            accessibilityLabel="Kembali"
            onPress={() => router.back()}
          />
          <DSText variant="headlineBase" style={styles.headerTitle}>
            Pengaturan Profil
          </DSText>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Banner Status KYC */}
          <View
            style={[
              styles.kycBanner,
              isKYCVerified ? styles.kycBannerVerified : styles.kycBannerUnverified,
            ]}>
            <Icon
              name={isKYCVerified ? 'verified-user' : 'info'}
              size={22}
              color={isKYCVerified ? Palette.primary : Palette.secondary}
            />
            <View style={styles.kycBannerText}>
              <DSText variant="labelMd" style={styles.kycTitle}>
                {isKYCVerified
                  ? 'Identitas Terverifikasi (KYC Disetujui)'
                  : 'Identitas Belum Terverifikasi KYC'}
              </DSText>
              <DSText variant="labelSm" color={Palette.secondary}>
                {isKYCVerified
                  ? 'Nama, Jenis Kelamin, Tanggal Lahir, dan NIK KTP telah dikunci sesuai dokumen resmi dan tidak dapat diubah.'
                  : 'Anda masih dapat melengkapi data identitas sebelum diverifikasi.'}
              </DSText>
            </View>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <DSText variant="labelSm" color={Palette.error}>
                {errorMsg}
              </DSText>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBox}>
              <DSText variant="labelSm" color={Palette.primary}>
                {successMsg}
              </DSText>
            </View>
          ) : null}

          <View style={styles.form}>
            {/* Bagian 1: Identitas Resmi (Dikunci bila sudah KYC) */}
            <DSText variant="headlineSm" style={styles.sectionHeading}>
              Data Identitas Resmi (KYC)
            </DSText>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <DSText variant="labelMd" style={styles.label}>
                  Nama Lengkap (Sesuai KTP)
                </DSText>
                {isKYCVerified ? <Icon name="lock" size={14} color={Palette.secondary} /> : null}
              </View>
              <TextInput
                style={[styles.input, isKYCVerified && styles.disabledInput]}
                placeholder="Nama lengkap Anda"
                placeholderTextColor={Palette.secondary}
                value={name}
                onChangeText={setName}
                editable={!isKYCVerified}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <DSText variant="labelMd" style={styles.label}>
                  Nomor Induk Kependudukan (NIK KTP)
                </DSText>
                {isKYCVerified ? <Icon name="lock" size={14} color={Palette.secondary} /> : null}
              </View>
              <TextInput
                style={[styles.input, isKYCVerified && styles.disabledInput]}
                placeholder="16 digit NIK KTP"
                placeholderTextColor={Palette.secondary}
                keyboardType="number-pad"
                value={identityNumber}
                onChangeText={setIdentityNumber}
                editable={!isKYCVerified}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <DSText variant="labelMd" style={styles.label}>
                  Jenis Kelamin
                </DSText>
                {isKYCVerified ? <Icon name="lock" size={14} color={Palette.secondary} /> : null}
              </View>
              <View style={styles.genderRow}>
                {['Laki-laki', 'Perempuan'].map((opt) => {
                  const active = gender === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      disabled={isKYCVerified}
                      onPress={() => setGender(opt)}
                      style={[
                        styles.genderChip,
                        active && styles.genderChipActive,
                        isKYCVerified && styles.disabledChip,
                      ]}>
                      <DSText
                        variant="labelMd"
                        color={active ? Brand.ink : Palette.secondary}
                        style={active && styles.genderTextActive}>
                        {opt}
                      </DSText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <DSText variant="labelMd" style={styles.label}>
                  Tanggal Lahir (YYYY-MM-DD)
                </DSText>
                {isKYCVerified ? <Icon name="lock" size={14} color={Palette.secondary} /> : null}
              </View>
              <TextInput
                style={[styles.input, isKYCVerified && styles.disabledInput]}
                placeholder="1998-05-14"
                placeholderTextColor={Palette.secondary}
                value={birthDate}
                onChangeText={setBirthDate}
                editable={!isKYCVerified}
              />
            </View>

            {/* Bagian 2: Kontak & Domisili */}
            <DSText variant="headlineSm" style={styles.sectionHeading}>
              Kontak & Domisili
            </DSText>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <DSText variant="labelMd" style={styles.label}>
                  Alamat Email Terdaftar
                </DSText>
                <Icon name="lock" size={14} color={Palette.secondary} />
              </View>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={user?.email || ''}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <DSText variant="labelMd" style={styles.label}>
                Nomor Telepon / WhatsApp Aktif
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
                Kontak Darurat (Keluarga / Kerabat)
              </DSText>
              <TextInput
                style={styles.input}
                placeholder="Nomor HP darurat"
                placeholderTextColor={Palette.secondary}
                keyboardType="phone-pad"
                value={emergencyContact}
                onChangeText={setEmergencyContact}
              />
            </View>

            <View style={styles.inputGroup}>
              <DSText variant="labelMd" style={styles.label}>
                Alamat Domisili Saat Ini
              </DSText>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                placeholder="Nama jalan, nomor rumah, kecamatan, kota..."
                placeholderTextColor={Palette.secondary}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <Button
              label={loading ? 'Menyimpan...' : 'Simpan Pengaturan Profil'}
              variant="primary"
              size="lg"
              disabled={loading}
              onPress={handleSave}
              style={styles.submitBtn}
            />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.edgeMargin,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.surfaceVariant,
    backgroundColor: Palette.surfaceContainerLowest,
  },
  headerTitle: {
    fontWeight: '700',
  },
  spacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  kycBannerVerified: {
    backgroundColor: Brand.ctaAction + '25',
    borderColor: Brand.ctaAction,
  },
  kycBannerUnverified: {
    backgroundColor: Palette.surfaceContainer,
    borderColor: Palette.surfaceVariant,
  },
  kycBannerText: {
    flex: 1,
    gap: 2,
  },
  kycTitle: {
    fontWeight: '700',
  },
  form: {
    gap: Spacing.md,
  },
  sectionHeading: {
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: Radius.base,
    backgroundColor: Palette.errorContainer,
    borderWidth: 1,
    borderColor: Palette.error,
  },
  successBox: {
    padding: Spacing.md,
    borderRadius: Radius.base,
    backgroundColor: Palette.primaryContainer,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  disabledInput: {
    backgroundColor: Palette.surfaceContainer,
    color: Palette.secondary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  genderChip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.surfaceContainerHigh,
    backgroundColor: Palette.surfaceContainerLowest,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: Brand.ctaAction,
    borderColor: Brand.ctaAction,
  },
  disabledChip: {
    opacity: 0.7,
  },
  genderTextActive: {
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: Spacing.md,
  },
});
