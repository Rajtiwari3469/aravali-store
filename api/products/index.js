const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  if (req.method === 'GET') {
    try {
      const { search, category, page = 1, limit = 20 } = req.query
      const p = Math.max(1, parseInt(page))
      const l = Math.min(100, Math.max(1, parseInt(limit)))
      const offset = (p - 1) * l

      let where = ''
      const params = []

      if (search) {
        params.push('%' + search + '%')
        where += ` WHERE (name ILIKE $${params.length} OR description ILIKE $${params.length})`
      }
      if (category) {
        params.push(category)
        where += where ? ` AND category = $${params.length}` : ` WHERE category = $${params.length}`
      }

      const countResult = await sql.unsafe(`SELECT COUNT(*)::int AS count FROM products${where}`, params)
      const total = countResult[0].count

      const items = await sql.unsafe(
        `SELECT * FROM products${where} ORDER BY created_at DESC LIMIT ${l} OFFSET ${offset}`,
        params
      )

      return jsonRes(res, { items, total, page: p, totalPages: Math.ceil(total / l) })
    } catch (err) {
      return errRes(res, err.message, 500)
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await getUserFromRequest(req)
      if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

      const body = JSON.parse(req.body)
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

      const {
        name = '',
        description = '',
        category = '',
        price = 0,
        mrp = 0,
        stock = 0,
        unit = '',
        image = '',
        badge = '',
        offer = ''
      } = body

      const [product] = await sql`
        INSERT INTO products (id, name, description, category, price, mrp, stock, unit, image, badge, offer)
        VALUES (${id}, ${name}, ${description}, ${category}, ${price}, ${mrp}, ${stock}, ${unit}, ${image}, ${badge}, ${offer})
        RETURNING *
      `

      return jsonRes(res, { success: true, product }, 201)
    } catch (err) {
      return errRes(res, err.message, 500)
    }
  }

  return errRes(res, 'Method not allowed', 405)
}
