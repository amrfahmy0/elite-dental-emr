'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock, AlertTriangle, ChevronRight, CalendarDays,
  UserCheck, PlayCircle, CheckCircle2, XCircle, RefreshCw, Stethoscope
} from 'lucide-react';
import { updateAppointmentStatusAction } from '@/app/actions';

type ApptStatus = 'SCHEDULED' | 'WAITING' | 'IN_SESSION' | 'COMPLETED' | 'CANCELLED';

interface QueueAppt {
  id: string;
  start_time: string;
  end_time: string;
  status: ApptStatus;
  chief_complaint?: string;
  patient: { id: string; first_name: string; last_name: string; patient_id: string; has_bleeding_disorder: boolean };
  service?: { name: string };
  doctor?: { full_name: string };
}

interface QueuePanelProps {
  initialQueue: QueueAppt[];
  role: 'DOCTOR' | 'RECEPTIONIST';
  /** Doctor ID — receptionist shows all, doctor shows only theirs */
  doctorId?: string;
}

const STATUS_META: Record<ApptStatus, { label: string; color: string; dot: string }> = {
  SCHEDULED:  { label: 'Scheduled',  color: '#C9A84C', dot: '○' },
  WAITING:    { label: 'Waiting',    color: '#F59E0B', dot: '◐' },
  IN_SESSION: { label: 'In Session', color: '#10B981', dot: '●' },
  COMPLETED:  { label: 'Completed',  color: '#6A6A7A', dot: '✓' },
  CANCELLED:  { label: 'Cancelled',  color: '#EF4444', dot: '✕' },
};

export default function QueuePanel({ initialQueue, role, doctorId }: QueuePanelProps) {
  const [queue, setQueue] = useState<QueueAppt[]>(initialQueue);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // ── Auto-refresh every 5 s ────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const ts = new Date().getTime();
      const url = `/api/queue-today?t=${ts}` + (doctorId ? `&doctorId=${doctorId}` : '');
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data: QueueAppt[] = await res.json();
      setQueue(data);
      setLastRefresh(new Date());
    } catch { /* silent */ }
  }, [doctorId]);

  useEffect(() => {
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  // ── Status change ─────────────────────────────────────────────────────────
  const changeStatus = (apptId: string, newStatus: ApptStatus) => {
    setLoadingId(apptId);
    startTransition(async () => {
      await updateAppointmentStatusAction(apptId, newStatus);
      // Optimistic update
      setQueue(prev => prev.map(a => a.id === apptId ? { ...a, status: newStatus } : a));
      setLoadingId(null);
    });
  };

  // ── Filter: doctor sees only their own ───────────────────────────────────
  const visible = queue.filter(a => {
    if (role === 'DOCTOR' && doctorId) return true; // already filtered server-side
    return true;
  });

  const stats = {
    total:    visible.length,
    waiting:  visible.filter(a => a.status === 'WAITING').length,
    inSession:visible.filter(a => a.status === 'IN_SESSION').length,
    done:     visible.filter(a => a.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#E8E8F0' }}>
          <Clock className="w-5 h-5" style={{ color: '#C9A84C' }} />
          Today's Queue
          <span className="text-sm font-normal ml-1" style={{ color: '#5A5A6A' }}>({visible.length} patients)</span>
        </h2>
        <button onClick={refresh} title="Refresh"
          className="p-1.5 rounded-lg transition-all hover:scale-110"
          style={{ color: '#5A5A6A' }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Mini stats strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total',      value: stats.total,     color: '#C9A84C' },
          { label: 'Waiting',    value: stats.waiting,   color: '#F59E0B' },
          { label: 'In Session', value: stats.inSession, color: '#10B981' },
          { label: 'Completed',  value: stats.done,      color: '#6A6A7A' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-3 py-2 text-center"
            style={{ background: `${s.color}12`, border: `1px solid ${s.color}25` }}>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: s.color + 'AA' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Queue list */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <div className="text-center py-10 rounded-2xl" style={{ background: 'rgba(15,27,46,0.5)', border: '1px solid rgba(201,168,76,0.06)' }}>
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm" style={{ color: '#5A5A6A' }}>No appointments scheduled for today.</p>
          </div>
        )}

        {visible.map(appt => {
          const pt = appt.patient;
          const meta = STATUS_META[appt.status] || STATUS_META.SCHEDULED;
          const isLoading = loadingId === appt.id;
          const startTime = new Date(appt.start_time);

          return (
            <div key={appt.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{ background: 'rgba(15,27,46,0.7)', border: `1px solid ${meta.color}25` }}>

              {/* Status bar */}
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />

              <div className="flex items-center gap-3 px-4 py-3">
                {/* Time */}
                <div className="text-center w-14 shrink-0">
                  <p className="text-sm font-black" style={{ color: '#E8E8F0' }}>
                    {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </p>
                  <p className="text-[10px]" style={{ color: '#3A3A4A' }}>{appt.service?.name?.slice(0, 9)}</p>
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                  {pt.first_name[0]}{pt.last_name[0]}
                </div>

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate" style={{ color: '#E8E8F0' }}>
                      {pt.first_name} {pt.last_name}
                    </p>
                    {pt.has_bleeding_disorder && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ background: 'rgba(220,38,38,0.2)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.4)' }}>
                        <AlertTriangle className="w-2.5 h-2.5" /> ⚠
                      </span>
                    )}
                  </div>
                  <p className="text-[11px]" style={{ color: '#5A5A6A' }}>{pt.patient_id}</p>
                  {appt.chief_complaint && (
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: '#A87E30' }}>"{appt.chief_complaint}"</p>
                  )}
                </div>

                {/* Status badge */}
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                  {meta.dot} {meta.label}
                </span>

                {/* Action buttons — RECEPTIONIST */}
                {role === 'RECEPTIONIST' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {appt.status === 'SCHEDULED' && (
                      <ActionBtn color="#F59E0B" title="Check In (Mark Waiting)" disabled={isLoading}
                        onClick={() => changeStatus(appt.id, 'WAITING')}>
                        <UserCheck className="w-4 h-4" />
                      </ActionBtn>
                    )}
                    {appt.status === 'WAITING' && (
                      <ActionBtn color="#10B981" title="Send to Doctor" disabled={isLoading}
                        onClick={() => changeStatus(appt.id, 'IN_SESSION')}>
                        <PlayCircle className="w-4 h-4" />
                      </ActionBtn>
                    )}
                    {!['COMPLETED', 'CANCELLED'].includes(appt.status) && (
                      <ActionBtn color="#EF4444" title="Cancel Appointment" disabled={isLoading}
                        onClick={() => { if (confirm('Cancel this appointment?')) changeStatus(appt.id, 'CANCELLED'); }}>
                        <XCircle className="w-4 h-4" />
                      </ActionBtn>
                    )}
                    <Link href={`/receptionist/patients`}
                      className="p-1.5 rounded-lg transition-all hover:scale-110"
                      style={{ color: '#5A5A6A' }} title="View Patient">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {/* Action buttons — DOCTOR */}
                {role === 'DOCTOR' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {appt.status === 'WAITING' && (
                      <ActionBtn color="#10B981" title="Start Session" disabled={isLoading}
                        onClick={() => changeStatus(appt.id, 'IN_SESSION')}>
                        <Stethoscope className="w-4 h-4" />
                        <span className="text-xs font-semibold">Start</span>
                      </ActionBtn>
                    )}
                    {appt.status === 'IN_SESSION' && (
                      <ActionBtn color="#C9A84C" title="Complete Session" disabled={isLoading}
                        onClick={() => changeStatus(appt.id, 'COMPLETED')}>
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-semibold">Done</span>
                      </ActionBtn>
                    )}
                    <Link href={`/doctor/patients/${pt.id}`}
                      className="p-1.5 rounded-lg transition-all hover:scale-110"
                      style={{ color: '#C9A84C' }} title="Open Patient Record">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Last refresh indicator */}
      <p className="text-[10px] text-right" style={{ color: '#3A3A4A' }}>
        Auto-refreshes every 5 s · Last: {lastRefresh.toLocaleTimeString()}
      </p>
    </div>
  );
}

function ActionBtn({ children, color, title, disabled, onClick }: {
  children: React.ReactNode; color: string; title: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all hover:scale-105 disabled:opacity-40"
      style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
      {children}
    </button>
  );
}
