import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  UserProfile, 
  VideoItem, 
  LiveStream, 
  PartyRoom, 
  Conversation, 
  ChatMessage, 
  NotificationItem, 
  Transaction 
} from '../types';

/**
 * 1. REAL POSTS / VIDEOS FIRESTORE SERVICE
 */
export async function fetchFirestoreVideos(): Promise<VideoItem[]> {
  const collPath = 'posts';
  try {
    const q = query(collection(db, collPath), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        creator: data.creator || data.user || {
          id: data.userId || 'unknown',
          name: 'Linzo Creator',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          level: 1,
          fansCount: '1K',
          followingCount: 10,
          likesCount: '10K',
          coins: 0,
          diamonds: 0,
          vipLevel: 1,
          isVIP: false,
          bio: '',
          displayId: '1001',
        },
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl || data.videoUrl,
        description: data.description || '',
        musicTitle: data.musicTitle || 'Original Sound - Linzo Live',
        hashtags: data.hashtags || ['#viral', '#linzo'],
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0,
        sharesCount: data.sharesCount || 0,
        repostsCount: data.repostsCount || 0,
        isLiked: false,
        isSaved: false,
        isPrivate: data.isPrivate || false,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collPath);
    return [];
  }
}

export function subscribeFirestoreVideos(onUpdate: (videos: VideoItem[]) => void) {
  const collPath = 'posts';
  const q = query(collection(db, collPath), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const vids = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          creator: data.creator || data.user || {
            id: data.userId || 'unknown',
            name: 'Linzo Creator',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            level: 1,
            fansCount: '1K',
            followingCount: 10,
            likesCount: '10K',
            coins: 0,
            diamonds: 0,
            vipLevel: 1,
            isVIP: false,
            bio: '',
            displayId: '1001',
          },
          videoUrl: data.videoUrl,
          thumbnailUrl: data.thumbnailUrl || data.videoUrl,
          description: data.description || '',
          musicTitle: data.musicTitle || 'Original Sound - Linzo Live',
          hashtags: data.hashtags || ['#viral', '#linzo'],
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          sharesCount: data.sharesCount || 0,
          repostsCount: data.repostsCount || 0,
          isLiked: false,
          isSaved: false,
          isPrivate: data.isPrivate || false,
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        };
      });
      onUpdate(vids);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, collPath);
    }
  );
}

export async function createFirestoreVideo(video: {
  videoUrl: string;
  thumbnailUrl?: string;
  description: string;
  musicTitle?: string;
  isPrivate?: boolean;
}): Promise<string> {
  const collPath = 'posts';
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Authentication required to upload a video.');

  try {
    const docRef = await addDoc(collection(db, collPath), {
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || video.videoUrl,
      description: video.description,
      musicTitle: video.musicTitle || 'Original Sound - Linzo Live',
      isPrivate: video.isPrivate || false,
      userId: currentUser.uid,
      user: {
        id: currentUser.uid,
        name: currentUser.displayName || 'Linzo Creator',
        username: `@${(currentUser.email?.split('@')[0] || 'user').toLowerCase()}`,
        avatar: currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        level: 1,
      },
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
    throw err;
  }
}

export async function toggleLikeVideo(videoId: string, isLiked: boolean): Promise<void> {
  const docRef = doc(db, 'posts', videoId);
  try {
    await updateDoc(docRef, {
      likesCount: increment(isLiked ? 1 : -1),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `posts/${videoId}`);
  }
}

/**
 * 2. REAL PARTY ROOMS FIRESTORE SERVICE
 */
export async function fetchFirestorePartyRooms(): Promise<PartyRoom[]> {
  const collPath = 'party_rooms';
  try {
    const q = query(collection(db, collPath), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as PartyRoom));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collPath);
    return [];
  }
}

export function subscribeFirestorePartyRooms(onUpdate: (rooms: PartyRoom[]) => void) {
  const collPath = 'party_rooms';
  const q = query(collection(db, collPath), limit(30));
  return onSnapshot(
    q,
    (snap) => {
      const rooms = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as PartyRoom));
      onUpdate(rooms);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, collPath);
    }
  );
}

export async function createFirestorePartyRoom(room: Omit<PartyRoom, 'id'>): Promise<string> {
  const collPath = 'party_rooms';
  try {
    const docRef = await addDoc(collection(db, collPath), {
      ...room,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
    throw err;
  }
}

export async function updateFirestorePartyRoom(roomId: string, updates: Partial<PartyRoom>): Promise<void> {
  const docRef = doc(db, 'party_rooms', roomId);
  try {
    await updateDoc(docRef, updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `party_rooms/${roomId}`);
  }
}

/**
 * 3. REAL LIVE STREAMS FIRESTORE SERVICE
 */
export async function fetchFirestoreLiveStreams(): Promise<LiveStream[]> {
  const collPath = 'live_streams';
  try {
    const q = query(collection(db, collPath), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as LiveStream));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collPath);
    return [];
  }
}

export function subscribeFirestoreLiveStreams(onUpdate: (streams: LiveStream[]) => void) {
  const collPath = 'live_streams';
  const q = query(collection(db, collPath), limit(30));
  return onSnapshot(
    q,
    (snap) => {
      const streams = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as LiveStream));
      onUpdate(streams);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, collPath);
    }
  );
}

export async function createFirestoreLiveStream(stream: Omit<LiveStream, 'id'>): Promise<string> {
  const collPath = 'live_streams';
  try {
    const docRef = await addDoc(collection(db, collPath), {
      ...stream,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
    throw err;
  }
}

export async function endFirestoreLiveStream(streamId: string): Promise<void> {
  const docRef = doc(db, 'live_streams', streamId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `live_streams/${streamId}`);
  }
}

/**
 * 4. REAL TRANSACTIONS & COIN BALANCE FIRESTORE SERVICE
 */
export async function recordUserTransaction(transaction: {
  type: 'recharge' | 'gift_sent' | 'gift_received' | 'reward';
  amount: number;
  coinsChange: number;
  description: string;
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const collPath = `users/${currentUser.uid}/transactions`;
  try {
    await addDoc(collection(db, collPath), {
      ...transaction,
      userId: currentUser.uid,
      timestamp: serverTimestamp(),
    });

    // Update user balance in their Firestore profile
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      coins: increment(transaction.coinsChange),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
  }
}

/**
 * 5. REAL NOTIFICATIONS FIRESTORE SERVICE
 */
export async function sendFirestoreNotification(targetUserId: string, notification: {
  title: string;
  message: string;
  type: 'system' | 'like' | 'follow' | 'gift';
  actionUrl?: string;
}): Promise<void> {
  const collPath = `users/${targetUserId}/notifications`;
  try {
    await addDoc(collection(db, collPath), {
      ...notification,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
  }
}

export function subscribeUserNotifications(
  userId: string,
  onUpdate: (notifications: NotificationItem[]) => void
) {
  const collPath = `users/${userId}/notifications`;
  const q = query(collection(db, collPath), orderBy('createdAt', 'desc'), limit(40));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        time: 'Just now',
      } as unknown as NotificationItem));
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, collPath);
    }
  );
}

/**
 * 6. REAL MESSAGING & WHATSAPP-STYLE FIRESTORE SERVICE
 */
export function subscribeChatMessages(
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void
) {
  const collPath = `chats/${chatId}/messages`;
  const q = query(collection(db, collPath), orderBy('createdAtMillis', 'asc'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName || 'User',
          senderAvatar: data.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          senderVip: data.senderVip || 0,
          isHost: data.isHost || false,
          isPinned: data.isPinned || false,
          text: data.text || '',
          timestamp: data.timestamp || (data.createdAt ? (data.createdAt as Timestamp).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'),
          createdAtMillis: data.createdAtMillis || Date.now(),
          status: data.status || 'read',
          type: data.type || 'text',
          mediaUrl: data.mediaUrl,
          mediaName: data.mediaName,
          mediaSize: data.mediaSize,
          voiceDuration: data.voiceDuration,
          voiceWaveform: data.voiceWaveform,
          replyTo: data.replyTo,
          reactions: data.reactions || [],
          mentions: data.mentions || [],
          isEdited: data.isEdited || false,
          isStarred: data.isStarred || false,
          isForwarded: data.isForwarded || false,
          deletedForEveryone: data.deletedForEveryone || false,
          deletedForUsers: data.deletedForUsers || [],
          roomInvite: data.roomInvite,
          gift: data.gift,
        } as ChatMessage;
      });
      onUpdate(msgs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, collPath);
    }
  );
}

export async function sendChatMessage(
  chatId: string,
  message: {
    text: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    senderVip?: number;
    type?: 'text' | 'voice' | 'image' | 'video' | 'file' | 'room_invite';
    mediaUrl?: string;
    mediaName?: string;
    mediaSize?: string;
    voiceDuration?: number;
    voiceWaveform?: number[];
    replyTo?: any;
    roomInvite?: any;
  }
): Promise<string> {
  const collPath = `chats/${chatId}/messages`;
  try {
    const docRef = await addDoc(collection(db, collPath), {
      ...message,
      status: 'sent',
      createdAt: serverTimestamp(),
      createdAtMillis: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: [],
      deletedForEveryone: false,
      deletedForUsers: [],
    });

    // Update conversation metadata
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, {
      lastMessage: message.type === 'voice' ? '🎤 Voice message' : (message.type === 'image' ? '📷 Photo' : (message.type === 'room_invite' ? '🎉 Room invitation' : message.text)),
      lastMessageType: message.type || 'text',
      lastMessageStatus: 'sent',
      lastMessageSenderId: message.senderId,
      updatedAt: serverTimestamp(),
      updatedAtMillis: Date.now(),
    }, { merge: true });

    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
    return '';
  }
}

export async function editChatMessage(
  chatId: string,
  messageId: string,
  newText: string
): Promise<void> {
  const docPath = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      text: newText,
      isEdited: true,
      editedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function deleteChatMessage(
  chatId: string,
  messageId: string,
  mode: 'for_everyone' | 'for_me',
  userId: string
): Promise<void> {
  const docPath = `chats/${chatId}/messages/${messageId}`;
  try {
    if (mode === 'for_everyone') {
      await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        deletedForEveryone: true,
        text: '🚫 This message was deleted',
      });
    } else {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      const snap = await getDoc(msgRef);
      if (snap.exists()) {
        const deletedForUsers = snap.data().deletedForUsers || [];
        if (!deletedForUsers.includes(userId)) {
          deletedForUsers.push(userId);
          await updateDoc(msgRef, { deletedForUsers });
        }
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function reactToChatMessage(
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string,
  userName: string
): Promise<void> {
  const docPath = `chats/${chatId}/messages/${messageId}`;
  try {
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    let reactions: any[] = snap.data().reactions || [];
    const existingIndex = reactions.findIndex((r) => r.userId === userId);

    if (existingIndex >= 0) {
      if (reactions[existingIndex].emoji === emoji) {
        reactions.splice(existingIndex, 1);
      } else {
        reactions[existingIndex].emoji = emoji;
      }
    } else {
      reactions.push({ emoji, userId, userName });
    }

    await updateDoc(msgRef, { reactions });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function pinChatMessage(
  chatId: string,
  messageId: string,
  isPinned: boolean
): Promise<void> {
  const docPath = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), { isPinned });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function starChatMessage(
  chatId: string,
  messageId: string,
  isStarred: boolean
): Promise<void> {
  const docPath = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), { isStarred });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

/**
 * 7. REAL STORE PURCHASE & USER BALANCE SERVICE
 */
export async function purchaseStoreItem(
  userId: string,
  item: {
    id: string;
    name: string;
    category: string;
    price: number;
    currency: 'coins' | 'diamonds' | 'usd';
  },
  quantity: number = 1
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return { success: false, newBalance: 0, error: 'User profile not found' };
    }

    const userData = snap.data();
    const totalCost = item.price * quantity;

    if (item.currency === 'coins') {
      const currentCoins = userData.coins || 0;
      if (currentCoins < totalCost) {
        return { success: false, newBalance: currentCoins, error: 'Insufficient coins balance' };
      }
      const newCoins = currentCoins - totalCost;
      await updateDoc(userRef, { coins: newCoins });
      
      // Add transaction history
      await addDoc(collection(db, `users/${userId}/transactions`), {
        type: 'store_purchase',
        title: `Purchased ${item.name} (${quantity}x)`,
        amount: -totalCost,
        currency: 'coins',
        timestamp: serverTimestamp(),
      });

      return { success: true, newBalance: newCoins };
    } else if (item.currency === 'diamonds') {
      const currentDiamonds = userData.diamonds || 0;
      if (currentDiamonds < totalCost) {
        return { success: false, newBalance: currentDiamonds, error: 'Insufficient diamonds balance' };
      }
      const newDiamonds = currentDiamonds - totalCost;
      await updateDoc(userRef, { diamonds: newDiamonds });
      
      return { success: true, newBalance: newDiamonds };
    } else {
      // Direct cash bundle gives coins/VIP
      const currentCoins = userData.coins || 0;
      const coinsToAdd = item.id.includes('bundle') ? 50000 * quantity : 10000;
      const newCoins = currentCoins + coinsToAdd;
      await updateDoc(userRef, { coins: newCoins });
      return { success: true, newBalance: newCoins };
    }
  } catch (err: any) {
    return { success: false, newBalance: 0, error: err?.message || 'Transaction failed' };
  }
}

