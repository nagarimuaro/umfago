import type { Driver } from './order';

/** Who sent a message. `me` is the passenger using this app. */
export type ChatAuthor = 'me' | 'them';

export type ChatMessage = {
  id: string;
  author: ChatAuthor;
  text: string;
  /**
   * Relative time as the design draws it ("3 min ago", "Just now"). Sample content has
   * no absolute timestamps to derive this from, so the label is stored directly.
   */
  timeLabel: string;
};

/**
 * Who is on the other end of a thread. This decides how the avatar is drawn: a driver
 * gets a photo, a merchant and support get a glyph tile.
 */
export type ChatThreadKind = 'driver' | 'merchant' | 'support';

export type ChatThread = {
  id: string;
  kind: ChatThreadKind;
  title: string;
  /**
   * Set on driver threads. The conversation header reads rating, vehicle and photo from
   * it, so one driver record backs both the trip screen and the chat screen.
   */
  driver?: Driver;
  /** Last message, shown as the second line of the list row. */
  preview: string;
  timeLabel: string;
  unreadCount: number;
  /** Archived threads are dimmed in the list, matching the design's `opacity-75` row. */
  archived: boolean;
  messages: readonly ChatMessage[];
};