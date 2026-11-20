import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Send,
  Smartphone,
  Hash,
} from 'lucide-react';
import { UserProfile, Conversation } from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { profileService } from '../../utils/profileService';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  currentUser: UserProfile;
  conversations?: Conversation[];
  onSendInApp?: (targetUser: UserProfile, message: string) => void;
}

export const ShareProfileModal: React.FC<ShareProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  conversations = [],
  onSendInApp,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const shareUrl = profileService.generateShareUrl(user);
  const shareText = `Join ${user.name} (${user.username || `@${user.displayId}`} · ID: ${user.displayId}) on Lenzo Party Live!`;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast('Profile link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(user.displayId);
      setCopiedId(true);
      showToast(`Lenzo ID ${user.displayId} copied`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user.name} · Lenzo Party Live`,
          text: shareText,
          url: shareUrl,
        });
        showToast('Shared successfully');
        onClose();
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    handleCopyLink();
  };

  const handleShareTo = (platform: 'whatsapp' | 'telegram' | 'sms' | 'email') => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    let url = '';

    if (platform === 'whatsapp') url = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
    if (platform === 'telegram') url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    if (platform === 'sms') url = `sms:?body=${encodedText}%20${encodedUrl}`;
    if (platform === 'email') {
      url = `mailto:?subject=${encodeURIComponent(`${user.name} on Lenzo Party Live`)}&body=${encodedText}%0A%0A${encodedUrl}`;
    }

    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Opening ${platform}...`);
    }
  };

  const handleShareInApp = (conv: Conversation) => {
    if (onSendInApp) {
      onSendInApp(
        conv.user,
        `Shared Lenzo Party Profile: ${user.name} (ID: ${user.displayId}) — ${shareUrl}`
      );
    }
    showToast(`Sent to ${conv.user.name}`);
    setTimeout(() => onClose(), 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#140B24] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 sm:hidden" />

        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg text-center">
            {toastMessage}
          </div>
        )}

        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#FA26A0]" />
            <h3 className="text-sm font-extrabold text-white">Share Lenzo Profile</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Share Profile"
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite Card Preview */}
        <div className="p-4 border-b border-white/[0.06] bg-gradient-to-br from-[#231042] via-[#150A28] to-[#0E071B]">
          <div className="flex items-center gap-3.5">
            <AvatarWithFrame
              src={user.avatar}
              name={user.name}
              level={user.level}
              vipLevel={user.equippedVipFrame || user.vipLevel}
              isVIP={user.isVIP}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-extrabold text-white truncate">{user.name}</h4>
              <p className="text-xs text-[#FA26A0] font-mono truncate">
                {user.username || `@${user.displayId}`}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-[#B9AECF] font-mono">
                <span>ID: {user.displayId}</span>
                <span>·</span>
                <span>Lv.{user.level}</span>
                {user.agencyName && (
                  <>
                    <span>·</span>
                    <span className="truncate text-[#C084FC]">{user.agencyName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Primary Native Share + Copy ID */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleNativeShare}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-[#8B20FF]/25 active:scale-95 transition-transform"
            >
              <Smartphone className="w-4 h-4" />
              <span>Share Now</span>
            </button>
            <button
              onClick={handleCopyId}
              className="py-3 px-4 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Hash className="w-4 h-4 text-[#FFC84A]" />}
              <span>{copiedId ? 'ID Copied' : `Copy ID ${user.displayId}`}</span>
            </button>
          </div>

          {/* Shareable Profile Link */}
          <div>
            <span className="text-[11px] font-bold text-[#B9AECF] uppercase tracking-wider block mb-1.5">
              Shareable Profile Link
            </span>
            <div className="flex items-center bg-[#090611] border border-white/10 rounded-2xl p-1.5 pl-3">
              <span className="text-xs text-white/80 font-mono truncate flex-1 mr-2">
                {shareUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Quick External Channels */}
          <div className="grid grid-cols-4 gap-2">
            {([
              { id: 'whatsapp', label: 'WhatsApp', glyph: '💬' },
              { id: 'telegram', label: 'Telegram', glyph: '✈️' },
              { id: 'sms', label: 'Message', glyph: '📩' },
              { id: 'email', label: 'Email', glyph: '✉️' },
            ] as const).map((item) => (
              <button
                key={item.id}
                onClick={() => handleShareTo(item.id)}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] transition-colors"
              >
                <span className="text-lg mb-1">{item.glyph}</span>
                <span className="text-[11px] font-semibold text-white">{item.label}</span>
              </button>
            ))}
          </div>

          {/* In-App Direct Share */}
          <div>
            <span className="text-[11px] font-bold text-[#B9AECF] uppercase tracking-wider block mb-2">
              Send in Lenzo Chat
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-xs text-[#B9AECF]/70 text-center py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  No recent chats yet. Copy your profile link to invite friends!
                </p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleShareInApp(conv)}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] cursor-pointer border border-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={conv.user.avatar}
                        alt={conv.user.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{conv.user.name}</p>
                        <p className="text-[10px] text-[#B9AECF] truncate">
                          {conv.user.username || `@${conv.user.displayId}`}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#FA26A0]/20 text-[#FA26A0] text-[11px] font-bold flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      <span>Send</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
