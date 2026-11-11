import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Send, 
  MessageCircle, 
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { UserProfile, Conversation } from '../../types';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { profileService } from '../../utils/profileService';
import { MOCK_CONVERSATIONS } from '../../data/mockData';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  currentUser: UserProfile;
  onSendInApp?: (targetUser: UserProfile, message: string) => void;
}

export const ShareProfileModal: React.FC<ShareProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  onSendInApp,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [sentInApp, setSentInApp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const shareUrl = profileService.generateShareUrl(user);
  const shareText = `Check out ${user.name} (${user.username || `@${user.displayId}`}) on Lonzo Party Live! 🎵✨`;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Profile link copied to clipboard! 📋');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Native Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user.name} on Lonzo Party Live`,
          text: shareText,
          url: shareUrl,
        });
        showToast('Profile shared successfully!');
        onClose();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // External share intent links
  const handleShareTo = (platform: 'whatsapp' | 'telegram' | 'facebook' | 'sms' | 'email') => {
    let url = '';
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'sms':
        url = `sms:?body=${encodedText}%20${encodedUrl}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(`${user.name} on Lonzo Party Live`)}&body=${encodedText}%0A%0A${encodedUrl}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      showToast(`Opening ${platform.toUpperCase()}...`);
    }
  };

  // In-app sharing to friends / conversations
  const handleShareInApp = (conv: Conversation) => {
    setSelectedConversationId(conv.id);
    setSentInApp(true);
    if (onSendInApp) {
      onSendInApp(conv.user, `Shared Profile: ${user.name} (${user.username || `@${user.displayId}`}) 🔗 ${shareUrl}`);
    }
    showToast(`Shared to ${conv.user.name} in chat! 💬`);
    setTimeout(() => {
      setSentInApp(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-sm bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg shadow-[#8B20FF]/50 text-center animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#FA26A0]" />
            <h3 className="text-sm font-extrabold text-white font-display">Share Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Preview */}
        <div className="p-4 border-b border-white/[0.06] bg-[#0F081B] flex items-center gap-3">
          <AvatarWithFrame
            src={user.avatar}
            name={user.name}
            level={user.level}
            vipLevel={user.vipLevel}
            isVIP={user.isVIP}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate flex items-center gap-1">
              <span>{user.name}</span>
              <span className="text-xs text-[#06B6D4]">✓</span>
            </h4>
            <p className="text-xs text-[#FA26A0] font-mono truncate">{user.username || `@${user.displayId}`}</p>
            <p className="text-[10px] text-[#B9AECF] truncate mt-0.5">{user.bio || 'Lonzo Party Live Creator'}</p>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Quick Copy Link Box */}
          <div>
            <span className="text-[11px] font-bold text-[#B9AECF] uppercase tracking-wider block mb-1.5">
              Unique Profile Link
            </span>
            <div className="flex items-center bg-[#090611] border border-white/10 rounded-2xl p-1.5 pl-3">
              <span className="text-xs text-white/80 font-mono truncate flex-1 mr-2">
                {shareUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-bold flex items-center gap-1.5 shadow active:scale-95 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* External Share Sheet Buttons */}
          <div>
            <span className="text-[11px] font-bold text-[#B9AECF] uppercase tracking-wider block mb-2">
              Share to Apps
            </span>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleShareTo('whatsapp')}
                className="flex flex-col items-center justify-center p-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:scale-105 transition-transform"
                title="WhatsApp"
              >
                <span className="text-xl mb-1">💬</span>
                <span className="text-[10px] font-bold text-white">WhatsApp</span>
              </button>

              <button
                onClick={() => handleShareTo('telegram')}
                className="flex flex-col items-center justify-center p-2 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:scale-105 transition-transform"
                title="Telegram"
              >
                <span className="text-xl mb-1">✈️</span>
                <span className="text-[10px] font-bold text-white">Telegram</span>
              </button>

              <button
                onClick={() => handleShareTo('facebook')}
                className="flex flex-col items-center justify-center p-2 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:scale-105 transition-transform"
                title="Facebook"
              >
                <span className="text-xl mb-1">🌐</span>
                <span className="text-[10px] font-bold text-white">Facebook</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center justify-center p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:scale-105 transition-transform"
                title="More Apps"
              >
                <Smartphone className="w-5 h-5 mb-1 text-purple-400" />
                <span className="text-[10px] font-bold text-white">More Apps</span>
              </button>
            </div>
          </div>

          {/* In-App Direct Message Sharing */}
          <div>
            <span className="text-[11px] font-bold text-[#B9AECF] uppercase tracking-wider block mb-2">
              Send in Chat (In-App)
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar pr-1">
              {MOCK_CONVERSATIONS.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleShareInApp(conv)}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={conv.user.avatar}
                      alt={conv.user.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/15"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{conv.user.name}</span>
                      <span className="text-[10px] text-[#B9AECF] truncate">{conv.user.username || `@${conv.user.displayId}`}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-full bg-[#FA26A0]/20 group-hover:bg-[#FA26A0] text-[#FA26A0] group-hover:text-white text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
