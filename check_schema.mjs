import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tbwfgettxzydbkldobte.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
  const { data, error } = await supabaseAdmin
    .from('patients')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error fetching patients:", error.message);
  } else {
    console.log("Columns found in patients table:");
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log("No data, inserting dummy to test structure...");
      const { data: d2, error: e2 } = await supabaseAdmin.from('patients').insert({
        patient_id: 'TEST-123',
        first_name: 'Test',
        last_name: 'Test',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        contact_number: '123'
      }).select();
      if (e2) {
        console.error("Insert error:", e2.message);
      } else {
        console.log(Object.keys(d2[0]));
        await supabaseAdmin.from('patients').delete().eq('id', d2[0].id);
      }
    }
  }
}

checkSchema();
