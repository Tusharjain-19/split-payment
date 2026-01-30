import db from '../models/db.js';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class RefundEngine {
  /**
   * Initiates a refund for a sub-transaction
   * @param {string} subTxnId - The ID of the sub-transaction
   * @param {number} amount - Amount to refund
   */
  async refund(subTxnId, amount) {
    try {
      console.log(`💰 [REFUND-ENGINE] Processing refund for ${subTxnId} (Amount: ₹${amount})`);
      
      // 1. Get transaction details
      const { rows } = await db.query(
        'SELECT gateway_payment_id, status FROM sub_transactions WHERE id = $1',
        [subTxnId]
      );
      
      if (!rows.length) throw new Error('Sub-transaction not found');
      const { gateway_payment_id, status } = rows[0];
      
      if (status === 'REFUNDED') {
        console.log(`⚠️ Skip: ${subTxnId} already refunded`);
        return;
      }

      let refundId = `sim_ref_${subTxnId.slice(0, 8)}`;
      let refundStatus = 'SUCCESS';

      // 2. Call Razorpay Refund API if in production/live mode (mocking for test)
      if (gateway_payment_id && !gateway_payment_id.startsWith('pay_test_fake')) {
        try {
          const refund = await razorpay.payments.refund(gateway_payment_id, {
            amount: Math.round(amount * 100),
            notes: { subTxnId }
          });
          refundId = refund.id;
        } catch (error) {
          console.error(`❌ Razorpay Refund Failed: ${error.message}`);
          refundStatus = 'FAILED';
          throw error;
        }
      }

      // 3. Update DB
      await db.query(
        'INSERT INTO refunds (sub_txn_id, amount, gateway_refund_id, status) VALUES ($1, $2, $3, $4)',
        [subTxnId, amount, refundId, refundStatus]
      );

      if (refundStatus === 'SUCCESS') {
        await db.query(
          "UPDATE sub_transactions SET status = 'REFUNDED', refund_id = $1, updated_at = NOW() WHERE id = $2",
          [refundId, subTxnId]
        );
        console.log(`✅ Refund successful: ${refundId}`);
      }

    } catch (error) {
      console.error(`❌ Refund Engine Error [${subTxnId}]:`, error.message);
      
      await db.query(
        'INSERT INTO refunds (sub_txn_id, amount, status, retry_count) VALUES ($1, $2, $3, $4)',
        [subTxnId, amount, 'FAILED', 1]
      );
      
      throw error;
    }
  }
}

export default new RefundEngine();
