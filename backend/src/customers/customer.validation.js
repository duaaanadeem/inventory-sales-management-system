// backend/src/customers/customer.validation.js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{5,30}$/; // matches customers.phone VARCHAR(30) in schemav3.sql

const clean = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

// Note: schemav3's uniq_customers_email index already treats '' the same as
// NULL (WHERE ... AND btrim(email) <> ''), but we still normalize to null
// here so the API never stores a blank string.
function validateCustomerBody(body = {}) {
  const errors = {};
  const name = clean(body.name);
  const phone = clean(body.phone);
  const email = clean(body.email);
  const address = clean(body.address);

  if (!name) errors.name = 'Name is required.';
  else if (name.length > 100) errors.name = 'Name must be 100 characters or fewer.';

  if (phone && !PHONE_RE.test(phone)) errors.phone = 'Phone must be 5-30 characters: digits, spaces, + ( ) -';
  if (email && (email.length > 150 || !EMAIL_RE.test(email))) errors.email = 'Enter a valid email address.';
  if (address && address.length > 255) errors.address = 'Address must be 255 characters or fewer.';

  if (Object.keys(errors).length) {
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = errors;
    throw err;
  }
  return { name, phone, email: email ? email.toLowerCase() : null, address };
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('Invalid customer id');
    err.status = 400;
    throw err;
  }
  return id;
}

function parsePaging(query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, offset: (page - 1) * limit };
}

// Escapes LIKE wildcards so a search for "50%" or "a_b" is literal, not a pattern.
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => '\\' + c);

function parseDate(value, field) {
  if (value === undefined || value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    const err = new Error(`${field} must be a date in YYYY-MM-DD format`);
    err.status = 400;
    throw err;
  }
  return value;
}

module.exports = { validateCustomerBody, parseId, parsePaging, escapeLike, parseDate };
