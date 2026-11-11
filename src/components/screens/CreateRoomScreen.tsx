import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Users, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  Globe 
} from 'lucide-react';
import { PartyRoom, UserProfile } from '../../types';

interface CreateRoomScreenProps {
  currentUser: UserProfile;
  onClose: () => void;
  onCreateRoom: (newRoom: PartyRoom) => void;
}

export const CreateRoomScreen: React.FC<CreateRoomScreenProps> = ({
  currentUser,
  onClose,
  onCreateRoom,
}) => {
  const [roomName, setRoomName] = useState('');
  const [maxSeats, setMaxSeats] = useState<8 | 16>(8);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [coverUrl, setCoverUrl] = useState(
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
  );
  const [error, setError] = useState<string | null>(null);

  const sampleCovers = [
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    if (isPrivate && !password.trim()) {
      setError('Please enter a room password for private room');
      return;
    }

    // Initialize 8 or 16 empty seats
    const emptySeats = Array(maxSeats).fill(null);
    // Host sits in seat 0
    emptySeats[0] = currentUser;

    const newRoom: PartyRoom = {
      id: `room_${Date.now()}`,
      displayId: Math.floor(10000 + Math.random() * 90000).toString(),
      title: roomName.trim(),
      category: 'Party',
      host: currentUser,
      coverImage: coverUrl,
      iconType: 'heart',
      participantCount: `1/${maxSeats}`,
      numericParticipants: 1,
      isAudioRoom: true,
      maxSeats,
      roomType: isPrivate ? 'private' : 'public',
      password: isPrivate ? password.trim() : undefined,
      announcement: announcement.trim() || 'Welcome to my party voice room! Respect everyone and enjoy! 🎶',
      seats: emptySeats,
      isLocked: false,
      allowJoin: true,
    };

    onCreateRoom(newRoom);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#080413] flex flex-col justify-between p-4 sm:p-6 select-none animate-fade-in text-white font-sans">
      <div className="max-w-md mx-auto w-full">
        
        {/* ========================================================
            1. HEADER (Back Arrow + "Create Room")
            Matching Screenshot 1 top-right
           ======================================================== */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#160E24] hover:bg-[#201433] border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95"
            title="Back to Rooms"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-black text-white font-display">Create Room</h2>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {error && (
          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs py-2 px-3 rounded-xl mb-4 animate-shake">
            {error}
          </div>
        )}

        {/* ========================================================
            2. ADD ROOM COVER BOX
            Matching Screenshot 1 & 2
           ======================================================== */}
        <div className="relative mb-5">
          <div className="relative h-44 rounded-2xl overflow-hidden border border-dashed border-white/20 hover:border-[#FA26A0] bg-[#140D20] group cursor-pointer">
            <img
              src={coverUrl}
              alt="Room Cover"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6 text-white stroke-[1.8]" />
              </div>
              <span className="text-xs font-bold text-white">Add Room Cover</span>
            </div>
          </div>

          {/* Quick preset covers picker */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-[#9E97AA]">Presets:</span>
            {sampleCovers.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCoverUrl(c)}
                className={`w-7 h-7 rounded-lg overflow-hidden border ${coverUrl === c ? 'ring-2 ring-[#FA26A0] border-[#FA26A0]' : 'border-white/20'}`}
              >
                <img src={c} alt="preset" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================
            3. ROOM CREATION FORM
            - Room Name
            - Room Type (8 Seats vs 16 Seats)
            - Room Privacy (Public vs Private)
            - Room Password (Optional)
            - Room Announcement (Optional)
           ======================================================== */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">Room Name</label>
            <input
              type="text"
              placeholder="Enter room name..."
              value={roomName}
              onChange={(e) => {
                setRoomName(e.target.value);
                if (error) setError(null);
              }}
              className="w-full bg-[#140D20] border border-white/10 focus:border-[#FA26A0] rounded-xl px-4 py-3 text-xs text-white placeholder-[#9E97AA] outline-none transition-colors"
            />
          </div>

          {/* Room Type: 8 Seats vs 16 Seats Toggle */}
          <div>
            <label className="block text-xs font-bold text-white mb-2">Room Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMaxSeats(8)}
                className={`py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                  maxSeats === 8
                    ? 'bg-[#FA26A0] text-white shadow-lg shadow-[#FA26A0]/30'
                    : 'bg-[#140D20] text-[#9E97AA] hover:text-white border border-white/10'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>8 Seats</span>
              </button>

              <button
                type="button"
                onClick={() => setMaxSeats(16)}
                className={`py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                  maxSeats === 16
                    ? 'bg-[#FA26A0] text-white shadow-lg shadow-[#FA26A0]/30'
                    : 'bg-[#140D20] text-[#9E97AA] hover:text-white border border-white/10'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>16 Seats</span>
              </button>
            </div>
          </div>

          {/* Room Privacy: Public Room vs Private Room */}
          <div>
            <label className="block text-xs font-bold text-white mb-2">Room Privacy</label>
            <div className="space-y-2">
              {/* Option 1: Public Room */}
              <div
                onClick={() => setIsPrivate(false)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  !isPrivate 
                    ? 'bg-[#160E24] border-[#FA26A0]/60' 
                    : 'bg-[#140D20] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    !isPrivate ? 'border-[#FA26A0]' : 'border-white/30'
                  }`}>
                    {!isPrivate && <div className="w-2.5 h-2.5 rounded-full bg-[#FA26A0]" />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white">Public Room</span>
                    <span className="text-[10px] text-[#9E97AA]">Anyone can join</span>
                  </div>
                </div>
              </div>

              {/* Option 2: Private Room */}
              <div
                onClick={() => setIsPrivate(true)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  isPrivate 
                    ? 'bg-[#160E24] border-[#FA26A0]/60' 
                    : 'bg-[#140D20] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isPrivate ? 'border-[#FA26A0]' : 'border-white/30'
                  }`}>
                    {isPrivate && <div className="w-2.5 h-2.5 rounded-full bg-[#FA26A0]" />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white">Private Room</span>
                    <span className="text-[10px] text-[#9E97AA]">Only with password</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Room Password (Optional / Active when Private) */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              Room Password {isPrivate ? '*' : '(Optional)'}
            </label>
            <div className="relative flex items-center bg-[#140D20] border border-white/10 focus-within:border-[#FA26A0] rounded-xl px-3.5 py-3 transition-colors">
              <Lock className="w-4 h-4 text-[#9E97AA] shrink-0 mr-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-[#9E97AA] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#9E97AA] hover:text-white shrink-0 ml-2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Room Announcement (Optional) with 0/100 character counter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white">Room Announcement (Optional)</label>
              <span className="text-[10px] text-[#9E97AA] font-mono">{announcement.length}/100</span>
            </div>
            <textarea
              rows={3}
              maxLength={100}
              placeholder="Enter announcement..."
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              className="w-full bg-[#140D20] border border-white/10 focus:border-[#FA26A0] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#9E97AA] outline-none resize-none transition-colors"
            />
          </div>

          {/* Create Room Submit Button */}
          <div className="pt-3 pb-6">
            <button
              type="submit"
              className="w-full py-4 rounded-full bg-[#FA26A0] hover:bg-[#e01d8b] text-white font-black text-sm shadow-xl shadow-[#FA26A0]/40 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Create Room</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
