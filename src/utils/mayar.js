const https = require('https');

const MAYAR_API_KEY = process.env.MAYAR_API_KEY;
const MAYAR_PRODUCT_ID = process.env.MAYAR_PRODUCT_ID;

const request = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mayar.id',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: { message: 'Invalid JSON response' } });
        }
      });
    });

    req.on('error', (e) => {
      console.error('Mayar API Request Error:', e.message);
      resolve({ status: 500, data: { message: 'Connection Error' } });
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const Mayar = {
  /**
   * Get user credit balance from Mayar
   * @param {string} customerId 
   */
  async getBalance(customerId) {
    if (!customerId) return null;
    const path = `/credit/v1/credit/customer/balance?customerId=${customerId}&productId=${MAYAR_PRODUCT_ID}`;
    const res = await request('GET', path);
    if (res.status === 200) return res.data;
    return null;
  },

  /**
   * Spend user credit in Mayar
   * @param {string} customerId 
   * @param {number} amount 
   */
  async spendCredit(customerId, amount) {
    if (!customerId) return { success: false, message: 'No Customer ID' };
    const path = '/credit/v1/credit/customer/spend';
    const body = {
      customerId,
      productId: MAYAR_PRODUCT_ID,
      amount
    };
    const res = await request('POST', path, body);
    return {
      success: res.status === 200,
      status: res.status,
      data: res.data
    };
  }
};

module.exports = Mayar;
