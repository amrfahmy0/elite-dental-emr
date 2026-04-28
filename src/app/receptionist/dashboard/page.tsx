import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import InteractiveCalendar from '@/components/InteractiveCalendar';
import { CalendarDays, Users, Clock, CheckCircle, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ReceptionistDashboard() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  // Fetch all data in parallel
  const [apptsRes, servicesRes, patientsRes, doctorsRes, todayApptsRes] = await Promise.all([
    supabaseAdmin.from('appointments').select(`*, patient:patients(*), doctor:users(*), service:services(*)`).order('start_time', { ascending: true }),
    supabaseAdmin.from('services').select('*').order('duration_minutes', { ascending: true }),
    supabaseAdmin.from('patients').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('users').select('*').eq('role', 'DOCTOR'),
    supabaseAdmin.from('appointments')
      .select(`*, patient:patients(*), service:services(*)`)
      .gte('start_time', new Date(new Date().setHours(0,0,0,0)).toISOString())
      .lte('start_time', new Date(new Date().setHours(23,59,59,999)).toISOString())
      .order('start_time', { ascending: true }),
  ]);

  const appointments = apptsRes.data || [];
  const services = servicesRes.data || [];
  const patients = patientsRes.data || [];
  const doctors = doctorsRes.data || [];
  const todayAppts = todayApptsRes.data || [];

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
          <h1 className="text-2xl font-bold text-gold-gradient">Booking Calendar</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6A6A7A' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
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

      {/* Interactive Calendar */}
      <div className="flex-1 min-h-0">
        <InteractiveCalendar
          appointments={appointments}
          services={services}
          patients={patients}
          doctors={doctors}
        />
      </div>
    </div>
  );
}
