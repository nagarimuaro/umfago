import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DSText } from '@/components/ds/ds-text';
import { ListRow } from '@/components/ds/list-row';
import { SectionHeader } from '@/components/home/section-header';
import { formatRupiah, SampleHistory, ServiceIcons, ServiceOptions } from '@/constants/booking';
import { Palette, Spacing } from '@/constants/design-system';
import type { TripStatus } from '@/types/order';

const StatusLabels: Partial<Record<TripStatus, string>> = {
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

/** `5 Agu, 08.14` — Indonesian short date plus 24-hour time, as the design draws it. */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActivityScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SectionHeader title="Riwayat" />

          {SampleHistory.length === 0 ? (
            <DSText variant="bodySm" color={Palette.secondary}>
              Belum ada perjalanan.
            </DSText>
          ) : (
            <View>
              {SampleHistory.map((order, index) => {
                const service = ServiceOptions.find((option) => option.id === order.service);
                const status = StatusLabels[order.status] ?? order.status;

                return (
                  <ListRow
                    key={order.id}
                    icon={ServiceIcons[order.service]}
                    title={`${service?.label ?? order.service} · ${status}`}
                    subtitle={`${order.destination.label} · ${formatDate(order.createdAt)}`}
                    trailing={formatRupiah(order.fare)}
                    divider={index > 0}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.surface,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.edgeMargin,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
});
