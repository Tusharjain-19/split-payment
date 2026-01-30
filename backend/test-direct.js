import pkg from 'pg';
const { Client } = pkg;

async function testDirect() {
    const client = new Client({
        host: 'db.jjkioxbzgpcssjquosrh.supabase.co',
        port: 5432,
        user: 'postgres',
        password: 'Tushar#@123',
        database: 'postgres',
    });

    try {
        console.log('🧪 Attempting direct connection...');
        await client.connect();
        console.log('✅ Direct connection successful!');
        const res = await client.query('SELECT NOW()');
        console.log('Time:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('❌ Direct connection failed:', err.message);
    }
}

testDirect();
