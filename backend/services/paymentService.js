import Razorpay from 'razorpay';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';
import emailService from './emailService.js';
import refundEngine from './refundEngine.js';
import StateMachine from './stateMachine.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log('💎 Razorpay initialized');

class PaymentService {
  
  async resolveMasterTransaction(masterTxnId) {
    const sm = new StateMachine(masterTxnId);
    
    // 1. Get current state of all parts
    const { rows: subTxns } = await db.query(
      'SELECT id, status, amount, source_type FROM sub_transactions WHERE master_txn_id = $1',
      [masterTxnId]
    );
    
    const { rows: masterRows } = await db.query(
      'SELECT user_email, total_amount, status FROM master_transactions WHERE id = $1',
      [masterTxnId]
    );
    
    if (!masterRows.length) return;
    const master = masterRows[0];
    const statuses = subTxns.map(s => s.status);
    
    console.log(`🔍 [RESOLVER] ${masterTxnId} | Sub-statuses: [${statuses.join(', ')}]`);

    // Case 1: All SUCCESS
    if (statuses.every(s => s === 'SUCCESS')) {
      await sm.transition('SUCCESS', { reason: 'All sub-payments completed' });
      await emailService.sendPaymentSuccess(master.user_email, {
        masterTxnId,
        totalAmount: master.total_amount
      });
      return;
    }

    // Case 2: Any FAILED (Compensation Logic)
    if (statuses.some(s => s === 'FAILED')) {
      await sm.transition('PROCESSING_REFUND', { reason: 'Sub-payment failure detected' });
      
      let refundedTotal = 0;
      for (const sub of subTxns) {
        if (sub.status === 'SUCCESS') {
          try {
            await refundEngine.refund(sub.id, sub.amount);
            refundedTotal += parseFloat(sub.amount);
          } catch (e) {
            console.error(`🔴 Refund failed for ${sub.id}`);
          }
        }
      }

      await sm.transition('FAILED', { 
        reason: 'Split payment failed',
        refundedAmount: refundedTotal 
      });

      await emailService.sendPaymentFailed(master.user_email, {
        masterTxnId,
        totalAmount: master.total_amount,
        reason: 'One or more of your split payments failed. Refunds have been initiated for successful parts.'
      });
    }
  }

  async createSplitPayment(userId, userEmail, totalAmount, sources) {
    try {
      const masterTxnId = uuidv4();
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
      console.log(`🚀 [PAYMENT-SERVICE] Creating Split Payment for ${userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')} (Total: ₹${totalAmount})`);

      await db.query(`
        INSERT INTO master_transactions (id, user_id, user_email, total_amount, status, expires_at)
        VALUES ($1, $2, $3, $4, 'PENDING', $5)
      `, [masterTxnId, userId, userEmail, totalAmount, expiresAt]);
      
      const orders = [];
      for (const s of sources) {
        console.log(`📦 Creating order for ${s.type} (Amount: ₹${s.amount})`);
        const subTxnId = uuidv4();
        const order = await razorpay.orders.create({
          amount: Math.round(s.amount * 100),
          currency: 'INR',
          receipt: subTxnId,
          notes: { masterTxnId }
        });
        
        await db.query(`
          INSERT INTO sub_transactions (id, master_txn_id, source_type, amount, gateway_order_id, status)
          VALUES ($1, $2, $3, $4, $5, 'INITIATED')
        `, [subTxnId, masterTxnId, s.type, s.amount, order.id]);
        
        orders.push({ subTxnId, orderId: order.id, amount: s.amount, type: s.type });
      }
      
      return { masterTxnId, orders };
    } catch (error) {
      console.error('❌ [CREATE-SPLIT-ERROR]:', error);
      throw error;
    }
  }

  async verifyPayment(subTxnId, razorpayPaymentId, razorpayOrderId, razorpaySignature) {
    // 1. Signature Verify
    const text = razorpayOrderId + '|' + razorpayPaymentId;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(text).digest('hex');
    
    if (expected !== razorpaySignature) throw new Error('Invalid payment signature');
    
    // 2. Update Sub-transaction
    await db.query(`
      UPDATE sub_transactions 
      SET status = 'SUCCESS', gateway_payment_id = $1, updated_at = NOW() 
      WHERE id = $2
    `, [razorpayPaymentId, subTxnId]);
    
    // 3. Resolve Master
    const { rows } = await db.query('SELECT master_txn_id FROM sub_transactions WHERE id = $1', [subTxnId]);
    if (rows.length) {
      await this.resolveMasterTransaction(rows[0].master_txn_id);
    }
    
    return { success: true };
  }
  
  async handlePaymentFailure(subTxnId) {
    await db.query("UPDATE sub_transactions SET status = 'FAILED', updated_at = NOW() WHERE id = $1", [subTxnId]);
    const { rows } = await db.query('SELECT master_txn_id FROM sub_transactions WHERE id = $1', [subTxnId]);
    if (rows.length) {
      await this.resolveMasterTransaction(rows[0].master_txn_id);
    }
    return { success: true };
  }

  async getPaymentStatus(masterTxnId) {
    const { rows: master } = await db.query('SELECT * FROM master_transactions WHERE id = $1', [masterTxnId]);
    const { rows: subs } = await db.query('SELECT * FROM sub_transactions WHERE master_txn_id = $1', [masterTxnId]);
    
    if (!master.length) throw new Error('Transaction not found');
    
    return { master: master[0], subTransactions: subs };
  }

  async getTransactionHistory() {
    const { rows } = await db.query(`
      SELECT * FROM transaction_health_report 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    return rows;
  }
}

export default new PaymentService();
