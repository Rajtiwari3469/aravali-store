const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  const user = await getUserFromRequest(req)
  if (!user) return errRes(res, 'Unauthorized', 401)

  try {
    if (req.method === 'GET') {
      if (user.role === 'admin') {
        const returns = await sql`SELECT * FROM returns ORDER BY created_at DESC`
        return jsonRes(res, returns)
      }

      const returns = await sql`SELECT * FROM returns WHERE user_id = ${user.id} ORDER BY created_at DESC`
      return jsonRes(res, returns)
    }

    if (req.method === 'POST') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { orderId, reason, additionalInfo } = body
      if (!orderId || !reason) return errRes(res, 'orderId and reason are required', 400)

      const order = await sql`SELECT * FROM orders WHERE id = ${orderId}`
      if (order.length === 0) return errRes(res, 'Order not found', 404)

      const o = order[0]
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

      await sql`INSERT INTO returns (id, order_id, user_id, customer_name, reason, additional_info, status)
                VALUES (${id}, ${orderId}, ${user.id}, ${o.user_name || ''}, ${reason}, ${additionalInfo || ''}, 'pending')`
      return jsonRes(res, { success: true, id })
    }

    return errRes(res, 'Method not allowed', 405)
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
