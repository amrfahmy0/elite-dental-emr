import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Users, AlertTriangle, ChevronRight, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DoctorPatientsPage() {
  const cookieStore = await cookies();
  const doctorId = cookieStore.get('user_id')?.value;

  // Get distinct patients the doctor has appointments with
  const { data: appts } = await supabaseAdmin
    .from('appointments')
    .select('patient_id, patient:patients(*, visits(total_cost, previous_balance, amount_paid, visit_date))')
    .eq('doctor_id', doctorId!)
    .order('created_at', { ascending: false });

  // De-duplicate patients
  const seen = new Set<string>();
  const patients: any[] = [];
  (appts || []).forEach(a => {
    if (a.patient && !seen.has(a.patient_id)) {
      seen.add(a.patient_id);
      
      const sortedVisits = (a.patient.visits || []).sort((x: any, y: any) => new Date(y.visit_date).getTime() - new Date(x.visit_date).getTime());
      const latestVisit = sortedVisits.length > 0 ? sortedVisits[0] : null;
      const outstandingBalance = latestVisit 
        ? Math.max(0, (latestVisit.total_cost || 0) + (latestVisit.previous_balance || 0) - (latestVisit.amount_paid || 0))
        : 0;

      patients.push({ ...a.patient, outstandingBalance });
    }
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gold-gradient">My Patients</h1>
        <p className="text-sm mt-1" style={{ color: '#6A6A7A' }}>{patients.length} patients under your care</p>
      </div>

      <div className="glass-card p-6 space-y-3">
        {patients.length === 0 ? (
          <div className="text-center py-10">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm" style={{ color: '#5A5A6A' }}>No patients assigned yet.</p>
          </div>
        ) : patients.map((p: any) => (
          <Link href={`/doctor/patients/${p.id}`} key={p.id}>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-all hover:scale-[1.005] group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.08)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold group-hover:text-[#C9A84C] transition-colors truncate" style={{ color: '#E8E8F0' }}>
                      {p.first_name} {p.last_name}
                    </p>
                    {p.has_bleeding_disorder && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                        style={{ background: 'rgba(220,38,38,0.15)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.3)' }}>
                        <AlertTriangle className="w-3 h-3" /> Bleeding Risk
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#5A5A6A' }}>
                    {p.patient_id} · {p.gender} · DOB {new Date(p.date_of_birth).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {p.outstandingBalance > 0 && (
                  <span className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                    style={{ background: 'rgba(220,38,38,0.1)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.25)' }}>
                    Balance: {p.outstandingBalance.toFixed(2)}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 group-hover:text-[#C9A84C] transition-colors" style={{ color: '#3A3A4A' }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
