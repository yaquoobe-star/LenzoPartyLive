import React, { useEffect } from 'react';
import {
  Bell,
  Building2,
  Crown,
  Gift,
  MessageCircle,
  Radio,
  Swords,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import { PushNotificationPayload } from '../../services/pushNotificationService';

interface PushNotificationBannerProps {
  notification: PushNotificationPayload | null;
  onDismiss: () => void;
  onOpen: (notification: PushNotificationPayload) => void;
}

function getCategoryStyle(type: PushNotificationPayload['type']) {
  switch (type) {
    case 'messages':
      return {
        icon: <MessageCircle className="w-4 h-4 text-cyan-300" />,
        ring: 'border-cyan-400/45 shadow-cyan-500/20',
        pill: 'bg-cyan-500/20 text-cyan-200',
        label: 'Message',
      };
    case 'gifts':
      return {
        icon: <Gift className="w-4 h-4 text-amber-300" />,
        ring: 'border-amber-400/55 shadow-amber-500/25',
        pill: 'bg-amber-500/20 text-amber-200',
        label: 'Gift',
      };
    case 'followers':
      return {
        icon: <UserPlus className="w-4 h-4 text-pink-300" />,
        ring: 'border-pink-400/45 shadow-pink-500/20',
        pill: 'bg-pink-500/20 text-pink-200',
        label: 'Social',
      };
    case 'rooms':
      return {
        icon: <Radio className="w-4 h-4 text-fuchsia-300" />,
        ring: 'border-fuchsia-400/50 shadow-fuchsia-500/25',
        pill: 'bg-fuchsia-500/20 text-fuchsia-200',
        label: 'Live & Room',
      };
    case 'pk':
      return {
        icon: <Swords className="w-4 h-4 text-rose-300" />,
        ring: 'border-rose-400/60 shadow-rose-500/30',
        pill: 'bg-rose-500/20 text-rose-200',
        label: 'PK Battle',
      };
    case 'wallet':
      return {
        icon: <Wallet className="w-4 h-4 text-emerald-300" />,
        ring: 'border-emerald-400/50 shadow-emerald-500/25',
        pill: 'bg-emerald-500/20 text-emerald-200',
        label: 'Wallet',
      };
    case 'agency':
      return {
        icon: <Building2 className="w-4 h-4 text-indigo-300" />,
        ring: 'border-indigo-400/50 shadow-indigo-500/25',
        pill: 'bg-indigo-500/20 text-indigo-200',
        label: 'Agency',
      };
    case 'progression':
      return {
        icon: <Crown className="w-4 h-4 text-yellow-300" />,
        ring: 'border-yellow-400/55 shadow-yellow-500/25',
        pill: 'bg-yellow-500/20 text-yellow-200',
        label: 'VIP & Level',
      };
    default:
      return {
        icon: <Bell className="w-4 h-4 text-purple-300" />,
        ring: 'border-[#8B20FF]/55 shadow-[#8B20FF]/25',
        pill: 'bg-[#8B20FF]/25 text-purple-200',
        label: 'Lenzo Alert',
      };
  }
}

export const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({
  notification,
  onDismiss,
  onOpen,
}) => {
  useEffect(() => {
    if (!notification) return;
    const duration = notification.priority === 'urgent' ? 8000 : 5200;
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const style = getCategoryStyle(notification.type);

  return (
    <div
      className="fixed safe-top-offset-16 left-1/2 -translate-x-1/2 z-[180] w-[calc(100vw-24px)] max-w-md pointer-events-auto animate-fade-in select-none"
      role="status"
      aria-live="polite"
    >
      <div
        onClick={() => {
          onOpen(notification);
          onDismiss();
        }}
        className={`flex items-start gap-3 p-3.5 rounded-2xl bg-[#160C25]/95 backdrop-blur-xl border ${style.ring} shadow-2xl cursor-pointer active:scale-[0.98] transition-all`}
      >
        {/* Avatar or Category Icon */}
        {notification.avatar ? (
          <img
            src={notification.avatar}
            alt={notification.senderName || 'Lenzo Party'}
            className="w-11 h-11 rounded-xl object-cover border border-white/15 shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-[#211333] border border-white/10 flex items-center justify-center shrink-0">
            {style.icon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${style.pill}`}>
              {style.label}
            </span>
            <span className="text-[10px] text-[#B9AECF] font-mono">now</span>
          </div>
          <p className="text-xs font-extrabold text-white truncate">{notification.title}</p>
          <p className="text-[11px] text-[#C5B9DE] leading-snug line-clamp-2 mt-0.5">
            {notification.message}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Dismiss notification"
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
