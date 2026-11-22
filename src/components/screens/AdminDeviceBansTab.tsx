import React, { useEffect, useState } from 'react';
import {
  Ban,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Unlock,
} from 'lucide-react';
import {
  BannedDeviceRecord,
  adminBanDevice,
  adminUnbanDevice,
  subscribeBannedDevicesForAdmin,
} from '../../services/adminService';

interface AdminDeviceBansTabProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export const AdminDeviceBansTab: React.FC<AdminDeviceBansTabProps> = ({
  onNotify,
  onError,
}) => {
  const [devices, setDevices] = useState<BannedDeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [reasonInput, setReasonInput] = useState('Permanent Device Ban by Lenzo Administration');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeBannedDevicesForAdmin(
      (list) => {
        setDevices(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        onError(err);
      }
    );
    return () => unsub();
  }, [onError]);

  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceIdInput.trim()) {
      onError('Enter a valid Device ID to ban.');
      return;
    }
    setBusyId('manual');
    const res = await adminBanDevice({
      deviceId: deviceIdInput.trim(),
      reason: reasonInput.trim() || 'Banned by Administration',
    });
    setBusyId(null);
    if (res.success) {
      onNotify(`Device ${deviceIdInput.trim()} added to permanent Device Ban registry.`);
      setDeviceIdInput('');
    } else {
      onError(res.error || 'Failed to ban device.');
    }
  };

  const handleUnban = async (rec: BannedDeviceRecord) => {
    setBusyId(rec.deviceId);
    const res = await adminUnbanDevice({
      deviceId: rec.deviceId,
      targetUid: rec.targetUid || undefined,
      targetUserName: rec.targetUserName || undefined,
    });
    setBusyId(null);
    if (res.success) {
      onNotify(`Device ${rec.deviceId} unbanned.`);
    } else {
      onError(res.error || 'Failed to unban device.');
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleManualBan}
        className="p-4 rounded-2xl bg-[#160B2B] border border-fuchsia-400/25 space-y-2.5"
      >
        <h3 className="text-xs font-black uppercase tracking-wider text-fuchsia-300 flex items-center gap-1.5">
          <Smartphone className="w-4 h-4" />
          <span>Ban Device ID Manually</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={deviceIdInput}
            onChange={(e) => setDeviceIdInput(e.target.value)}
            placeholder="Device ID (e.g. dev_a1b2c3d4...)"
            className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
          />
          <input
            type="text"
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder="Reason for Device Ban"
            className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
          />
        </div>
        <button
          type="submit"
          disabled={busyId === 'manual'}
          className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
        >
          <Ban className="w-3.5 h-3.5" />
          <span>{busyId === 'manual' ? 'Banning...' : 'Ban Device Immediately'}</span>
        </button>
      </form>

      {loading ? (
        <div className="py-10 flex flex-col items-center gap-2 text-xs text-[#B9AECF]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#FFC84A]" />
          <span>Loading banned devices registry...</span>
        </div>
      ) : devices.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
          <ShieldCheck className="w-8 h-8 text-emerald-400/60 mx-auto" />
          <p className="text-xs font-bold text-white">No Banned Devices</p>
          <p className="text-[11px] text-[#B9AECF]">
            You can ban any user&apos;s device from the Users tab or enter a Device ID above.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {devices.map((rec) => (
            <div
              key={rec.deviceId}
              className="p-3.5 rounded-2xl bg-[#160B2B] border border-white/10 flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 font-mono text-xs font-bold">
                    {rec.deviceId}
                  </span>
                  {rec.targetUserName && (
                    <span className="text-xs font-black text-white">{rec.targetUserName}</span>
                  )}
                  {rec.targetUserEmail && (
                    <span className="text-[11px] text-[#C5B9DE]">{rec.targetUserEmail}</span>
                  )}
                </div>
                <p className="text-xs text-rose-200">{rec.reason}</p>
                <p className="text-[10px] font-mono text-[#A59AB8]">
                  Banned by {rec.bannedBy || 'Admin'} ·{' '}
                  {rec.bannedAt ? new Date(rec.bannedAt).toLocaleString() : 'Active'}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === rec.deviceId}
                onClick={() => void handleUnban(rec)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{busyId === rec.deviceId ? 'Unbanning...' : 'Unban Device'}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
