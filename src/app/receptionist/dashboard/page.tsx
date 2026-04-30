import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import InteractiveCalendar from '@/components/InteractiveCalendar';
import QueuePanel from '@/components/QueuePanel';
import { CalendarDays, Users, Clock, CheckCircle, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ReceptionistDashboard() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  // Fetch all data in parallel
  const [apptsRes, servicesRes, patientsRes, doctorsRes] = await Promise.all([
    supabaseAdmin.from('appointments').select(`*, patient:patients(*), doctor:users(*), service:services(*)`).order('start_time', { ascending: true }),
    supabaseAdmin.from('services').select('*').order('duration_minutes', { ascending: true }),
    supabaseAdmin.from('patients').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('users').select('*').eq('role', 'DOCTOR'),
  ]);

  const appointments = (apptsRes.data || []).filter(a => a.status !== 'CANCELLED');
  const services = servicesRes.data || [];
  const patients = patientsRes.data || [];
  const doctors = doctorsRes.data || [];

  const now = new Date();
  const cairoTodayString = now.toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' });
  const todayAppts = appointments.filter(a => 
    new Date(a.start_time).toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' }) === cairoTodayString
  );

  const stats = [
    { label: "Today's Total", value: todayAppts.length, icon: <CalendarDays className="w-5 h-5" />, color: '#4F9CF9' },
    { label: 'Waiting', value: todayAppts.filter(a => a.status === 'WAITING').length, icon: <Users className="w-5 h-5" />, color: '#F59E0B' },
    { label: 'In Session', value: todayAppts.filter(a => a.status === 'IN_SESSION').length, icon: <Clock className="w-5 h-5" />, color: '#10B981' },
    { label: 'Completed', value: todayAppts.filter(a => a.status === 'COMPLETED').length, icon: <CheckCircle className="w-5 h-5" />, color: '#C9A84C' },
  ];

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gold-gradient">Front Desk</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6A6A7A' }}>
            {now.toLocaleDateString('en-US', { timeZone: 'Africa/Cairo', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Link href="/receptionist/patients/new"
          className="btn-gold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          New Patient
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card-light px-4 py-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: `${stat.color}18`, color: stat.color }}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs" style={{ color: '#6A6A7A' }}>{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout: Calendar + Queue */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* Interactive Calendar — takes most of the space */}
        <div className="flex-1 min-h-0 min-w-0">
          <InteractiveCalendar
            appointments={appointments}
            services={services}
            patients={patients}
            doctors={doctors}
          />
        </div>

        {/* Queue Panel — right sidebar */}
        <div className="w-[420px] shrink-0 overflow-y-auto rounded-2xl p-4"
          style={{ background: 'rgba(7,14,26,0.7)', border: '1px solid rgba(201,168,76,0.1)' }}>
          <QueuePanel initialQueue={todayAppts as any} role="RECEPTIONIST" />
        </div>
      </div>
    </div>
  );
}
