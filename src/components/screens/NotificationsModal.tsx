import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  CheckCheck, 
  Gift, 
  UserPlus, 
  Radio, 
  Sparkles, 
  MessageCircle 
} from 'lucide-react';
import { NotificationItem } from '../../types';
import { MOCK_NOTIFICATIONS } from '../../data/mockData';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onMarkAllRead,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'followers' | 'messages' | 'gifts' | 'rooms' | 'system'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'followers', label: 'Followers' },
    { id: 'gifts', label: 'Gifts' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'system', label: 'System' },
  ];

  const filteredNotifs = notifications.filter(
    (n) => activeTab === 'all' || n.type === activeTab
  );

  const handleMarkItemRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAll = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onMarkAllRead();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'followers':
        return <UserPlus className="w-4 h-4 text-[#F328D5]" />;
      case 'gifts':
        return <Gift className="w-4 h-4 text-[#FFC84A]" />;
      case 'rooms':
        return <Radio className="w-4 h-4 text-[#8B20FF]" />;
      default:
        return <Bell className="w-4 h-4 text-[#06B6D4]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-md bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#F328D5]" />
            <h3 className="text-base font-bold text-white font-display">Notifications</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAll}
              className="text-[11px] text-[#B9AECF] hover:text-white flex items-center gap-1 font-semibold transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#211333] hover:bg-[#2e1a47] flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 p-3 border-b border-white/[0.06] overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveTab(c.id as any)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === c.id
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow'
                  : 'bg-[#211333] text-[#B9AECF] hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="p-4 overflow-y-auto no-scrollbar flex-1 space-y-2.5">
          {filteredNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkItemRead(n.id)}
              className={`p-3 rounded-2xl flex items-start gap-3 transition-colors cursor-pointer border ${
                n.isRead
                  ? 'bg-[#1b102e] border-white/5 opacity-80'
                  : 'bg-[#211333] border-[#8B20FF]/30'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[#160C25] border border-white/10 flex items-center justify-center shrink-0">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-xs font-bold text-white truncate">{n.title}</span>
                  <span className="text-[10px] text-[#B9AECF] font-mono shrink-0">{n.timestamp}</span>
                </div>
                <p className="text-xs text-[#B9AECF] leading-snug">{n.message}</p>
              </div>

              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-[#F328D5] mt-1 shrink-0 animate-pulse" />
              )}
            </div>
          ))}

          {filteredNotifs.length === 0 && (
            <div className="py-12 text-center text-xs text-[#B9AECF]">
              No notifications in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
