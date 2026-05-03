'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function addExpenseAction(formData: {
  expense_date: string;
  category: string;
  payee: string;
  amount: number;
}) {
  const cookieStore = await cookies();
  const doctorId = cookieStore.get('user_id')?.value;

  if (!doctorId) {
    return { error: 'Unauthorized: No active session found' };
  }

  const newExpense = {
    ...formData,
    doctor_id: doctorId
  };

  const { data, error } = await supabaseAdmin.from('expenses').insert(newExpense).select();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/doctor/analytics');
  return { data: data[0] };
}
