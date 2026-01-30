import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import paymentRoutes from './routes/payment.js';
import processExpiredTransactions from './workers/expiryWorker.js';

// Start Background Worker (Run every 5 minutes)
setInterval(processExpiredTransactions, 5 * 60 * 1000);
processExpiredTransactions(); // Run immediately on start

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/payment', paymentRoutes);
app.get('/api/test', (req, res) => res.json({ message: 'API works' }));
app.get('/', (req, res) => res.send(`
  <div style="font-family: sans-serif; text-align: center; padding: 50px;">
    <h1 style="color: #5a4af4;">🚀 Split Payment Backend is Live</h1>
    <p>The server is running on port 5000.</p>
    <p>To view the <b>UI</b>, please go to: <a href="http://localhost:5176" style="color: #5a4af4;">http://localhost:5176</a></p>
    <div style="margin-top: 20px; color: #666; font-size: 14px;">
      API Status: <span style="color: #10b981;">Healthy</span>
    </div>
  </div>
`));

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend on ${PORT}`));
