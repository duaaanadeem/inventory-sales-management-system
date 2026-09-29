const activityService = require('./activity.service');
const { sendSuccess, sendError } = require('../../utils/response');

// Central place to turn a thrown error into the {success:false, error} envelope,
// matching the pattern already used in customers/customer.controller.js.
function handleError(res, err) {
  if (err.statusCode) return sendError(res, err.message, err.statusCode);
  console.error('activities error:', err);
  return sendError(res, 'Internal Server Error', 500);
}

const list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = (page - 1) * limit;
    return sendSuccess(
      res,
      await activityService.listActivities({
        search: req.query.search,
        entityType: req.query.entity_type || req.query.entityType,
        page,
        limit,
        offset,
      })
    );
  } catch (err) {
    return handleError(res, err);
  }
};

const summary = async (_req, res) => {
  try {
    return sendSuccess(res, await activityService.getActivitySummary());
  } catch (err) {
    return handleError(res, err);
  }
};

const getOne = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return sendError(res, 'Invalid input: activity id is required.', 400);
    return sendSuccess(res, { activity: await activityService.getActivity(id) });
  } catch (err) {
    return handleError(res, err);
  }
};

const create = async (req, res) => {
  try {
    const { action } = req.body;
    if (!action) return sendError(res, 'Invalid input: action is required.', 400);
    return sendSuccess(res, {
      activity: await activityService.logActivity({
        userId: req.user.id,
        action,
        entityType: req.body.entity_type || req.body.entityType,
        entityId: req.body.entity_id || req.body.entityId,
      }),
    });
  } catch (err) {
    return handleError(res, err);
  }
};

module.exports = { list, summary, getOne, create };