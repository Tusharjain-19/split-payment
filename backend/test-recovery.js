import 'dotenv/config';
import paymentService from './services/paymentService.js';
import db from './models/db.js';
import crypto from 'crypto';

async function testRecovery() {
  console.log('🧪 [TEST] Starting Split Payment Recovery Test...');
  
  try {
    // 1. Create a split payment
    const { masterTxnId, orders } = await paymentService.createSplitPayment(
      'user_test_4',
      'tushar@example.com',
      1000,
      [
        { type: 'WALLET', amount: 500 },
        { type: 'CARD', amount: 500 }
      ]
    );
    
    console.log(`✅ Created Master Transaction: ${masterTxnId}`);
    
    // 2. Simulate WALLET success
    console.log(`🏗️ Simulating SUCCESS for ${orders[0].type}...`);
    const paymentId = 'pay_test_success_123';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(orders[0].orderId + '|' + paymentId)
      .digest('hex');

    await paymentService.verifyPayment(
      orders[0].subTxnId,
      paymentId,
      orders[0].orderId,
      signature
    );
    
    // 3. Simulate CARD failure
    console.log(`⚠️ Simulating FAILURE for ${orders[1].type}...`);
    await paymentService.handlePaymentFailure(orders[1].subTxnId);
    
    // 4. Wait for resolution
    console.log('⏳ Waiting for State Machine to process refunds...');
    await new Promise(r => setTimeout(r, 2000));
    
    // 5. Verify DB state
    const { master, subTransactions } = await paymentService.getPaymentStatus(masterTxnId);
    
    console.log('\n📊 FINAL STATE:');
    console.log(`Master Status: ${master.status}`);
    subTransactions.forEach(s => {
      console.log(`- ${s.source_type}: ${s.status} (Refund ID: ${s.refund_id || 'N/A'})`);
    });
    
    if (master.status === 'FAILED' && subTransactions.some(s => s.status === 'REFUNDED')) {
      console.log('\n🌟 TEST PASSED: Recovery flow works perfectly!');
    } else {
      console.log('\n❌ TEST FAILED: Final state mismatch.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test crashed:', error);
    process.exit(1);
  }
}

testRecovery();
