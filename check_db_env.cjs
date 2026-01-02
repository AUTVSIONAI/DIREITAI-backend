const dotenv = require('dotenv');
dotenv.config();

console.log('Checking DATABASE_URL...');
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL is defined.');
} else {
  console.log('DATABASE_URL is NOT defined.');
}

if (process.env.SUPABASE_URL) {
  console.log('SUPABASE_URL is defined.');
}
