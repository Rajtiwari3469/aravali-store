const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  const user = await getUserFromRequest(req)
  if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`)
      const page = parseInt(url.searchParams.get('page')) || 1
      const limit = parseInt(url.searchParams.get('limit')) || 20
      const offset = (page - 1) * limit

      const countResult = await sql`SELECT COUNT(*) as total FROM users`
      const total = countResult[0].total

      const users = await sql`SELECT id, name, email, phone, created_at FROM users ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      return jsonRes(res, { users, total, page, limit })
    }

    if (req.method === 'DELETE') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { id } = body
      if (!id) return errRes(res, 'id is required', 400)

      await sql`DELETE FROM users WHERE id = ${id}`
      await sql`DELETE FROM cart_items WHERE user_id = ${id}`
      await sql`DELETE FROM wishlist WHERE user_id = ${id}`
      await sql`DELETE FROM addresses WHERE user_id = ${id}`
      return jsonRes(res, { success: true })
    }

    return errRes(res, 'Method not allowed', 405)
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
