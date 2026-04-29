import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { Users, Search, PlusCircle, AlertTriangle, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReceptionistPatientsPage() {
  const { data: patients } = await supabaseAdmin
    .from('patients')
    .select('*, visits(total_cost, previous_balance, amount_paid, visit_date)')
    .order('created_at', { ascending: false });

  const list = patients || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gold-gradient">Patient Registry</h1>
          <p className="text-sm mt-1" style={{ color: '#6A6A7A' }}>{list.length} patients registered</p>
        </div>
        <Link href="/receptionist/patients/new" className="btn-gold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
          <PlusCircle className="w-4 h-4" /> New Patient
        </Link>
      </div>

      <div className="glass-card p-6 space-y-4">
        {list.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm" style={{ color: '#6A6A7A' }}>No patients registered yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((p: any) => {
              const sortedVisits = (p.visits || []).sort((a: any, b: any) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
              const latestVisit = sortedVisits.length > 0 ? sortedVisits[0] : null;
              const outstandingBalance = latestVisit 
                ? Math.max(0, (latestVisit.total_cost || 0) + (latestVisit.previous_balance || 0) - (latestVisit.amount_paid || 0))
                : 0;

              return (
                <div key={p.id}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-all hover:scale-[1.005]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.08)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                      {p.first_name?.[0]}{p.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate" style={{ color: '#E8E8F0' }}>
                          {p.first_name} {p.last_name}
                        </p>
                        {p.has_bleeding_disorder && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
                            style={{ background: 'rgba(220,38,38,0.15)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.3)' }}>
                            <AlertTriangle className="w-3 h-3" /> Bleeding Risk
                          </span>
                        )}
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: '#6A6A7A' }}>
                        {p.patient_id} · {p.gender} · {p.contact_number}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    {outstandingBalance > 0 && (
                      <span className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                        style={{ background: 'rgba(220,38,38,0.1)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.25)' }}>
                        Balance: {outstandingBalance.toFixed(2)}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 opacity-50" style={{ color: '#C9A84C' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
