import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  UserCheck,
  Search,
  Heart,
  Play,
} from 'lucide-react';
import { UserProfile, VideoItem } from '../../types';
import { LevelBadge } from '../common/LevelBadge';
import { profileService, FollowListMember } from '../../utils/profileService';

interface FollowersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: 'followers' | 'following' | 'likes';
  currentUser: UserProfile;
  userPublishedVideos?: VideoItem[];
  totalLikesCount?: number;
  onSelectUser: (user: UserProfile) => void;
  onSelectVideo?: (video: VideoItem) => void;
  onFollowChange?: (isFollowing: boolean) => void;
}

export const FollowersListModal: React.FC<FollowersListModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialTab = 'followers',
  currentUser,
  userPublishedVideos = [],
  totalLikesCount = 0,
  onSelectUser,
  onSelectVideo,
  onFollowChange,
}) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'likes'>(initialTab);
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
    setTimeout(() => setToastMessage(null), 2400);
  };

  const currentList = activeTab === 'followers' ? followers : following;
  const filteredList = currentList.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedLikedContent = [...userPublishedVideos].sort(
    (a, b) => (b.likesCount || 0) - (a.likesCount || 0)
  );

  const handleToggleFollow = async (member: FollowListMember, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await profileService.toggleFollow(member.id, currentUser.id);
      setFollowers((prev) =>
        prev.map((item) => (item.id === member.id ? { ...item, isFollowing: res.isFollowing } : item))
      );
      setFollowing((prev) =>
        prev.map((item) => (item.id === member.id ? { ...item, isFollowing: res.isFollowing } : item))
      );
      showToast(res.isFollowing ? `Followed ${member.name}` : `Unfollowed ${member.name}`);
      if (onFollowChange) onFollowChange(res.isFollowing);
    } catch (err: any) {
      showToast(err.message || 'Action failed');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#140B24] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 sm:hidden" />

        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-[#8B20FF] text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg text-center">
            {toastMessage}
          </div>
        )}

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FA26A0]" />
            <h3 className="text-sm font-extrabold text-white">Profile Connections & Likes</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Connections"
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Tabs */}
        <div className="grid grid-cols-3 p-2 gap-1.5 bg-[#0E071B] border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab('following')}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'following'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            <span>Following</span>
            <span className="text-[10px] font-mono tabular-nums opacity-85">({following.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('followers')}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'followers'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            <span>Followers</span>
            <span className="text-[10px] font-mono tabular-nums opacity-85">({followers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('likes')}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'likes'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
                : 'text-[#B9AECF] hover:text-white'
            }`}
          >
            <span>Likes</span>
            <span className="text-[10px] font-mono tabular-nums opacity-85">({totalLikesCount})</span>
          </button>
        </div>

        {/* Search Bar for Followers/Following */}
        {activeTab !== 'likes' && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center bg-[#090611] border border-white/10 rounded-xl px-3 py-2.5 text-xs focus-within:border-[#FA26A0]">
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
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {activeTab === 'likes' ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#24103E] to-[#160B2A] border border-[#FA26A0]/30 text-center">
                <div className="w-11 h-11 rounded-2xl bg-[#FA26A0]/20 text-[#FA26A0] flex items-center justify-center mx-auto mb-2">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <p className="text-2xl font-black text-white font-mono tabular-nums">
                  {totalLikesCount.toLocaleString()}
                </p>
                <p className="text-xs text-[#B9AECF] mt-0.5">
                  Total likes received across {userPublishedVideos.length} published moment{userPublishedVideos.length === 1 ? '' : 's'}
                </p>
              </div>

              {sortedLikedContent.length === 0 ? (
                <div className="py-8 text-center rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4">
                  <p className="text-xs font-bold text-white">No likes received yet</p>
                  <p className="text-[11px] text-[#B9AECF] mt-1">
                    Upload videos or moments from the + tab to earn likes from the community.
                  </p>
                </div>
              ) : (
                sortedLikedContent.map((vid) => (
                  <button
                    key={vid.id}
                    onClick={() => {
                      if (onSelectVideo) onSelectVideo(vid);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-14 rounded-xl overflow-hidden bg-black shrink-0">
                        <img
                          src={vid.thumbnailUrl || vid.videoUrl}
                          alt={vid.description}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white line-clamp-2">
                          {vid.description || 'Lenzo Party Moment'}
                        </p>
                        <p className="text-[10px] text-[#B9AECF] mt-0.5">{vid.createdAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#FA26A0] shrink-0 tabular-nums">
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>{(vid.likesCount || 0).toLocaleString()}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : isLoading ? (
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
                    displayId: member.id.slice(0, 8).toUpperCase(),
                    name: member.name,
                    username: member.username,
                    avatar: member.avatar,
                    bio: member.bio,
                    level: member.level,
                    vipLevel: member.isVIP ? 1 : 0,
                    isVIP: member.isVIP,
                    fansCount: '0',
                    followingCount: 0,
                    likesCount: '0',
                    coins: 0,
                    diamonds: 0,
                    isFollowing: member.isFollowing,
                  });
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-white/15"
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{member.name}</span>
                      <LevelBadge level={member.level} size="xs" />
                    </div>
                    <span className="text-[11px] text-[#FA26A0] font-mono truncate">
                      {member.username}
                    </span>
                    {member.bio && (
                      <span className="text-[10px] text-[#B9AECF] line-clamp-1">{member.bio}</span>
                    )}
                  </div>
                </div>

                {member.id !== currentUser.id && (
                  <button
                    onClick={(e) => handleToggleFollow(member, e)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 active:scale-95 ${
                      member.isFollowing
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
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
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4">
              <Users className="w-8 h-8 text-[#B9AECF]/50" />
              <h4 className="text-xs font-bold text-white">No {activeTab} yet</h4>
              <p className="text-[11px] text-[#B9AECF] max-w-xs">
                {searchQuery
                  ? 'No users match that search keyword.'
                  : 'Connect with hosts and creators in Live Streams and Party Rooms!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
