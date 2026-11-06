import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ds/button';
import { Card } from '@/components/ds/card';
import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { IconButton } from '@/components/ds/icon-button';
import { Brand, Palette, Radius, Spacing } from '@/constants/design-system';
import { useAuth } from '@/hooks/use-auth';
import { ENV } from '@/constants/env';

const BACKEND_URL = ENV.API_URL;

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  note: string;
  icon: 'home' | 'work' | 'location-on';
}

const INITIAL_ADDRESSES: SavedAddress[] = [
  {
    id: '1',
    label: 'Rumah',
    address: 'Jl. Sudirman No. 45, Padang Barat, Kota Padang',
    note: 'Pagar warna hitam samping toko buku',
    icon: 'home',
  },
  {
    id: '2',
    label: 'Kantor / Tempat Kerja',
    address: 'Plaza Andalas Lantai 3, Jl. Pemuda No. 1, Padang',
    note: 'Lobby timur',
    icon: 'work',
  },
];

export default function SavedAddressesScreen() {
  const { token } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>(INITIAL_ADDRESSES);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAddresses = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/user/addresses`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.addresses) && data.addresses.length > 0) {
        setAddresses(
          data.addresses.map((a: any) => ({
            id: String(a.id),
            label: a.label,
            address: a.address,
            note: a.note || '',
            icon: a.icon === 'home' || a.icon === 'work' ? a.icon : 'location-on',
          })),
        );
      }
    } catch {
      // Fallback ke local
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleAdd = async () => {
    if (!label.trim() || !address.trim()) {
      Alert.alert('Perhatian', 'Label dan alamat lengkap wajib diisi.');
      return;
    }

    const trimmedLabel = label.trim();
    const trimmedAddress = address.trim();
    const trimmedNote = note.trim();
    const iconType =
      trimmedLabel.toLowerCase().includes('rumah')
        ? 'home'
        : trimmedLabel.toLowerCase().includes('kantor') || trimmedLabel.toLowerCase().includes('kerja')
        ? 'work'
        : 'location-on';

    setSaving(true);
    try {
      if (token) {
        const res = await fetch(`${BACKEND_URL}/api/user/addresses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            label: trimmedLabel,
            address: trimmedAddress,
            note: trimmedNote,
            icon: iconType,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          const created = resData.address;
          if (created) {
            setAddresses((prev) => [
              {
                id: String(created.id),
                label: created.label,
                address: created.address,
                note: created.note || '',
                icon: iconType,
              },
              ...prev,
            ]);
            setLabel('');
            setAddress('');
            setNote('');
            setModalOpen(false);
            return;
          }
        }
      }

      // Offline / fallback save
      const newItem: SavedAddress = {
        id: Date.now().toString(),
        label: trimmedLabel,
        address: trimmedAddress,
        note: trimmedNote,
        icon: iconType,
      };
      setAddresses((prev) => [newItem, ...prev]);
      setLabel('');
      setAddress('');
      setNote('');
      setModalOpen(false);
    } catch {
      Alert.alert('Gagal Menyimpan', 'Terjadi gangguan saat menyimpan ke server.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Hapus Alamat', 'Yakin ingin menghapus alamat tersimpan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setAddresses((prev) => prev.filter((a) => a.id !== id));
          if (token) {
            try {
              await fetch(`${BACKEND_URL}/api/user/addresses/${id}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
            } catch {
              // Ignore
            }
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" accessibilityLabel="Kembali" onPress={() => router.back()} />
        <DSText variant="headlineBase" style={styles.headerTitle}>
          Alamat Tersimpan
        </DSText>
        <IconButton
          icon="add"
          accessibilityLabel="Tambah Alamat"
          onPress={() => setModalOpen(true)}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {addresses.length === 0 ? (
          <Card elevation="soft" padding="md" radius="xl">
            <DSText variant="bodyMd" color={Palette.secondary} style={styles.emptyText}>
              Belum ada alamat tersimpan.
            </DSText>
          </Card>
        ) : (
          <Card elevation="soft" padding="none" radius="xl">
            {addresses.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.addressRow, idx !== addresses.length - 1 && styles.divider]}>
                <View style={styles.addressIconBox}>
                  <Icon name={item.icon} size={22} color={Brand.ink} />
                </View>
                <View style={styles.addressInfo}>
                  <DSText variant="headlineBaseSemi">{item.label}</DSText>
                  <DSText variant="bodySm" color={Palette.onSurface} numberOfLines={2}>
                    {item.address}
                  </DSText>
                  {item.note ? (
                    <DSText variant="labelSm" color={Palette.secondary}>
                      Catatan: {item.note}
                    </DSText>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={12}>
                  <Icon name="delete" size={20} color={Palette.error} />
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}

        <Button
          label="+ Tambah Alamat Baru"
          variant="surface"
          size="lg"
          onPress={() => setModalOpen(true)}
          style={styles.addBtn}
        />
      </ScrollView>

      {/* Modal Tambah Alamat */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <DSText variant="headlineBase">Tambah Alamat Tersimpan</DSText>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Icon name="close" size={24} color={Palette.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <DSText variant="labelMd">Nama / Label Tempat</DSText>
              <TextInput
                style={styles.input}
                placeholder="Rumah, Kost, Kampus, dsb."
                placeholderTextColor={Palette.secondary}
                value={label}
                onChangeText={setLabel}
              />
            </View>

            <View style={styles.formGroup}>
              <DSText variant="labelMd">Alamat Lengkap</DSText>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan..."
                placeholderTextColor={Palette.secondary}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.formGroup}>
              <DSText variant="labelMd">Patokan / Catatan (Opsional)</DSText>
              <TextInput
                style={styles.input}
                placeholder="Warna pagar, dekat pos satpam, dll."
                placeholderTextColor={Palette.secondary}
                value={note}
                onChangeText={setNote}
              />
            </View>

            <Button
              label="Simpan Alamat"
              variant="primary"
              size="lg"
              onPress={handleAdd}
              style={styles.saveBtn}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.surface,
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
  content: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  addressIconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: Brand.ctaAction + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
    gap: 3,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.surfaceContainer,
  },
  emptyText: {
    textAlign: 'center',
  },
  addBtn: {
    borderWidth: 1,
    borderColor: Palette.surfaceVariant,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  formGroup: {
    gap: Spacing.xs,
  },
  input: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Palette.surfaceContainerHigh,
    color: Palette.onSurface,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: Spacing.sm,
  },
});
