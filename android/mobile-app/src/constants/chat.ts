import { SampleDriver } from './booking';

import type { ChatThread } from '@/types/chat';

/**
 * Sample conversations until a messaging backend exists. Titles, previews, time labels
 * and unread counts are transcribed from the Stitch "Chat List" and "Chat with Driver"
 * screens. The driver thread reuses `SampleDriver` so the same person backs the trip
 * screen and this one.
 */
export const ChatThreads: readonly ChatThread[] = [
  {
    id: 'thread-driver',
    kind: 'driver',
    title: `${SampleDriver.name} (Driver)`,
    driver: SampleDriver,
    preview: 'I have arrived!',
    timeLabel: 'Just now',
    unreadCount: 1,
    archived: false,
    messages: [
      {
        id: 'msg-1',
        author: 'them',
        text: "Hello, I'm on my way.",
        timeLabel: '3 min ago',
      },
      {
        id: 'msg-2',
        author: 'them',
        text: 'I have arrived at the pickup point.',
        timeLabel: 'Just now',
      },
    ],
  },
  {
    id: 'thread-merchant',
    kind: 'merchant',
    title: 'Burger Joint Downtown',
    preview: 'Your order is being prepared.',
    timeLabel: '10:42 AM',
    unreadCount: 2,
    archived: false,
    messages: [
      {
        id: 'msg-3',
        author: 'them',
        text: 'Your order is being prepared.',
        timeLabel: '10:42 AM',
      },
    ],
  },
  {
    id: 'thread-support',
    kind: 'support',
    title: 'OpenJek Support',
    preview: 'How was your last trip?',
    timeLabel: 'Yesterday',
    unreadCount: 0,
    archived: true,
    messages: [
      {
        id: 'msg-4',
        author: 'them',
        text: 'How was your last trip?',
        timeLabel: 'Yesterday',
      },
    ],
  },
];

/** Tappable canned replies above the composer on the conversation screen. */
export const QuickReplies: readonly string[] = ['Okay, wait a min', "I'm coming", 'Where are you?'];

/** Footer note under the thread list. */
export const ChatArchiveNote = 'Older messages are automatically archived.';

/** Centred chip that opens the conversation transcript. */
export const ChatDateStamp = 'Today, 10:45 AM';

export function threadById(id: string | undefined): ChatThread | null {
  if (!id) return null;
  return ChatThreads.find((thread) => thread.id === id) ?? null;
}