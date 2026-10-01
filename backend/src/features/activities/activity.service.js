const pool = require('../../config/db');

const COLS = `
  al.id, al.action, al.entity_type, al.entity_id, al.created_at,
  u.id AS user_id, u.full_name, u.role
`;

const BASE_FROM = `
  FROM activity_log al
  LEFT JOIN users u ON u.id = al.user_id
`;

async function listActivities({ search, entityType, page, limit, offset }) {
  const conditions = [];
  const params = [];

  if (entityType) {
    params.push(entityType);
    conditions.push(`al.entity_type = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(al.action ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${COLS} ${BASE_FROM} ${where}
       ORDER BY al.created_at DESC, al.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total ${BASE_FROM} ${where}`, params),
  ]);

  const total = count.rows[0].total;
  return {
    activities: rows.rows,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function getActivity(id) {
  const { rows } = await pool.query(
    `SELECT ${COLS} ${BASE_FROM} WHERE al.id = $1`,
    [id]
  );
  if (!rows.length) {
    const err = new Error('Activity not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

async function getActivitySummary() {
  const [total, today, byEntity] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM activity_log`),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM activity_log
       WHERE created_at >= CURRENT_DATE
         AND created_at < CURRENT_DATE + INTERVAL '1 day'`
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(entity_type, ''), 'other') AS entity_type,
              COUNT(*)::int AS count
       FROM activity_log
       GROUP BY entity_type
       ORDER BY count DESC, entity_type ASC`
    ),
  ]);

  return {
    total_actions: total.rows[0].total,
    today_actions: today.rows[0].total,
    by_entity: byEntity.rows,
  };
}

async function logActivity({ userId, action, entityType, entityId }) {
  const { rows } = await pool.query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, action, entity_type, entity_id, created_at`,
    [userId, action, entityType || null, entityId || null]
  );
  return rows[0];
}

module.exports = {
  listActivities,
  getActivity,
  getActivitySummary,
  logActivity,
};