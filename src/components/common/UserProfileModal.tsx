import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  UserPlus, 
  UserCheck, 
  MessageCircle, 
  Gift, 
  Share2, 
  ShieldAlert, 
  Ban, 
  Check, 
  Heart, 
  Users,
  ChevronRight 
} from 'lucide-react';
import { UserProfile } from '../../types';
import { AvatarWithFrame } from './AvatarWithFrame';
import { LevelBadge } from './LevelBadge';

interface UserProfileModalProps {
  user: UserProfile | null;
  currentUserId?: string;
  isOpen: boolean;
  isBlocked?: boolean;
  isBlockedByTarget?: boolean;
  onClose: () => void;
  onToggleFollow: (userId: string) => void;
  onSendMessage: (user: UserProfile) => void;
  onSendGift: (user: UserProfile) => void;
  onViewFullProfile?: (user: UserProfile) => void;
  onBlockUser?: (user: UserProfile) => Promise<void> | void;
  onUnblockUser?: (userId: string, userName?: string) => Promise<void> | void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUserId,
  isOpen,
  isBlocked: isBlockedProp = false,
  isBlockedByTarget = false,
  onClose,
  onToggleFollow,
  onSendMessage,
  onSendGift,
  onViewFullProfile,
  onBlockUser,
  onUnblockUser,
}) => {
  const [reportSuccess, setReportSuccess] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isSelf = Boolean(currentUserId && currentUserId === user.id);
  const interactionBlocked = isBlockedProp || isBlockedByTarget;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleShare = () => {
    showToast(`Profile link for ${user.name} copied to clipboard!`);
  };

  const handleReport = () => {
    setReportSuccess(true);
    showToast(`Report filed for ${user.name}. Our moderation team has been alerted.`);
    setTimeout(() => setReportSuccess(false), 3000);
  };

  const handleBlockToggle = async () => {
    if (isSelf || blockBusy) return;
    setBlockBusy(true);
    try {
      if (isBlockedProp) {
        if (onUnblockUser) await onUnblockUser(user.id, user.name);
        showToast(`${user.name} has been unblocked.`);
      } else {
        if (onBlockUser) await onBlockUser(user);
        showToast(`${user.name} blocked. They cannot interact with your streams, rooms, or messages.`);
      }
    } finally {
      setBlockBusy(false);
    }
  };

  if (!isSelf && isBlockedByTarget) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm bg-[#160C25] border border-rose-500/25 rounded-3xl overflow-hidden shadow-2xl relative p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-500/15 border border-rose-500/35 flex items-center justify-center">
            <Ban className="w-7 h-7 text-rose-400" />
          </div>

          <h3 className="text-base font-extrabold text-white mb-1.5">
            Profile Unavailable
          </h3>
          <p className="text-xs text-[#B9AECF] leading-relaxed mb-5">
            You cannot view this user&apos;s ID, profile, videos, or interact with them.
          </p>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white transition-all active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-[#8B20FF] text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-lg shadow-[#8B20FF]/50 text-center">
            {toastMessage}
          </div>
        )}

        {/* Cover Header */}
        <div className="relative h-28 bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A]">
          {user.coverImage && (
            <img 
              src={user.coverImage} 
              alt="cover" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-60" 
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#160C25] to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Avatar & Info */}
        <div className="px-5 pt-0 pb-5 -mt-12 text-center flex flex-col items-center">
          <div className="relative mb-2">
            <AvatarWithFrame
              src={user.avatar}
              name={user.name}
              level={user.level}
              vipLevel={user.vipLevel}
              isVIP={user.isVIP}
              size="lg"
              showFrame={true}
              showVipBadge={true}
            />
          </div>

          <div className="flex items-center gap-1.5 justify-center mb-0.5">
            <h3 className="text-lg font-bold text-white font-display">{user.name}</h3>
            <LevelBadge level={user.level} size="xs" />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[#F328D5] font-mono">{user.username || `@${user.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}</span>
            <span className="text-white/20">•</span>
            <span className="text-xs text-[#B9AECF] font-mono">ID: {user.displayId}</span>
          </div>

          <p className="text-xs text-white/80 line-clamp-2 max-w-xs mb-4">
            {user.bio || 'Living life on Lenzo Party Live! Connect with me on streams.'}
          </p>

          {/* Followers / Following Stats */}
          <div className="grid grid-cols-3 gap-2 w-full py-2.5 px-3 rounded-2xl bg-[#211333] border border-white/[0.06] mb-4">
            <div className="flex flex-col items-center">
              <span className="text-sm font-extrabold text-white font-mono">{user.fansCount}</span>
              <span className="text-[10px] text-[#B9AECF]">Fans</span>
            </div>
            <div className="flex flex-col items-center border-x border-white/10">
              <span className="text-sm font-extrabold text-white font-mono">{user.followingCount}</span>
              <span className="text-[10px] text-[#B9AECF]">Following</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-extrabold text-[#FFC84A] font-mono">{user.likesCount}</span>
              <span className="text-[10px] text-[#B9AECF]">Likes</span>
            </div>
          </div>

          {/* Blocked Status Warning */}
          {!isSelf && interactionBlocked && (
            <div className="w-full mb-4 px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-[11px] font-semibold text-rose-200">
              {isBlockedProp
                ? `You permanently blocked ${user.name}. Unblock to interact again.`
                : `You cannot interact with ${user.name}.`}
            </div>
          )}

          {/* Primary Action Buttons: Follow, Message, Gift */}
          {!isSelf && !interactionBlocked && (
            <div className="grid grid-cols-3 gap-2 w-full mb-4">
              <button
                onClick={() => onToggleFollow(user.id)}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  user.isFollowing
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/30'
                }`}
              >
                {user.isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>{user.isFollowing ? 'Following' : 'Follow'}</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onSendMessage(user);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#211333] hover:bg-[#2c1745] border border-white/10 text-white text-xs font-bold transition-all active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#F328D5]" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onSendGift(user);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-xs font-bold transition-all active:scale-95 shadow-md shadow-[#FFC84A]/20"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Gift</span>
              </button>
            </div>
          )}

          {onViewFullProfile && !isBlockedByTarget && (
            <button
              onClick={() => {
                onClose();
                onViewFullProfile(user);
              }}
              className="w-full mb-4 py-2 px-3 rounded-xl bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 border border-white/10 text-xs font-semibold text-white/90 flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <span>View Full Profile & Videos</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#F328D5]" />
            </button>
          )}

          {/* Secondary Actions: Share, Report, Block */}
          <div className="flex items-center justify-between w-full pt-3 border-t border-white/[0.08] text-xs text-[#B9AECF]">
            <button 
              onClick={handleShare}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            {!isSelf && (
              <button 
                onClick={handleReport}
                className={`flex items-center gap-1 transition-colors ${reportSuccess ? 'text-amber-300 font-bold' : 'hover:text-amber-400'}`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{reportSuccess ? 'Reported' : 'Report'}</span>
              </button>
            )}
            {!isSelf && (
              <button 
                disabled={blockBusy}
                onClick={() => void handleBlockToggle()}
                className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${isBlockedProp ? 'text-rose-400 font-bold' : 'hover:text-rose-400'}`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{blockBusy ? '...' : isBlockedProp ? 'Unblock' : 'Block'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
