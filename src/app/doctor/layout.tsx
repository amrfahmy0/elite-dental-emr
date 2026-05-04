import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ArrivalNotifier from '@/components/ArrivalNotifier';
import { supabaseAdmin } from '@/lib/supabase';

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const role = cookieStore.get('user_role')?.value;

  if (!userId || role !== 'DOCTOR') redirect('/login');

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('full_name')
    .eq('id', userId)
    .single();

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="print:hidden">
        <Sidebar role="DOCTOR" userName={user?.full_name || 'Doctor'} />
      </div>
      <main className="flex-1 lg:ml-20 overflow-y-auto transition-all duration-300 print:hidden" style={{ background: '#0B1220' }}>
        <div className="p-4 sm:p-8 pt-20 lg:pt-8 min-h-screen">
          {children}
        </div>
      </main>
      <ArrivalNotifier doctorId={userId} />
    </div>
  );
}
