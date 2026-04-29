import { supabaseAdmin } from '@/lib/supabase';
import { updateAppointmentStatusAction } from '@/app/actions';
import { AlertTriangle, CalendarDays, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_META = {
  SCHEDULED:  { label: 'Scheduled',  color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',  border: 'rgba(201,168,76,0.25)' },
  WAITING:    { label: 'Waiting',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)'  },
  IN_SESSION: { label: 'In Session', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  COMPLETED:  { label: 'Completed',  color: '#6A6A7A', bg: 'rgba(106,106,122,0.12)', border: 'rgba(106,106,122,0.25)' },
  CANCELLED:  { label: 'Cancelled',  color: '#EF4444', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.25)'  },
} as const;

type Status = keyof typeof STATUS_META;

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status] || STATUS_META.SCHEDULED;
  return (
    <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      {m.label}
    </span>
  );
}

async function changeStatus(formData: FormData) {
  'use server';
  const id     = formData.get('id') as string;
  const status = formData.get('status') as string;
  await updateAppointmentStatusAction(id, status);
}

export default async function QueuePage() {
  const todayStart = new Date(new Date().setHours(0,0,0,0)).toISOString();
  const todayEnd   = new Date(new Date().setHours(23,59,59,999)).toISOString();

  const { data: appts } = await supabaseAdmin
    .from('appointments')
    .select(`*, patient:patients(*), service:services(*), doctor:users(*)`)
    .gte('start_time', todayStart)
    .lte('start_time', todayEnd)
    .order('start_time', { ascending: true });

  const queue = appts || [];

  const counts = {
    total:    queue.length,
    waiting:  queue.filter(a => a.status === 'WAITING').length,
    session:  queue.filter(a => a.status === 'IN_SESSION').length,
    done:     queue.filter(a => a.status === 'COMPLETED').length,
    scheduled:queue.filter(a => a.status === 'SCHEDULED').length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gold-gradient">Today's Queue</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6A6A7A' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          <span className="ml-2 text-xs" style={{ color: '#3A3A4A' }}>· Page refreshes after each action</span>
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total',      value: counts.total,     color: '#C9A84C' },
          { label: 'Scheduled',  value: counts.scheduled, color: '#8A8A9A' },
          { label: 'Waiting',    value: counts.waiting,   color: '#F59E0B' },
          { label: 'In Session', value: counts.session,   color: '#10B981' },
          { label: 'Completed',  value: counts.done,      color: '#6A6A7A' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-3 py-3 text-center"
            style={{ background: `${s.color}10`, border: `1px solid ${s.color}25` }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: `${s.color}BB` }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Queue list */}
      {queue.length === 0 ? (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: 'rgba(15,27,46,0.5)', border: '1px solid rgba(201,168,76,0.06)' }}>
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p style={{ color: '#5A5A6A' }}>No appointments scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((appt: any) => {
            const pt = appt.patient;
            const meta = STATUS_META[appt.status as Status] || STATUS_META.SCHEDULED;
            const startTime = new Date(appt.start_time);
            const isActive = !['COMPLETED', 'CANCELLED'].includes(appt.status);

            return (
              <div key={appt.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(11,18,32,0.85)', border: `1px solid ${meta.color}30` }}>

                {/* Colored top bar */}
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />

                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Time */}
                  <div className="text-center w-14 shrink-0">
                    <p className="text-sm font-black" style={{ color: '#E8E8F0' }}>
                      {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                    <p className="text-[10px]" style={{ color: '#4A4A5A' }}>{appt.service?.name?.slice(0,10)}</p>
                  </div>

                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                    {pt.first_name[0]}{pt.last_name[0]}
                  </div>

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold" style={{ color: '#E8E8F0' }}>
                        {pt.first_name} {pt.last_name}
                      </p>
                      {pt.has_bleeding_disorder && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: 'rgba(220,38,38,0.2)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.4)' }}>
                          <AlertTriangle className="w-2.5 h-2.5" /> ⚠ BLEEDING
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#5A5A6A' }}>
                      {pt.patient_id} · Dr. {appt.doctor?.full_name}
                    </p>
                    {appt.chief_complaint && (
                      <p className="text-xs mt-1" style={{ color: '#A87E30' }}>"{appt.chief_complaint}"</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <StatusBadge status={appt.status} />

                  {/* Action buttons via server forms */}
                  {isActive && (
                    <div className="flex items-center gap-2 shrink-0">

                      {/* SCHEDULED → WAITING (Check In) */}
                      {appt.status === 'SCHEDULED' && (
                        <form action={changeStatus}>
                          <input type="hidden" name="id" value={appt.id} />
                          <input type="hidden" name="status" value="WAITING" />
                          <button type="submit"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                            style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.35)' }}>
                            ✓ Check In
                          </button>
                        </form>
                      )}

                      {/* WAITING → IN_SESSION (Send to Dr) */}
                      {appt.status === 'WAITING' && (
                        <form action={changeStatus}>
                          <input type="hidden" name="id" value={appt.id} />
                          <input type="hidden" name="status" value="IN_SESSION" />
                          <button type="submit"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                            style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)' }}>
                            ▶ Send to Dr.
                          </button>
                        </form>
                      )}

                      {/* IN_SESSION → COMPLETED */}
                      {appt.status === 'IN_SESSION' && (
                        <form action={changeStatus}>
                          <input type="hidden" name="id" value={appt.id} />
                          <input type="hidden" name="status" value="COMPLETED" />
                          <button type="submit"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                            style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.35)' }}>
                            ✓ Complete
                          </button>
                        </form>
                      )}

                      {/* Cancel — always shown for active */}
                      <form action={changeStatus}>
                        <input type="hidden" name="id" value={appt.id} />
                        <input type="hidden" name="status" value="CANCELLED" />
                        <button type="submit"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                          style={{ background: 'rgba(220,38,38,0.1)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.25)' }}>
                          ✕ Cancel
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
