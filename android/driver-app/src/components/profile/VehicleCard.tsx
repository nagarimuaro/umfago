import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { colors, rounded, spacing } from '../../constants/theme';
import { DriverVehicle } from '../../types/driver';

interface VehicleCardProps {
  vehicle: DriverVehicle;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.leftHeader}>
          <View style={styles.iconCircle}>
            <FontAwesome5
              name={vehicle.type === 'motorcycle' ? 'motorcycle' : 'car'}
              size={18}
              color={colors.primary}
            />
          </View>
          <View>
            <Text style={styles.modelText}>{vehicle.model}</Text>
            <Text style={styles.specText}>
              Tahun {vehicle.year} • {vehicle.color}
            </Text>
          </View>
        </View>

        <View style={styles.verifiedBadge}>
          <MaterialIcons name="verified" size={14} color={colors.primary} />
          <Text style={styles.verifiedText}>AKTIF</Text>
        </View>
      </View>

      {/* Plate Number Spotlight */}
      <View style={styles.plateContainer}>
        <Text style={styles.plateLabel}>PLAT NOMOR TERDAFTAR</Text>
        <Text style={styles.plateNumber}>{vehicle.plateNumber}</Text>
      </View>

      {/* Details List */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Masa Berlaku STNK</Text>
          <Text style={styles.detailValue}>{vehicle.stnkExpiry}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Pajak Kendaraan</Text>
          <Text style={[styles.detailValue, { color: colors.primary }]}>Lunas & Terverifikasi</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2020',
    borderRadius: rounded.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  modelText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  specText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#162A14',
    borderWidth: 1,
    borderColor: '#23581E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  verifiedText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  plateContainer: {
    backgroundColor: '#131414',
    padding: spacing.md,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: '#232525',
    alignItems: 'center',
  },
  plateLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  plateNumber: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  detailValue: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
});
