const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/reports/products?from=2026-09-03&to=2026-10-03',
  method: 'GET',
  headers: {
    'Cookie': 'token=eyJh' 
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});

req.on('error', console.error);
req.end();
