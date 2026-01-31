<div align="center">

# 💳 Split Payment System

### Production-Ready Multi-Gateway Payment Orchestration Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)

**A sophisticated dual-source payment coordination system with atomic transaction guarantees, automatic refund recovery, and comprehensive audit trails.**

[Features](#-key-features) • [Architecture](#-system-architecture) • [Quick Start](#-quick-start) • [API Docs](#-api-documentation) • [Deployment](#-deployment)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Database Setup](#-database-setup)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Monitoring & Logging](#-monitoring--logging)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

The **Split Payment System** is an enterprise-grade payment orchestration platform designed to handle complex multi-gateway split payments with guaranteed atomicity. Built for scenarios where payments need to be distributed across multiple recipients or payment sources while maintaining transactional consistency.

### 💡 Problem Statement

Traditional payment systems struggle with:

- **Split payment failures** leaving partial transactions
- **Manual refund processes** when one payment source fails
- **Lack of audit trails** for financial reconciliation
- **Poor user experience** during payment failures

### ✅ Our Solution

A state-machine-driven payment system that:

- Automatically refunds successful payments if any part fails
- Provides real-time monitoring and audit logs
- Offers a premium, mobile-first checkout experience
- Handles edge cases like network failures and expired sessions

---

## 🚀 Key Features

### 💰 Payment Features

- **🔗 Coordinated Atomicity**
  - All-or-nothing payment guarantee across multiple gateways
  - Automatic rollback with instant refunds on partial failures
  - Idempotent payment processing to prevent duplicates

- **🔄 Intelligent State Management**
  - State machine tracking: `PENDING` → `SUCCESS` or `PROCESSING_REFUND` → `FAILED`
  - Transaction lifecycle monitoring with detailed state transitions
  - Automatic retry mechanisms for transient failures

- **⏰ Recovery & Cleanup**
  - Background worker to detect and handle abandoned sessions
  - Configurable timeout periods (default: 15 minutes)
  - Automatic refund processing for expired transactions

### 🛡️ Security & Compliance

- **🔐 PII Masking**
  - Automatic masking of sensitive data in logs
  - Email and phone number obfuscation
  - Secure API key handling with environment isolation

- **📝 Comprehensive Audit Trail**
  - Every transaction state change logged
  - Immutable audit records with timestamps
  - Detailed refund tracking and reconciliation

- **🔒 Production-Ready Security**
  - Environment variable isolation
  - CORS protection
  - Input validation and sanitization
  - Secure webhook handling

### 🎨 User Experience

- **📱 Mobile-First Design**
  - Responsive glassmorphism UI
  - Touch-optimized interactions
  - Progressive loading states

- **📊 Admin Dashboard**
  - Real-time transaction monitoring
  - Health metrics and system status
  - Downloadable audit reports (PDF)
  - Activity timeline visualization

- **✉️ Email Notifications**
  - Success confirmations
  - Failure notifications with refund status
  - Professional HTML email templates

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │  Checkout  │  │   Success    │  │  Admin Monitor   │     │
│  │    Page    │  │    Screen    │  │    Dashboard     │     │
│  └─────┬──────┘  └──────────────┘  └────────┬─────────┘     │
│        │                                      │             │
└────────┼──────────────────────────────────────┼─────────────┘
         │                                      │
         │             HTTPS/REST API           │
         │                                      │
┌────────┼──────────────────────────────────────┼──────────────┐
│        ▼                                      ▼              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │            Express.js Backend Server                 │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │    │
│  │  │   Payment    │  │    Email     │  │   Health   │  │    │
│  │  │   Service    │  │   Service    │  │   Service  │  │    │
│  │  └──────┬───────┘  └──────────────┘  └────────────┘  │    │
│  └─────────┼────────────────────────────────────────────┘    │
│            │                                                 │
│  ┌─────────┼──────────────────────────────────────────┐      │
│  │         ▼         Background Workers               │      │
│  │  ┌──────────────────────────────────────────────┐  │      │
│  │  │  Expiry Worker (Cleanup & Auto-Refund)       │  │      │
│  │  └──────────────────────────────────────────────┘  │      │
│  └────────────────────────────────────────────────────┘      │
└─────────┬───────────────────┬────────────────────────────────┘
          │                   │
          ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │   Razorpay API   │
│   (Supabase)     │  │   (Payment GW)   │
│                  │  │                  │
│  • Transactions  │  │  • Payments      │
│  • Audit Logs    │  │  • Refunds       │
│  • Health View   │  │  • Webhooks      │
└──────────────────┘  └──────────────────┘
```

### 🔄 Payment Flow

```
1. User initiates split payment (e.g., ₹1000 split into ₹600 + ₹400)
   └─> Master transaction created with PENDING state

2. First payment gateway (₹600)
   └─> Razorpay order created
   └─> User completes payment
   └─> Payment verified and logged

3. Second payment gateway (₹400)
   └─> Razorpay order created
   └─> [SUCCESS PATH] User completes → Transaction marked SUCCESS
   └─> [FAILURE PATH] User cancels/fails → Triggers refund worker

4. Refund Recovery (if needed)
   └─> Automatically refund first payment (₹600)
   └─> Update state to PROCESSING_REFUND → FAILED
   └─> Log all actions in audit trail
   └─> Send email notification to user

5. Expiry Worker (Background)
   └─> Scans for transactions pending > 15 minutes
   └─> Auto-triggers refund for abandoned sessions
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose                    |
| ---------- | ------- | -------------------------- |
| **React**  | 19.2.0  | UI framework               |
| **Vite**   | 7.2.4   | Build tool & dev server    |
| **Axios**  | 1.13.4  | HTTP client                |
| **jsPDF**  | 4.0.0   | PDF report generation      |
| **CSS3**   | -       | Glassmorphism & animations |

### Backend

| Technology       | Version | Purpose              |
| ---------------- | ------- | -------------------- |
| **Node.js**      | 18+     | Runtime environment  |
| **Express**      | 5.2.1   | Web framework        |
| **PostgreSQL**   | 15+     | Relational database  |
| **Razorpay SDK** | 2.9.6   | Payment processing   |
| **Resend**       | 6.9.1   | Transactional emails |
| **UUID**         | 13.0.0  | Unique ID generation |

### Infrastructure

- **Supabase** - Managed PostgreSQL hosting
- **Razorpay** - Payment gateway
- **Resend** - Email delivery service

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **PostgreSQL** (v15 or higher) or Supabase account
- **Git** for version control

### Required Accounts

1. **Razorpay Account** - [Sign up here](https://dashboard.razorpay.com/signup)
2. **Supabase Account** - [Sign up here](https://supabase.com/dashboard)
3. **Resend Account** - [Sign up here](https://resend.com/signup)

---

## ⚡ Quick Start

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/split-payment-system.git
cd split-payment-system
```

### 2️⃣ Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials (see Configuration section)
nano .env

# Start the backend server
npm start
```

The backend server will start on `http://localhost:5000`

### 3️⃣ Frontend Setup

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4️⃣ Verify Installation

1. Open your browser to `http://localhost:5173`
2. You should see the split payment checkout interface
3. Click the ⚙️ icon to access the Admin dashboard

---

## 🗄️ Database Setup

### Option A: Using Supabase (Recommended)

1. **Create a new project** on [Supabase](https://supabase.com/dashboard)

2. **Run the following SQL** in the Supabase SQL Editor:

```sql
-- Create master transactions table
CREATE TABLE master_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  user_email VARCHAR(255),
  user_phone VARCHAR(20)
);

-- Create transaction logs table (audit trail)
CREATE TABLE transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID REFERENCES master_transactions(id),
  split_index INTEGER,
  amount DECIMAL(10, 2),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_refund_id VARCHAR(255),
  status VARCHAR(50),
  action VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_master_status ON master_transactions(status);
CREATE INDEX idx_master_expires ON master_transactions(expires_at);
CREATE INDEX idx_logs_master ON transaction_logs(master_id);

-- Create view for health monitoring
CREATE VIEW transaction_health_report AS
SELECT
  mt.id,
  mt.total_amount,
  mt.status,
  mt.created_at,
  mt.expires_at,
  COUNT(tl.id) as log_count,
  json_agg(
    json_build_object(
      'action', tl.action,
      'status', tl.status,
      'amount', tl.amount,
      'timestamp', tl.created_at
    ) ORDER BY tl.created_at DESC
  ) as activity_log
FROM master_transactions mt
LEFT JOIN transaction_logs tl ON mt.id = tl.master_id
GROUP BY mt.id
ORDER BY mt.created_at DESC;
```

3. **Copy your database URL** from Settings → Database → Connection String

### Option B: Local PostgreSQL

```bash
# Create database
createdb split_payment_db

# Run schema
psql split_payment_db < backend/schema.sql
```

---

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5000

# Database Connection (PostgreSQL)
# Format: postgresql://[user]:[password]@[host]:[port]/[database]
DATABASE_URL=postgresql://postgres:your_password@db.supabase.co:5432/postgres

# Razorpay Payment Gateway
# Get from: https://dashboard.razorpay.com/app/keys
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_SECRET_KEY

# Resend Email Service
# Get from: https://resend.com/api-keys
RESEND_API_KEY=re_YOUR_API_KEY
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Frontend Configuration

Update `frontend/src/App.jsx` if your backend runs on a different port:

```javascript
const API_BASE_URL = "http://localhost:5000";
```

---

## 📡 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Endpoints

#### 1. Create Split Payment

**POST** `/payment/create-split`

Creates a new split payment transaction.

**Request Body:**

```json
{
  "splits": [600, 400],
  "totalAmount": 1000,
  "userEmail": "customer@example.com",
  "userPhone": "+919876543210"
}
```

**Response:**

```json
{
  "masterId": "uuid-string",
  "orders": [
    {
      "orderId": "order_razorpay_id_1",
      "amount": 600,
      "currency": "INR"
    },
    {
      "orderId": "order_razorpay_id_2",
      "amount": 400,
      "currency": "INR"
    }
  ],
  "rzpKeyId": "rzp_test_xxx"
}
```

#### 2. Verify Payment

**POST** `/payment/verify`

Verifies a completed Razorpay payment.

**Request Body:**

```json
{
  "masterId": "uuid-string",
  "splitIndex": 0,
  "paymentId": "pay_razorpay_id",
  "orderId": "order_razorpay_id",
  "signature": "razorpay_signature"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment 1 verified"
}
```

#### 3. Trigger Refund

**POST** `/payment/trigger-refund`

Initiates refund for a failed split payment.

**Request Body:**

```json
{
  "masterId": "uuid-string"
}
```

**Response:**

```json
{
  "message": "Refund process completed",
  "refunds": [
    {
      "refundId": "rfnd_razorpay_id",
      "amount": 600,
      "status": "processed"
    }
  ]
}
```

#### 4. Health Check

**GET** `/health`

Returns system health status.

**Response:**

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-31T12:10:00Z"
}
```

#### 5. Get Health Report

**GET** `/health/report`

Returns transaction health metrics.

**Response:**

```json
{
  "totalTransactions": 150,
  "successfulTransactions": 142,
  "failedTransactions": 8,
  "recentActivity": [...]
}
```

---

## 🧪 Testing

### Manual Testing Flow

1. **Start both servers** (backend & frontend)

2. **Test successful payment:**

   ```
   - Open http://localhost:5173
   - Select split amount (e.g., ₹600 + ₹400)
   - Complete BOTH Razorpay payments
   - Should redirect to success page
   ```

3. **Test refund mechanism:**

   ```
   - Select split amount
   - Complete FIRST payment
   - Close/cancel SECOND payment popup
   - Check Admin dashboard - refund should auto-trigger
   ```

4. **Test expiry worker:**
   ```
   - Create a payment but don't complete
   - Wait 15+ minutes (or modify timeout in code)
   - Worker should auto-refund
   ```

### Automated Tests

```bash
# Backend tests
cd backend

# Test database connection
node test-db.js

# Test email service
node test-email.js

# Test recovery mechanism
node test-recovery.js
```

### Test Razorpay Cards

Use these test cards in Razorpay test mode:

| Card Number         | Type       | Scenario      |
| ------------------- | ---------- | ------------- |
| 4111 1111 1111 1111 | Visa       | Success       |
| 5555 5555 5555 4444 | Mastercard | Success       |
| 4000 0000 0000 0002 | Visa       | Payment fails |

**Test CVV:** Any 3 digits  
**Test Expiry:** Any future date

---

## 🚀 Deployment

### Backend Deployment (Railway/Render)

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Railway:**
   - Connect your GitHub repository
   - Add environment variables
   - Deploy automatically

3. **Update frontend API URL:**
   ```javascript
   // frontend/src/config.js
   export const API_BASE_URL = "https://your-app.railway.app";
   ```

### Frontend Deployment (Vercel/Netlify)

```bash
# Build for production
cd frontend
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to Netlify
netlify deploy --prod
```

### Environment Variables Checklist

- ✅ DATABASE_URL
- ✅ RAZORPAY_KEY_ID
- ✅ RAZORPAY_KEY_SECRET
- ✅ RESEND_API_KEY
- ✅ RESEND_FROM_EMAIL
- ✅ PORT (if different from 5000)

---

## 📊 Monitoring & Logging

### Application Logs

Logs are written to:

- `backend/server.log` - General application logs
- `backend/error.log` - Error traces
- Console output with timestamps

### Log Levels

```javascript
[INFO]     - General information
[SUCCESS]  - Successful operations
[WARNING]  - Potential issues
[ERROR]    - Error conditions
[REFUND]   - Refund operations
```

### Admin Dashboard

Access at: `http://localhost:5173` → Click ⚙️ icon

Features:

- Real-time transaction status
- State transition timeline
- Refund tracking
- Export reports as PDF

### Database Monitoring

Query the health view:

```sql
SELECT * FROM transaction_health_report
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## 🔒 Security

### Best Practices Implemented

✅ **Environment Isolation** - All secrets in `.env`  
✅ **PII Masking** - Emails/phones masked in logs  
✅ **Input Validation** - All API inputs validated  
✅ **CORS Protection** - Configured allowed origins  
✅ **SQL Injection Prevention** - Parameterized queries  
✅ **Signature Verification** - Razorpay webhooks verified

### Additional Recommendations

1. **Use HTTPS in production**
2. **Enable rate limiting**
3. **Set up monitoring alerts**
4. **Regular security audits**
5. **Keep dependencies updated**

---

## 🐛 Troubleshooting

### Common Issues

#### ❌ "Database connection failed"

**Solution:**

```bash
# Check DATABASE_URL format
# Should be: postgresql://user:pass@host:5432/db

# Test connection
node backend/test-db.js
```

#### ❌ "Razorpay key invalid"

**Solution:**

- Verify keys in `.env` match Razorpay dashboard
- Ensure no extra spaces or quotes
- Use test keys: `rzp_test_xxx`

#### ❌ "Port 5000 already in use"

**Solution:**

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change PORT in .env
PORT=5001
```

#### ❌ "Email not sending"

**Solution:**

- Check Resend API key
- Verify sender email domain
- Check Resend dashboard for quota

### Debug Mode

Enable detailed logging:

```javascript
// backend/server.js
const DEBUG = true;
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow ESLint rules
- Add comments for complex logic
- Update README for new features
- Test thoroughly before PR

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Tushar Jain

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 🎯 Roadmap

- [ ] Multi-currency support
- [ ] Additional payment gateways (Stripe, PayPal)
- [ ] Webhook support for real-time updates
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] GraphQL API
- [ ] Docker containerization
- [ ] Kubernetes deployment manifests

---

## 🙏 Acknowledgments

- Razorpay for payment gateway
- Supabase for database hosting
- Resend for email delivery
- React and Vite communities

---

<div align="center">

**Built with ❤️ by Tushar Jain**

⭐ Star this repo if you find it helpful!

</div>
