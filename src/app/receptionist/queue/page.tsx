import { supabaseAdmin } from '@/lib/supabase';
import QueuePanel from '@/components/QueuePanel';

export const dynamic = 'force-dynamic';

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gold-gradient">Today's Queue</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6A6A7A' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <QueuePanel initialQueue={queue as any} role="RECEPTIONIST" />
    </div>
  );
}
