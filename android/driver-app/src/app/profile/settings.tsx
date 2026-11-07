import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors, rounded, spacing } from '../../constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [navApp, setNavApp] = useState<'google' | 'waze'>('google');
  const [autoAccept, setAutoAccept] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [vibration, setVibration] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan Aplikasi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Navigation App Preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APLIKASI NAVIGASI UTAMA</Text>
          <View style={styles.choiceGroup}>
            {/* Google Maps */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setNavApp('google')}
              style={[styles.choiceItem, navApp === 'google' && styles.choiceItemActive]}
            >
              <View style={styles.choiceLeft}>
                <Ionicons name="map-outline" size={20} color={navApp === 'google' ? colors.primary : colors.textSecondary} />
                <View>
                  <Text style={styles.choiceTitle}>Google Maps</Text>
                  <Text style={styles.choiceSub}>Rute standar & estimasi lalu lintas real-time</Text>
                </View>
              </View>
              <Ionicons
                name={navApp === 'google' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={navApp === 'google' ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Waze */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setNavApp('waze')}
              style={[styles.choiceItem, navApp === 'waze' && styles.choiceItemActive]}
            >
              <View style={styles.choiceLeft}>
                <Ionicons name="navigate-outline" size={20} color={navApp === 'waze' ? colors.primary : colors.textSecondary} />
                <View>
                  <Text style={styles.choiceTitle}>Waze Navigation</Text>
                  <Text style={styles.choiceSub}>Peringatan kamera tilang & polisi aktif</Text>
                </View>
              </View>
              <Ionicons
                name={navApp === 'waze' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={navApp === 'waze' ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dispatch Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OTOMATISASI PENERIMAAN ORDER</Text>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={styles.toggleTitle}>Terima Order Otomatis (Auto-Accept)</Text>
              <Text style={styles.toggleSub}>
                Otomatis menerima tawaran order terdekat tanpa perlu menekan tombol konfirmasi.
              </Text>
            </View>
            <Switch
              value={autoAccept}
              onValueChange={setAutoAccept}
              trackColor={{ false: colors.surfaceHigh, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Audio & Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PEMBERITAHUAN & NOTIFIKASI</Text>
          <View style={styles.toggleGroup}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Bunyi Alarm Order Keras</Text>
                <Text style={styles.toggleSub}>Suara audio volume maksimal saat ada order masuk</Text>
              </View>
              <Switch
                value={soundAlerts}
                onValueChange={setSoundAlerts}
                trackColor={{ false: colors.surfaceHigh, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Getaran Berulang (Vibrate)</Text>
                <Text style={styles.toggleSub}>Getar kuat agar terasa di saku celana saat berkendara</Text>
              </View>
              <Switch
                value={vibration}
                onValueChange={setVibration}
                trackColor={{ false: colors.surfaceHigh, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#131313',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: '#131313',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  choiceGroup: {
    gap: spacing.sm,
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2020',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  choiceItemActive: {
    borderColor: colors.primary,
    backgroundColor: '#1E2319',
  },
  choiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  choiceTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  choiceSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  toggleGroup: {
    backgroundColor: '#1F2020',
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2020',
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  toggleTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
});

