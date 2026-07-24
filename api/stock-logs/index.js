const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  if (req.method !== 'GET') return errRes(res, 'Method not allowed', 405)

  const user = await getUserFromRequest(req)
  if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

  try {
    const logs = await sql`SELECT * FROM stock_logs ORDER BY timestamp DESC`
    return jsonRes(res, logs)
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
