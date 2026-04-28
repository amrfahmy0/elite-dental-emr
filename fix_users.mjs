import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tbwfgettxzydbkldobte.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixUsers() {
  console.log("Checking for missing profiles in public.users...");

  // 1. Get all users from auth.users
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (authError) {
    console.error("Error fetching auth users:", authError.message);
    return;
  }

  for (const user of authUsers.users) {
    // 2. Check if they exist in public.users
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      console.log(`Profile missing for ${user.email}. Creating it now...`);
      // 3. Insert them into public.users
      const { error: insertError } = await supabaseAdmin.from('users').insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        role: user.user_metadata?.role || 'RECEPTIONIST'
      });

      if (insertError) {
        console.error(`Failed to insert profile for ${user.email}:`, insertError.message);
      } else {
        console.log(`✅ Successfully linked profile for ${user.email}`);
      }
    } else {
      console.log(`Profile already exists for ${user.email}`);
    }
  }
}

fixUsers();
