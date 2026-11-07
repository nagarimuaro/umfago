import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { colors, rounded, spacing } from '../../constants/theme';
import { KycDocument } from '../../types/driver';

interface KycDocumentItemProps {
  doc: KycDocument;
  onPressUpload?: (doc: KycDocument) => void;
}

export const KycDocumentItem: React.FC<KycDocumentItemProps> = ({ doc, onPressUpload }) => {
  const isVerified = doc.status === 'verified';
  const isPending = doc.status === 'pending';

  return (
    <View style={styles.card}>
      <View style={styles.leftGroup}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isVerified ? '#162A14' : colors.surfaceHigh },
          ]}
        >
          <MaterialIcons
            name={isVerified ? 'verified-user' : 'description'}
            size={20}
            color={isVerified ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.textGroup}>
          <Text style={styles.title}>{doc.title}</Text>
          {doc.documentNumber && <Text style={styles.docNumber}>No: {doc.documentNumber}</Text>}
          {doc.expiryDate && (
            <Text style={styles.expiry}>Berlaku s/d {doc.expiryDate}</Text>
          )}
        </View>
      </View>

      <View style={styles.rightGroup}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isVerified ? '#162A14' : isPending ? '#332700' : '#351010',
              borderColor: isVerified ? '#23581E' : isPending ? '#664E00' : '#7A1C1C',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isVerified ? colors.primary : isPending ? '#FFD54F' : '#FF8A80' },
            ]}
          >
            {isVerified ? 'TERVERIFIKASI' : isPending ? 'MENUNGGU' : 'DITOLAK'}
          </Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={() => onPressUpload?.(doc)} style={styles.uploadBtn}>
          <Ionicons name="camera-outline" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2020',
    borderRadius: rounded.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    marginRight: spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  docNumber: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  expiry: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  rightGroup: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.full,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  uploadBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
});
