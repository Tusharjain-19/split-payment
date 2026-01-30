import { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './App.css';
import './FintechSuccess.css';

const API_BASE = 'http://localhost:5000/api/payment';

const PAYMENT_METHODS = [
  { id: 'WALLET', label: 'Wallet', icon: '/money.png' },
  { id: 'CARD', label: 'Credit Card', icon: '/credit-card.png' },
  { id: 'UPI', label: 'UPI / GPay', icon: '/upi.png' },
  { id: 'NETBANKING', label: 'Net Banking', icon: '/net banking.png' }
];

function App() {
  const [view, setView] = useState('checkout'); 
  const [totalAmount] = useState(1850); 
  const [userEmail, setUserEmail] = useState('');
  
  // Simplified Dual Split State
  const [split1, setSplit1] = useState({ type: 'CARD', amount: 925 });
  const [split2, setSplit2] = useState({ type: 'UPI', amount: 925 });
  
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); 
  const [statusMessage, setStatusMessage] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (view === 'admin') fetchHistory();
  }, [view]);

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/history`);
      setHistory(data);
    } catch (err) { console.error('History fetch failed', err); }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleAmountChange = (val) => {
    const amount1 = Math.min(parseFloat(val) || 0, totalAmount);
    setSplit1({ ...split1, amount: amount1 });
    setSplit2({ ...split2, amount: totalAmount - amount1 });
  };

  const startPayment = async () => {
    if (!userEmail || !userEmail.includes('@')) {
      alert('Please enter a valid email to receive your receipt.');
      return;
    }

    setLoading(true);
    setPaymentStatus('processing');
    setStatusMessage('Synchronizing secure nodes...');

    try {
      const isRazorpayLoaded = await loadRazorpay();
      if (!isRazorpayLoaded) throw new Error('Razorpay SDK failed to load');

      const { data: initData } = await axios.post(`${API_BASE}/create`, {
        userId: 'user_tushar_demo',
        userEmail,
        totalAmount,
        sources: [split1, split2]
      });

      const { masterTxnId, orders, razorpayKeyId } = initData;

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        setStatusMessage(i === 0 ? "This is 1st payment..." : "This is second payment...");

        await new Promise((resolve, reject) => {
          const options = {
            key: razorpayKeyId,
            amount: Math.round(order.amount * 100),
            currency: 'INR',
            name: 'Split Payment System',
            description: i === 0 ? "1st Payment of Split" : "Second Payment of Split",
            order_id: order.orderId,
            handler: async (response) => {
              try {
                await axios.post(`${API_BASE}/verify`, {
                  subTxnId: order.subTxnId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature
                });
                resolve(); 
              } catch {
                reject(new Error('Verification failed.'));
              }
            },
            modal: {
              ondismiss: async () => {
                await axios.post(`${API_BASE}/failed`, { subTxnId: order.subTxnId });
                reject(new Error('User cancelled payment.'));
              }
            },
            prefill: { email: userEmail },
            theme: { color: "#1d4ed8" }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
        });
      }

      startPolling(masterTxnId);

    } catch (error) {
      setPaymentStatus('failed');
      setStatusMessage(error.message || 'Workflow interrupted.');
      setLoading(false);
    }
  };

  const downloadInvoice = () => {
    try {
      console.log('📄 Initiating PDF Generation...');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(29, 78, 216); 
      doc.text('SPLIT PAYMENT SYSTEM', 20, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Official Payment Receipt', 20, 28);
      doc.text(`Date: ${new Date().toLocaleString()}`, 140, 28);
      
      doc.line(20, 35, 190, 35);
      
      const getLabel = (type) => PAYMENT_METHODS.find(m => m.id === type)?.label || type;

      const tableData = [
        [getLabel(split1.type), 'COMPLETE', `INR ${split1.amount}`],
        [getLabel(split2.type), 'COMPLETE', `INR ${split2.amount}`]
      ];
      
      autoTable(doc, {
        startY: 50,
        head: [['Source', 'Status', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [29, 78, 216] }
      });
      
      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Total Paid: INR ${totalAmount}`, 20, finalY);
      
      doc.save(`Invoice_${Date.now()}.pdf`);
      console.log('✅ PDF Saved Successfully');
    } catch (err) {
      console.error('❌ PDF Error:', err);
      alert('Failed to generate invoice. Please check the browser console for details.');
    }
  };

  const startPolling = (id) => {
    setStatusMessage('Confirming split payment...');
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/status/${id}`);
        if (data.master.status === 'SUCCESS') {
          setPaymentStatus('success');
          clearInterval(interval);
          setLoading(false);
        } else if (data.master.status === 'FAILED') {
          setPaymentStatus('failed');
          setStatusMessage('Transaction failed. Refunds initiated.');
          clearInterval(interval);
          setLoading(false);
        }
      } catch (e) { console.error(e); }
    }, 2000);
  };

  if (view === 'admin') {
    return (
      <div className="App admin-view">
        <header className="checkout-header" style={{paddingBottom: '16px'}}>
          <div className="header-top">
            <span className="back-arrow" onClick={() => setView('checkout')}>←</span>
            <div className="brand-info">
              <h2>System Audit Logs</h2>
              <p>Real-time Recovery Logs</p>
            </div>
          </div>
        </header>
        <div className="checkout-body main-card">
          <p className="section-label">RECENT TRANSACTIONS</p>
          <div className="payment-list">
            {history.map(item => (
              <div key={item.master_id} className="list-item">
                <div className="item-content">
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span className="item-title">{item.user_email}</span>
                    <span className={`status-${item.master_status.toLowerCase()}`} style={{fontSize: '12px'}}>
                      {item.master_status}
                    </span>
                  </div>
                  <div className="item-subtitle">
                    ₹{item.total_amount} | {item.successful_splits}/{item.total_splits} splits completed
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding: '20px'}}>
             <button className="continue-btn" style={{width: '100%'}} onClick={fetchHistory}>Refresh Audit</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <header className="checkout-header">
        <div className="header-top">
          <span className="back-arrow">←</span>
          <div className="brand-icon">A</div>
          <div className="brand-info">
            <h2>Split Payment System</h2>
            <p>🛡️ Razorpay Trusted Business</p>
          </div>
          <div style={{marginLeft: 'auto', display: 'flex', gap: '8px'}}>
             <img 
              src="/settings.png" 
              alt="Settings" 
              style={{width: '24px', height: '24px', cursor: 'pointer'}} 
              onClick={() => setView('admin')} 
            />
          </div>
        </div>
      </header>

      <div className="checkout-body">
        <div className="main-card">
          
          <div className="input-group-premium">
            <label className="section-label">RECEIPT EMAIL</label>
            <input 
              type="email" 
              className="email-input-field" 
              placeholder="e.g. alex@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>

          <p className="section-label" style={{marginTop: '24px'}}>SPLIT CONFIGURATION</p>
          
          <div className="split-simple-container">
            {/* Split 1 */}
            <div className="split-simple-card">
                <span className="split-tag" style={{fontSize: '14px', color: 'var(--primary)', letterSpacing: '2px'}}>SPLIT 1</span>
              <div className="split-amount-row">
                <span className="currency-symbol">₹</span>
                <input 
                  type="number" 
                  className="split-amount-input primary"
                  value={split1.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>
            </div>

            {/* Split 2 */}
            <div className="split-simple-card secondary">
                <span className="split-tag" style={{fontSize: '14px', color: '#64748b', letterSpacing: '2px'}}>SPLIT 2 (AUTO)</span>
              <div className="split-amount-row">
                <span className="currency-symbol">₹</span>
                <input 
                  type="number" 
                  className="split-amount-input disabled"
                  value={split2.amount}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="balance-info-bubble">
            <span>Total Payable: <b>₹{totalAmount}</b></span>
          </div>
        </div>
      </div>

      <footer className="checkout-footer">
        <div className="amount-display">
          <p className="amount-label">Final Amount</p>
          <p className="amount-value">₹{totalAmount}</p>
        </div>
        <button 
          className="continue-btn" 
          onClick={() => startPayment()} 
          disabled={loading || !userEmail}
        >
          {loading ? 'Processing...' : 'Pay with Split'}
        </button>
      </footer>

      {/* Success Overlay - High-Trust & Celebratory */}
      {/* Premium Fintech Success Screen */}
      {paymentStatus === 'success' && (
        <div className="success-overlay-container">
          
          {/* 1. Calm Green Header */}
          <div className="success-header-zone">
            <div className="success-icon-circle">
              <img src="/success.png" alt="Success" />
            </div>
            <h1 className="success-headline">Payment Confirmed</h1>
            <p className="success-subline">Split transaction completed successfully</p>
          </div>

          {/* 2. Hero Receipt Card */}
          <div className="receipt-hero-card">
            <div className="receipt-total-section">
              <div className="receipt-label-sm">Total Paid</div>
              <div className="receipt-amount-lg">₹{totalAmount}</div>
            </div>

            <div className="receipt-breakdown">
              <div className="rb-row">
                <span className="rb-label">Split 1 ({PAYMENT_METHODS.find(m => m.id === split1.type).label})</span>
                <span className="rb-value">₹{split1.amount}</span>
              </div>
              <div className="rb-row">
                <span className="rb-label">Split 2 ({PAYMENT_METHODS.find(m => m.id === split2.type).label})</span>
                <span className="rb-value">₹{split2.amount}</span>
              </div>
            </div>

            <div className="receipt-meta">
              <div className="meta-col">
                <span className="meta-label">Date</span>
                <span className="meta-val">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="meta-col" style={{textAlign: 'right'}}>
                <span className="meta-label">Transaction ID</span>
                <span className="meta-val">#TRX-{Math.floor(Math.random() * 10000)}</span>
              </div>
            </div>
          </div>

          {/* 3. Action Footer */}
          <div className="success-action-footer">
            
            <div className="trust-badge-row">
              <span className="trust-text">🔒 Secured by Razorpay</span>
            </div>

            <button 
              className="btn-primary-finish" 
              onClick={() => { setPaymentStatus('idle'); setView('checkout'); }}
            >
              Done
            </button>

            <button 
              className="btn-secondary-pdf" 
              onClick={() => { console.log('📁 Generating PDF...'); downloadInvoice(); }}
            >
              <img src="/invoice.png" alt="PDF" style={{width: '16px', height: '16px', opacity: 0.6}} />
              Download Receipt
            </button>
          </div>
        </div>
      )}

      {/* Processing State - Engaging & Informative */}
      {paymentStatus === 'processing' && (
        <div className="overlay processing">
           <div className="processing-box">
             <div className="spinner"></div>
             <img src="/report.png" alt="Processing" style={{width: '60px', opacity: '0.2', marginBottom: '-40px'}} />
             <h3 className="processing-title">Securing your payment...</h3>
             <p className="processing-status">{statusMessage}</p>
           </div>
        </div>
      )}

      {/* Failure Overlay */}
      {paymentStatus === 'failed' && (
        <div className="overlay" style={{background: 'white'}}>
           <div className="error-content">
             <img src="/cancel.png" alt="Failed" style={{width: '80px', marginBottom: '24px'}} />
             <h2 style={{color: '#1e293b', marginBottom: '8px'}}>Transaction Paused</h2>
             <p style={{color: '#64748b', fontSize: '14px', maxWidth: '260px'}}>{statusMessage}</p>
             <button 
              className="continue-btn" 
              style={{marginTop: '40px', background: '#ef4444'}}
              onClick={() => setPaymentStatus('idle')}
            >
              Try Again
            </button>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;
