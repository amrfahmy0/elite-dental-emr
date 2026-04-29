import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { supabaseAdmin } from '@/lib/supabase';

export default async function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const role = cookieStore.get('user_role')?.value;

  if (!userId || role !== 'RECEPTIONIST') redirect('/login');

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('full_name')
    .eq('id', userId)
    .single();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="RECEPTIONIST" userName={user?.full_name || 'Receptionist'} />
      <main className="flex-1 lg:ml-20 overflow-y-auto transition-all duration-300" style={{ background: '#0B1220' }}>
        <div className="p-4 sm:p-8 pt-20 lg:pt-8 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
