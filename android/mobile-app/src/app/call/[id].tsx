import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CallAvatar } from '@/components/call/call-avatar';
import { CallControl } from '@/components/call/call-control';
import { DSText } from '@/components/ds/ds-text';
import { IconButton } from '@/components/ds/icon-button';
import { CallCopy } from '@/constants/call';
import { threadById } from '@/constants/chat';
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
 * Voice call in progress, keyed on the chat thread it was placed from.
 *
 * There is no telephony backend, so the controls are local state and the status line is
 * the design's fixed "Calling..." rather than a live timer. Both ending the call and
 * minimising it pop back to the conversation, which is where the call started.
 */
export default function CallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const thread = useMemo(() => threadById(id), [id]);

  const [isMuted, setMuted] = useState(false);
  /** The design draws the speaker control in its active state. */
  const [isSpeakerOn, setSpeakerOn] = useState(true);

  if (!thread) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.missing}>
          <DSText variant="bodyMd" color={Palette.onSecondary}>
            {CallCopy.missing}
          </DSText>
        </SafeAreaView>
      </View>
    );
  }

  const driver = thread.driver;
  const name = driver?.name ?? thread.title;

  return (
    <View style={styles.screen}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {driver ? (
          <Image
            source={{ uri: driver.photo }}
            style={styles.backdrop}
            contentFit="cover"
            blurRadius={BackdropBlur}
            accessibilityIgnoresInvertColors
          />
        ) : null}
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
            <CallAvatar photo={driver?.photo} name={name} />
            <DSText variant="headlineDisplay" color={Palette.onSecondary} style={styles.name}>
              {name}
            </DSText>
            <DSText variant="bodyLgMedium" color={Palette.primaryContainer}>
              {CallCopy.role}
            </DSText>
          </View>

          <DSText variant="overlineLg" color={Palette.surfaceVariant} style={styles.status}>
            {CallCopy.status}
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
            {/* Video calling has no backend, so the control stays as the design draws it. */}
            <CallControl icon="videocam-off" accessibilityLabel={CallCopy.video} disabled />
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
