const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  try {
    if (req.method === 'GET') {
      const catalogs = await sql`SELECT * FROM catalogs ORDER BY sort_order ASC`
      return jsonRes(res, catalogs)
    }

    const user = await getUserFromRequest(req)
    if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

    if (req.method === 'POST') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { name, emoji, description, image, active, sort_order } = body
      if (!name) return errRes(res, 'name is required', 400)

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      await sql`INSERT INTO catalogs (id, name, emoji, description, image, active, sort_order)
                VALUES (${id}, ${name}, ${emoji || ''}, ${description || ''}, ${image || ''}, ${active !== false}, ${sort_order || 0})`
      return jsonRes(res, { success: true, id })
    }

    if (req.method === 'PUT') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { id, name, emoji, description, image, active, sort_order } = body
      if (!id) return errRes(res, 'id is required', 400)

      await sql`UPDATE catalogs SET name = ${name}, emoji = ${emoji}, description = ${description}, image = ${image}, active = ${active}, sort_order = ${sort_order} WHERE id = ${id}`
      return jsonRes(res, { success: true })
    }

    if (req.method === 'DELETE') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { id } = body
      if (!id) return errRes(res, 'id is required', 400)

      await sql`DELETE FROM catalogs WHERE id = ${id}`
      return jsonRes(res, { success: true })
    }

    return errRes(res, 'Method not allowed', 405)
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
