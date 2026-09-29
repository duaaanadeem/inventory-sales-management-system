const pool = require('../../config/db');

const COLUMNS = 'id, type, message, related_id, is_read, created_at';

async function listNotifications({ unreadOnly, limit, offset }) {
  const where = unreadOnly ? 'WHERE is_read = FALSE' : '';

  const [rows, count, unreadCount] = await Promise.all([
    pool.query(
      `SELECT ${COLUMNS} FROM notifications ${where} ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM notifications ${where}`),
    pool.query(`SELECT COUNT(*)::int AS unread FROM notifications WHERE is_read = FALSE`),
  ]);

  return {
    notifications: rows.rows,
    unread_count: unreadCount.rows[0].unread,
    pagination: { limit, offset, total: count.rows[0].total },
  };
}

async function getUnreadCount() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS unread FROM notifications WHERE is_read = FALSE`
  );
  return { unread_count: rows[0].unread };
}

async function markAsRead(id) {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING ${COLUMNS}`,
    [id]
  );
  if (!rows.length) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

async function markAllAsRead() {
  const { rowCount } = await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE`
  );
  return { message: 'All notifications marked as read', updated_count: rowCount };
}

async function createNotification({ type, message, related_id = null }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (type, message, related_id)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`,
    [type, message, related_id]
  );
  return rows[0];
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
};