import db from '../models/db.js';
import paymentService from '../services/paymentService.js';
import StateMachine from '../services/stateMachine.js';

/**
 * Checks for transactions that have exceeded their expiry time and are still pending.
 * Triggers failure and refund logic for them.
 */
async function processExpiredTransactions() {
  console.log('⏰ [WORKER] Checking for expired transactions...');
  
  try {
    // 1. Find PENDING transactions that are past their expires_at
    const { rows: expired } = await db.query(`
      SELECT id FROM master_transactions 
      WHERE status = 'PENDING' AND expires_at < NOW()
    `);

    if (expired.length === 0) {
      console.log('✅ No expired transactions found.');
      return;
    }

    console.log(`⚠️ Found ${expired.length} expired transactions. Triggering cleanup...`);

    for (const txn of expired) {
      try {
        const sm = new StateMachine(txn.id);
        
        // Update any INITIATED sub-transactions to FAILED
        await db.query(`
          UPDATE sub_transactions SET status = 'FAILED', updated_at = NOW()
          WHERE master_txn_id = $1 AND status IN ('INITIATED', 'PENDING')
        `, [txn.id]);

        // This will trigger the compensation flow (refunds for any partial SUCCESS)
        await paymentService.resolveMasterTransaction(txn.id);
        
        // Final transition to EXPIRED
        await sm.transition('EXPIRED', { reason: 'TTL Exceeded' });
        
      } catch (e) {
        console.error(`❌ Error cleaning up ${txn.id}:`, e.message);
      }
    }
  } catch (error) {
    console.error('❌ Expiry Worker Error:', error.message);
  }
}

// If run directly
if (process.argv[1].includes('expiryWorker.js')) {
  console.log('🚀 Expiry Worker Started Locally');
  setInterval(processExpiredTransactions, 60000); // Run every minute
  processExpiredTransactions(); // Initial run
}

export default processExpiredTransactions;
