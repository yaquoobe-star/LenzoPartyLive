import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  BellRing,
  CheckCheck,
  Gift,
  UserPlus,
  Radio,
  MessageCircle,
  Wallet,
  Building2,
  Swords,
  Crown,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { NotificationActionType, NotificationCategory, NotificationItem } from '../../types';
import { auth } from '../../firebase';
import {
  PushPermissionState,
  clearAllNotifications,
  deleteSingleNotification,
  getPushPermissionState,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  normalizeNotificationCategory,
  registerDeviceForPushNotifications,
  subscribeRealTimeNotifications,
} from '../../services/pushNotificationService';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  notifications?: NotificationItem[];
  onNotificationAction?: (item: {
    actionType?: NotificationActionType;
    targetId?: string;
    senderId?: string;
    type?: NotificationCategory;
  }) => void;
}

const CATEGORIES: Array<{ id: 'all' | NotificationCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'messages', label: 'Messages' },
  { id: 'gifts', label: 'Gifts' },
  { id: 'followers', label: 'Followers' },
  { id: 'rooms', label: 'Live & Rooms' },
  { id: 'pk', label: 'PK' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'agency', label: 'Agency' },
  { id: 'progression', label: 'VIP' },
  { id: 'system', label: 'System' },
];

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onMarkAllRead,
  notifications: externalNotifications,
  onNotificationAction,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | NotificationCategory>('all');
  const [internalNotifications, setInternalNotifications] = useState<NotificationItem[]>([]);
  const [permissionState, setPermissionState] = useState<PushPermissionState>('default');
  const [enablingPush, setEnablingPush] = useState(false);

  const notifications = externalNotifications ?? internalNotifications;

  const hasExternalNotifications = externalNotifications !== undefined;

  useEffect(() => {
    if (!isOpen) return;
    void getPushPermissionState().then(setPermissionState);

    if (hasExternalNotifications) return;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setInternalNotifications([]);
      return;
    }

    const unsubscribe = subscribeRealTimeNotifications(uid, (items) => {
      setInternalNotifications(items);
    });
    return () => unsubscribe();
  }, [isOpen, hasExternalNotifications]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    return normalizeNotificationCategory(n.type) === activeTab;
  });

  const handleEnablePush = async () => {
    setEnablingPush(true);
    try {
      const res = await registerDeviceForPushNotifications({ requestPermission: true });
      setPermissionState(res.permission);
    } finally {
      setEnablingPush(false);
    }
  };

  const handleOpenItem = async (item: NotificationItem) => {
    const uid = auth.currentUser?.uid;
    if (!item.isRead && uid) {
      if (!externalNotifications) {
        setInternalNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      }
      void markNotificationAsRead(uid, item.id);
    }
    if (onNotificationAction && item.actionType && item.actionType !== 'open_notifications') {
      onClose();
      onNotificationAction({
        actionType: item.actionType,
        targetId: item.targetId,
        senderId: item.senderId,
        type: normalizeNotificationCategory(item.type),
      });
    }
  };

  const handleMarkAll = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (!externalNotifications) {
      setInternalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
    const uid = auth.currentUser?.uid;
    if (uid && unreadIds.length > 0) {
      void markAllNotificationsAsRead(uid, unreadIds);
    }
    onMarkAllRead();
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const uid = auth.currentUser?.uid;
    if (!externalNotifications) {
      setInternalNotifications((prev) => prev.filter((n) => n.id !== id));
    }
    if (uid) {
      void deleteSingleNotification(uid, id);
    }
  };

  const handleClearAll = async () => {
    const uid = auth.currentUser?.uid;
    const allIds = notifications.map((n) => n.id);
    if (!externalNotifications) {
      setInternalNotifications([]);
    }
    if (uid && allIds.length > 0) {
      void clearAllNotifications(uid, allIds);
    }
    onMarkAllRead();
  };

  const getIcon = (rawType: string) => {
    const type = normalizeNotificationCategory(rawType);
    switch (type) {
      case 'messages':
        return <MessageCircle className="w-4 h-4 text-cyan-400" />;
      case 'followers':
        return <UserPlus className="w-4 h-4 text-[#F328D5]" />;
      case 'gifts':
        return <Gift className="w-4 h-4 text-[#FFC84A]" />;
      case 'rooms':
        return <Radio className="w-4 h-4 text-[#8B20FF]" />;
      case 'pk':
        return <Swords className="w-4 h-4 text-rose-400" />;
      case 'wallet':
        return <Wallet className="w-4 h-4 text-emerald-400" />;
      case 'agency':
        return <Building2 className="w-4 h-4 text-indigo-400" />;
      case 'progression':
        return <Crown className="w-4 h-4 text-amber-300" />;
      default:
        return <Bell className="w-4 h-4 text-[#06B6D4]" />;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div
        className="w-full max-w-md bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-5 h-5 text-[#F328D5] shrink-0" />
            <h3 className="text-base font-bold text-white font-display truncate">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#F328D5] to-[#8B20FF] text-[10px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-[11px] text-[#B9AECF] hover:text-white flex items-center gap-1 font-semibold transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Read all</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                title="Clear all notifications"
                className="p-1.5 rounded-full bg-[#211333] hover:bg-rose-500/20 text-[#B9AECF] hover:text-rose-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#211333] hover:bg-[#2e1a47] flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Enable Device Push Notifications Callout */}
        {permissionState === 'default' && (
          <div className="mx-3 mt-3 p-3 rounded-2xl bg-gradient-to-r from-[#8B20FF]/20 via-[#F328D5]/15 to-[#06B6D4]/15 border border-[#F328D5]/35 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#F328D5]/25 text-[#F328D5] flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-white truncate">Turn On Push Alerts</p>
                <p className="text-[10px] text-[#C5B9DE] leading-tight">
                  Get instant alerts for chats, gifts, live hosts, PK &amp; payouts
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={enablingPush}
              onClick={() => void handleEnablePush()}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-[11px] font-black shrink-0 shadow-md active:scale-95 disabled:opacity-50"
            >
              {enablingPush ? 'Enabling...' : 'Enable'}
            </button>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 p-3 border-b border-white/[0.06] overflow-x-auto no-scrollbar">
          {CATEGORIES.map((c) => {
            const catUnread =
              c.id === 'all'
                ? unreadCount
                : notifications.filter(
                    (n) => !n.isRead && normalizeNotificationCategory(n.type) === c.id
                  ).length;
            return (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === c.id
                    ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow'
                    : 'bg-[#211333] text-[#B9AECF] hover:text-white'
                }`}
              >
                <span>{c.label}</span>
                {catUnread > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-black/35 text-[9px] font-black">
                    {catUnread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="p-3.5 overflow-y-auto no-scrollbar flex-1 space-y-2.5">
          {filteredNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => void handleOpenItem(n)}
              className={`p-3 rounded-2xl flex items-start gap-3 transition-colors cursor-pointer border group ${
                n.isRead
                  ? 'bg-[#1b102e] border-white/5 opacity-80 hover:opacity-100'
                  : 'bg-[#211333] border-[#8B20FF]/40 shadow-sm'
              }`}
            >
              {n.avatar ? (
                <img
                  src={n.avatar}
                  alt={n.senderName || 'User'}
                  className="w-10 h-10 rounded-xl object-cover border border-white/15 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#160C25] border border-white/10 flex items-center justify-center shrink-0">
                  {getIcon(n.type)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-xs font-bold text-white truncate">{n.title}</span>
                  <span className="text-[10px] text-[#B9AECF] font-mono shrink-0">{n.timestamp}</span>
                </div>
                <p className="text-xs text-[#C5B9DE] leading-snug break-words">{n.message}</p>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-[#F328D5] animate-pulse" />
                )}
                <button
                  type="button"
                  onClick={(e) => void handleDeleteItem(e, n.id)}
                  title="Delete notification"
                  className="opacity-60 hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/20 text-[#B9AECF] hover:text-rose-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {filteredNotifs.length === 0 && (
            <div className="py-12 text-center flex flex-col items-center gap-2 text-xs text-[#B9AECF]">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#F328D5]/60" />
              </div>
              <span className="font-semibold text-white/80">All caught up!</span>
              <span className="text-[11px] text-[#B9AECF]/80">
                Real-time alerts for chats, gifts, live hosts, PK, wallet &amp; agency will appear here.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
