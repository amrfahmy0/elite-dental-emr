import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import FinancialAnalytics from '@/components/FinancialAnalytics';
import { TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DoctorAnalyticsPage() {
  const cookieStore = await cookies();
  const doctorId = cookieStore.get('user_id')?.value;

  const [{ data: visitsRes }, { data: servicesRes }] = await Promise.all([
    supabaseAdmin
      .from('visits')
      .select('*, patient:patients(*)')
      .eq('doctor_id', doctorId!)
      .order('visit_date', { ascending: false }),
    supabaseAdmin
      .from('services')
      .select('*')
  ]);

  const visits = visitsRes || [];
  const services = servicesRes || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-7 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F1B2E 0%, #152340 50%, #1A2D52 100%)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #C9A84C, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}>
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gold-gradient mb-1">Financial Analytics</h1>
            <p className="text-sm" style={{ color: '#8A8A9A' }}>Interactive revenue and debt tracking</p>
          </div>
        </div>
      </div>

      <FinancialAnalytics visits={visits as any} services={services as any} />
    </div>
  );
}
