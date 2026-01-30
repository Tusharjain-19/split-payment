require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
  console.log('🧪 Testing email service...');
  
  // Replace with your actual email
  const testEmail = 'tushar.jain.19@example.com'; // CHANGE THIS to your email to test!
  
  try {
    console.log(`📡 Sending test success email to ${testEmail}...`);
    
    // Test success email
    await emailService.sendPaymentSuccess(testEmail, {
      masterTxnId: 'test-txn-' + Math.floor(Math.random() * 1000),
      totalAmount: 1000,
      sources: [
        { type: 'WALLET', amount: 600 },
        { type: 'CARD', amount: 400 }
      ]
    });
    
    console.log('✅ Test email sent! Check your inbox.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Email test failed:', error);
    process.exit(1);
  }
}

testEmail();
