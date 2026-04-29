import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import DoctorCalendar from '@/components/DoctorCalendar';
import { CalendarDays, CheckCircle, Clock, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DoctorCalendarPage() {
  const cookieStore = await cookies();
  const doctorId    = cookieStore.get('user_id')?.value;

  const { data: appts } = await supabaseAdmin
    .from('appointments')
    .select(`*, patient:patients(*), service:services(*)`)
    .eq('doctor_id', doctorId!)
    .order('start_time', { ascending: true });

  const appointments = appts || [];

  const stats = [
    { label: 'Total',      value: appointments.length,                                                    color: '#C9A84C', icon: <CalendarDays className="w-5 h-5" /> },
    { label: 'Upcoming',   value: appointments.filter(a => new Date(a.start_time) > new Date()).length,   color: '#4F9CF9', icon: <Clock className="w-5 h-5" /> },
    { label: 'Completed',  value: appointments.filter(a => a.status === 'COMPLETED').length,              color: '#10B981', icon: <CheckCircle className="w-5 h-5" /> },
    { label: 'Cancelled',  value: appointments.filter(a => a.status === 'CANCELLED').length,              color: '#EF4444', icon: <Users className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gold-gradient">My Schedule</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6A6A7A' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        {stats.map((s, i) => (
          <div key={i} className="glass-card-light px-4 py-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: `${s.color}18`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs" style={{ color: '#6A6A7A' }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="flex-1 min-h-0">
        <DoctorCalendar appointments={appointments as any} />
      </div>
    </div>
  );
}
