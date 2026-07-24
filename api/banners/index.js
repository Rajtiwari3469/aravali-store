const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  try {
    if (req.method === 'GET') {
      const banners = await sql`SELECT * FROM banners ORDER BY sort_order ASC`
      return jsonRes(res, banners)
    }

    const user = await getUserFromRequest(req)
    if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

    if (req.method === 'POST') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { title, subtitle, gradient, link, image, active, sort_order } = body

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      await sql`INSERT INTO banners (id, title, subtitle, gradient, link, image, active, sort_order)
                VALUES (${id}, ${title || ''}, ${subtitle || ''}, ${gradient || ''}, ${link || ''}, ${image || ''}, ${active !== false}, ${sort_order || 0})`
      return jsonRes(res, { success: true, id })
    }

    if (req.method === 'PUT') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { id, title, subtitle, gradient, link, image, active, sort_order } = body
      if (!id) return errRes(res, 'id is required', 400)

      await sql`UPDATE banners SET title = ${title}, subtitle = ${subtitle}, gradient = ${gradient}, link = ${link}, image = ${image}, active = ${active}, sort_order = ${sort_order} WHERE id = ${id}`
      return jsonRes(res, { success: true })
    }

    if (req.method === 'DELETE') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { id } = body
      if (!id) return errRes(res, 'id is required', 400)

      await sql`DELETE FROM banners WHERE id = ${id}`
      return jsonRes(res, { success: true })
    }

    return errRes(res, 'Method not allowed', 405)
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
