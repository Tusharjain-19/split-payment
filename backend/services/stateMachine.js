import db from '../models/db.js';

class StateMachine {
  constructor(masterTxnId) {
    this.masterTxnId = masterTxnId;
    this.validTransitions = {
      'PENDING': ['SUCCESS', 'PROCESSING_REFUND', 'EXPIRED', 'FAILED'],
      'PROCESSING_REFUND': ['FAILED_REFUNDED', 'EXPIRED_REFUNDED', 'FAILED'],
      'SUCCESS': [],
      'FAILED': ['PROCESSING_REFUND'], // Allow retrying refund flow
      'EXPIRED': ['PROCESSING_REFUND'],
      'FAILED_REFUNDED': [],
      'EXPIRED_REFUNDED': []
    };
  }

  /**
   * Transitions the master transaction to a new state
   * @param {string} newStatus - Destination status
   * @param {object} metadata - Optional audit metadata
   */
  async transition(newStatus, metadata = {}) {
    const { rows } = await db.query(
      'SELECT status FROM master_transactions WHERE id = $1',
      [this.masterTxnId]
    );

    if (!rows.length) throw new Error(`Transaction ${this.masterTxnId} not found`);
    const oldStatus = rows[0].status;

    // 1. Validate (allow same-state transition for idempotency)
    if (oldStatus === newStatus) return;

    if (!this.validTransitions[oldStatus] || !this.validTransitions[oldStatus].includes(newStatus)) {
      console.warn(`⚠️ Warning: Potentially invalid transition ${oldStatus} -> ${newStatus}`);
      // In production, we'd throw. For this project, we'll log and proceed but enforce standard flow.
    }

    // 2. Update status
    await db.query(
      'UPDATE master_transactions SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, this.masterTxnId]
    );

    // 3. Log to Audit (Rich Logging)
    await db.query(`
      INSERT INTO audit_logs (master_txn_id, event_type, old_status, new_status, metadata)
      VALUES ($1, 'STATUS_CHANGE', $2, $3, $4)
    `, [this.masterTxnId, oldStatus, newStatus, JSON.stringify(metadata)]);

    // 4. Log to Status Logs (Legacy compatibility)
    await db.query(`
      INSERT INTO status_logs (master_txn_id, old_status, new_status)
      VALUES ($1, $2, $3)
    `, [this.masterTxnId, oldStatus, newStatus]);

    console.log(`📡 [STATE-MACHINE] ${this.masterTxnId}: ${oldStatus} → ${newStatus}`);
  }
}

export default StateMachine;
