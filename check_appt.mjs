import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tbwfgettxzydbkldobte.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAppointmentsDetails() {
  const { data, error } = await supabaseAdmin.from('appointments').select('*').limit(1);
  if (error) {
    console.error("Error:", error.message);
  } else {
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log("No data, trying insert to see next error...");
      const { error: e2 } = await supabaseAdmin.from('appointments').insert({
        appointment_date: new Date().toISOString()
      });
      console.log("Next error:", e2?.message);
    }
  }
}

checkAppointmentsDetails();
