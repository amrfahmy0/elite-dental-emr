'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function addExpenseAction(formData: FormData) {
  const cookieStore = await cookies();
  const doctorId = cookieStore.get('user_id')?.value;

  if (!doctorId) {
    return { error: 'Unauthorized: No active session found' };
  }

  const expense_date = formData.get('expense_date') as string;
  const category = formData.get('category') as string;
  const payee = formData.get('payee') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const receiptFile = formData.get('receipt') as File | null;

  let receipt_url: string | undefined = undefined;

  if (receiptFile && receiptFile.size > 0) {
    const fileExt = receiptFile.name.split('.').pop();
    const fileName = `${doctorId}-${Date.now()}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('receipts')
      .upload(fileName, receiptFile);
      
    if (uploadError) {
      return { error: `Failed to upload receipt: ${uploadError.message}` };
    }
    
    // Get public URL
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('receipts')
      .getPublicUrl(fileName);
      
    receipt_url = publicUrlData.publicUrl;
  }

  const newExpense = {
    expense_date,
    category,
    payee,
    amount,
    doctor_id: doctorId,
    ...(receipt_url && { receipt_url })
  };

  const { data, error } = await supabaseAdmin.from('expenses').insert(newExpense).select();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/doctor/analytics');
  return { data: data[0] };
}
