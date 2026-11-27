import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileClock,
  Flag,
  PowerOff,
  Search,
  ShieldAlert,
  Smartphone,
  UserX,
  XCircle,
} from 'lucide-react';
import {
  AdminAuditLogRecord,
  adminSetUserSuspension,
} from '../../services/adminService';
import {
  AdminReportRecord,
  adminEndLiveStream,
  adminEndPartyRoom,
  adminUpdateReportStatus,
} from '../../services/superAdminService';
import { AdminDeviceBansTab } from '../screens/AdminDeviceBansTab';

interface AdminModerationSectionProps {
  reports: AdminReportRecord[];
  auditLogs: AdminAuditLogRecord[];
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

type ModSubTab = 'reports' | 'activity_log' | 'device_bans';

export const AdminModerationSection: React.FC<AdminModerationSectionProps> = ({
  reports,
  auditLogs,
  onNotify,
  onError,
}) => {
  const [subTab, setSubTab] = useState<ModSubTab>('reports');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'open' | 'reviewing' | 'resolved' | 'dismissed'>('all');
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'user' | 'room' | 'stream' | 'reel'>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const [logSearch, setLogSearch] = useState('');

  const openCount = useMemo(
    () => reports.filter((r) => r.status === 'open' || r.status === 'reviewing').length,
    [reports]
  );

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (reportStatusFilter !== 'all' && r.status !== reportStatusFilter) return false;
      if (reportTypeFilter !== 'all' && r.targetType !== reportTypeFilter) return false;
      return true;
    });
  }, [reports, reportStatusFilter, reportTypeFilter]);

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q) ||
        l.targetLabel.toLowerCase().includes(q) ||
        l.adminEmail.toLowerCase().includes(q)
    );
  }, [auditLogs, logSearch]);

  const handleReportDecision = async (
    report: AdminReportRecord,
    status: 'reviewing' | 'resolved' | 'dismissed',
    actionTaken?: string
  ) => {
    setBusyReportId(report.id);
    const res = await adminUpdateReportStatus({
      reportId: report.id,
      status,
      adminNote: adminNote.trim() || report.adminNote,
      actionTaken: actionTaken || report.actionTaken || `Marked as ${status}`,
    });
    setBusyReportId(null);
    if (res.success) {
      onNotify(`Report ${report.id} updated to "${status}".`);
      setAdminNote('');
    } else {
      onError(res.error || 'Failed to update report status.');
    }
  };

  const handleSuspendReportedAccount = async (report: AdminReportRecord) => {
    const targetUid = report.targetOwnerUid || (report.targetType === 'user' ? report.targetId : '');
    if (!targetUid) {
      onError('No target user UID associated with this report.');
      return;
    }
    setBusyReportId(report.id);
    const susp = await adminSetUserSuspension({
      targetUid,
      targetName: report.targetLabel || targetUid,
      suspended: true,
      durationHours: 24 * 7,
      reason: `Report #${report.id}: ${report.reason}`,
    });
    if (susp.success) {
      await adminUpdateReportStatus({
        reportId: report.id,
        status: 'resolved',
        adminNote: adminNote.trim() || `Suspended target user (${targetUid}) for 7 days.`,
        actionTaken: 'Account Suspended (7 days)',
      });
      onNotify(`Suspended user ${targetUid} (7 days) and resolved report.`);
    } else {
      onError(susp.error || 'Failed to suspend user.');
    }
    setBusyReportId(null);
  };

  const handleEndReportedSession = async (report: AdminReportRecord) => {
    if (report.targetType !== 'room' && report.targetType !== 'stream') return;
    setBusyReportId(report.id);
    const res =
      report.targetType === 'room'
        ? await adminEndPartyRoom({
            roomId: report.targetId,
            roomTitle: report.targetLabel,
            reason: `Ended due to report: ${report.reason}`,
          })
        : await adminEndLiveStream({
            streamId: report.targetId,
            streamTitle: report.targetLabel,
            reason: `Ended due to report: ${report.reason}`,
          });
    if (res.success) {
      await adminUpdateReportStatus({
        reportId: report.id,
        status: 'resolved',
        adminNote: adminNote.trim() || `Terminated reported ${report.targetType}.`,
        actionTaken: report.targetType === 'room' ? 'Party Room Force-Ended' : 'Live Stream Force-Ended',
      });
      onNotify(`Ended reported ${report.targetType} and marked report resolved.`);
    } else {
      onError(res.error || 'Failed to end reported session.');
    }
    setBusyReportId(null);
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="inline-flex rounded-lg bg-[#0B0716] border border-[#261E40] p-0.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('reports')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'reports' ? 'bg-[#FFC84A] text-[#0B0716]' : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Reports Queue ({openCount} open)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('activity_log')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'activity_log'
              ? 'bg-[#FFC84A] text-[#0B0716]'
              : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <FileClock className="w-3.5 h-3.5" />
          <span>Admin Activity Log ({auditLogs.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('device_bans')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'device_bans'
              ? 'bg-[#FFC84A] text-[#0B0716]'
              : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Device Bans</span>
        </button>
      </div>

      {/* REPORTS QUEUE */}
      {subTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-[#0B0716] border border-[#261E40] p-0.5">
              {(['all', 'open', 'reviewing', 'resolved', 'dismissed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReportStatusFilter(s)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold capitalize whitespace-nowrap ${
                    reportStatusFilter === s
                      ? 'bg-[#FFC84A] text-[#0B0716]'
                      : 'text-[#A59BC4] hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <select
              value={reportTypeFilter}
              onChange={(e) => setReportTypeFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-[#130E24] border border-[#261E40] text-xs text-white focus:outline-none focus:border-[#FFC84A]"
            >
              <option value="all">All Target Types</option>
              <option value="user">User Reports</option>
              <option value="room">Party Room Reports</option>
              <option value="stream">Live Stream Reports</option>
              <option value="reel">Reel Reports</option>
            </select>
          </div>

          {/* Selected Report Inspector */}
          {selectedReport && (
            <div className="p-4 sm:p-5 rounded-xl bg-[#16102A] border border-[#FFC84A]/40 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-[#271F42]">
                <div>
                  <div className="text-xs font-mono text-[#FFC84A] uppercase">
                    {selectedReport.targetType} Report · #{selectedReport.id}
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">{selectedReport.reason}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReportId(null)}
                  className="text-xs text-[#988DB9] hover:text-white"
                >
                  Close Review
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#0B0716] border border-[#241C3C]">
                  <div className="text-[10px] text-[#8E83B0] uppercase">Reporter</div>
                  <div className="text-white font-mono mt-1 truncate">{selectedReport.reporterUid}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0716] border border-[#241C3C]">
                  <div className="text-[10px] text-[#8E83B0] uppercase">Target ID</div>
                  <div className="text-white font-mono mt-1 truncate">{selectedReport.targetId}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#0B0716] border border-[#241C3C]">
                  <div className="text-[10px] text-[#8E83B0] uppercase">Current Status</div>
                  <div className="text-[#FFC84A] font-semibold uppercase mt-1">{selectedReport.status}</div>
                </div>
              </div>

              {selectedReport.details && (
                <div className="p-3 rounded-lg bg-[#0B0716] border border-[#241C3C] text-xs text-[#D6CFE9]">
                  {selectedReport.details}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">
                  Moderation Note
                </label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Enter internal moderation decision note..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busyReportId === selectedReport.id}
                  onClick={() => handleReportDecision(selectedReport, 'reviewing', 'Under Admin Review')}
                  className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600 border border-sky-500/40 text-sky-200 hover:text-white text-xs font-semibold"
                >
                  Mark Reviewing
                </button>
                <button
                  type="button"
                  disabled={busyReportId === selectedReport.id}
                  onClick={() => handleReportDecision(selectedReport, 'resolved', 'Resolved by Super Admin')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white text-xs font-semibold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve</span>
                </button>
                <button
                  type="button"
                  disabled={busyReportId === selectedReport.id}
                  onClick={() => handleReportDecision(selectedReport, 'dismissed', 'No Violation Found')}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Dismiss</span>
                </button>
                {(selectedReport.targetOwnerUid || selectedReport.targetType === 'user') && (
                  <button
                    type="button"
                    disabled={busyReportId === selectedReport.id}
                    onClick={() => handleSuspendReportedAccount(selectedReport)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/25 hover:bg-amber-600 border border-amber-500/40 text-amber-200 hover:text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Suspend User (7d)</span>
                  </button>
                )}
                {(selectedReport.targetType === 'room' || selectedReport.targetType === 'stream') && (
                  <button
                    type="button"
                    disabled={busyReportId === selectedReport.id}
                    onClick={() => handleEndReportedSession(selectedReport)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/25 hover:bg-rose-600 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>End Reported {selectedReport.targetType === 'room' ? 'Room' : 'Stream'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reports Table */}
          <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
            {filteredReports.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8E83B0]">
                No reports match the current filter. User, room, stream, and reel complaints submitted in the app appear here in real time.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#241C3C] text-[11px] text-[#8E83B0] uppercase">
                      <th className="py-2.5 px-4 font-semibold">Type &amp; Target</th>
                      <th className="py-2.5 px-4 font-semibold">Reason</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold">Action Taken</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#211A36] text-xs">
                    {filteredReports.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white uppercase text-[11px]">
                            {r.targetType}
                          </div>
                          <div className="text-[11px] font-mono text-[#8E83B0] truncate max-w-[160px]">
                            {r.targetId}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{r.reason}</div>
                          {r.details && (
                            <div className="text-[11px] text-[#8E83B0] truncate max-w-[240px]">
                              {r.details}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-semibold uppercase ${
                              r.status === 'open'
                                ? 'text-rose-400'
                                : r.status === 'reviewing'
                                  ? 'text-amber-400'
                                  : r.status === 'resolved'
                                    ? 'text-emerald-400'
                                    : 'text-[#8E83B0]'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#C5B9DE]">
                          {r.actionTaken || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReportId(r.id);
                              setAdminNote(r.adminNote || '');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#FFC84A] hover:text-[#0B0716] text-xs font-semibold text-white whitespace-nowrap transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMIN ACTIVITY LOG */}
      {subTab === 'activity_log' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-[#8E83B0] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Filter activity log by action, target, reason, or admin..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#130E24] border border-[#261E40] text-xs text-white placeholder-[#7C719D] focus:outline-none focus:border-[#FFC84A]"
            />
          </div>

          <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8E83B0]">
                No admin audit logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#241C3C] text-[11px] text-[#8E83B0] uppercase">
                      <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-4 font-semibold">Action</th>
                      <th className="py-2.5 px-4 font-semibold">Summary &amp; Reason</th>
                      <th className="py-2.5 px-4 font-semibold">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#211A36] text-xs">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-[#8E83B0] whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#FFC84A] whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-white">{log.summary}</div>
                          {log.reason && (
                            <div className="text-[11px] text-[#8E83B0]">{log.reason}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#C5B9DE]">
                          {log.adminEmail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEVICE BANS */}
      {subTab === 'device_bans' && (
        <div className="rounded-xl bg-[#130E24] border border-[#261E40] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-[#A59BC4]">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Hardware &amp; browser device bans take effect immediately across active sessions.</span>
          </div>
          <AdminDeviceBansTab onNotify={onNotify} onError={onError} />
        </div>
      )}
    </div>
  );
};
