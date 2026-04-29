import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { updateAppointmentStatusAction } from '@/app/actions';
import Link from 'next/link';
import { Clock, ChevronRight, AlertTriangle, CalendarDays, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function completeSession(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  await updateAppointmentStatusAction(id, 'COMPLETED');
}

export default async function DoctorDashboard() {
  const cookieStore = await cookies();
  const doctorId = cookieStore.get('user_id')?.value;

  const { data: doctor } = await supabaseAdmin
    .from('users').select('*').eq('id', doctorId!).single();

  const todayStart = new Date(new Date().setHours(0,0,0,0)).toISOString();
  const todayEnd   = new Date(new Date().setHours(23,59,59,999)).toISOString();

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
    { label: 'Today',      value: queue.length,                                                               color: '#C9A84C' },
    { label: 'Waiting',    value: queue.filter(a => a.status === 'WAITING').length,                           color: '#F59E0B' },
    { label: 'In Session', value: queue.filter(a => a.status === 'IN_SESSION').length,                        color: '#10B981' },
    { label: 'Remaining',  value: queue.filter(a => !['COMPLETED','CANCELLED'].includes(a.status)).length,    color: '#4F9CF9' },
  ];

  const sc = (s: string) =>
    s === 'IN_SESSION' ? '#10B981' : s === 'WAITING' ? '#F59E0B' : s === 'COMPLETED' ? '#6A6A7A' : s === 'CANCELLED' ? '#EF4444' : '#C9A84C';

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Hero header */}
      <div className="rounded-2xl p-7 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F1B2E 0%, #152340 50%, #1A2D52 100%)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #C9A84C, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10">
          <p className="text-sm mb-1" style={{ color: '#8A8A9A' }}>{greeting},</p>
          <h1 className="text-3xl font-bold text-gold-gradient mb-1">Dr. {doctor?.full_name || 'Doctor'}</h1>
          <p className="text-sm flex items-center gap-2" style={{ color: '#6A6A7A' }}>
            <CalendarDays className="w-4 h-4" />
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="flex gap-6 mt-5">
            {stats.map(s => (
              <div key={s.label}>
                <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#5A5A6A' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Queue Panel */}
      <QueuePanel initialQueue={queue as any} role="DOCTOR" doctorId={doctorId} />
    </div>
  );
}
