import 'dotenv/config';

console.log('🔍 Environment Variable Test');
console.log('============================');
console.log('DATABASE_URL:', process.env.DATABASE_URL || '❌ NOT SET');
console.log('UNUSUAL_WHALES_API_KEY:', process.env.UNUSUAL_WHALES_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('PORT:', process.env.PORT || 'undefined');
console.log('');

if (process.env.DATABASE_URL) {
    console.log('✅ Ready to start the application!');
} else {
    console.log('❌ DATABASE_URL is missing. Check your .env file.');
    console.log('Expected format:');
    console.log('DATABASE_URL=postgresql://postgres:postgres@localhost:5432/uwibkr_dev');
}
