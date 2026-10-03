const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const reportsService = require('./src/features/reports/reports.service');

async function test() {
  const products = await reportsService.getProductSalesReport({ from: '2026-09-03', to: '2026-10-03', limit: 10 });
  console.log('Products:', JSON.stringify(products));

  const inventory = await reportsService.getInventoryReport({});
  console.log('Inventory:', JSON.stringify(inventory));
}

test().catch(console.error).finally(() => process.exit());
