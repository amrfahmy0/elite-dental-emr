import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tbwfgettxzydbkldobte.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkServices() {
  const { data, error } = await supabaseAdmin.from('services').select('*');
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log(`Found ${data.length} services.`);
  }
}

checkServices();
