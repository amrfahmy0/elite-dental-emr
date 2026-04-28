import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tbwfgettxzydbkldobte.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedUsers() {
  console.log("Creating default staff accounts...");

  // 1. Create Doctor
  const { data: doctor, error: doctorError } = await supabaseAdmin.auth.admin.createUser({
    email: 'doctor@elitedental.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Dr. Ahmed Fahmy',
      role: 'DOCTOR'
    }
  });

  if (doctorError) {
    console.error("Error creating Doctor:", doctorError.message);
  } else {
    console.log("✅ Doctor created successfully: doctor@elitedental.com");
  }

  // 2. Create Receptionist
  const { data: receptionist, error: receptionistError } = await supabaseAdmin.auth.admin.createUser({
    email: 'reception@elitedental.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Sara Hassan',
      role: 'RECEPTIONIST'
    }
  });

  if (receptionistError) {
    console.error("Error creating Receptionist:", receptionistError.message);
  } else {
    console.log("✅ Receptionist created successfully: reception@elitedental.com");
  }
}

seedUsers();
