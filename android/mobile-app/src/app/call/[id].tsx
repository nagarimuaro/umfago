import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CallAvatar } from '@/components/call/call-avatar';
import { CallControl } from '@/components/call/call-control';
import { DSText } from '@/components/ds/ds-text';
import { IconButton } from '@/components/ds/icon-button';
import { CallCopy } from '@/constants/call';
import { threadById } from '@/constants/chat';
import { SampleDriver } from '@/constants/booking';
import { Opacity, Overlay, Palette, Sizes, Spacing } from '@/constants/design-system';

/** `blur-xl` on the backdrop portrait. Tailwind's own value is a 24px Gaussian blur. */
const BackdropBlur = 24;
/** `scale-110`, which keeps the blur's soft edges outside the frame. */
const BackdropScale = 1.1;
/** `mt-12` on the main column, clearing the fixed header. */
const BodyTopOffset = 48;
/** `mb-16` under the status line, which sits the profile above centre. */
const StatusBottomOffset = 64;
/** `pb-12` under the end-call button. Deeper than any home indicator, so it stands in. */
const FooterBottomInset = 48;

/**
 * Panggilan suara dalam aplikasi dengan timer realtime dan fallback dial telepon seluler.
 */
export default function CallScreen() {
  const router = useRouter();
  const { id, name: paramName, photo: paramPhoto, phone: paramPhone, vehicle: paramVehicle, plate: paramPlate } =
    useLocalSearchParams<{
      id: string;
      name?: string;
      photo?: string;
      phone?: string;
      vehicle?: string;
      plate?: string;
    }>();

  const thread = useMemo(() => (id ? threadById(id) : null), [id]);

  const [isMuted, setMuted] = useState(false);
  const [isSpeakerOn, setSpeakerOn] = useState(true);
  const [callState, setCallState] = useState<'calling' | 'connected'>('calling');
  const [seconds, setSeconds] = useState(0);

  // Driver didapat dari thread atau dari order params
  const driver = useMemo(() => {
    if (thread?.driver) return thread.driver;
    return {
      id: String(id || '1'),
      name: paramName || 'Driver UmfaGo',
      rating: 4.9,
      vehicle: paramVehicle || 'Toyota Avanza',
      plate: paramPlate || 'BA 5678 AB',
      photo: paramPhoto?.startsWith('http') ? paramPhoto : SampleDriver.photo,
      etaMinutes: 3,
    };
  }, [thread, id, paramName, paramPhoto, paramVehicle, paramPlate]);

  const name = driver.name;
  const phoneNumber = paramPhone || '081234567891';

  // Simulasi koneksi panggilan suara (terhubung dalam 2.5 detik)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCallState('connected');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Timer panggilan aktif saat terhubung
  useEffect(() => {
    if (callState !== 'connected') return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const timeDisplay = useMemo(() => {
    if (callState === 'calling') return 'MEMANGGIL...';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [callState, seconds]);

  const handleCellularCall = () => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={{ uri: driver.photo }}
          style={styles.backdrop}
          contentFit="cover"
          blurRadius={BackdropBlur}
          accessibilityIgnoresInvertColors
        />
        <LinearGradient
          colors={[Overlay.secondarySoft, Palette.secondary, Palette.secondary]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <IconButton
            icon="keyboard-arrow-down"
            accessibilityLabel={CallCopy.minimize}
            onPress={router.back}
            box={Sizes.avatar}
            background={Overlay.onSecondarySubtle}
            color={Palette.onSecondary}
          />
        </View>

        <View style={styles.body}>
          <View style={styles.identity}>
            <CallAvatar photo={driver.photo} name={name} />
            <DSText variant="headlineDisplay" color={Palette.onSecondary} style={styles.name}>
              {name}
            </DSText>
            <DSText variant="bodyLgMedium" color={Palette.primaryContainer}>
              {driver.vehicle ? `${driver.vehicle} • ${driver.plate}` : 'Mitra Driver UmfaGo'}
            </DSText>
          </View>

          <DSText
            variant="overlineLg"
            color={callState === 'connected' ? '#4ADE80' : Palette.surfaceVariant}
            style={styles.status}>
            {timeDisplay}
          </DSText>
        </View>

        <View style={styles.footer}>
          <View style={styles.controls}>
            <CallControl
              icon="mic-off"
              accessibilityLabel={isMuted ? CallCopy.unmute : CallCopy.mute}
              tone={isMuted ? 'active' : 'subtle'}
              onPress={() => setMuted((current) => !current)}
            />
            <CallControl
              icon="volume-up"
              accessibilityLabel={isSpeakerOn ? CallCopy.speakerOff : CallCopy.speakerOn}
              tone={isSpeakerOn ? 'active' : 'subtle'}
              onPress={() => setSpeakerOn((current) => !current)}
            />
            {/* Tombol Dial GSM Telepon Seluler Langsung */}
            <CallControl
              icon="call"
              accessibilityLabel="Panggil nomor seluler"
              tone="subtle"
              onPress={handleCellularCall}
            />
          </View>

          <CallControl
            icon="call-end"
            accessibilityLabel={CallCopy.endCall}
            tone="danger"
            onPress={router.back}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.secondary,
  },
  safeArea: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: Opacity.backdrop,
    transform: [{ scale: BackdropScale }],
  },
  header: {
    height: Sizes.appBar,
    justifyContent: 'center',
    paddingHorizontal: Spacing.edgeMargin,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: BodyTopOffset,
  },
  identity: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  name: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  status: {
    marginBottom: StatusBottomOffset,
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: FooterBottomInset,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.xl + Spacing.md,
  },
});
