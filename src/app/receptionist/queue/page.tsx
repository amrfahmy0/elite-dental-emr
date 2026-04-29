import { supabaseAdmin } from '@/lib/supabase';
import QueuePanel from '@/components/QueuePanel';

export const dynamic = 'force-dynamic';

export default async function QueuePage() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 2);

  const { data: apptsRes } = await supabaseAdmin
    .from('appointments')
    .select(`*, patient:patients(*), service:services(*), doctor:users(*)`)
    .gte('start_time', yesterday.toISOString())
    .lte('start_time', tomorrow.toISOString())
    .order('start_time', { ascending: true });

  const cairoTodayString = now.toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' });
  const queue = (apptsRes || [])
    .filter(a => a.status !== 'CANCELLED')
    .filter(a => new Date(a.start_time).toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' }) === cairoTodayString);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gold-gradient">Today's Queue</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6A6A7A' }}>
          {new Date().toLocaleDateString('en-US', { timeZone: 'Africa/Cairo', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <QueuePanel initialQueue={queue as any} role="RECEPTIONIST" />
    </div>
  );
}
