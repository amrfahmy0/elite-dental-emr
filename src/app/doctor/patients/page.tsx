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
    .select('patient_id, patient:patients(*)')
    .eq('doctor_id', doctorId!)
    .order('created_at', { ascending: false });

  // De-duplicate patients
  const seen = new Set<string>();
  const patients: any[] = [];
  (appts || []).forEach(a => {
    if (a.patient && !seen.has(a.patient_id)) {
      seen.add(a.patient_id);
      patients.push(a.patient);
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold group-hover:text-[#C9A84C] transition-colors" style={{ color: '#E8E8F0' }}>
                      {p.first_name} {p.last_name}
                    </p>
                    {p.has_bleeding_disorder && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(220,38,38,0.15)', color: '#EF4444', border: '1px solid rgba(220,38,38,0.3)' }}>
                        <AlertTriangle className="w-3 h-3" /> Bleeding Risk
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#5A5A6A' }}>
                    {p.patient_id} · {p.gender} · DOB {new Date(p.date_of_birth).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 group-hover:text-[#C9A84C] transition-colors" style={{ color: '#3A3A4A' }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
