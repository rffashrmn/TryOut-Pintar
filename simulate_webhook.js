const http = require('http');
const crypto = require('crypto');
require('dotenv').config();

const WEBHOOK_TOKEN = process.env.MAYAR_WEBHOOK_TOKEN;
const payload = {
  event: 'payment.success',
  data: {
    id: 'test_pay_' + Date.now(),
    amount: 1000,
    customerEmail: 'raffasuche1@gmail.com',
    customerId: 'mayar_cust_test_123',
    metadata: JSON.stringify({ user_id: 1 })
  }
};

const rawBody = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', WEBHOOK_TOKEN).update(rawBody).digest('hex');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/payments/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-callback-signature': signature,
    'Content-Length': Buffer.byteLength(rawBody)
  }
};

console.log('Sending simulated webhook using native http...');
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Body:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Problem with request:', e.message);
  process.exit(1);
});

req.write(rawBody);
req.end();
