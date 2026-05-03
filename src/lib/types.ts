export type UserRole = 'DOCTOR' | 'RECEPTIONIST';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  contact_number: string;
  email?: string;
  address?: string;
  medical_history?: string;
  allergies?: string;
  has_bleeding_disorder: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  color: string;
  description?: string;
  price?: number;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: 'SCHEDULED' | 'WAITING' | 'IN_SESSION' | 'COMPLETED' | 'CANCELLED';
  chief_complaint?: string;
  notes?: string;
  created_at: string;
  patient?: Patient;
  doctor?: AppUser;
  service?: Service;
}

export type AttachmentCategory = 'X_RAY' | 'LAB_RESULT' | 'CLINICAL_PHOTO' | 'PRESCRIPTION' | 'OTHER';

export interface Attachment {
  id: string;
  visit_id: string;
  patient_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  file_size_bytes: number;
  category: AttachmentCategory;
  uploaded_by_id: string;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_date: string;
  category: string;
  payee: string;
  amount: number;
  doctor_id: string;
  receipt_url?: string;
  created_at?: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  tooth_numbers?: string;
  chief_complaint?: string;
  procedure_performed?: string;
  medical_notes?: string;
  diagnosis?: string;
  prescription?: string;
  next_visit_plan?: string;
  total_cost?: number;
  amount_paid?: number;
  previous_balance?: number;
  visit_date: string;
  created_at: string;
  updated_at: string;
  doctor?: AppUser;
  patient?: Patient;
  attachments?: Attachment[];
}
