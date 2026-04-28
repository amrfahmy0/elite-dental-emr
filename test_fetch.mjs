import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tbwfgettxzydbkldobte.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testFetch() {
  console.log("Fetching visits...");
  const { data, error } = await supabaseAdmin
    .from('visits')
    .select(`*, doctor:users(*), attachments(*)`)
    .limit(1);
    
  if (error) {
    console.error("Fetch Error:", error.message, error.details, error.hint);
  } else {
    console.log("Fetch Success, visits count:", data.length);
    if (data.length > 0) console.log(data[0]);
  }
}

testFetch();
