import db from './models/db.js';

async function testDatabase() {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test 1: Simple query
    const result = await db.query('SELECT NOW() as current_time');
    console.log('✅ Current time from DB:', result.rows[0].current_time);
    
    // Test 2: Check tables
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('✅ Tables found:', tables.rows.map(r => r.table_name));
    
    // Test 3: Insert sample data (Cleanup if exists first)
    await db.query('DELETE FROM master_transactions WHERE user_id = $1', ['test_user_1']);
    
    const testInsert = await db.query(`
      INSERT INTO master_transactions 
      (id, user_id, user_email, total_amount, status, expires_at)
      VALUES (gen_random_uuid(), $1, $2, $3, 'PENDING', NOW() + INTERVAL '20 minutes')
      RETURNING *
    `, ['test_user_1', 'test@example.com', 1000]);
    
    console.log('✅ Test record created:', testInsert.rows[0]);
    
    // Clean up
    await db.query('DELETE FROM master_transactions WHERE user_id = $1', ['test_user_1']);
    console.log('✅ Test record deleted');
    
    console.log('\n🎉 All database tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();
