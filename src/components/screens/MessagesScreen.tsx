import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Send, 
  Smile, 
  Gift, 
  MoreVertical, 
  CheckCheck, 
  User, 
  Bell, 
  Users 
} from 'lucide-react';
import { Conversation, UserProfile, ScreenType, ChatMessage } from '../../types';
import { MOCK_CONVERSATIONS } from '../../data/mockData';

interface MessagesScreenProps {
  currentUser: UserProfile;
  conversations: Conversation[];
  onNavigate: (screen: ScreenType) => void;
  onSelectUser: (user: UserProfile) => void;
  onOpenGiftShop: (recipient: UserProfile) => void;
  activeChatUser?: UserProfile | null;
  onCloseChat?: () => void;
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({
  currentUser,
  conversations,
  onNavigate,
  onSelectUser,
  onOpenGiftShop,
  activeChatUser: initialActiveUser,
  onCloseChat,
}) => {
  const [activeTab, setActiveTab] = useState<'Chat' | 'Fans' | 'System'>('Chat');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    initialActiveUser
      ? conversations.find((c) => c.user.id === initialActiveUser.id) || {
          id: `conv_${initialActiveUser.id}`,
          user: initialActiveUser,
          lastMessage: 'Started chat',
          timestamp: 'Just now',
          unreadCount: 0,
          isOnline: true,
        }
      : null
  );

  const [chatMessages, setChatMessages] = useState<Record<string, { id: string; sender: 'me' | 'them'; text: string; time: string }[]>>({
    conv_kingraja: [
      { id: '1', sender: 'them', text: 'Hey QueenSara! Amazing live stream tonight 👑', time: '9:30 AM' },
      { id: '2', sender: 'me', text: 'Thank you KingRaja! Thanks for dropping that Castle gift! 🏰', time: '9:35 AM' },
      { id: '3', sender: 'them', text: 'Hi 💕 Welcome to my room anytime!', time: '9:41 AM' },
    ],
    conv_ayesha: [
      { id: '1', sender: 'them', text: 'Beautiful stream yesterday! 💕', time: '9:40 AM' },
      { id: '2', sender: 'me', text: 'Ayesha dear, let’s do a duet tomorrow! 🎶', time: '9:42 AM' }
    ]
  });

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const currentChatList = selectedConversation ? (chatMessages[selectedConversation.id] || [
    { id: '1', sender: 'them', text: selectedConversation.lastMessage, time: selectedConversation.timestamp }
  ]) : [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConversation) return;

    const newMsg = {
      id: `m_${Date.now()}`,
      sender: 'me' as const,
      text: inputText.trim(),
      time: 'Just now',
    };

    setChatMessages((prev) => ({
      ...prev,
      [selectedConversation.id]: [...(prev[selectedConversation.id] || []), newMsg],
    }));

    setInputText('');
  };

  const filteredConversations = conversations.filter(
    (c) => !searchQuery || c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full pb-20 sm:pb-12 animate-fade-in">
      <div className="max-w-2xl mx-auto px-3.5 sm:px-6 pt-3 space-y-4">
        
        {/* If Active Chat view is open with a specific user */}
        {selectedConversation ? (
          <div className="flex flex-col h-[82vh] bg-[#160C25] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Direct Chat Top Bar */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#211333] border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    if (onCloseChat) onCloseChat();
                  }}
                  className="w-8 h-8 rounded-full bg-[#160C25] hover:bg-[#28173e] flex items-center justify-center text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div 
                  onClick={() => onSelectUser(selectedConversation.user)}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <div className="relative">
                    <img
                      src={selectedConversation.user.avatar}
                      alt={selectedConversation.user.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-[#8B20FF]"
                    />
                    {selectedConversation.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#160C25]" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white group-hover:text-[#F328D5] transition-colors leading-tight">
                      {selectedConversation.user.name}
                    </span>
                    <span className="text-[10px] text-[#B9AECF]">
                      {selectedConversation.isOnline ? 'Active Now' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenGiftShop(selectedConversation.user)}
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FFC84A] to-[#F59E0B] flex items-center justify-center text-[#090611] shadow transition-transform active:scale-95"
                  title="Send Gift"
                >
                  <Gift className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
              <div className="text-center text-[10px] text-[#B9AECF] my-2">
                End-to-end encrypted session • Lonzo Party Live
              </div>

              {currentChatList.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-md ${
                      m.sender === 'me'
                        ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white rounded-br-none'
                        : 'bg-[#211333] text-white border border-white/10 rounded-bl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-[#B9AECF]">
                    <span>{m.time}</span>
                    {m.sender === 'me' && <CheckCheck className="w-3 h-3 text-[#06B6D4]" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-[#160C25] border-t border-white/[0.08] flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-[#211333] border border-white/10 focus:border-[#F328D5] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#B9AECF]/50 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95 shadow-md shadow-[#F328D5]/30"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Normal Inbox Conversations List matching reference */
          <>
            {/* Header Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate('home')}
                  className="w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-xl font-extrabold text-white font-display">Messages</h2>
              </div>
            </div>

            {/* Filter Tabs matching reference: "Chat", "Fans", "System" */}
            <div className="flex p-1 bg-[#160C25] rounded-2xl border border-white/10">
              {[
                { id: 'Chat', label: 'Chat', badge: 3 },
                { id: 'Fans', label: 'Fans', badge: null },
                { id: 'System', label: 'System', badge: 1 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/20'
                      : 'text-[#B9AECF] hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="w-4 h-4 rounded-full bg-white text-[#090611] text-[9px] font-black flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'Chat' && (
              /* Conversation list items matching reference screenshot */
              <div className="space-y-2">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/10 hover:border-[#8B20FF]/50 transition-all cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={conv.user.avatar}
                          alt={conv.user.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-[#F328D5] transition-all"
                        />
                        {conv.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#160C25]" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors truncate">
                          {conv.user.name}
                        </span>
                        <span className="text-xs text-[#B9AECF] truncate">
                          {conv.lastMessage}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className="text-[11px] text-[#B9AECF] font-mono">
                        {conv.timestamp}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-gradient-to-r from-[#F328D5] to-[#8B20FF] text-white text-[10px] font-extrabold flex items-center justify-center shadow">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Fans' && (
              <div className="py-12 text-center flex flex-col items-center">
                <Users className="w-12 h-12 text-[#B9AECF]/40 mb-2" />
                <h4 className="text-sm font-bold text-white mb-1">Fan Club Activity</h4>
                <p className="text-xs text-[#B9AECF] max-w-xs">
                  Your fan badges, top supporters, and follower alerts appear here.
                </p>
              </div>
            )}

            {activeTab === 'System' && (
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-[#160C25] border border-white/10 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#8B20FF]/20 text-[#8B20FF] flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">VIP Daily Login Bonus</span>
                    <span className="text-[11px] text-[#B9AECF] mt-0.5">
                      Your VIP 4 privileges earned you 100 bonus party coins today!
                    </span>
                    <span className="text-[10px] text-[#FFC84A] font-mono mt-1">2h ago</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
