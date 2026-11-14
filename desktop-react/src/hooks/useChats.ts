import { useState, useEffect, useCallback } from 'react';
import { rtdb } from '@/lib/firebase';
import {
  ref,
  onValue,
  get,
  set,
  push,
  update,
  serverTimestamp,
} from 'firebase/database';
import type { Chat, User, Message } from '@/types';

export function useChats(uid: string | undefined) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  // Real-time listener for chats in RTDB
  useEffect(() => {
    if (!uid) {
      setChats([]);
      setLoading(false);
      return;
    }

    const chatsRef = ref(rtdb, 'chats');
    const unsubscribe = onValue(chatsRef, async (snapshot) => {
      const data = snapshot.val() || {};
      const chatList: Chat[] = [];
      const userIds = new Set<string>();

      for (const [id, chatData] of Object.entries(data)) {
        if (!chatData || typeof chatData !== 'object') continue;
        const c = chatData as Record<string, unknown>;
        const members = (c.members || []) as string[];

        // Check if current user is a member of this chat
        if (members.includes(uid)) {
          const lastMsgAt = (c.lastMsgAt || c.lastAt || 0) as number;
          chatList.push({
            id,
            type: (c.type as 'dm' | 'group' | 'channel') || 'dm',
            name: c.name as string | undefined,
            avatar: c.avatar as string | undefined,
            members,
            lastMessage: c.lastMsg ? {
              id: 'last',
              chatId: id,
              uid: (c.lastMsgUid as string) || '',
              text: (c.lastMsg as string) || '',
              ts: lastMsgAt,
            } : undefined,
            lastTs: lastMsgAt,
            unread: c.unread && typeof c.unread === 'object' ? ((c.unread as Record<string, number>)[uid] || 0) : 0,
          });

          members.forEach((m) => userIds.add(m));
        }
      }

      // Sort chats by most recent message
      chatList.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));

      // Fetch member profiles
      const newUsers: Record<string, User> = { ...users };
      const toFetch = [...userIds].filter((id) => !newUsers[id]);

      if (toFetch.length > 0) {
        await Promise.all(
          toFetch.map(async (userId) => {
            try {
              const uSnap = await get(ref(rtdb, 'users/' + userId));
              if (uSnap.exists()) {
                newUsers[userId] = { uid: userId, ...uSnap.val() } as User;
              }
            } catch (_) {}
          })
        );
        setUsers(newUsers);
      }

      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  const createDirectChat = useCallback(
    async (currentUid: string, targetNickOrUid: string): Promise<string | null> => {
      // Find user by direct UID or nickname
      const usersSnap = await get(ref(rtdb, 'users'));
      const allUsers = usersSnap.val() || {};
      let targetUid: string | null = null;

      const trimmedTarget = targetNickOrUid.trim();

      // 1. Direct match by UID
      if (allUsers[trimmedTarget]) {
        targetUid = trimmedTarget;
      } else {
        // Search by nickname or stored uid
        for (const [uId, uData] of Object.entries(allUsers)) {
          const u = uData as Record<string, unknown>;
          if (
            (u.uid && String(u.uid) === trimmedTarget) ||
            (u.nick && typeof u.nick === 'string' && u.nick.toLowerCase() === trimmedTarget.toLowerCase())
          ) {
            targetUid = uId;
            break;
          }
        }
      }

      if (!targetUid || targetUid === currentUid) return null;

      // Deterministic DM Chat ID to prevent duplicates (same as Nonsense Chat web logic)
      const uids = [currentUid, targetUid].sort();
      const chatId = `${uids[0]}_${uids[1]}`;

      const chatRef = ref(rtdb, 'chats/' + chatId);
      const existing = await get(chatRef);

      if (!existing.exists()) {
        await set(chatRef, {
          type: 'dm',
          members: [currentUid, targetUid],
          lastMsg: '',
          lastMsgAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          createdBy: currentUid,
        });
      }

      return chatId;
    },
    []
  );

  const createGroup = useCallback(
    async (
      currentUid: string,
      name: string,
      memberNicks: string[],
      avatar?: string
    ): Promise<string | null> => {
      const usersSnap = await get(ref(rtdb, 'users'));
      const allUsers = usersSnap.val() || {};
      const memberUids = [currentUid];

      for (const nick of memberNicks) {
        for (const [uId, uData] of Object.entries(allUsers)) {
          const u = uData as Record<string, unknown>;
          if (
            u.nick &&
            typeof u.nick === 'string' &&
            u.nick.toLowerCase() === nick.toLowerCase()
          ) {
            if (!memberUids.includes(uId)) {
              memberUids.push(uId);
            }
            break;
          }
        }
      }

      if (memberUids.length < 2) return null;

      const newChatRef = push(ref(rtdb, 'chats'));
      const chatId = newChatRef.key;
      if (!chatId) return null;

      await set(newChatRef, {
        type: 'group',
        name,
        avatar: avatar || '',
        members: memberUids,
        admins: [currentUid],
        lastMsg: '',
        lastMsgAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: currentUid,
      });

      return chatId;
    },
    []
  );

  const markRead = useCallback(async (chatId: string, currentUid: string) => {
    try {
      await update(ref(rtdb, `chats/${chatId}/unread`), { [currentUid]: 0 });
      await update(ref(rtdb, `chats/${chatId}/readBy`), { [currentUid]: serverTimestamp() });
    } catch (_) {}
  }, []);

  return { chats, users, loading, createDirectChat, createGroup, markRead };
}

export function useMessages(chatId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Realtime listener for messages in RTDB at messages/${chatId}
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const msgsRef = ref(rtdb, `messages/${chatId}`);

    const unsubscribe = onValue(msgsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const msgsList: Message[] = [];

      for (const [id, msgData] of Object.entries(data)) {
        if (!msgData || typeof msgData !== 'object') continue;
        const m = msgData as Record<string, unknown>;
        if (m._deleted) continue;

        let atTime = Date.now();
        if (typeof m.at === 'number') {
          atTime = m.at;
        } else if (m.at && typeof m.at === 'object' && '__ts__' in m.at) {
          atTime = new Date((m.at as { __ts__: string }).__ts__).getTime();
        }

        const replyObj = m.replyTo && typeof m.replyTo === 'object' ? (m.replyTo as Record<string, unknown>) : null;
        const replyId = replyObj ? (replyObj.id as string) : (typeof m.replyTo === 'string' ? m.replyTo : undefined);
        const replyPreview = replyObj ? (replyObj.text as string) : (m.replyPreview as string | undefined);

        const stickerUrl = (m.stickerUrl as string) || undefined;
        const photoUrl = (m.photoUrl as string) || stickerUrl || undefined;
        const isStickerMsg = m.type === 'sticker' || !!stickerUrl || (typeof m.text === 'string' && /^<img\s+[^>]*src=/i.test(m.text.trim()));

        msgsList.push({
          id,
          chatId,
          uid: (m.uid as string) || '',
          text: (m.text as string) || '',
          ts: atTime,
          type: isStickerMsg ? 'sticker' : ((m.type as any) || (photoUrl ? 'photo' : m.audioUrl ? 'voice' : m.poll ? 'poll' : 'text')),
          replyTo: replyId,
          replyPreview: replyPreview,
          reactions: m.reactions as Record<string, string[]> | undefined,
          poll: m.poll as import('@/types').PollData | undefined,
          audioUrl: (m.audioUrl as string) || undefined,
          audioDuration: typeof m.audioDuration === 'number' ? m.audioDuration : typeof m.duration === 'number' ? m.duration : undefined,
          audioTitle: (m.audioTitle as string) || undefined,
          audioArtist: (m.audioArtist as string) || undefined,
          audioCover: (m.audioCover as string) || undefined,
          photoUrl: photoUrl,
          fileUrl: (m.fileUrl as string) || undefined,
          fileName: (m.fileName as string) || undefined,
          fileSize: (m.fileSize as number) || undefined,
          caption: (m.caption as string) || undefined,
          isSpoiler: !!m.isSpoiler,
          forwarded: !!m.forwardFrom,
          forwardFrom: (m.forwardFrom as string) || undefined,
          pinned: !!m.pinned,
        });
      }

      // Sort in chronological order
      msgsList.sort((a, b) => a.ts - b.ts);
      setMessages(msgsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = useCallback(
    async (
      activeChatId: string,
      uid: string,
      text: string,
      replyToId?: string,
      replyPreviewText?: string,
      poll?: import('@/types').PollData,
      audioUrl?: string,
      audioDuration?: number,
      forwardFrom?: string,
      attachment?: {
        type: 'photo' | 'file' | 'audio' | 'video';
        url: string;
        fileName?: string;
        fileSize?: number;
        caption?: string;
        isSpoiler?: boolean;
      }
    ) => {
      const targetChat = chatId || activeChatId;
      const msgsRef = ref(rtdb, `messages/${targetChat}`);
      const newMsgRef = push(msgsRef);

      const msgData: Record<string, unknown> = {
        chatId: targetChat,
        uid,
        text: text.trim(),
        at: serverTimestamp(),
        type: poll
          ? 'poll'
          : audioUrl
          ? 'voice'
          : attachment
          ? attachment.type
          : 'text',
      };

      if (poll) msgData.poll = poll;
      if (audioUrl) {
        msgData.audioUrl = audioUrl;
        msgData.audioDuration = audioDuration || 0;
      }
      if (forwardFrom) msgData.forwardFrom = forwardFrom;

      if (attachment) {
        if (attachment.fileName === 'sticker.webp' || (attachment.url && attachment.url.includes('sticker'))) {
          msgData.type = 'sticker';
          msgData.stickerUrl = attachment.url;
          msgData.photoUrl = attachment.url;
        } else if (attachment.type === 'photo') {
          msgData.photoUrl = attachment.url;
        } else {
          msgData.fileUrl = attachment.url;
        }
        if (attachment.fileName) msgData.fileName = attachment.fileName;
        if (attachment.fileSize) msgData.fileSize = attachment.fileSize;
        if (attachment.caption) msgData.caption = attachment.caption;
        if (attachment.isSpoiler) msgData.isSpoiler = true;
      }

      if (replyToId) {
        msgData.replyTo = {
          id: replyToId,
          text: replyPreviewText || '',
        };
      }

      await set(newMsgRef, msgData);

      // Update chat last message in RTDB
      let previewText = text.trim().slice(0, 60);
      if (poll) previewText = `📊 ${poll.question}`;
      else if (audioUrl) previewText = '🎤 Голосовое сообщение';
      else if (attachment?.type === 'photo') previewText = attachment.caption ? `📷 ${attachment.caption.slice(0, 40)}` : '📷 Фото';
      else if (attachment?.type === 'file') previewText = `📎 Файл: ${attachment.fileName || ''}`;

      await update(ref(rtdb, `chats/${activeChatId}`), {
        lastMsg: previewText,
        lastMsgAt: serverTimestamp(),
        lastMsgUid: uid,
      });
    },
    []
  );

  return { messages, loading, sendMessage };
}
