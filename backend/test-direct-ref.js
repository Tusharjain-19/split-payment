import pkg from 'pg';
const { Client } = pkg;

async function testDirect() {
    // Current Supabase standard for direct connection:
    // User: postgres.[PROJ_REF]
    const client = new Client({
        host: 'aws-0-ap-southeast-2.pooler.supabase.com',
        port: 5432,
        user: 'postgres.jjkioxbzgpcssjquosrh',
        password: 'Tushar#@123',
        database: 'postgres',
    });

    try {
        console.log('🧪 Attempting connection with Project Ref...');
        await client.connect();
        console.log('✅ Connection successful!');
        const res = await client.query('SELECT NOW()');
        console.log('Time:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    }
}

testDirect();
