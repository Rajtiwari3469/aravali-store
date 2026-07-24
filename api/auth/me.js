const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  if (req.method !== 'GET') return errRes(res, 'Method not allowed', 405)

  await initDB()

  try {
    const payload = getUserFromRequest(req)
    if (!payload) {
      return errRes(res, 'Unauthorized', 401)
    }

    let result
    if (payload.role === 'admin') {
      result = await sql`SELECT id, name, email, role FROM admins WHERE id = ${payload.id}`
    } else {
      result = await sql`SELECT id, name, email, phone, role FROM users WHERE id = ${payload.id}`
    }

    if (result.length === 0) {
      return errRes(res, 'User not found', 404)
    }

    return jsonRes(res, { success: true, user: result[0] })
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
