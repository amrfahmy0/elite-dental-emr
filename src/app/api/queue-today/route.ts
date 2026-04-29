import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctorId');

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const todayEnd   = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();

  let query = supabaseAdmin
    .from('appointments')
    .select(`*, patient:patients(*), service:services(*), doctor:users(*)`)
    .gte('start_time', todayStart)
    .lte('start_time', todayEnd)
    .order('start_time', { ascending: true });

  if (doctorId) query = query.eq('doctor_id', doctorId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}
