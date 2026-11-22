import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Send, 
  Smile, 
  Paperclip, 
  Mic, 
  MicOff, 
  MoreVertical, 
  Check, 
  CheckCheck, 
  User, 
  Users, 
  Phone, 
  Video, 
  Image as ImageIcon, 
  FileText, 
  CornerUpLeft, 
  Copy, 
  Trash2, 
  Star, 
  Pin, 
  Edit3, 
  X, 
  Play, 
  Pause, 
  Volume2, 
  ShieldAlert, 
  Archive, 
  ArchiveRestore, 
  BellOff, 
  UserX, 
  Plus, 
  Sparkles, 
  Radio, 
  Share2,
  ChevronDown,
  Coins,
  BadgeCheck,
  ShieldCheck,
  MessageCircle,
  Receipt,
  Loader2,
} from 'lucide-react';
import { 
  Conversation, 
  UserProfile, 
  ScreenType, 
  ChatMessage, 
  ChatGroup, 
  MessageReplyPreview 
} from '../../types';
import { 
  buildDirectChatId,
  subscribeUserDirectConversations,
  subscribeChatMessages, 
  sendChatMessage, 
  editChatMessage, 
  deleteChatMessage, 
  reactToChatMessage, 
  pinChatMessage, 
  starChatMessage 
} from '../../services/firestoreService';
import { BlockedUserRecord, blockedRecordToUserProfile } from '../../services/blockService';
import {
  DualAgencyRecord,
  buildWhatsAppUrl,
  subscribeActiveAgencies,
  transferCoinsFromAgency,
} from '../../services/agencyService';
import { uploadUserImage } from '../../services/storageService';
import { CoinSlipOrderModal } from '../agency/CoinSlipOrderModal';

interface MessagesScreenProps {
  currentUser: UserProfile;
  conversations: Conversation[];
  onNavigate: (screen: ScreenType) => void;
  onSelectUser: (user: UserProfile) => void;
  onOpenGiftShop: (recipient: UserProfile) => void;
  activeChatUser?: UserProfile | null;
  onCloseChat?: () => void;
  blockedUsers?: BlockedUserRecord[];
  blockedByUserIds?: string[];
  onBlockUser?: (user: UserProfile) => Promise<void> | void;
  onUnblockUser?: (userId: string, targetName?: string) => Promise<void> | void;
}

type TabKey = 'all' | 'personal' | 'groups' | 'requests' | 'archived' | 'blocked';

const QUICK_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '🙏'];
const AGENCY_COIN_CARDS = [1000, 5000, 10000, 25000, 50000, 100000];

export const MessagesScreen: React.FC<MessagesScreenProps> = ({
  currentUser,
  conversations: initialConversations,
  onNavigate,
  onSelectUser,
  onOpenGiftShop,
  activeChatUser: initialActiveUser,
  onCloseChat,
  blockedUsers: persistedBlockedRecords = [],
  blockedByUserIds = [],
  onBlockUser,
  onUnblockUser,
}) => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [callToast, setCallToast] = useState<string | null>(null);
  const [conversationsList, setConversationsList] = useState<Conversation[]>(() =>
    initialConversations.map((c) => ({ ...c, type: c.type || 'direct' }))
  );

  // Active Coin Seller Agencies (for Verified Agency Inbox + Coin Cards + WhatsApp)
  const [coinSellerAgencies, setCoinSellerAgencies] = useState<DualAgencyRecord[]>([]);
  const [showAgencyCoinTray, setShowAgencyCoinTray] = useState(true);
  const [customCoinInput, setCustomCoinInput] = useState('');
  const [isSendingCoinCard, setIsSendingCoinCard] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [isUploadingChatImage, setIsUploadingChatImage] = useState(false);
  const [imageLightboxUrl, setImageLightboxUrl] = useState<string | null>(null);
  const chatImageInputRef = useRef<HTMLInputElement | null>(null);

  // Agency Owner Quick Real Coin Transfer directly inside In-App Inbox
  const [showOwnerQuickSend, setShowOwnerQuickSend] = useState(false);
  const [ownerSendAmount, setOwnerSendAmount] = useState('');
  const [ownerSendPin, setOwnerSendPin] = useState('');
  const [ownerSendNote, setOwnerSendNote] = useState('');
  const [isOwnerSendingCoins, setIsOwnerSendingCoins] = useState(false);

  // Selected Conversation State (deterministic symmetric chatId for real-time 2-way messaging)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(() => {
    if (initialActiveUser) {
      return {
        id: buildDirectChatId(currentUser.id, initialActiveUser.id),
        user: initialActiveUser,
        lastMessage: 'Started conversation',
        timestamp: 'Just now',
        unreadCount: 0,
        isOnline: true,
        type: 'direct',
      };
    }
    return null;
  });

  // Sync selected conversation if initialActiveUser prop updates (e.g. tapping a different agency card)
  useEffect(() => {
    if (!initialActiveUser) return;
    const chatId = buildDirectChatId(currentUser.id, initialActiveUser.id);
    setSelectedConversation({
      id: chatId,
      user: initialActiveUser,
      lastMessage: 'Direct Inbox',
      timestamp: 'Just now',
      unreadCount: 0,
      isOnline: true,
      type: 'direct',
    });
    setShowAgencyCoinTray(true);
  }, [initialActiveUser?.id, currentUser.id]);

  const initialConversationsRef = useRef(initialConversations);
  initialConversationsRef.current = initialConversations;

  // Real-time subscription to Active Coin Seller Agencies & User's Direct Conversations
  useEffect(() => {
    if (!currentUser?.id || currentUser.id === 'user_current_01') return;
    const unsubAgencies = subscribeActiveAgencies('coin_seller', setCoinSellerAgencies);
    const unsubDirectConvs = subscribeUserDirectConversations(currentUser.id, (liveConvs) => {
      setConversationsList((prev) => {
        const groupConvs = prev.filter((c) => c.type === 'group');
        const map = new Map<string, Conversation>();
        liveConvs.forEach((c) => map.set(c.id, c));
        initialConversationsRef.current.forEach((c) => {
          const normalizedId =
            c.type === 'group' ? c.id : buildDirectChatId(currentUser.id, c.user.id);
          if (!map.has(normalizedId) && c.type !== 'group') {
            map.set(normalizedId, { ...c, id: normalizedId, type: 'direct' });
          }
        });
        return [...Array.from(map.values()), ...groupConvs];
      });
    });

    return () => {
      unsubAgencies();
      unsubDirectConvs();
    };
  }, [currentUser.id]);

  // Search in conversation list & messages
  const [searchQuery, setSearchQuery] = useState('');

  // Active Chat Message List (starts empty and loads real Firestore messages)
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Real-time Firestore sync when conversation is opened
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeChatMessages(selectedConversation.id, (firestoreMsgs) => {
      setMessages(firestoreMsgs);
    });

    return () => unsubscribe();
  }, [selectedConversation?.id]);

  // Input & Messaging States
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<MessageReplyPreview | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [activeMessageActionId, setActiveMessageActionId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<ChatMessage | null>(null);

  // Voice Note Recording States
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Group Creation Modal
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  // Message Requests & Blocked States
  const [messageRequests, setMessageRequests] = useState<Conversation[]>([]);

  const [localBlockedUsers, setLocalBlockedUsers] = useState<UserProfile[]>([]);

  const blockedUsers: UserProfile[] = persistedBlockedRecords.length > 0 || onBlockUser
    ? persistedBlockedRecords.map(blockedRecordToUserProfile)
    : localBlockedUsers;

  const blockedUserIdSet = new Set(blockedUsers.map((u) => u.id));
  const blockedByIdSet = new Set(blockedByUserIds);

  const activeDirectUserId =
    selectedConversation && selectedConversation.type !== 'group'
      ? selectedConversation.user.id
      : null;
  const isSelectedBlockedByMe = Boolean(activeDirectUserId && blockedUserIdSet.has(activeDirectUserId));
  const isSelectedBlockedMe = Boolean(activeDirectUserId && blockedByIdSet.has(activeDirectUserId));
  const isSelectedChatBlocked = isSelectedBlockedByMe || isSelectedBlockedMe;

  // Detect if current chat partner is an Active Verified Coin Seller Agency
  const activeChatAgency =
    selectedConversation && selectedConversation.type !== 'group'
      ? coinSellerAgencies.find((a) => a.ownerUid === selectedConversation.user.id) || null
      : null;

  // Detect if the logged-in user owns an active Coin Seller Agency (for replying to buyers)
  const myOwnedCoinAgency =
    coinSellerAgencies.find((a) => a.ownerUid === currentUser.id) || null;

  const activeAgencyWaHref = activeChatAgency
    ? buildWhatsAppUrl(
        activeChatAgency.whatsappNumber,
        `Salam ${activeChatAgency.name} (${activeChatAgency.agencyCode})! I am contacting you from Lenzo Party In-App Inbox. My Name: ${currentUser.name} | Lenzo ID: ${currentUser.displayId || currentUser.id.slice(0, 8)}. I want to buy Lenzo Coins.`
      )
    : '';

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [messages, selectedConversation]);

  // Send or Edit Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedConversation) return;
    if (isSelectedChatBlocked) {
      setCallToast(
        isSelectedBlockedByMe
          ? 'Unblock this user to send messages.'
          : 'You cannot send messages to this user.'
      );
      setTimeout(() => setCallToast(null), 2600);
      return;
    }

    if (editingMessageId) {
      // Edit existing message
      await editChatMessage(selectedConversation.id, editingMessageId, inputText.trim());
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessageId
            ? { ...m, text: inputText.trim(), isEdited: true }
            : m
        )
      );
      setEditingMessageId(null);
      setInputText('');
      return;
    }

    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderVip: currentUser.vipLevel,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMillis: Date.now(),
      status: 'sent',
      type: 'text',
      replyTo: replyingTo || undefined,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setReplyingTo(null);

    // Save to Firestore backend (with symmetric participant metadata so BOTH buyer & agency see inbox live!)
    await sendChatMessage(selectedConversation.id, {
      text: newMsg.text,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderDisplayId: currentUser.displayId || currentUser.id.slice(0, 8),
      senderVip: currentUser.vipLevel,
      recipientId: activeDirectUserId || undefined,
      recipientName: activeChatAgency?.name || selectedConversation.user.name,
      recipientAvatar: activeChatAgency?.ownerAvatar || selectedConversation.user.avatar,
      recipientDisplayId: selectedConversation.user.displayId || selectedConversation.user.id.slice(0, 8),
      type: 'text',
      replyTo: replyingTo || undefined,
    });

    // Update conversation snippet in local list
    setConversationsList((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? { ...c, lastMessage: newMsg.text, timestamp: 'Just now' }
          : c
      )
    );
  };

  // Send Structured Coin Purchase Request Card directly inside the Agency Inbox
  const handleSendCoinRequestCard = async (coinsCount: number, customNote?: string) => {
    if (!selectedConversation || !activeChatAgency || isSelectedChatBlocked) return;
    const cleanCoins = Math.floor(Number(coinsCount));
    if (!Number.isFinite(cleanCoins) || cleanCoins <= 0) {
      setCallToast('Please enter a valid number of coins.');
      setTimeout(() => setCallToast(null), 2200);
      return;
    }

    const buyerIdLabel = currentUser.displayId || currentUser.id.slice(0, 8);
    const noteText =
      (customNote || '').trim() ||
      `Salam ${activeChatAgency.name}! Mujhe ${cleanCoins.toLocaleString()} coins chahiye. Please share payment details.`;

    const cardPayload = {
      coins: cleanCoins,
      agencyId: activeChatAgency.id,
      agencyName: activeChatAgency.name,
      agencyCode: activeChatAgency.agencyCode,
      buyerDisplayId: buyerIdLabel,
      note: noteText,
    };

    const tempMsg: ChatMessage = {
      id: `coin_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderVip: currentUser.vipLevel,
      text: noteText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMillis: Date.now(),
      status: 'sent',
      type: 'coin_request',
      coinRequest: cardPayload,
    };

    setIsSendingCoinCard(true);
    setMessages((prev) => [...prev, tempMsg]);

    await sendChatMessage(selectedConversation.id, {
      text: noteText,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderDisplayId: buyerIdLabel,
      senderVip: currentUser.vipLevel,
      recipientId: activeChatAgency.ownerUid,
      recipientName: activeChatAgency.name,
      recipientAvatar: activeChatAgency.ownerAvatar || selectedConversation.user.avatar,
      recipientDisplayId: activeChatAgency.ownerDisplayId || activeChatAgency.agencyCode,
      type: 'coin_request',
      coinRequest: cardPayload,
    });

    setCustomCoinInput('');
    setIsSendingCoinCard(false);
    setCallToast(`Coin request card (${cleanCoins.toLocaleString()} coins) sent to ${activeChatAgency.name}!`);
    setTimeout(() => setCallToast(null), 2600);
  };

  // Agency Owner: Atomically transfer real coins to the buyer right inside the In-App Inbox
  const handleOwnerQuickSendCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myOwnedCoinAgency || !selectedConversation || selectedConversation.type === 'group') return;
    const buyer = selectedConversation.user;
    if (!buyer?.id || buyer.id === currentUser.id) return;

    const cleanAmount = Math.floor(Number(ownerSendAmount));
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      setCallToast('Enter a valid coin amount greater than 0.');
      setTimeout(() => setCallToast(null), 2600);
      return;
    }
    if (!/^\d{4,5}$/.test(ownerSendPin.trim())) {
      setCallToast('Enter your 4 or 5 digit Agency Transfer PIN.');
      setTimeout(() => setCallToast(null), 2600);
      return;
    }

    setIsOwnerSendingCoins(true);
    const res = await transferCoinsFromAgency({
      agencyId: myOwnedCoinAgency.id,
      recipient: {
        uid: buyer.id,
        fullName: buyer.name || 'Lenzo User',
        username: buyer.username || '@user',
        displayId: buyer.displayId || buyer.id.slice(0, 8),
        email: buyer.email || '',
        avatar: buyer.avatar || '',
        coins: buyer.coins || 0,
        level: buyer.level || 1,
      },
      amount: cleanAmount,
      pin: ownerSendPin.trim(),
      note: ownerSendNote.trim() || 'In-App Agency Inbox Coin Order',
    });
    setIsOwnerSendingCoins(false);

    if (!res.success) {
      setCallToast(res.error || 'Coin transfer failed.');
      setTimeout(() => setCallToast(null), 3200);
      return;
    }

    const confirmText = `✅ ${myOwnedCoinAgency.name} sent ${cleanAmount.toLocaleString()} real Coins to your Gifting Wallet!${ownerSendNote.trim() ? ` Note: ${ownerSendNote.trim()}` : ''}`;
    await sendChatMessage(selectedConversation.id, {
      text: confirmText,
      senderId: currentUser.id,
      senderName: myOwnedCoinAgency.name || currentUser.name,
      senderAvatar: myOwnedCoinAgency.ownerAvatar || currentUser.avatar,
      senderDisplayId: myOwnedCoinAgency.agencyCode || currentUser.displayId || currentUser.id.slice(0, 8),
      recipientId: buyer.id,
      recipientName: buyer.name,
      recipientAvatar: buyer.avatar,
      recipientDisplayId: buyer.displayId || buyer.id.slice(0, 8),
      type: 'text',
    });

    setOwnerSendAmount('');
    setOwnerSendPin('');
    setOwnerSendNote('');
    setShowOwnerQuickSend(false);
    setCallToast(`${cleanAmount.toLocaleString()} real Coins credited to ${buyer.name}'s wallet!`);
    setTimeout(() => setCallToast(null), 3200);
  };

  // Upload real Payment Slip / Gallery Photo directly in chat
  const handleChatImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || isSelectedChatBlocked) return;
    if (!file.type.startsWith('image/')) {
      setCallToast('Please select an image file (JPG, PNG, WebP).');
      setTimeout(() => setCallToast(null), 2400);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setCallToast('Image must be smaller than 12 MB.');
      setTimeout(() => setCallToast(null), 2400);
      return;
    }

    setIsUploadingChatImage(true);
    setIsAttachmentOpen(false);
    try {
      const uploadedUrl = await uploadUserImage(file, 'payment_slips');
      const caption = activeChatAgency ? '📷 Payment Slip Screenshot' : '📷 Photo';
      const msg: ChatMessage = {
        id: `img_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        text: caption,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAtMillis: Date.now(),
        status: 'sent',
        type: 'image',
        mediaUrl: uploadedUrl,
      };
      setMessages((prev) => [...prev, msg]);
      await sendChatMessage(selectedConversation.id, {
        text: caption,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        senderDisplayId: currentUser.displayId || currentUser.id.slice(0, 8),
        recipientId: activeDirectUserId || undefined,
        recipientName: activeChatAgency?.name || selectedConversation.user.name,
        recipientAvatar: activeChatAgency?.ownerAvatar || selectedConversation.user.avatar,
        recipientDisplayId: selectedConversation.user.displayId || selectedConversation.user.id.slice(0, 8),
        type: 'image',
        mediaUrl: uploadedUrl,
      });
    } catch (err: any) {
      setCallToast(err?.message || 'Failed to upload image. Please try again.');
      setTimeout(() => setCallToast(null), 2800);
    } finally {
      setIsUploadingChatImage(false);
      if (chatImageInputRef.current) chatImageInputRef.current.value = '';
    }
  };

  // Voice Note Handlers
  const handleStartVoiceRecord = () => {
    if (isSelectedChatBlocked) return;
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  };

  const handleStopAndSendVoice = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    if (!selectedConversation || isSelectedChatBlocked) return;

    const duration = Math.max(recordingSeconds, 2);
    const waveform = Array.from({ length: 16 }, () => Math.floor(Math.random() * 65) + 35);

    const voiceMsg: ChatMessage = {
      id: `v_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: 'Voice note',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMillis: Date.now(),
      status: 'sent',
      type: 'voice',
      voiceDuration: duration,
      voiceWaveform: waveform,
    };

    setMessages((prev) => [...prev, voiceMsg]);

    await sendChatMessage(selectedConversation.id, {
      text: '🎤 Voice message',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      recipientId: activeDirectUserId || undefined,
      type: 'voice',
      voiceDuration: duration,
      voiceWaveform: waveform,
    });
  };

  const handleCancelVoiceRecord = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  // Media Attachment Sender
  const handleSendMedia = async (type: 'image' | 'video' | 'file' | 'room_invite') => {
    if (!selectedConversation || isSelectedChatBlocked) return;
    setIsAttachmentOpen(false);

    let mediaUrl = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80';
    let text = '📷 Photo';

    if (type === 'room_invite') {
      const inviteMsg: ChatMessage = {
        id: `inv_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        text: 'Join my party room!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAtMillis: Date.now(),
        status: 'sent',
        type: 'room_invite',
        roomInvite: {
          roomId: `room_${currentUser.id}`,
          title: `${currentUser.name}'s Party Room`,
          category: 'Party',
          hostName: currentUser.name,
          hostAvatar: currentUser.avatar,
        },
      };

      setMessages((prev) => [...prev, inviteMsg]);
      await sendChatMessage(selectedConversation.id, {
        text: '🎉 Party Room Invitation',
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        recipientId: activeDirectUserId || undefined,
        type: 'room_invite',
        roomInvite: inviteMsg.roomInvite,
      });
      return;
    }

    const msg: ChatMessage = {
      id: `m_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMillis: Date.now(),
      status: 'sent',
      type,
      mediaUrl,
    };

    setMessages((prev) => [...prev, msg]);
    await sendChatMessage(selectedConversation.id, {
      text,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      recipientId: activeDirectUserId || undefined,
      type,
      mediaUrl,
    });
  };

  // Emoji Reaction Trigger
  const handleReactToMessage = async (msgId: string, emoji: string) => {
    if (!selectedConversation) return;
    setActiveMessageActionId(null);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        let reactions = m.reactions ? [...m.reactions] : [];
        const existingIdx = reactions.findIndex((r) => r.userId === currentUser.id);

        if (existingIdx >= 0) {
          if (reactions[existingIdx].emoji === emoji) {
            reactions.splice(existingIdx, 1);
          } else {
            reactions[existingIdx] = { emoji, userId: currentUser.id, userName: currentUser.name };
          }
        } else {
          reactions.push({ emoji, userId: currentUser.id, userName: currentUser.name });
        }
        return { ...m, reactions };
      })
    );

    await reactToChatMessage(selectedConversation.id, msgId, emoji, currentUser.id, currentUser.name);
  };

  // Message Actions (Delete, Pin, Star, Reply, Copy)
  const handleDeleteMessage = async (mode: 'for_everyone' | 'for_me') => {
    if (!selectedConversation || !deleteConfirmModal) return;
    const msgId = deleteConfirmModal.id;

    if (mode === 'for_everyone') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, text: '🚫 This message was deleted', deletedForEveryone: true }
            : m
        )
      );
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }

    await deleteChatMessage(selectedConversation.id, msgId, mode, currentUser.id);
    setDeleteConfirmModal(null);
  };

  const handleTogglePin = async (msg: ChatMessage) => {
    if (!selectedConversation) return;
    const nextPinned = !msg.isPinned;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isPinned: nextPinned } : m))
    );
    setActiveMessageActionId(null);
    await pinChatMessage(selectedConversation.id, msg.id, nextPinned);
  };

  const handleToggleStar = async (msg: ChatMessage) => {
    if (!selectedConversation) return;
    const nextStarred = !msg.isStarred;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isStarred: nextStarred } : m))
    );
    setActiveMessageActionId(null);
    await starChatMessage(selectedConversation.id, msg.id, nextStarred);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    setActiveMessageActionId(null);
  };

  // Message Request Actions
  const handleAcceptRequest = (req: Conversation) => {
    setMessageRequests((prev) => prev.filter((r) => r.id !== req.id));
    setConversationsList((prev) => [{ ...req, isRequest: false }, ...prev]);
    setSelectedConversation({ ...req, isRequest: false });
  };

  const handleDeleteRequest = (reqId: string) => {
    setMessageRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleBlockFromRequest = async (req: Conversation) => {
    setMessageRequests((prev) => prev.filter((r) => r.id !== req.id));
    if (onBlockUser) {
      await onBlockUser(req.user);
    } else {
      setLocalBlockedUsers((prev) =>
        prev.some((u) => u.id === req.user.id) ? prev : [...prev, req.user]
      );
    }
  };

  const handleUnblockUser = async (userId: string, userName?: string) => {
    if (onUnblockUser) {
      await onUnblockUser(userId, userName);
    } else {
      setLocalBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  // Create Group Chat
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: ChatGroup = {
      id: `grp_${Date.now()}`,
      name: newGroupName.trim(),
      avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80',
      description: newGroupDesc.trim() || 'New party group chat',
      creatorId: currentUser.id,
      adminIds: [currentUser.id],
      moderatorIds: [],
      memberIds: [currentUser.id, ...selectedGroupMembers],
      membersCount: selectedGroupMembers.length + 1,
      privacy: 'public',
      onlyAdminsCanMessage: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newConv: Conversation = {
      id: `conv_${newGroup.id}`,
      type: 'group',
      group: newGroup,
      user: currentUser,
      lastMessage: 'Group created',
      timestamp: 'Just now',
      unreadCount: 0,
      isOnline: true,
    };

    setConversationsList([newConv, ...conversationsList]);
    setIsCreateGroupOpen(false);
    setNewGroupName('');
    setNewGroupDesc('');
    setSelectedGroupMembers([]);
    setSelectedConversation(newConv);
  };

  // Tab Filtering (excludes blocked direct threads from All/Personal inbox)
  const getFilteredConversations = () => {
    return conversationsList.filter((conv) => {
      if (conv.type !== 'group') {
        const uid = conv.user?.id;
        if (uid && (blockedUserIdSet.has(uid) || blockedByIdSet.has(uid))) {
          return false;
        }
      }

      // Search filter
      const matchesSearch = !searchQuery || 
        (conv.type === 'group' 
          ? conv.group?.name.toLowerCase().includes(searchQuery.toLowerCase())
          : conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeTab === 'all') return !conv.isArchived;
      if (activeTab === 'personal') return conv.type !== 'group' && !conv.isArchived;
      if (activeTab === 'groups') return conv.type === 'group' && !conv.isArchived;
      if (activeTab === 'archived') return !!conv.isArchived;
      return true;
    });
  };

  const pinnedMessage = messages.find((m) => m.isPinned);

  return (
    <div className="w-full min-h-dvh-screen bg-[#080511] text-white pb-24 md:pb-8 flex flex-col">
      {/* 1. TOP HEADER & TABS BAR (when no active conversation is opened) */}
      {!selectedConversation ? (
        <div className="sticky top-0 z-30 bg-[#0c0718]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 safe-pt-3 pb-3">
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Header Title + Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate('home')}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-black bg-gradient-to-r from-white via-purple-200 to-[#F328D5] bg-clip-text text-transparent flex items-center gap-2">
                    Chats & Inbox
                  </h1>
                  <p className="text-[11px] text-[#A59AB8]">Instant WhatsApp-style real-time messaging</p>
                </div>
              </div>

              {/* Header Right: Create Group & Search */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shadow-[0_4px_12px_rgba(243,40,213,0.35)] active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Group</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e82a3]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations, friends, and groups..."
                className="w-full bg-[#140b25] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#786c8f] focus:outline-none focus:border-[#F328D5] transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 6 Main WhatsApp-style Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {[
                { id: 'all', label: 'All Chats', count: conversationsList.filter(c => !c.isArchived).length },
                { id: 'personal', label: 'Personal', count: conversationsList.filter(c => c.type !== 'group' && !c.isArchived).length },
                { id: 'groups', label: 'Groups', count: conversationsList.filter(c => c.type === 'group' && !c.isArchived).length },
                { id: 'requests', label: 'Requests', count: messageRequests.length, isAlert: messageRequests.length > 0 },
                { id: 'archived', label: 'Archived', count: conversationsList.filter(c => c.isArchived).length },
                { id: 'blocked', label: 'Blocked', count: blockedUsers.length },
              ].map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabKey)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-[0_4px_12px_rgba(243,40,213,0.4)]'
                        : 'bg-[#150d24] text-[#A59AB8] hover:text-white hover:bg-[#1f1336] border border-white/[0.06]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                        tab.isAlert 
                          ? 'bg-[#F328D5] text-white animate-pulse' 
                          : (isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-[#A59AB8]')
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. MAIN CONTENT BODY */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-3.5 sm:px-4 py-3">
        {/* VIEW A: Active Conversation Screen */}
        {selectedConversation ? (
          <div className="flex flex-col h-[calc(100dvh-96px-var(--safe-bottom))] sm:h-[85vh] bg-[#120a22] rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative safe-pt-2 sm:pt-0">
            {/* A1. Chat Header */}
            <div className="p-3 sm:p-3.5 bg-[#1b1031] border-b border-white/[0.08] flex items-center justify-between gap-2 z-20">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    if (onCloseChat) onCloseChat();
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Avatar & User/Group info */}
                <div 
                  onClick={() => {
                    if (selectedConversation.type !== 'group') {
                      onSelectUser(selectedConversation.user);
                    }
                  }}
                  className="flex items-center gap-2 cursor-pointer group min-w-0 flex-1"
                >
                  <div className="relative shrink-0">
                    <img
                      src={selectedConversation.type === 'group' ? selectedConversation.group?.avatar : selectedConversation.user.avatar}
                      alt={selectedConversation.type === 'group' ? selectedConversation.group?.name : selectedConversation.user.name}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-[#F328D5]/50"
                    />
                    {selectedConversation.type !== 'group' && selectedConversation.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#120a22]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors truncate flex items-center gap-1.5">
                      <span className="truncate">
                        {selectedConversation.type === 'group'
                          ? selectedConversation.group?.name
                          : activeChatAgency?.name || selectedConversation.user.name}
                      </span>
                      {activeChatAgency && (
                        <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {!activeChatAgency && selectedConversation.user.isVIP && (
                        <span className="text-[10px] text-amber-400 font-extrabold shrink-0">👑</span>
                      )}
                    </h2>
                    {activeChatAgency ? (
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[#FFC84A] text-[9px] font-black uppercase">
                          Official Coin Seller
                        </span>
                        <span className="text-[10px] font-mono text-emerald-300 font-bold">
                          {activeChatAgency.agencyCode}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#A59AB8] truncate">
                        {selectedConversation.type === 'group'
                          ? `${selectedConversation.group?.membersCount || 10} members`
                          : selectedConversation.isOnline
                            ? 'Online • Lenzo Direct Inbox'
                            : 'Last seen recently'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Header Actions */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {activeChatAgency && activeAgencyWaHref && (
                  <a
                    href={activeAgencyWaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B0E] text-[11px] font-black flex items-center gap-1 shadow-md transition-all"
                    title="Contact Agency on WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden xs:inline">WhatsApp</span>
                  </a>
                )}
                {!isSelectedChatBlocked && !activeChatAgency && (
                  <>
                    <button 
                      onClick={() => onOpenGiftShop(selectedConversation.user)}
                      className="p-2 rounded-xl bg-gradient-to-r from-[#F328D5]/20 to-[#8B20FF]/20 text-[#F328D5] hover:bg-[#F328D5]/30 transition-colors"
                      title="Send Gift"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setCallToast('Audio call request sent.');
                        setTimeout(() => setCallToast(null), 2500);
                      }}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Audio Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setCallToast('Video call request sent.');
                        setTimeout(() => setCallToast(null), 2500);
                      }}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Video Call"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </>
                )}
                {selectedConversation.type !== 'group' && selectedConversation.user.id !== currentUser.id && (
                  <button
                    onClick={async () => {
                      if (isSelectedBlockedByMe) {
                        await handleUnblockUser(selectedConversation.user.id, selectedConversation.user.name);
                        setCallToast(`Unblocked ${selectedConversation.user.name}`);
                      } else if (onBlockUser) {
                        await onBlockUser(selectedConversation.user);
                        setCallToast(`Blocked ${selectedConversation.user.name}`);
                      } else {
                        setLocalBlockedUsers((prev) =>
                          prev.some((u) => u.id === selectedConversation.user.id)
                            ? prev
                            : [...prev, selectedConversation.user]
                        );
                        setCallToast(`Blocked ${selectedConversation.user.name}`);
                      }
                      setTimeout(() => setCallToast(null), 2500);
                    }}
                    className={`p-2 rounded-xl transition-colors ${
                      isSelectedBlockedByMe
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                    }`}
                    title={isSelectedBlockedByMe ? 'Unblock User' : 'Block User'}
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {callToast && (
              <div className="px-4 py-1.5 bg-[#8B20FF]/25 border-b border-[#F328D5]/30 text-[11px] font-bold text-white text-center">
                {callToast}
              </div>
            )}

            {/* A2. Pinned Message Banner */}
            {pinnedMessage && (
              <div className="px-4 py-2 bg-[#251542] border-b border-purple-500/20 flex items-center justify-between text-xs text-purple-200">
                <div className="flex items-center gap-2 truncate">
                  <Pin className="w-3.5 h-3.5 text-[#F328D5] shrink-0" />
                  <span className="font-bold text-[#F328D5]">Pinned:</span>
                  <span className="truncate">{pinnedMessage.text}</span>
                </div>
                <button 
                  onClick={() => handleTogglePin(pinnedMessage)}
                  className="text-[10px] text-gray-400 hover:text-white shrink-0 ml-2"
                >
                  Unpin
                </button>
              </div>
            )}

            {/* A3. Messages Bubbles List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-[#100720] via-[#120a22] to-[#0c0617]">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const isDeleted = msg.deletedForEveryone;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Message Bubble Container */}
                    <div className="relative max-w-[85%] sm:max-w-[75%]">
                      {/* Popover trigger button on message hover */}
                      <button
                        onClick={() => setActiveMessageActionId(activeMessageActionId === msg.id ? null : msg.id)}
                        className={`absolute top-1 ${isMe ? '-left-6' : '-right-6'} opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition-opacity`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Floating Message Action Popover */}
                      {activeMessageActionId === msg.id && (
                        <div className={`absolute top-7 ${isMe ? 'right-0' : 'left-0'} z-30 w-48 rounded-2xl bg-[#1d1033] border border-white/15 p-1.5 shadow-2xl space-y-1 animate-in fade-in`}>
                          {/* Quick Emoji Bar */}
                          <div className="flex items-center justify-between px-2 py-1 border-b border-white/10">
                            {QUICK_EMOJIS.map((em) => (
                              <button
                                key={em}
                                onClick={() => handleReactToMessage(msg.id, em)}
                                className="hover:scale-125 transition-transform text-sm"
                              >
                                {em}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => {
                              setReplyingTo({
                                id: msg.id,
                                senderName: msg.senderName,
                                text: msg.text,
                                type: msg.type,
                              });
                              setActiveMessageActionId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-xs text-white"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5 text-blue-400" />
                            <span>Reply</span>
                          </button>

                          <button
                            onClick={() => handleCopyText(msg.text)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-xs text-white"
                          >
                            <Copy className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copy Text</span>
                          </button>

                          <button
                            onClick={() => handleToggleStar(msg)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-xs text-white"
                          >
                            <Star className={`w-3.5 h-3.5 ${msg.isStarred ? 'text-amber-400 fill-amber-400' : 'text-amber-400'}`} />
                            <span>{msg.isStarred ? 'Unstar' : 'Star Message'}</span>
                          </button>

                          <button
                            onClick={() => handleTogglePin(msg)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-xs text-white"
                          >
                            <Pin className="w-3.5 h-3.5 text-[#F328D5]" />
                            <span>{msg.isPinned ? 'Unpin' : 'Pin Message'}</span>
                          </button>

                          {isMe && !isDeleted && (
                            <button
                              onClick={() => {
                                setEditingMessageId(msg.id);
                                setInputText(msg.text);
                                setActiveMessageActionId(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-xs text-white"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Edit Message</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setDeleteConfirmModal(msg);
                              setActiveMessageActionId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-xs text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete...</span>
                          </button>
                        </div>
                      )}

                      {/* Bubble Content */}
                      <div
                        className={`rounded-2xl p-3 shadow-md ${
                          isMe
                            ? 'bg-gradient-to-tr from-[#6918c7] to-[#b3149d] text-white rounded-br-xs'
                            : 'bg-[#1e1335] border border-white/10 text-white rounded-bl-xs'
                        }`}
                      >
                        {/* Group Sender Name */}
                        {selectedConversation.type === 'group' && !isMe && (
                          <div className="text-[10px] font-black text-[#F328D5] mb-1">
                            {msg.senderName}
                          </div>
                        )}

                        {/* Quoted Reply Preview */}
                        {msg.replyTo && (
                          <div className="mb-2 p-2 rounded-xl bg-black/30 border-l-2 border-[#F328D5] text-[11px]">
                            <div className="font-bold text-[#F328D5]">{msg.replyTo.senderName}</div>
                            <div className="text-[#d8cfeb] truncate">{msg.replyTo.text}</div>
                          </div>
                        )}

                        {/* Voice Note View */}
                        {msg.type === 'voice' && (
                          <div className="flex items-center gap-3 py-1 min-w-[200px]">
                            <button
                              onClick={() => setPlayingAudioId(playingAudioId === msg.id ? null : msg.id)}
                              className="w-8 h-8 rounded-full bg-white text-[#6918c7] flex items-center justify-center hover:scale-105 transition-transform"
                            >
                              {playingAudioId === msg.id ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>
                            <div className="flex-1 space-y-1">
                              {/* Waveform Bars */}
                              <div className="flex items-center gap-1 h-6">
                                {(msg.voiceWaveform || [40, 70, 90, 60, 80, 50, 95, 70, 45, 80]).map((h, i) => (
                                  <span
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className={`w-1 rounded-full transition-all ${
                                      playingAudioId === msg.id ? 'bg-amber-300 animate-pulse' : 'bg-white/60'
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className="text-[9px] text-white/70">
                                0:{msg.voiceDuration || 12}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Image Media View (tap to zoom full payment slip / photo) */}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div className="rounded-xl overflow-hidden mb-1.5">
                            <img
                              src={msg.mediaUrl}
                              alt={msg.text || 'attachment'}
                              onClick={() => setImageLightboxUrl(msg.mediaUrl || null)}
                              className="w-full max-h-60 object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                            />
                            {msg.text && (
                              <p className="text-[11px] text-white/85 mt-1">{msg.text}</p>
                            )}
                          </div>
                        )}

                        {/* Official Coin Purchase Request Card Bubble */}
                        {msg.type === 'coin_request' && msg.coinRequest && (
                          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#2B1749] via-[#1B0D33] to-[#2F1538] border border-amber-400/55 space-y-2 min-w-[215px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/45 text-[#FFC84A] text-[9px] font-black uppercase tracking-wider">
                                <Coins className="w-3 h-3" />
                                Coin Request Card
                              </span>
                              <span className="text-[10px] font-mono font-bold text-emerald-300">
                                {msg.coinRequest.agencyCode}
                              </span>
                            </div>

                            <div className="py-1">
                              <div className="text-xl font-black font-mono text-[#FFC84A] tabular-nums leading-none">
                                {Number(msg.coinRequest.coins || 0).toLocaleString()} Coins
                              </div>
                              <p className="text-[10px] text-[#D8CEE8] mt-1 font-mono">
                                Buyer ID: <strong className="text-white">{msg.coinRequest.buyerDisplayId}</strong>
                              </p>
                            </div>

                            <p className="text-[11px] text-white/90 leading-snug">
                              {msg.coinRequest.note || msg.text}
                            </p>

                            {activeChatAgency && isMe && (
                              <button
                                type="button"
                                onClick={() => setIsSlipModalOpen(true)}
                                className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-[11px] font-black flex items-center justify-center gap-1.5 shadow active:scale-95 transition-transform"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Send Payment Slip</span>
                              </button>
                            )}

                            {myOwnedCoinAgency && !isMe && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOwnerSendAmount(String(msg.coinRequest?.coins || ''));
                                  setShowOwnerQuickSend(true);
                                }}
                                className="w-full py-2 px-2.5 rounded-xl bg-emerald-500 text-black text-[11px] font-black flex items-center justify-center gap-1.5 shadow active:scale-95 transition-transform"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Send {Number(msg.coinRequest.coins || 0).toLocaleString()} Coins Now</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Room Invite Card */}
                        {msg.type === 'room_invite' && msg.roomInvite && (
                          <div className="p-3 rounded-2xl bg-black/40 border border-purple-500/40 space-y-2.5">
                            <div className="flex items-center gap-2">
                              <Radio className="w-4 h-4 text-[#F328D5] animate-pulse" />
                              <span className="text-[10px] font-extrabold uppercase text-[#F328D5] tracking-wide">
                                Party Room Invitation
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <img
                                src={msg.roomInvite.hostAvatar}
                                alt={msg.roomInvite.hostName}
                                className="w-8 h-8 rounded-full border border-white/20"
                              />
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">
                                  {msg.roomInvite.title}
                                </h4>
                                <p className="text-[10px] text-gray-300">
                                  Host: {msg.roomInvite.hostName}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => onNavigate('rooms')}
                              className="w-full py-1.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
                            >
                              Join Stage
                            </button>
                          </div>
                        )}

                        {/* Regular Text */}
                        {msg.type === 'text' && (
                          <p className={`text-xs md:text-sm leading-relaxed ${isDeleted ? 'italic text-white/50' : 'text-white'}`}>
                            {msg.text}
                          </p>
                        )}

                        {/* Message Meta: Time, Star, Edited, Read Status Ticks */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-white/70">
                          {msg.isStarred && <Star className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />}
                          {msg.isEdited && <span className="text-[8px] italic">edited</span>}
                          <span>{msg.timestamp}</span>
                          {isMe && (
                            <span className="ml-0.5">
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3 h-3 text-cyan-300 stroke-[2.5]" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3 h-3 text-white/70" />
                              ) : (
                                <Check className="w-3 h-3 text-white/60" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Emoji Reactions Pills */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`flex items-center gap-1 -mt-2 ${isMe ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#180b2a] border border-white/20 text-[10px] shadow-lg">
                            {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((em) => (
                              <span key={em}>{em}</span>
                            ))}
                            <span className="font-bold text-white text-[9px]">
                              {msg.reactions.length}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* A4. Quoted Reply Bar / Edit Indicator */}
            {replyingTo && (
              <div className="px-4 py-2 bg-[#1b1031] border-t border-white/10 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 truncate">
                  <CornerUpLeft className="w-3.5 h-3.5 text-[#F328D5]" />
                  <span className="font-bold text-[#F328D5]">Replying to {replyingTo.senderName}:</span>
                  <span className="text-gray-300 truncate">{replyingTo.text}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {editingMessageId && (
              <div className="px-4 py-2 bg-amber-500/20 border-t border-amber-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-amber-300">Editing Message</span>
                </div>
                <button 
                  onClick={() => {
                    setEditingMessageId(null);
                    setInputText('');
                  }} 
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Hidden Real Image / Payment Slip File Input */}
            <input
              ref={chatImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleChatImageFileSelected}
              className="hidden"
            />

            {/* A5b. IN-APP COIN PURCHASING BAR (When chatting directly with an Active Coin Seller Agency) */}
            {activeChatAgency && !isSelectedChatBlocked && (
              <div className="bg-[#180C2E] border-t border-amber-400/30 px-3 py-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAgencyCoinTray((prev) => !prev)}
                    className="flex items-center gap-1.5 text-[11px] font-black text-[#FFC84A]"
                  >
                    <Coins className="w-3.5 h-3.5 shrink-0" />
                    <span>In-App Coin Purchase Cards</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        showAgencyCoinTray ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsSlipModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-[10px] font-black flex items-center gap-1 shadow"
                    >
                      <Receipt className="w-3 h-3" />
                      <span>Send Slip</span>
                    </button>
                    {activeAgencyWaHref && (
                      <a
                        href={activeAgencyWaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WA</span>
                      </a>
                    )}
                  </div>
                </div>

                {showAgencyCoinTray && (
                  <div className="space-y-2">
                    {/* Tap-to-Send Coin Request Cards */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {AGENCY_COIN_CARDS.map((coinsAmt) => (
                        <button
                          key={coinsAmt}
                          type="button"
                          disabled={isSendingCoinCard}
                          onClick={() => void handleSendCoinRequestCard(coinsAmt)}
                          className="shrink-0 px-2.5 py-1.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-[#8B20FF]/25 hover:from-amber-500/35 hover:to-[#F328D5]/35 border border-amber-400/40 text-left active:scale-95 transition-all disabled:opacity-50"
                        >
                          <span className="block text-[11px] font-mono font-black text-[#FFC84A] leading-tight">
                            🪙 {coinsAmt.toLocaleString()}
                          </span>
                          <span className="block text-[9px] text-[#E5D4FA] font-bold">
                            Tap to Request
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Custom Coin Amount Quick Card Sender */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        value={customCoinInput}
                        onChange={(e) => setCustomCoinInput(e.target.value)}
                        placeholder="Custom coins (e.g. 7500)..."
                        className="flex-1 min-w-0 bg-black/40 border border-white/15 focus:border-[#FFC84A] rounded-xl px-3 py-1.5 text-[11px] font-mono text-white placeholder-[#9B8DB5] outline-none"
                      />
                      <button
                        type="button"
                        disabled={isSendingCoinCard || !customCoinInput.trim()}
                        onClick={() => void handleSendCoinRequestCard(Number(customCoinInput))}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-[11px] font-black shrink-0 disabled:opacity-45 active:scale-95 transition-all"
                      >
                        Request Coins
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* A5c. AGENCY OWNER REAL COIN TRANSFER BAR (When an Active Coin Seller Agency Owner chats with a Buyer) */}
            {myOwnedCoinAgency &&
              !activeChatAgency &&
              selectedConversation.type !== 'group' &&
              selectedConversation.user.id !== currentUser.id &&
              !isSelectedChatBlocked && (
                <div className="bg-[#121D1A] border-t border-emerald-400/35 px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOwnerQuickSend((prev) => !prev)}
                      className="flex items-center gap-1.5 text-[11px] font-black text-emerald-300"
                    >
                      <Coins className="w-3.5 h-3.5 text-[#FFC84A] shrink-0" />
                      <span>
                        Send Real Coins to {selectedConversation.user.name} (Agency Bal:{' '}
                        {(myOwnedCoinAgency.coinBalance || 0).toLocaleString()})
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          showOwnerQuickSend ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <span className="text-[10px] font-mono text-[#FFC84A] shrink-0">
                      ID: {selectedConversation.user.displayId || selectedConversation.user.id.slice(0, 8)}
                    </span>
                  </div>

                  {showOwnerQuickSend && (
                    <form onSubmit={handleOwnerQuickSendCoins} className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          max={myOwnedCoinAgency.coinBalance}
                          required
                          value={ownerSendAmount}
                          onChange={(e) => setOwnerSendAmount(e.target.value)}
                          placeholder="Coins amount"
                          className="w-full bg-black/50 border border-white/15 focus:border-[#FFC84A] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#FFC84A] outline-none"
                        />
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={5}
                          required
                          value={ownerSendPin}
                          onChange={(e) =>
                            setOwnerSendPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))
                          }
                          placeholder="4–5 Digit PIN"
                          className="w-full bg-black/50 border border-amber-400/40 focus:border-[#FFC84A] rounded-xl px-3 py-2 text-xs font-mono tracking-[0.25em] text-white outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={120}
                          value={ownerSendNote}
                          onChange={(e) => setOwnerSendNote(e.target.value)}
                          placeholder="Note (e.g. EasyPaisa slip verified)"
                          className="flex-1 min-w-0 bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isOwnerSendingCoins}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-black text-xs font-black shrink-0 disabled:opacity-50 active:scale-95 transition-transform"
                        >
                          {isOwnerSendingCoins ? 'Sending...' : 'Send Coins'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

            {/* A5. Attachment Action Sheet */}
            {isAttachmentOpen && (
              <div className="p-3 bg-[#1d1033] border-t border-white/10 grid grid-cols-4 gap-2 animate-in slide-in-from-bottom-2">
                <button
                  type="button"
                  onClick={() => chatImageInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold">
                    {activeChatAgency ? 'Slip Photo' : 'Gallery'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMedia('room_invite')}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold">Room Invite</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMedia('file')}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold">Document</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    activeChatAgency ? setIsSlipModalOpen(true) : onOpenGiftShop(selectedConversation.user)
                  }
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center">
                    {activeChatAgency ? (
                      <Receipt className="w-5 h-5 text-black" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold">
                    {activeChatAgency ? 'Slip Form' : 'Virtual Gift'}
                  </span>
                </button>
              </div>
            )}

            {/* A6. Input Bar (or Blocked Status Banner) */}
            {isSelectedChatBlocked ? (
              <div className="p-3.5 bg-rose-950/35 border-t border-rose-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserX className="w-4 h-4 text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-200 font-medium truncate">
                    {isSelectedBlockedByMe
                      ? `You blocked ${selectedConversation.user.name}. Unblock to message or interact.`
                      : 'You cannot message or interact with this user.'}
                  </p>
                </div>
                {isSelectedBlockedByMe && (
                  <button
                    onClick={() => handleUnblockUser(selectedConversation.user.id, selectedConversation.user.name)}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/15 transition-colors"
                  >
                    Unblock
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 bg-[#170e28] border-t border-white/[0.08] flex items-center gap-2">
                {isRecordingVoice ? (
                  // Voice Recording Live Bar
                  <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-2xl bg-rose-950/40 border border-rose-500/40">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-xs font-bold text-rose-300">
                        Recording 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelVoiceRecord}
                        className="px-2.5 py-1 rounded-lg bg-white/10 text-xs text-gray-300 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleStopAndSendVoice}
                        className="p-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Standard Chat Text Input Form
                  <>
                    <button
                      type="button"
                      onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                      className="p-2 rounded-full hover:bg-white/10 text-[#A59AB8] hover:text-white transition-colors"
                      title="Attachments / Slip Photo"
                    >
                      {isUploadingChatImage ? (
                        <Loader2 className="w-5 h-5 text-[#FFC84A] animate-spin" />
                      ) : (
                        <Paperclip className="w-5 h-5" />
                      )}
                    </button>

                    <form onSubmit={handleSendMessage} className="flex-1 flex items-center relative">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={
                          activeChatAgency
                            ? `Write to ${activeChatAgency.name} (e.g. Mujhe 10,000 coins chahiye)...`
                            : 'Type a message...'
                        }
                        className="w-full bg-[#201337] border border-white/10 rounded-2xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-[#786c8f] focus:outline-none focus:border-[#F328D5] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setInputText((prev) => prev + ' 💕')}
                        className="absolute right-3 text-[#A59AB8] hover:text-white"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                    </form>

                    {inputText.trim() ? (
                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartVoiceRecord}
                        className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#F328D5] transition-colors"
                        title="Hold to record voice message"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          /* VIEW B: Conversations / Message Requests / Blocked Tabs */
          <div className="space-y-3">
            {/* TAB: Message Requests */}
            {activeTab === 'requests' && (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-xs text-[#d8cfeb]">
                  Messages from people who are not in your mutual friends list. Open requests will not reveal your read receipt until accepted.
                </div>

                {messageRequests.length === 0 ? (
                  <div className="p-12 text-center text-[#8e82a3]">
                    <ShieldAlert className="w-12 h-12 stroke-[1.2] opacity-40 mx-auto mb-2 text-[#F328D5]" />
                    <p className="text-sm font-bold text-white">No Message Requests</p>
                    <p className="text-xs mt-1">You’re all caught up!</p>
                  </div>
                ) : (
                  messageRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-[#140b25] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={req.user.avatar}
                          alt={req.user.name}
                          className="w-12 h-12 rounded-full object-cover border border-[#F328D5]/50"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate flex items-center gap-2">
                            {req.user.name}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                              Lv.{req.user.level}
                            </span>
                          </h4>
                          <p className="text-xs text-[#b8accf] truncate mt-0.5">{req.lastMessage}</p>
                          <span className="text-[10px] text-gray-500">{req.timestamp}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-gray-300 hover:text-white"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => handleBlockFromRequest(req)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-xs text-rose-300"
                        >
                          Block
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: Blocked Users */}
            {activeTab === 'blocked' && (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-200">
                  Blocked contacts will no longer be able to message you or invite you to audio rooms and live battles.
                </div>

                {blockedUsers.length === 0 ? (
                  <div className="p-12 text-center text-[#8e82a3]">
                    <UserX className="w-12 h-12 stroke-[1.2] opacity-40 mx-auto mb-2 text-rose-400" />
                    <p className="text-sm font-bold text-white">No Blocked Contacts</p>
                  </div>
                ) : (
                  blockedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-2xl bg-[#140b25] border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover grayscale"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white">{u.name}</h4>
                          <span className="text-[10px] text-gray-500">ID: {u.displayId}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(u.id, u.name)}
                        className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                      >
                        Unblock
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: Standard Conversations (All / Personal / Groups / Archived) */}
            {activeTab !== 'requests' && activeTab !== 'blocked' && (
              <div className="space-y-2">
                {getFilteredConversations().length === 0 ? (
                  <div className="p-12 text-center text-[#8e82a3]">
                    <Users className="w-12 h-12 stroke-[1.2] opacity-40 mx-auto mb-2 text-[#F328D5]" />
                    <p className="text-sm font-bold text-white">No Conversations Found</p>
                    <p className="text-xs mt-1">Start a conversation from a live room or create a new group!</p>
                  </div>
                ) : (
                  getFilteredConversations().map((conv) => {
                    const isGroup = conv.type === 'group';
                    const matchedAgency = !isGroup
                      ? coinSellerAgencies.find((a) => a.ownerUid === conv.user.id) || null
                      : null;
                    const title = isGroup ? conv.group?.name : matchedAgency?.name || conv.user.name;
                    const avatar = isGroup
                      ? conv.group?.avatar
                      : matchedAgency?.ownerAvatar || conv.user.avatar;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className="p-3.5 rounded-2xl bg-[#130a24] border border-white/[0.06] hover:border-[#F328D5]/50 hover:bg-[#1a0f30] transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar with Online/Group Icon */}
                          <div className="relative shrink-0">
                            <img
                              src={avatar}
                              alt={title}
                              className="w-12 h-12 rounded-full object-cover border border-[#F328D5]/40"
                            />
                            {!isGroup && conv.isOnline && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#130a24]" />
                            )}
                            {isGroup && (
                              <span className="absolute bottom-0 right-0 p-0.5 rounded-full bg-[#8B20FF] border-2 border-[#130a24]">
                                <Users className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </div>

                          {/* Message snippet */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors truncate">
                                {title}
                              </h3>
                              {matchedAgency && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[#FFC84A] text-[9px] font-black uppercase shrink-0">
                                  Coin Seller
                                </span>
                              )}
                              {conv.isPinned && <Pin className="w-3 h-3 text-[#F328D5]" />}
                              {conv.isMuted && <BellOff className="w-3 h-3 text-gray-400" />}
                            </div>
                            <p className="text-xs text-[#A59AB8] truncate mt-0.5 max-w-[200px] sm:max-w-md">
                              {conv.lastMessage}
                            </p>
                          </div>
                        </div>

                        {/* Timestamp & Unread Badge */}
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                          <span className="text-[10px] text-[#8e82a3]">{conv.timestamp}</span>
                          {conv.unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. MODAL: Delete Message ("Delete for Me" vs "Delete for Everyone") */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#190e2d] border border-white/15 p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Delete Message?</h3>
            <p className="text-xs text-gray-300">Choose how you want to delete this message.</p>

            <div className="space-y-2 pt-2">
              {deleteConfirmModal.senderId === currentUser.id && (
                <button
                  onClick={() => handleDeleteMessage('for_everyone')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                  Delete for Everyone
                </button>
              )}
              <button
                onClick={() => handleDeleteMessage('for_me')}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors"
              >
                Delete for Me
              </button>
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="w-full py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: Create New Group */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#170c2a] border border-white/15 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#F328D5]" />
                Create Group Chat
              </h3>
              <button onClick={() => setIsCreateGroupOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-300">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. VIP Singers Club"
                  className="w-full bg-[#201337] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white mt-1 focus:outline-none focus:border-[#F328D5]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300">Description</label>
                <textarea
                  rows={2}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What is this group about?"
                  className="w-full bg-[#201337] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white mt-1 focus:outline-none focus:border-[#F328D5]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300">Add Friends ({selectedGroupMembers.length} selected)</label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 mt-1.5 pr-1">
                  {conversationsList.filter(c => c.type !== 'group' && c.user.id !== currentUser.id).length === 0 ? (
                    <p className="text-[11px] text-[#B9AECF] py-3 text-center">
                      Start a conversation with friends first to invite them into a group.
                    </p>
                  ) : (
                    conversationsList
                      .filter((c) => c.type !== 'group' && c.user.id !== currentUser.id)
                      .map((c) => {
                        const u = c.user;
                        const isSelected = selectedGroupMembers.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              setSelectedGroupMembers((prev) =>
                                isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                              );
                            }}
                            className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-purple-900/40 border-[#F328D5]'
                                : 'bg-[#201337] border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                              <span className="text-xs font-bold text-white">{u.name}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                              isSelected ? 'bg-[#F328D5] border-[#F328D5]' : 'border-white/30'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#c415f5] text-white text-xs font-black shadow-lg disabled:opacity-50 active:scale-95 transition-all"
            >
              Create Group Now
            </button>
          </div>
        </div>
      )}

      {/* 5. IN-INBOX PAYMENT SLIP MODAL FOR ACTIVE COIN SELLER AGENCY */}
      {activeChatAgency && (
        <CoinSlipOrderModal
          isOpen={isSlipModalOpen}
          onClose={() => setIsSlipModalOpen(false)}
          agency={activeChatAgency}
          currentUser={currentUser}
        />
      )}

      {/* 6. FULLSCREEN CHAT IMAGE / PAYMENT SLIP LIGHTBOX */}
      {imageLightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setImageLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setImageLightboxUrl(null)}
            aria-label="Close Image Preview"
            className="absolute top-6 right-5 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={imageLightboxUrl}
            alt="Chat Attachment Preview"
            className="max-w-full max-h-[84vh] rounded-2xl object-contain border border-white/15 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
