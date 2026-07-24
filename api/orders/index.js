const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  if (req.method === 'GET') {
    try {
      const user = await getUserFromRequest(req)
      if (!user) return errRes(res, 'Authentication required', 401)

      const { page = 1, limit = 20 } = req.query
      const p = Math.max(1, parseInt(page))
      const l = Math.min(100, Math.max(1, parseInt(limit)))
      const offset = (p - 1) * l

      const isAdmin = user.role === 'admin'
      const where = isAdmin ? '' : ` WHERE user_id = '${user.id}'`

      const countResult = await sql.unsafe(`SELECT COUNT(*)::int AS count FROM orders${where}`)
      const total = countResult[0].count

      const orders = await sql.unsafe(
        `SELECT * FROM orders${where} ORDER BY order_date DESC LIMIT ${l} OFFSET ${offset}`
      )

      return jsonRes(res, { items: orders, total, page: p, totalPages: Math.ceil(total / l) })
    } catch (err) {
      return errRes(res, err.message, 500)
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await getUserFromRequest(req)
      if (!user) return errRes(res, 'Authentication required', 401)

      const body = JSON.parse(req.body)
      const { items = [], address = '', paymentMethod = 'cod', subtotal = 0, delivery = 0, total = 0 } = body

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      const userName = user.name || ''

      const [order] = await sql`
        INSERT INTO orders (id, user_id, user_name, items, address, payment_method, subtotal, delivery, total)
        VALUES (${id}, ${user.id}, ${userName}, ${JSON.stringify(items)}, ${address}, ${paymentMethod}, ${subtotal}, ${delivery}, ${total})
        RETURNING *
      `

      for (const item of items) {
        if (item.product_id && item.qty) {
          await sql`UPDATE products SET stock = GREATEST(0, stock - ${item.qty}), updated_at = NOW() WHERE id = ${item.product_id}`

          const [product] = await sql`SELECT name FROM products WHERE id = ${item.product_id}`
          await sql`
            INSERT INTO stock_logs (id, product_id, product_name, change_val, reason)
            VALUES (${Date.now().toString(36) + Math.random().toString(36).slice(2, 8)},
                    ${item.product_id}, ${product ? product.name : ''}, ${-item.qty}, ${'Order ' + id})
          `
        }
      }

      return jsonRes(res, { success: true, order }, 201)
    } catch (err) {
      return errRes(res, err.message, 500)
    }
  }

  return errRes(res, 'Method not allowed', 405)
}
