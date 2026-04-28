import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Clock, ChevronRight, Activity, AlertTriangle, CalendarDays } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DoctorDashboard() {
  const cookieStore = await cookies();
  const doctorId = cookieStore.get('user_id')?.value;

  const { data: doctor } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', doctorId!)
    .single();

  const todayStart = new Date(new Date().setHours(0,0,0,0)).toISOString();
  const todayEnd = new Date(new Date().setHours(23,59,59,999)).toISOString();

  const { data: appts } = await supabaseAdmin
    .from('appointments')
    .select(`*, patient:patients(*), service:services(*)`)
    .eq('doctor_id', doctorId!)
    .gte('start_time', todayStart)
    .lte('start_time', todayEnd)
    .order('start_time', { ascending: true });

  const queue = appts || [];
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const stats = [
    { label: 'Today', value: queue.length, color: '#C9A84C' },
    { label: 'Waiting', value: queue.filter(a => a.status === 'WAITING').length, color: '#F59E0B' },
    { label: 'In Session', value: queue.filter(a => a.status === 'IN_SESSION').length, color: '#10B981' },
    { label: 'Remaining', value: queue.filter(a => !['COMPLETED','CANCELLED'].includes(a.status)).length, color: '#4F9CF9' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Hero header */}
      <div className="rounded-2xl p-7 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F1B2E 0%, #152340 50%, #1A2D52 100%)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #C9A84C, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10">
          <p className="text-sm mb-1" style={{ color: '#8A8A9A' }}>{greeting},</p>
          <h1 className="text-3xl font-bold text-gold-gradient mb-1">
            Dr. {doctor?.full_name || 'Doctor'}
          </h1>
          <p className="text-sm flex items-center gap-2" style={{ color: '#6A6A7A' }}>
            <CalendarDays className="w-4 h-4" />
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          {/* Quick stats inline */}
          <div className="flex gap-6 mt-5">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#5A5A6A' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Patient Queue */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#E8E8F0' }}>
          <Clock className="w-5 h-5" style={{ color: '#C9A84C' }} />
          Today's Queue
        </h2>

        <div className="space-y-3">
          {queue.map((appt: any) => {
            const pt = appt.patient;
            const startTime = new Date(appt.start_time);
            const statusColor = appt.status === 'IN_SESSION' ? '#10B981' : appt.status === 'WAITING' ? '#F59E0B' : appt.status === 'COMPLETED' ? '#6A6A7A' : '#C9A84C';
            return (
              <Link href={`/doctor/patients/${pt.id}`} key={appt.id}>
                <div className="flex items-center justify-between p-4 rounded-2xl transition-all hover:scale-[1.005] group relative overflow-hidden"
                  style={{ background: 'rgba(15,27,46,0.7)', border: '1px solid rgba(201,168,76,0.08)' }}>
                  {/* Status bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all"
                    style={{ background: statusColor }} />

                  <div className="flex items-center gap-4 pl-3">
                    {/* Time */}
                    <div className="text-center w-16 shrink-0">
                      <p className="text-base font-black" style={{ color: '#E8E8F0' }}>
                        {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                      <p className="text-xs" style={{ color: '#3A3A4A' }}>
                        {appt.service?.name?.slice(0,8)}
                      </p>
                    </div>

                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                      {pt.first_name[0]}{pt.last_name[0]}
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold group-hover:text-[#C9A84C] transition-colors" style={{ color: '#E8E8F0' }}>
                          {pt.first_name} {pt.last_name}
                        </p>
                        {pt.has_bleeding_disorder && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'rgba(220,38,38,0.2)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.4)' }}>
                            <AlertTriangle className="w-3 h-3" /> ⚠
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#5A5A6A' }}>{pt.patient_id}</p>
                      {appt.chief_complaint && (
                        <p className="text-xs mt-1 px-2 py-0.5 rounded-md inline-block"
                          style={{ background: 'rgba(201,168,76,0.08)', color: '#A87E30', border: '1px solid rgba(201,168,76,0.15)' }}>
                          "{appt.chief_complaint}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full"
                      style={{
                        background: `${statusColor}18`,
                        color: statusColor,
                        border: `1px solid ${statusColor}30`,
                      }}>
                      {appt.status === 'IN_SESSION' ? '● In Session' : appt.status === 'WAITING' ? '◐ Waiting' : appt.status === 'COMPLETED' ? '✓ Done' : 'Scheduled'}
                    </span>
                    <ChevronRight className="w-4 h-4 group-hover:text-[#C9A84C] transition-colors" style={{ color: '#3A3A4A' }} />
                  </div>
                </div>
              </Link>
            );
          })}
          {queue.length === 0 && (
            <div className="text-center py-12 rounded-2xl"
              style={{ background: 'rgba(15,27,46,0.5)', border: '1px solid rgba(201,168,76,0.06)' }}>
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm" style={{ color: '#5A5A6A' }}>No appointments scheduled for today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
