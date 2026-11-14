// Types for Nonsense Chat Desktop App

export interface User {
  uid: string;
  nick: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  online?: boolean;
  lastSeen?: number;
  theme?: string;
  lang?: string;
}

export interface PollData {
  question: string;
  options: string[];
  votes?: Record<string, number>;
  isQuiz?: boolean;
  anonymous?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  uid: string;
  text: string;
  ts: number;
  type?: 'text' | 'image' | 'file' | 'sticker' | 'voice' | 'video' | 'call' | 'poll' | 'photo' | 'audio';
  edited?: boolean;
  editedAt?: number;
  replyTo?: string;
  replyPreview?: string;
  reactions?: Record<string, string[]>;
  poll?: PollData;
  audioUrl?: string;
  audioDuration?: number;
  audioTitle?: string;
  audioArtist?: string;
  audioCover?: string;
  photoUrl?: string;
  stickerUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  caption?: string;
  isSpoiler?: boolean;
  attachment?: {
    type: 'photo' | 'file' | 'audio' | 'video';
    url: string;
    fileName?: string;
    fileSize?: number;
    caption?: string;
    isSpoiler?: boolean;
  };
  file?: {
    url: string;
    name: string;
    size: number;
    mime?: string;
  };
  forwarded?: boolean;
  forwardFrom?: string;
  pinned?: boolean;
  deleted?: boolean;
  read?: boolean;
  readAt?: Record<string, number>;
  callType?: 'audio' | 'video';
  callDuration?: number;
  callStatus?: 'missed' | 'ended' | 'declined';
}

export interface PinnedItem {
  id: string;
  text: string;
  author?: string;
}

export interface Chat {
  id: string;
  type: 'dm' | 'group' | 'channel' | 'fav';
  name?: string;
  avatar?: string;
  members: string[];
  admins?: string[];
  lastMessage?: Message;
  lastTs?: number;
  unread?: number;
  pinned?: boolean;
  pinnedMsgs?: PinnedItem[];
  muted?: boolean;
  archived?: boolean;
  description?: string;
  createdAt?: number;
  createdBy?: string;
  typing?: Record<string, number>;
  theme?: string;
  readBy?: Record<string, number>;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  chatId?: string;
  avatar?: string;
  ts: number;
  read: boolean;
}

export type Theme = 'dark' | 'amoled' | 'light' | 'coffee-dark' | 'moss';
export type Language = 'ru' | 'en' | 'uk' | 'ru-pre' | 'bg';
