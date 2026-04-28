import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import PatientProfileClient from './PatientProfileClient';

export const dynamic = 'force-dynamic';

export default async function PatientProfilePage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const cookieStore = await cookies();
  const doctorId = cookieStore.get('user_id')?.value;

  const [patientRes, visitsRes, doctorsRes, servicesRes] = await Promise.all([
    supabaseAdmin.from('patients').select('*').eq('id', patientId).single(),
    supabaseAdmin
      .from('visits')
      .select(`*, doctor:users(*), attachments(*)`)
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false }),
    supabaseAdmin.from('users').select('*').eq('role', 'DOCTOR'),
    supabaseAdmin.from('services').select('*'),
  ]);

  if (patientRes.error || !patientRes.data) notFound();

  return (
    <PatientProfileClient
      patient={patientRes.data}
      visits={visitsRes.data || []}
      doctors={doctorsRes.data || []}
      services={servicesRes.data || []}
      currentDoctorId={doctorId || ''}
    />
  );
}
