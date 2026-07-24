const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  const user = await getUserFromRequest(req)
  if (!user) return errRes(res, 'Unauthorized', 401)

  try {
    if (req.method === 'GET') {
      const addresses = await sql`SELECT * FROM addresses WHERE user_id = ${user.id} ORDER BY is_default DESC, created_at DESC`
      return jsonRes(res, addresses)
    }

    if (req.method === 'POST') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { name, phone, line, city, state, pincode, type, isDefault } = body

      if (!name || !line || !city || !state || !pincode) {
        return errRes(res, 'Name, line, city, state, and pincode are required', 400)
      }

      if (isDefault) {
        await sql`UPDATE addresses SET is_default = false WHERE user_id = ${user.id}`
      }

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      await sql`INSERT INTO addresses (id, user_id, name, phone, line, city, state, pincode, type, is_default)
                VALUES (${id}, ${user.id}, ${name}, ${phone || ''}, ${line}, ${city}, ${state}, ${pincode}, ${type || 'home'}, ${isDefault || false})`
      return jsonRes(res, { success: true, id })
    }

    if (req.method === 'DELETE') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { id } = body
      if (!id) return errRes(res, 'id is required', 400)

      await sql`DELETE FROM addresses WHERE id = ${id} AND user_id = ${user.id}`
      return jsonRes(res, { success: true })
    }

    return errRes(res, 'Method not allowed', 405)
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
