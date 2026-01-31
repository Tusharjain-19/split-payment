import 'dotenv/config';
import { Resend } from 'resend';
import db from '../models/db.js';

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
  async logEmail(masterTxnId, emailType, recipient) {
    try {
      await db.query('INSERT INTO email_logs (master_txn_id, email_type, recipient) VALUES ($1, $2, $3)', [masterTxnId, emailType, recipient]);
    } catch (e) { console.error('Log error', e); }
  }
  async sendPaymentSuccess(email, data) {
    try {
      if (!email) {
        console.warn('⚠️ Skipping email: No recipient provided');
        return;
      }
      const maskedEmail = email.length > 3 ? `${email.substring(0, 2)}***@${email.split('@')[1] || '...'}` : '***';
      console.log(`✉️ Sending SUCCESS email to: ${maskedEmail}`);
      
      const response = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: '✅ Payment Success - Split Payment System',
        html: `<h1>Payment Confirmed</h1><p>Your split payment of <b>INR ${data.totalAmount}</b> was successful.</p><p>Transaction ID: ${data.masterTxnId}</p>`
      });
      console.log('✅ Resend ID:', response.data?.id || 'Sent');
      await this.logEmail(data.masterTxnId, 'SUCCESS', email);
    } catch (e) { 
      console.error('❌ Email Failed:', e.message); 
    }
  }
  async sendPaymentFailed(email, data) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: '❌ Payment Failed',
        html: `<h1>Failed</h1><p>Reason: ${data.reason}</p>`
      });
      await this.logEmail(data.masterTxnId, 'FAILED', email);
    } catch (e) { console.error('Email error', e); }
  }
}
export default new EmailService();
