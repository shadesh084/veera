import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// This script is meant to run from inside the backend/ directory
// so that @supabase/supabase-js and dotenv resolve correctly
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load backend/.env (we're running from backend/ dir, so .env is in CWD)
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.includes('PASTE_YOUR')) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  console.error('');
  console.error('Steps:');
  console.error('  1. Open backend/.env');
  console.error('  2. Replace PASTE_YOUR_SERVICE_ROLE_KEY_HERE with your actual service_role key');
  console.error('     (Find it in Supabase Dashboard -> Project Settings -> API -> service_role)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEMO_EMAIL = 'student@example.com';
const DEMO_PASSWORD = 'password123';

async function seedDemoUser() {
  console.log('Seeding demo user into Supabase...');

  // Check if user already exists
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }

  const existingUser = existingUsers.users.find(u => u.email === DEMO_EMAIL);
  if (existingUser) {
    console.log('Demo user already exists:', DEMO_EMAIL);

    // Update password to ensure it matches
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (updateError) {
      console.error('Failed to update demo user password:', updateError.message);
    } else {
      console.log('Demo user password confirmed/updated successfully.');
    }
    return;
  }

  // Create the demo user with email already confirmed
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      display_name: 'Demo Student',
      academic_level: 'Undergraduate',
      institution_name: 'AcademiTrack University',
    },
  });

  if (error) {
    console.error('Failed to create demo user:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('Demo user created successfully!');
  console.log('  Email:    ' + DEMO_EMAIL);
  console.log('  Password: ' + DEMO_PASSWORD);
  console.log('  User ID:  ' + data.user.id);
  console.log('');
  console.log('You can now log in using the Demo button on the login page.');
}

seedDemoUser().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
