import { Platform } from 'react-native';
import { Audio } from 'expo-av';

export class SoundService {
  private static soundInstance: Audio.Sound | null = null;
  private static webAudioElement: HTMLAudioElement | null = null;
  private static webAudioCtx: any = null;
  private static isPlaying = false;

  /**
   * Play the high-volume incoming order dispatch alert sound.
   * Loops until stopOrderAlert() is called.
   */
  public static async playOrderAlert(): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    try {
      if (Platform.OS === 'web') {
        // High-volume Web Audio playback with GainNode amplification
        try {
          if (!this.webAudioElement && typeof window !== 'undefined') {
            const audio = new window.Audio('/sound/notify.wav');
            audio.loop = true;
            this.webAudioElement = audio;

            // Use Web Audio API GainNode to boost volume above normal 100%
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              this.webAudioCtx = ctx;
              const source = ctx.createMediaElementSource(audio);
              const gainNode = ctx.createGain();
              gainNode.gain.value = 2.0; // 200% volume boost ("volume besar sekali")
              source.connect(gainNode);
              gainNode.connect(ctx.destination);
            } else {
              audio.volume = 1.0;
            }
          }

          if (this.webAudioCtx && this.webAudioCtx.state === 'suspended') {
            await this.webAudioCtx.resume();
          }

          if (this.webAudioElement) {
            this.webAudioElement.currentTime = 0;
            await this.webAudioElement.play().catch((err) => {
              console.log('[SoundService] Web audio autoplay note:', err);
            });
          }
          return;
        } catch (webErr) {
          console.warn('[SoundService] Web audio setup note:', webErr);
        }
      }

      // Native Android / iOS via expo-av
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });

      if (this.soundInstance) {
        await this.soundInstance.unloadAsync().catch(() => {});
        this.soundInstance = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sound/notify.wav'),
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0, // Maximum hardware volume
        }
      );

      this.soundInstance = sound;
      await sound.playAsync();
    } catch (e) {
      console.warn('[SoundService] Failed to play order alert sound:', e);
    }
  }

  /**
   * Stop the order alert sound immediately.
   */
  public static async stopOrderAlert(): Promise<void> {
    this.isPlaying = false;

    // Web stop
    if (this.webAudioElement) {
      try {
        this.webAudioElement.pause();
        this.webAudioElement.currentTime = 0;
      } catch {}
    }

    // Native stop
    if (this.soundInstance) {
      try {
        await this.soundInstance.stopAsync();
        await this.soundInstance.unloadAsync();
      } catch {}
      this.soundInstance = null;
    }
  }
}
