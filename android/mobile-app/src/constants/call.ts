/**
 * Copy for the in-call screen, transcribed from the Stitch design.
 *
 * The design draws a single ringing state, so the status line is fixed rather than
 * derived from a call timer. Control labels are written as the action each press
 * performs, which is what a screen reader should announce; the design's markup has no
 * labels of its own because the controls are icon-only there.
 */
export const CallCopy = {
  /** Subtitle under the callee's name. */
  role: 'Driver UmfaGo',
  /** Rendered uppercase by `Typography.overlineLg`. */
  status: 'Calling...',
  minimize: 'Minimize call',
  mute: 'Mute microphone',
  unmute: 'Unmute microphone',
  speakerOn: 'Turn on speaker',
  speakerOff: 'Turn off speaker',
  video: 'Switch to video call',
  endCall: 'End call',
  /** Shown when the thread id in the route does not resolve to a conversation. */
  missing: 'This call is no longer available.',
} as const;
