const http = require('http');
const crypto = require('crypto');
require('dotenv').config();

const WEBHOOK_TOKEN = process.env.MAYAR_WEBHOOK_TOKEN;

async function send(payload, sig, label) {
  return new Promise((resolve) => {
    const rawBody = JSON.stringify(payload);
    const signature = sig || crypto.createHmac('sha256', WEBHOOK_TOKEN).update(rawBody).digest('hex');

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

    console.log(`--- Testing: ${label} ---`);
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Body:', data);
        resolve();
      });
    });
    req.on('error', (e) => { console.error('Error:', e.message); resolve(); });
    req.write(rawBody);
    req.end();
  });
}

const payloadBase = {
  event: 'payment.success',
  data: { id: 'test_fail_' + Date.now(), amount: 1000, customerEmail: 'nonexistent@mail.com' }
};

async function runTests() {
  // Test 1: User not found
  await send(payloadBase, null, 'User Not Found');
  
  // Test 2: Invalid Signature
  await send({...payloadBase, data: {...payloadBase.data, id: 'test_sig_fail'}}, 'wrong_sig', 'Invalid Signature');

  // Test 3: Correct User (admin)
  await send({
    ...payloadBase,
    data: { ...payloadBase.data, id: 'test_ok_' + Date.now(), customerEmail: 'admin@tryoutpintar.com' }
  }, null, 'Correct User (Admin)');
}

runTests();
