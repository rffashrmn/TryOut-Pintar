const router = require('express').Router();
const crypto = require('crypto');
const db = require('../config/database');
const auth = require('../middleware/auth');

// Get payment link
router.get('/buy-credits', auth, async (req, res) => {
  try {
    const paymentLink = process.env.MAYAR_PAYMENT_LINK;
    const [users] = await db.execute('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const email = users[0].email;
    const url = `${paymentLink}?email=${encodeURIComponent(email)}&metadata=${encodeURIComponent(JSON.stringify({ user_id: req.user.id }))}`;
    res.json({ payment_url: url });
  } catch (err) {
    console.error('Buy credits error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mayar Webhook
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-callback-signature'] || req.headers['x-webhook-signature'];
    const webhookToken = process.env.MAYAR_WEBHOOK_TOKEN;

    if (signature && req.rawBody) {
      const expectedSignature = crypto.createHmac('sha256', webhookToken).update(req.rawBody).digest('hex');
      if (signature !== expectedSignature) {
        console.error('Webhook: Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { event, data } = req.body;
    const validEvents = ['payment.success', 'payment_link.paid', 'payment.received'];
    if (!validEvents.includes(event)) return res.status(200).json({ received: true });

    const paymentId = data.id || data.transactionId;
    const amount = parseFloat(data.amount || data.total || 0);
    const customerEmail = data.email || data.customerEmail || (data.customer && data.customer.email);
    const mayarCustomerId = data.customerId || (data.customer && data.customer.id);
    const metadata = data.metadata ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata) : null;

    const [existingPayment] = await db.execute('SELECT id FROM payments WHERE payment_id = $1', [paymentId]);
    if (existingPayment.length > 0) return res.status(200).json({ received: true, duplicate: true });

    let userId;
    if (metadata && metadata.user_id) {
      userId = metadata.user_id;
    } else if (customerEmail) {
      const [users] = await db.execute('SELECT id FROM users WHERE email = $1', [customerEmail]);
      if (users.length > 0) userId = users[0].id;
    }

    if (!userId) {
      console.error('Webhook: User not found for payment', paymentId);
      return res.status(200).json({ received: true, error: 'user_not_found' });
    }

    // Capture Mayar Customer ID if provided and not already saved
    if (mayarCustomerId) {
      await db.execute('UPDATE users SET mayar_customer_id = $1 WHERE id = $2 AND mayar_customer_id IS NULL', [mayarCustomerId, userId]);
    }

    // For "Usage-Based (credit)" products, Mayar may provide the credit amount directly.
    // We prioritize data.credit or data.credits fields if they exist.
    let creditsToAdd = data.credit || data.credits || data.total_credit || 0;
    
    if (!creditsToAdd || creditsToAdd <= 0) {
      // Fallback: 1 kredit per Rp 1 (Minimum 1000 kredit)
      creditsToAdd = Math.max(1000, Math.floor(amount));
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2', [creditsToAdd, userId]);
      await conn.execute(
        'INSERT INTO payments (user_id, payment_id, amount, credits_added, status, transaction_type, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, paymentId, amount, creditsToAdd, 'success', 'credit', 'Top-up Kredit via Mayar']
      );
      await conn.commit();
      console.log(`Webhook: Successfully added ${creditsToAdd} credits to user ${userId}`);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.status(200).json({ received: true, credits_added: creditsToAdd });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Payment history
router.get('/history', auth, async (req, res) => {
  try {
    // Prevent caching for history
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const [payments] = await db.execute('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const Mayar = require('../utils/mayar');

// Sync balance with Mayar
router.post('/sync-balance', auth, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, mayar_customer_id, credit_balance FROM users WHERE id = $1', [req.user.id]);
    const user = users[0];

    if (!user.mayar_customer_id) {
      return res.json({ balance: user.credit_balance, synced: false, message: 'Mayar Customer ID not set' });
    }

    const mayarData = await Mayar.getBalance(user.mayar_customer_id);
    if (mayarData && mayarData.statusCode === 200) {
      const val = (mayarData.data && mayarData.data.customerBalance !== undefined) 
        ? mayarData.data.customerBalance 
        : mayarData.customerBalance;

      const balanceValue = parseFloat(val);

      if (!isNaN(balanceValue) && isFinite(balanceValue)) {
        const newBalance = Math.floor(balanceValue);
        await db.execute('UPDATE users SET credit_balance = $1 WHERE id = $2', [newBalance, user.id]);
        return res.json({ balance: newBalance, synced: true });
      }
    }

    res.json({ balance: user.credit_balance, synced: false });
  } catch (err) {
    console.error('Sync balance error:', err);
    try {
      const [users] = await db.execute('SELECT credit_balance FROM users WHERE id = $1', [req.user.id]);
      res.json({ balance: users[0]?.credit_balance || 0, synced: false, error: 'Connection failed' });
    } catch (dbErr) {
      res.json({ balance: 0, synced: false, error: 'Connection failed' });
    }
  }
});

module.exports = router;
