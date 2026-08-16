import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

const { data, error } = await supabase
  .from('scans')
  .select('id')
  .limit(1);

if (error) {
  console.error('Supabase database test failed:');
  console.error(error.message);
  process.exit(1);
}

console.log('Supabase database connection successful!');
console.log('Scans rows found:', data.length);