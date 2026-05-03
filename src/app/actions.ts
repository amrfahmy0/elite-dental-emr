'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AttachmentCategory } from '@/lib/types';

// ─── AUTH ──────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: authError?.message || 'Invalid credentials' };
  }

  // Fetch role from users table
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (!user) return { error: 'User profile not found.' };

  // Store session token in cookie
  const cookieStore = await cookies();
  cookieStore.set('session_token', authData.session?.access_token || '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  cookieStore.set('user_id', authData.user.id, {
    httpOnly: true,
    path: '/',
  });
  cookieStore.set('user_role', user.role, {
    httpOnly: true,
    path: '/',
  });

  if (user.role === 'DOCTOR') redirect('/doctor/dashboard');
  if (user.role === 'RECEPTIONIST') redirect('/receptionist/dashboard');
  return { error: 'Unknown role' };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
  cookieStore.delete('user_id');
  cookieStore.delete('user_role');
  redirect('/login');
}

// ─── APPOINTMENTS ──────────────────────────────────────────────────────────

export async function createAppointmentAction(data: {
  patient_id: string;
  doctor_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  chief_complaint?: string;
}) {
  const { error } = await supabaseAdmin.from('appointments').insert({
    id: crypto.randomUUID(),
    ...data,
    status: 'SCHEDULED',
    created_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath('/receptionist/dashboard');
  return { success: true };
}

export async function updateAppointmentStatusAction(id: string, status: string) {
  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ status })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/receptionist/dashboard');
  revalidatePath('/receptionist/queue');
  revalidatePath('/doctor/dashboard');
  return { success: true };
}

export async function getAppointmentDetailsAction(id: string) {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(`*, patient:patients(*), service:services(*), doctor:users(*)`)
    .eq('id', id)
    .single();
  if (error) return { error: error.message };
  return { data };
}

// ─── PATIENTS ──────────────────────────────────────────────────────────────

export async function createPatientAction(formData: FormData) {
  const { count } = await supabaseAdmin
    .from('patients')
    .select('*', { count: 'exact', head: true });

  const patient_id = `EDS-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data: patient, error } = await supabaseAdmin.from('patients').insert({
    id: crypto.randomUUID(),
    patient_id,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    date_of_birth: formData.get('date_of_birth') as string,
    gender: formData.get('gender') as string,
    contact_number: formData.get('contact_number') as string,
    email: formData.get('email') as string || null,
    address: formData.get('address') as string || null,
    medical_history: formData.get('medical_history') as string || null,
    allergies: formData.get('allergies') as string || null,
    has_bleeding_disorder: formData.get('has_bleeding_disorder') === 'true',
    created_at: new Date().toISOString(),
  }).select().single();

  if (error) return { error: error.message };
  revalidatePath('/receptionist/patients');
  return { patient };
}

// ─── VISITS ────────────────────────────────────────────────────────────────

export async function createVisitAction(formData: FormData, patientId: string, doctorId: string) {
  const { data: visit, error } = await supabaseAdmin.from('visits').insert({
    id: crypto.randomUUID(),
    patient_id: patientId,
    doctor_id: doctorId,
    appointment_id: formData.get('appointment_id') as string || null,
    tooth_numbers: formData.get('tooth_numbers') as string || null,
    chief_complaint: formData.get('chief_complaint') as string || null,
    procedure_performed: formData.get('procedure_performed') as string || null,
    medical_notes: formData.get('medical_notes') as string || null,
    diagnosis: formData.get('diagnosis') as string || null,
    prescription: formData.get('prescription') as string || null,
    next_visit_plan: formData.get('next_visit_plan') as string || null,
    total_cost: formData.get('total_cost') ? parseFloat(formData.get('total_cost') as string) : null,
    amount_paid: formData.get('amount_paid') ? parseFloat(formData.get('amount_paid') as string) : null,
    previous_balance: formData.get('previous_balance') ? parseFloat(formData.get('previous_balance') as string) : 0,
    visit_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select().single();

  if (error || !visit) return { error: error?.message || 'Unknown error' };

  // Handle file attachments — upload to Supabase Storage
  const fileCount = parseInt((formData.get('fileCount') as string) || '0');
  for (let i = 0; i < fileCount; i++) {
    const file = formData.get(`file_${i}`) as File;
    const category = (formData.get(`category_${i}`) as AttachmentCategory) || 'OTHER';
    if (file && file.size > 0) {
      // Build a unique storage path: patients/{patientId}/{visitId}/{originalName}
      const ext = file.name.split('.').pop() || '';
      const safeFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const storagePath = `patients/${patientId}/${visit.id}/${safeFileName}`;

      // Convert File to ArrayBuffer for server-side upload
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabaseAdmin.storage
        .from('patient-files')
        .upload(storagePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError.message);
        // Still save the record even if upload fails, so data isn't lost
      }

      await supabaseAdmin.from('attachments').insert({
        id: crypto.randomUUID(),
        visit_id: visit.id,
        patient_id: patientId,
        file_name: file.name,
        file_type: file.type,
        storage_path: storagePath,
        file_size_bytes: file.size,
        category,
        uploaded_by_id: doctorId,
        created_at: new Date().toISOString(),
      });
    }
  }

  revalidatePath(`/doctor/patients/${patientId}`);
  return { visit };
}

export async function getVisitDetailsAction(visitId: string) {
  const { data, error } = await supabaseAdmin
    .from('visits')
    .select('*, patient:patients(*), doctor:users(*)')
    .eq('id', visitId)
    .single();
  return { data, error: error?.message };
}

export async function updateVisitPaymentAction(visitId: string, addedPayment: number) {
  const { data: visit, error: fetchError } = await supabaseAdmin.from('visits').select('amount_paid, patient_id').eq('id', visitId).single();
  if (fetchError) return { error: fetchError.message };
  
  const newAmount = (visit.amount_paid || 0) + addedPayment;
  const { error } = await supabaseAdmin.from('visits').update({ amount_paid: newAmount }).eq('id', visitId);
  if (error) return { error: error.message };
  
  revalidatePath(`/doctor/patients/${visit.patient_id}`);
  revalidatePath(`/receptionist/patients/${visit.patient_id}`);
  return { success: true };
}

export async function deleteVisitAction(visitId: string, patientId: string) {
  const { error } = await supabaseAdmin.from('visits').delete().eq('id', visitId);
  if (error) return { error: error.message };
  revalidatePath(`/doctor/patients/${patientId}`);
  return { success: true };
}

export async function getArrivalNotificationDataAction(appointmentId: string) {
  const { data: appt, error: apptError } = await supabaseAdmin
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('id', appointmentId)
    .single();
    
  if (apptError || !appt) return { error: apptError?.message || 'Appointment not found' };

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 2);

  const { data: waitingAppts } = await supabaseAdmin
    .from('appointments')
    .select('id, start_time')
    .eq('doctor_id', appt.doctor_id)
    .eq('status', 'WAITING')
    .gte('start_time', yesterday.toISOString())
    .lte('start_time', tomorrow.toISOString());

  const cairoTodayString = now.toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' });
  const waitingCount = (waitingAppts || []).filter(a => 
    new Date(a.start_time).toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' }) === cairoTodayString
  ).length;

  return { 
    patientName: `${appt.patient?.first_name} ${appt.patient?.last_name}`,
    waitingCount
  };
}

export async function getEnterNotificationDataAction(appointmentId: string) {
  const { data: appt, error: apptError } = await supabaseAdmin
    .from('appointments')
    .select('patient:patients(*), doctor:users(*)')
    .eq('id', appointmentId)
    .single();
    
  if (apptError || !appt) return { error: apptError?.message || 'Appointment not found' };

  const patient = appt.patient as any;
  const doctor = appt.doctor as any;

  return { 
    patientName: `${patient?.first_name} ${patient?.last_name}`,
    doctorName: doctor?.full_name || 'Unknown Doctor'
  };
}

export async function updateVisitAction(visitId: string, patientId: string, formData: FormData) {
  const { error } = await supabaseAdmin.from('visits').update({
    tooth_numbers: formData.get('tooth_numbers') as string || null,
    chief_complaint: formData.get('chief_complaint') as string || null,
    procedure_performed: formData.get('procedure_performed') as string || null,
    medical_notes: formData.get('medical_notes') as string || null,
    diagnosis: formData.get('diagnosis') as string || null,
    prescription: formData.get('prescription') as string || null,
    next_visit_plan: formData.get('next_visit_plan') as string || null,
    total_cost: formData.get('total_cost') ? parseFloat(formData.get('total_cost') as string) : null,
    amount_paid: formData.get('amount_paid') ? parseFloat(formData.get('amount_paid') as string) : null,
    updated_at: new Date().toISOString(),
  }).eq('id', visitId);

  if (error) return { error: error.message };
  revalidatePath(`/doctor/patients/${patientId}`);
  return { success: true };
}
