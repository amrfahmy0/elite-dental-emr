'use client';

import React, { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Clock, AlertTriangle, ChevronRight, CalendarDays,
  UserCheck, PlayCircle, CheckCircle2, XCircle, Wifi, WifiOff, Stethoscope
} from 'lucide-react';
import { updateAppointmentStatusAction } from '@/app/actions';
import { supabase } from '@/lib/supabase';

type ApptStatus = 'SCHEDULED' | 'WAITING' | 'IN_SESSION' | 'COMPLETED' | 'CANCELLED';

interface QueueAppt {
  id: string;
  start_time: string;
  end_time: string;
  status: ApptStatus;
  chief_complaint?: string;
  doctor_id?: string;
  patient: { id: string; first_name: string; last_name: string; patient_id: string; has_bleeding_disorder: boolean };
  service?: { name: string };
  doctor?: { full_name: string };
}

interface QueuePanelProps {
  initialQueue: QueueAppt[];
  role: 'DOCTOR' | 'RECEPTIONIST';
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
  const router = useRouter();
  const [queue,     setQueue]     = useState<QueueAppt[]>(initialQueue);
  const [connected, setConnected] = useState(false);
  const [, startTransition]       = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const prevQueueRef = useRef(initialQueue);

  // ── Sync server prop → local state whenever the server re-renders ─────────
  // This is the key: router.refresh() makes the server re-fetch with full joins
  // and sends new initialQueue down. This effect picks it up without a full reload.
  useEffect(() => {
    // Diff to find newly inserted items and notify the Doctor
    if (role === 'DOCTOR') {
      const prevIds = new Set(prevQueueRef.current.map(a => a.id));
      const newAppts = initialQueue.filter(a => !prevIds.has(a.id));
      
      newAppts.forEach(appt => {
        // Play notification sound
        try {
          // A subtle modern UI ping sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {}); // Catch auto-play blocks
        } catch (e) {}
        
        // Show toast
        const time = new Date(appt.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const ptName = `${appt.patient?.first_name || 'Unknown'} ${appt.patient?.last_name || ''}`.trim();
        toast.success(`New Appointment Added!`, {
          description: `${ptName} at ${time}`,
          duration: 5000,
        });
      });
    }

    prevQueueRef.current = initialQueue;
    setQueue(initialQueue);
  }, [initialQueue, role]);

  // ── Supabase Realtime subscription ────────────────────────────────────────
  // Pattern: Realtime fires → router.refresh() → server re-fetches with admin
  // client (bypasses RLS) → full joined data arrives via initialQueue prop →
  // useEffect above syncs it to local state. Clean and reliable.
  useEffect(() => {
    const channelName = `queue-rt-${role}-${doctorId ?? 'all'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          // Just trigger a soft re-render of the server component.
          // No inline async fetches — the server handles all data with supabaseAdmin.
          router.refresh();
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, doctorId, router]);

  // ── Status change via server action ──────────────────────────────────────
  const changeStatus = useCallback((apptId: string, newStatus: ApptStatus) => {
    setLoadingId(apptId);
    // Optimistic update immediately in the UI
    setQueue(prev => prev.map(a => a.id === apptId ? { ...a, status: newStatus } : a));
    startTransition(async () => {
      await updateAppointmentStatusAction(apptId, newStatus);
      setLoadingId(null);
      // Realtime will call router.refresh() which confirms final state from DB
    });
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:     queue.length,
    waiting:   queue.filter(a => a.status === 'WAITING').length,
    inSession: queue.filter(a => a.status === 'IN_SESSION').length,
    done:      queue.filter(a => a.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#E8E8F0' }}>
          <Clock className="w-5 h-5" style={{ color: '#C9A84C' }} />
          Today's Queue
          <span className="text-sm font-normal ml-1" style={{ color: '#5A5A6A' }}>
            ({queue.length} patients)
          </span>
        </h2>

        {/* Realtime connection indicator */}
        <div className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: connected ? '#10B981' : '#F59E0B' }}
          title={connected ? 'Live – receiving real-time updates' : 'Connecting…'}>
          {connected
            ? <><Wifi className="w-3.5 h-3.5" /> Live</>
            : <><WifiOff className="w-3.5 h-3.5" /> Connecting…</>}
        </div>
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
        {queue.length === 0 && (
          <div className="text-center py-10 rounded-2xl"
            style={{ background: 'rgba(15,27,46,0.5)', border: '1px solid rgba(201,168,76,0.06)' }}>
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm" style={{ color: '#5A5A6A' }}>No appointments scheduled for today.</p>
          </div>
        )}

        {queue.map(appt => {
          const pt        = appt.patient || { first_name: '?', last_name: '?', patient_id: '...', has_bleeding_disorder: false };
          const meta      = STATUS_META[appt.status] ?? STATUS_META.SCHEDULED;
          const isLoading = loadingId === appt.id;
          const startTime = new Date(appt.start_time);

          return (
            <div key={appt.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{ background: 'rgba(15,27,46,0.7)', border: `1px solid ${meta.color}25` }}>

              {/* Coloured top bar */}
              <div className="h-0.5 w-full"
                style={{ background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />

              <div className="flex items-center gap-3 px-4 py-3">
                {/* Time */}
                <div className="text-center w-14 shrink-0">
                  <p className="text-sm font-black" style={{ color: '#E8E8F0' }}>
                    {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </p>
                  <p className="text-[10px]" style={{ color: '#3A3A4A' }}>{appt.service?.name?.slice(0, 9) || '...'}</p>
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                  {pt.first_name?.[0] || '?'}{pt.last_name?.[0] || '?'}
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

                {/* ── RECEPTIONIST actions ── */}
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
                    <Link href="/receptionist/patients"
                      className="p-1.5 rounded-lg transition-all hover:scale-110"
                      style={{ color: '#5A5A6A' }} title="View Patient">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {/* ── DOCTOR actions ── */}
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

      {/* Realtime status footer */}
      <p className="text-[10px] text-right" style={{ color: '#3A3A4A' }}>
        {connected
          ? '⚡ Real-time sync active via WebSocket'
          : '⏳ Establishing WebSocket connection…'}
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
