import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  UserCheck, 
  Search, 
  Crown,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../../types';
import { LevelBadge } from '../common/LevelBadge';
import { profileService, FollowListMember } from '../../utils/profileService';

interface FollowersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: 'followers' | 'following';
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onFollowChange?: (isFollowing: boolean) => void;
}

export const FollowersListModal: React.FC<FollowersListModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialTab = 'followers',
  currentUser,
  onSelectUser,
  onFollowChange,
}) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [followers, setFollowers] = useState<FollowListMember[]>([]);
  const [following, setFollowing] = useState<FollowListMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const [fList, fgList] = await Promise.all([
          profileService.getFollowers(userId),
          profileService.getFollowing(userId),
        ]);
        if (isSubscribed) {
          setFollowers(fList);
          setFollowing(fgList);
        }
      } catch (err) {
        console.warn('Failed to load follow lists:', err);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const currentList = activeTab === 'followers' ? followers : following;
  const filteredList = currentList.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleFollow = async (member: FollowListMember, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await profileService.toggleFollow(member.id, currentUser.id);
      
      // Update local item status
      setFollowers((prev) =>
        prev.map((item) => (item.id === member.id ? { ...item, isFollowing: res.isFollowing } : item))
      );
      setFollowing((prev) =>
        prev.map((item) => (item.id === member.id ? { ...item, isFollowing: res.isFollowing } : item))
      );

      showToast(res.isFollowing ? `Followed ${member.name}! ❤️` : `Unfollowed ${member.name}`);
      if (onFollowChange) onFollowChange(res.isFollowing);
    } catch (err: any) {
      showToast(err.message || 'Action failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-sm bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg shadow-[#8B20FF]/50 text-center animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* Top Header */}
        <div className="p-4 pb-2 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FA26A0]" />
            <h3 className="text-sm font-extrabold text-white font-display">Social Connections</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Switcher: Followers vs Following */}
        <div className="flex p-2 gap-1.5 bg-[#0F081B] border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'followers'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-md'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            <span>Followers</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-mono">
              {followers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'following'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-md'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            <span>Following</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-mono">
              {following.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 pb-1">
          <div className="flex items-center bg-[#090611] border border-white/10 rounded-2xl px-3 py-2 text-xs focus-within:border-[#FA26A0] transition-colors">
            <Search className="w-3.5 h-3.5 text-[#B9AECF] mr-2 shrink-0" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white placeholder-[#B9AECF]/50 outline-none w-full"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-7 h-7 border-2 border-[#FA26A0] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#B9AECF]">Loading {activeTab}...</span>
            </div>
          ) : filteredList.length > 0 ? (
            filteredList.map((member) => (
              <div
                key={member.id}
                onClick={() => {
                  onSelectUser({
                    id: member.id,
                    displayId: member.id.slice(0, 8),
                    name: member.name,
                    username: member.username,
                    avatar: member.avatar,
                    bio: member.bio,
                    level: member.level,
                    vipLevel: member.isVIP ? 4 : 0,
                    isVIP: member.isVIP,
                    fansCount: '12.4K',
                    followingCount: 142,
                    likesCount: '48.9K',
                    coins: 5000,
                    diamonds: 2000,
                    isFollowing: member.isFollowing,
                  });
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="relative">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-white/15"
                    />
                    {member.isVIP && (
                      <span className="absolute -top-1 -right-1 text-xs">👑</span>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate group-hover:text-pink-300 transition-colors">
                        {member.name}
                      </span>
                      <LevelBadge level={member.level} size="xs" />
                    </div>
                    <span className="text-[10px] text-[#FA26A0] font-mono truncate">
                      {member.username}
                    </span>
                    <span className="text-[10px] text-[#B9AECF] line-clamp-1">
                      {member.bio}
                    </span>
                  </div>
                </div>

                {member.id !== currentUser.id && (
                  <button
                    onClick={(e) => handleToggleFollow(member, e)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 active:scale-95 ${
                      member.isFollowing
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow'
                    }`}
                  >
                    {member.isFollowing ? (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">
                👥
              </div>
              <h4 className="text-xs font-bold text-white">No {activeTab} found</h4>
              <p className="text-[10px] text-[#B9AECF] max-w-xs">
                {searchQuery ? 'Try a different search keyword.' : `Connect with other hosts on streams and party rooms!`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
