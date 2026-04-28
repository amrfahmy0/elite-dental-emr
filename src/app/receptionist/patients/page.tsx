import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { Users, Search, PlusCircle, AlertTriangle, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReceptionistPatientsPage() {
  const { data: patients } = await supabaseAdmin
    .from('patients')
    .select('*')
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
            {list.map((p: any) => (
              <div key={p.id}
                className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-all hover:scale-[1.005]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                    {p.first_name[0]}{p.last_name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>
                        {p.first_name} {p.last_name}
                      </p>
                      {p.has_bleeding_disorder && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: 'rgba(220,38,38,0.15)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.3)' }}>
                          <AlertTriangle className="w-3 h-3" /> Bleeding Risk
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: '#6A6A7A' }}>
                      {p.patient_id} · {p.gender} · {p.contact_number}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: '#3A3A4A' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
