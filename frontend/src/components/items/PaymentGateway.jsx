import React, { useState } from 'react';
import { X, CreditCard, Smartphone, Globe, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import './PaymentGateway.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/';

// ─── Load Razorpay SDK once ───────────────────────────────────────────────────
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-sdk')) return resolve(true);
    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ─── Component ────────────────────────────────────────────────────────────────
const PaymentGateway = ({ item, onClose, onSuccess, onFailure }) => {
  const [method, setMethod] = useState('upi');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handlePay = async () => {
    setError('');
    setLoading(true);

    // 1. Load Razorpay SDK
    const sdkLoaded = await loadRazorpayScript();
    if (!sdkLoaded) {
      setError('Failed to load Razorpay. Check your internet connection.');
      setLoading(false);
      return;
    }

    try {
      // 2. Create order on backend
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${API}api/payments/create-order`,
        { amount: item.price, receipt: `item_${item._id}` },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 3. Open Razorpay checkout
      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      data.amount,
        currency:    data.currency || 'INR',
        name:        'Recampus KLU',
        description: item.title,
        image:       item.images?.[0] || '',
        order_id:    data.orderId,

        // 4. On payment success → verify on backend
        handler: async (response) => {
          try {
            const verify = await axios.post(
              `${API}api/payments/verify`,
              {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                itemId:              item._id,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            onSuccess({
              paymentId: response.razorpay_payment_id,
              otp:       verify.data.otp || null,
            });
          } catch {
            onFailure('Payment verification failed. Contact support.');
          }
        },

        prefill: {
          name:    localStorage.getItem('userName')  || '',
          email:   localStorage.getItem('userEmail') || '',
          contact: localStorage.getItem('userPhone') || '',
        },

        theme: { color: '#003366' },

        modal: {
          ondismiss: () => {
            setLoading(false);
            onFailure('Payment was cancelled.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setLoading(false);
        onFailure(response.error?.description || 'Payment failed.');
      });
      rzp.open();

    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err.response?.data?.message || 'Could not initiate payment. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="gateway-overlay">
      <div className="gateway-box">

        {/* HEADER */}
        <div className="gateway-header">
          <div className="gateway-logo">
            <span className="pay-text">Secure</span>Pay
          </div>
          <div className="order-summary">
            <p>Paying to <b>Recampus KLU</b></p>
            <h2>₹{Number(item.price).toFixed(2)}</h2>
          </div>
          <button className="close-gateway" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="gateway-body">
          <p className="select-label">Select Payment Method</p>

          <div className={`pay-method ${method === 'upi' ? 'selected' : ''}`} onClick={() => setMethod('upi')}>
            <div className="icon-circle"><Smartphone size={20} /></div>
            <div className="method-details"><h4>UPI / QR</h4><p>Google Pay, PhonePe, Paytm</p></div>
            <div className={`radio-circle ${method === 'upi' ? 'active' : ''}`} />
          </div>

          <div className={`pay-method ${method === 'card' ? 'selected' : ''}`} onClick={() => setMethod('card')}>
            <div className="icon-circle"><CreditCard size={20} /></div>
            <div className="method-details"><h4>Card</h4><p>Visa, MasterCard, RuPay</p></div>
            <div className={`radio-circle ${method === 'card' ? 'active' : ''}`} />
          </div>

          <div className={`pay-method ${method === 'netbanking' ? 'selected' : ''}`} onClick={() => setMethod('netbanking')}>
            <div className="icon-circle"><Globe size={20} /></div>
            <div className="method-details"><h4>Netbanking</h4><p>SBI, HDFC, ICICI, Axis</p></div>
            <div className={`radio-circle ${method === 'netbanking' ? 'active' : ''}`} />
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '10px' }}>{error}</p>
          )}

          <button className="pay-now-btn" onClick={handlePay} disabled={loading}>
            {loading ? 'Opening Razorpay...' : `Pay ₹${item.price}`}
          </button>
        </div>

        {/* FOOTER */}
        <div className="gateway-footer">
          <ShieldCheck size={14} style={{ marginRight: 4 }} />
          Secured by <strong>Razorpay</strong>
        </div>

      </div>
    </div>
  );
};

export default PaymentGateway;