import { Platform, Vibration } from 'react-native';
import { NOTIFY_SOUND_DATA_URI } from '../constants/notify-sound-asset';

export class SoundService {
  private static webAudioElement: HTMLAudioElement | null = null;
  private static webAudioCtx: any = null;
  private static isPlaying = false;
  private static nativeRingCallback: ((playing: boolean) => void) | null = null;

  /**
   * Register native WebView audio bridge so Android/iOS plays the exact notify.wav
   * recording inside WebView without requiring legacy expo-av native C++ module.
   */
  public static setNativeRingHandler(handler: ((playing: boolean) => void) | null) {
    this.nativeRingCallback = handler;
  }

  /**
   * Play the high-volume incoming order dispatch alert sound (notify.wav) & vibration.
   * Loops until stopOrderAlert() is called.
   */
  public static async playOrderAlert(): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    try {
      if (Platform.OS === 'web') {
        try {
          if (!this.webAudioElement && typeof window !== 'undefined') {
            const audio = new window.Audio(NOTIFY_SOUND_DATA_URI);
            audio.loop = true;
            this.webAudioElement = audio;

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              this.webAudioCtx = ctx;
              const source = ctx.createMediaElementSource(audio);
              const gainNode = ctx.createGain();
              gainNode.gain.value = 2.0;
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

      // Native Android / iOS: Trigger continuous hardware vibration + WebView AudioContext chime
      try {
        Vibration.vibrate([0, 600, 250, 600, 250, 600], true);
      } catch {
        // ignore if vibration permission unavailable
      }

      if (this.nativeRingCallback) {
        this.nativeRingCallback(true);
      }
    } catch (e) {
      console.warn('[SoundService] Failed to play order alert sound:', e);
    }
  }

  /**
   * Stop the order alert sound and vibration immediately.
   */
  public static async stopOrderAlert(): Promise<void> {
    this.isPlaying = false;

    if (Platform.OS === 'web') {
      if (this.webAudioElement) {
        try {
          this.webAudioElement.pause();
          this.webAudioElement.currentTime = 0;
        } catch {}
      }
      return;
    }

    try {
      Vibration.cancel();
    } catch {}

    if (this.nativeRingCallback) {
      this.nativeRingCallback(false);
    }
  }
}
