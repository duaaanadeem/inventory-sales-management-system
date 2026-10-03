// backend/src/customers/customer.controller.js
const service = require('./customer.service');
const { validateCustomerBody, parseId, parsePaging } = require('./customer.validation');
const { sendSuccess, sendError } = require('../utils/response');

// Central place to turn a thrown error into the {success:false, error} envelope.
function handleError(res, err) {
  if (err.status) return sendError(res, err.details ? { message: err.message, ...err.details } : err.message, err.status);
  if (err.code === '23505') return sendError(res, 'A customer with this email already exists.', 409); // uniq_customers_email
  console.error('customers error:', err);
  return sendError(res, 'Internal Server Error', 500);
}

const list = async (req, res) => {
  try {
    const paging = parsePaging(req.query);
    const result = await service.listCustomers({
      search: req.query.search, sort: req.query.sort, order: req.query.order, ...paging,
    });
    sendSuccess(res, result);
  } catch (err) { handleError(res, err); }
};

// GET /customers/count -> { success: true, data: { total: <int> } }
const count = async (_req, res) => {
  try {
    sendSuccess(res, await service.countCustomers());
  } catch (err) { handleError(res, err); }
};

const getOne = async (req, res) => {
  try {
    sendSuccess(res, { customer: await service.getCustomer(parseId(req.params.id)) });
  } catch (err) { handleError(res, err); }
};

const create = async (req, res) => {
  try {
    const fields = validateCustomerBody(req.body);
    sendSuccess(res, { customer: await service.createCustomer(fields, req.user) });
  } catch (err) { handleError(res, err); }
};

const update = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const fields = validateCustomerBody(req.body);
    sendSuccess(res, { customer: await service.updateCustomer(id, fields, req.user) });
  } catch (err) { handleError(res, err); }
};

const remove = async (req, res) => {
  try {
    await service.removeCustomer(parseId(req.params.id), req.user);
    sendSuccess(res, { message: 'Customer removed' });
  } catch (err) { handleError(res, err); }
};

const purchases = async (req, res) => {
  try {
    const paging = parsePaging(req.query, { defaultLimit: 10, maxLimit: 50 });
    sendSuccess(res, await service.getPurchaseHistory(parseId(req.params.id), {
      from: req.query.from, to: req.query.to, ...paging,
    }));
  } catch (err) { handleError(res, err); }
};

module.exports = { list, count, getOne, create, update, remove, purchases };
