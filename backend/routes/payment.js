import express from 'express';
import paymentService from '../services/paymentService.js';
const router = express.Router();

router.post('/create', async (req, res) => {
  try {
    const { userId, userEmail, totalAmount, sources } = req.body;
    const result = await paymentService.createSplitPayment(userId, userEmail, totalAmount, sources);
    res.json({ ...result, razorpayKeyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/verify', async (req, res) => {
  try {
    const { subTxnId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    const result = await paymentService.verifyPayment(subTxnId, razorpayPaymentId, razorpayOrderId, razorpaySignature);
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/failed', async (req, res) => {
  try {
    const { subTxnId } = req.body;
    res.json(await paymentService.handlePaymentFailure(subTxnId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/status/:id', async (req, res) => {
  try {
    res.json(await paymentService.getPaymentStatus(req.params.id));
  } catch (e) { res.status(404).json({ error: e.message }); }
});

router.get('/history', async (req, res) => {
  try {
    const history = await paymentService.getTransactionHistory();
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
