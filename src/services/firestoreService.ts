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
 * 6. REAL MESSAGING FIRESTORE SERVICE
 */
export function subscribeChatMessages(
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void
) {
  const collPath = `chats/${chatId}/messages`;
  const q = query(collection(db, collPath), orderBy('timestamp', 'asc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName || 'Linzo User',
          senderAvatar: data.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          text: data.text,
          timestamp: data.timestamp ? (data.timestamp as Timestamp).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
        } as ChatMessage;
      });
      onUpdate(msgs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, collPath);
    }
  );
}

export async function sendChatMessage(chatId: string, text: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required to send messages');

  const collPath = `chats/${chatId}/messages`;
  try {
    await addDoc(collection(db, collPath), {
      senderId: user.uid,
      text: text.trim(),
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collPath);
  }
}
