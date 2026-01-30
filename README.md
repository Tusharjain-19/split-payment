# 🔀 Split Payment System

A production-ready dual-source payment system that coordinates atomic transactions across multiple gateways (Razorpay) with automatic refund recovery and state-machine-driven consistency.

## 🚀 Key Features

- **Coordinated Atomicity**: Ensures that if any part of a split payment fails, all other successful parts are automatically refunded to maintain consistency.
- **State Machine Architecture**: Tracks the exact lifecycle of master transactions (`PENDING` -> `SUCCESS` or `PROCESSING_REFUND` -> `FAILED`).
- **Real-time Recovery Worker**: Background process to catch and clean up expired/abandoned sessions.
- **Audit Monitoring**: Built-in Admin dashboard to track system health and recovery logs.
- **Premium UX**: Highly polished mobile-first checkout experience inspired by Etsy and Turo.

## 🏗️ Technical Stack

- **Frontend**: React (Vite), Axios, Glassmorphism CSS.
- **Backend**: Node.js (ESM), Express.
- **Database**: PostgreSQL (Supabase) for ledger and audit logs.
- **Services**: Razorpay (Payment), Resend (Transactional Emails).

## 🛠️ Setup Instructions

### 1. Backend Configuration

Navigate to `backend/` and copy the example file:

```bash
cp .env.example .env
```

Your `.env` should look like this:

```env
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/db
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
```

# Terminal 1: Backend

cd backend
npm install
node server.js

# Terminal 2: Frontend

cd frontend
npm install
npm run dev

```

## 🧪 Testing the Recovery flow

1. Open the UI and select a split.
2. Complete the first payment in the Razorpay popup.
3. Close the second popup (simulating failure).
4. Watch the UI: The **Refund Engine** will trigger, and the Admin view will show the successful refund log.

## 📊 Monitoring

Click the ⚙️ icon in the header to enter the **Activity Monitor**. This view queries the `transaction_health_report` database view for real-time audit logs of every system transition.

---

_Created as part of the 5-Day Split Payment Masterclass._
```
