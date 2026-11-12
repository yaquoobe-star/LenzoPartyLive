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
  ChevronDown
} from 'lucide-react';
import { 
  Conversation, 
  UserProfile, 
  ScreenType, 
  ChatMessage, 
  ChatGroup, 
  MessageReplyPreview 
} from '../../types';
import { MOCK_CONVERSATIONS, MOCK_USERS } from '../../data/mockData';
import { 
  subscribeChatMessages, 
  sendChatMessage, 
  editChatMessage, 
  deleteChatMessage, 
  reactToChatMessage, 
  pinChatMessage, 
  starChatMessage 
} from '../../services/firestoreService';

interface MessagesScreenProps {
  currentUser: UserProfile;
  conversations: Conversation[];
  onNavigate: (screen: ScreenType) => void;
  onSelectUser: (user: UserProfile) => void;
  onOpenGiftShop: (recipient: UserProfile) => void;
  activeChatUser?: UserProfile | null;
  onCloseChat?: () => void;
}

type TabKey = 'all' | 'personal' | 'groups' | 'requests' | 'archived' | 'blocked';

const QUICK_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '🙏'];

export const MessagesScreen: React.FC<MessagesScreenProps> = ({
  currentUser,
  conversations: initialConversations,
  onNavigate,
  onSelectUser,
  onOpenGiftShop,
  activeChatUser: initialActiveUser,
  onCloseChat,
}) => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [conversationsList, setConversationsList] = useState<Conversation[]>(() => {
    // Enrich initial mock conversations
    return initialConversations.map((c, idx) => ({
      ...c,
      type: idx === 1 ? 'group' : 'direct',
      group: idx === 1 ? {
        id: 'grp_music_vip',
        name: 'Linzo VIP Club 🎵',
        avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80',
        description: 'Official VIP music creators & room hosts discussion',
        creatorId: 'u2',
        adminIds: ['u2', currentUser.id],
        moderatorIds: [],
        memberIds: ['u2', 'u3', 'u4', currentUser.id],
        membersCount: 148,
        privacy: 'public',
        onlyAdminsCanMessage: false,
        createdAt: '2026-01-01',
        updatedAt: '2026-11-12',
      } : undefined,
    }));
  });

  // Selected Conversation State
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(() => {
    if (initialActiveUser) {
      return {
        id: `conv_${initialActiveUser.id}`,
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

  // Search in conversation list & messages
  const [searchQuery, setSearchQuery] = useState('');

  // Active Chat Message List
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      senderId: 'them',
      senderName: 'Zara Khan',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      text: 'Hey QueenSara! Amazing live stream tonight 👑 Loved the performance!',
      timestamp: '09:30 AM',
      createdAtMillis: Date.now() - 3600000,
      status: 'read',
      type: 'text',
      reactions: [{ emoji: '❤️', userId: currentUser.id, userName: currentUser.name }],
    },
    {
      id: 'm2',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: 'Thank you Zara! Thanks for dropping that Castle gift in the party room! 🏰',
      timestamp: '09:32 AM',
      createdAtMillis: Date.now() - 3500000,
      status: 'read',
      type: 'text',
    },
    {
      id: 'm3',
      senderId: 'them',
      senderName: 'Zara Khan',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      text: 'Voice note from after party room',
      timestamp: '09:35 AM',
      createdAtMillis: Date.now() - 3400000,
      status: 'read',
      type: 'voice',
      voiceDuration: 18,
      voiceWaveform: [40, 65, 80, 50, 95, 75, 60, 85, 45, 90, 100, 70, 50, 80, 60, 40, 75, 90],
    },
    {
      id: 'm4',
      senderId: 'them',
      senderName: 'Zara Khan',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      text: 'Join our special 8-seat music room right now!',
      timestamp: '09:40 AM',
      createdAtMillis: Date.now() - 3000000,
      status: 'read',
      type: 'room_invite',
      roomInvite: {
        roomId: 'party_music_01',
        title: 'Music Lovers Acoustic Party 🎸',
        category: 'Music',
        hostName: 'Zara Khan',
        hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      },
    },
  ]);

  // Real-time Firestore sync when conversation is opened
  useEffect(() => {
    if (!selectedConversation) return;

    const unsubscribe = subscribeChatMessages(selectedConversation.id, (firestoreMsgs) => {
      if (firestoreMsgs.length > 0) {
        setMessages(firestoreMsgs);
      }
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
  const [messageRequests, setMessageRequests] = useState<Conversation[]>([
    {
      id: 'req_unknown_1',
      user: {
        id: 'u_req_1',
        displayId: '88392',
        name: 'Alex Johnson',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        bio: 'DJ & Electronic Music Producer',
        level: 4,
        vipLevel: 0,
        isVIP: false,
        fansCount: '450',
        followingCount: 30,
        likesCount: '2.1K',
        coins: 50,
        diamonds: 10,
      },
      lastMessage: 'Hi QueenSara! Would love to collab on an audio room session this Friday.',
      timestamp: '2h ago',
      unreadCount: 1,
      isOnline: true,
      isRequest: true,
    },
    {
      id: 'req_unknown_2',
      user: {
        id: 'u_req_2',
        displayId: '90123',
        name: 'Elena Rostova',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
        bio: 'Singer and vocal coach',
        level: 6,
        vipLevel: 1,
        isVIP: true,
        fansCount: '1.2K',
        followingCount: 90,
        likesCount: '12K',
        coins: 1200,
        diamonds: 300,
      },
      lastMessage: 'Sent you a gift! Check your room ranking.',
      timestamp: '5h ago',
      unreadCount: 1,
      isOnline: false,
      isRequest: true,
    },
  ]);

  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([
    {
      id: 'blocked_1',
      displayId: '44991',
      name: 'Spam Bot 99',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      bio: 'Promoter',
      level: 1,
      vipLevel: 0,
      isVIP: false,
      fansCount: '0',
      followingCount: 500,
      likesCount: '0',
      coins: 0,
      diamonds: 0,
    },
  ]);

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

    // Save to Firestore backend
    await sendChatMessage(selectedConversation.id, {
      text: newMsg.text,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderVip: currentUser.vipLevel,
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

  // Voice Note Handlers
  const handleStartVoiceRecord = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  };

  const handleStopAndSendVoice = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    if (!selectedConversation) return;

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
    if (!selectedConversation) return;
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
          roomId: 'party_vip_tonight',
          title: '🔥 QueenSara Royal VIP Party Room',
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

  const handleBlockFromRequest = (req: Conversation) => {
    setMessageRequests((prev) => prev.filter((r) => r.id !== req.id));
    setBlockedUsers((prev) => [...prev, req.user]);
  };

  const handleUnblockUser = (userId: string) => {
    setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
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

  // Tab Filtering
  const getFilteredConversations = () => {
    return conversationsList.filter((conv) => {
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
    <div className="w-full min-h-screen bg-[#080511] text-white pb-24 md:pb-8 flex flex-col">
      {/* 1. TOP HEADER & TABS BAR (when no active conversation is opened) */}
      {!selectedConversation ? (
        <div className="sticky top-0 z-30 bg-[#0c0718]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3">
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
          <div className="flex flex-col h-[85vh] bg-[#120a22] rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
            {/* A1. Chat Header */}
            <div className="p-3.5 bg-[#1b1031] border-b border-white/[0.08] flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    if (onCloseChat) onCloseChat();
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
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
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <div className="relative">
                    <img
                      src={selectedConversation.type === 'group' ? selectedConversation.group?.avatar : selectedConversation.user.avatar}
                      alt={selectedConversation.type === 'group' ? selectedConversation.group?.name : selectedConversation.user.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#F328D5]/50"
                    />
                    {selectedConversation.type !== 'group' && selectedConversation.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#120a22]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors truncate max-w-[160px] sm:max-w-xs flex items-center gap-1.5">
                      {selectedConversation.type === 'group' ? selectedConversation.group?.name : selectedConversation.user.name}
                      {selectedConversation.user.isVIP && (
                        <span className="text-[10px] text-amber-400 font-extrabold">👑 VIP</span>
                      )}
                    </h2>
                    <p className="text-[10px] text-[#A59AB8] flex items-center gap-1">
                      {selectedConversation.type === 'group' 
                        ? `${selectedConversation.group?.membersCount || 10} members` 
                        : (selectedConversation.isOnline ? 'Online • In Party Room' : 'Last seen recently')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Header Actions */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={() => onOpenGiftShop(selectedConversation.user)}
                  className="p-2 rounded-xl bg-gradient-to-r from-[#F328D5]/20 to-[#8B20FF]/20 text-[#F328D5] hover:bg-[#F328D5]/30 transition-colors"
                  title="Send Gift"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => alert('Starting secure encrypted audio call...')}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Audio Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => alert('Starting video call session...')}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>

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

                        {/* Image Media View */}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div className="rounded-xl overflow-hidden mb-1.5">
                            <img
                              src={msg.mediaUrl}
                              alt="attachment"
                              className="w-full max-h-60 object-cover rounded-xl"
                            />
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

            {/* A5. Attachment Action Sheet */}
            {isAttachmentOpen && (
              <div className="p-3 bg-[#1d1033] border-t border-white/10 grid grid-cols-4 gap-2 animate-in slide-in-from-bottom-2">
                <button
                  onClick={() => handleSendMedia('image')}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold">Gallery</span>
                </button>

                <button
                  onClick={() => handleSendMedia('room_invite')}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold">Room Invite</span>
                </button>

                <button
                  onClick={() => handleSendMedia('file')}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold">Document</span>
                </button>

                <button
                  onClick={() => onOpenGiftShop(selectedConversation.user)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold">Virtual Gift</span>
                </button>
              </div>
            )}

            {/* A6. Input Bar (WhatsApp-style with Voice Recorder & Send) */}
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
                    onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                    className="p-2 rounded-full hover:bg-white/10 text-[#A59AB8] hover:text-white transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <form onSubmit={handleSendMessage} className="flex-1 flex items-center relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a message..."
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
                      onClick={() => handleSendMessage()}
                      className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
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
                        onClick={() => handleUnblockUser(u.id)}
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
                    const title = isGroup ? conv.group?.name : conv.user.name;
                    const avatar = isGroup ? conv.group?.avatar : conv.user.avatar;

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
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors truncate">
                                {title}
                              </h3>
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
                  {Object.values(MOCK_USERS).filter(u => u.id !== currentUser.id).map((u) => {
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
                  })}
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
    </div>
  );
};
