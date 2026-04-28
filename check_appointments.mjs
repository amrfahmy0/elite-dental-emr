import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tbwfgettxzydbkldobte.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAppointments() {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error fetching appointments:", error.message);
  } else {
    console.log("Columns found in appointments table:");
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log("No data, inserting dummy to test structure...");
      const { data: d2, error: e2 } = await supabaseAdmin.from('appointments').insert({}).select();
      if (e2) {
        console.error("Insert error:", e2.message);
      } else {
        console.log(Object.keys(d2[0]));
        await supabaseAdmin.from('appointments').delete().eq('id', d2[0].id);
      }
    }
  }
}

checkAppointments();
