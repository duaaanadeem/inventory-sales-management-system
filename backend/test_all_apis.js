const http = require('http');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:5000/api';
let cookies = '';

function request(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      if (res.headers['set-cookie']) {
        cookies = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING API TESTS ---\n');

  console.log('1. Generating Admin Token...');
  const token = jwt.sign({ id: 1, role: 'admin' }, 'your_access_secret_here', { expiresIn: '1h' });
  cookies = `accessToken=${token}`;
  console.log(`[OK] Generated Admin Token manually.\n`);

  const endpoints = [
    { name: 'Daily Sales', path: '/reports/sales?type=daily&from=2026-09-01&to=2026-10-31' },
    { name: 'Products', path: '/reports/products?from=2026-09-01&to=2026-10-31&limit=5' },
    { name: 'Inventory', path: '/reports/inventory' },
    { name: 'Profit', path: '/reports/profit?from=2026-09-01&to=2026-10-31' },
    { name: 'Customers', path: '/reports/customers?from=2026-09-01&to=2026-10-31&limit=5' },
    { name: 'Suppliers', path: '/reports/suppliers?from=2026-09-01&to=2026-10-31' },
  ];

  let passed = 0;
  for (const ep of endpoints) {
    process.stdout.write(`Testing ${ep.name} (${ep.path})... `);
    try {
      const res = await request(ep.path);
      if (res.status === 200 && res.body.success) {
        console.log(`✅ OK`);
        passed++;
      } else {
        console.log(`❌ FAILED (Status: ${res.status})`);
        console.log(res.body);
      }
    } catch (e) {
      console.log(`❌ ERROR: ${e.message}`);
    }
  }

  console.log(`\n--- RESULTS: ${passed}/${endpoints.length} Passed ---`);
  process.exit();
}

runTests();
