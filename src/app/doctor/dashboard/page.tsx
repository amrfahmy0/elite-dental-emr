import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import QueuePanel from '@/components/QueuePanel';
import { CalendarDays } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DoctorDashboard() {
  const cookieStore = await cookies();
  const doctorId = cookieStore.get('user_id')?.value;

  const [doctorRes, apptsRes] = await Promise.all([
    supabaseAdmin.from('users').select('*').eq('id', doctorId!).single(),
    supabaseAdmin
      .from('appointments')
      .select(`*, patient:patients(*), service:services(*), doctor:users(*)`)
      .eq('doctor_id', doctorId!)
      .gte('start_time', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .lte('start_time', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: true }),
  ]);

  const doctor = doctorRes.data;
  const rawQueue = apptsRes.data || [];
  
  const now = new Date();
  const cairoTodayString = now.toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' });
  const queue = rawQueue.filter(a => 
    new Date(a.start_time).toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' }) === cairoTodayString
  );

  const greeting = now.toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour12: false }).split(':')[0];
  const greetingNum = parseInt(greeting);
  const greetingText = greetingNum < 12 ? 'Good morning' : greetingNum < 17 ? 'Good afternoon' : 'Good evening';

  const stats = [
    { label: 'Today',      value: queue.length,                                                               color: '#C9A84C' },
    { label: 'Waiting',    value: queue.filter(a => a.status === 'WAITING').length,                           color: '#F59E0B' },
    { label: 'In Session', value: queue.filter(a => a.status === 'IN_SESSION').length,                        color: '#10B981' },
    { label: 'Remaining',  value: queue.filter(a => !['COMPLETED','CANCELLED'].includes(a.status)).length,    color: '#4F9CF9' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Hero header */}
      <div className="rounded-2xl p-7 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F1B2E 0%, #152340 50%, #1A2D52 100%)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #C9A84C, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10">
          <p className="text-sm mb-1" style={{ color: '#8A8A9A' }}>{greetingText},</p>
          <h1 className="text-3xl font-bold text-gold-gradient mb-1">Dr. {doctor?.full_name || 'Doctor'}</h1>
          <p className="text-sm flex items-center gap-2" style={{ color: '#6A6A7A' }}>
            <CalendarDays className="w-4 h-4" />
            {now.toLocaleDateString('en-US', { timeZone: 'Africa/Cairo', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
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

      {/*
        QueuePanel is a client component that:
        - Renders the initial data immediately (no flicker)
        - Polls /api/queue-today?doctorId=... every 5 s in the background
        - Allows the doctor to click "Complete" via the server action in QueuePanel
      */}
      <QueuePanel initialQueue={queue as any} role="DOCTOR" doctorId={doctorId} />

    </div>
  );
}
