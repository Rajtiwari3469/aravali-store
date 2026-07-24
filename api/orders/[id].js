const { sql, initDB } = require('../../db')
const { getUserFromRequest, jsonRes, errRes } = require('../../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const user = await getUserFromRequest(req)
      if (!user) return errRes(res, 'Authentication required', 401)

      const [order] = await sql`SELECT * FROM orders WHERE id = ${id}`
      if (!order) return errRes(res, 'Order not found', 404)

      if (user.role !== 'admin' && order.user_id !== user.id) {
        return errRes(res, 'Access denied', 403)
      }

      return jsonRes(res, order)
    } catch (err) {
      return errRes(res, err.message, 500)
    }
  }

  if (req.method === 'PUT') {
    try {
      const user = await getUserFromRequest(req)
      if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

      const [existing] = await sql`SELECT id FROM orders WHERE id = ${id}`
      if (!existing) return errRes(res, 'Order not found', 404)

      const body = JSON.parse(req.body)
      const { status } = body

      const [order] = await sql`
        UPDATE orders SET status = ${status} WHERE id = ${id} RETURNING *
      `

      return jsonRes(res, { success: true, order })
    } catch (err) {
      return errRes(res, err.message, 500)
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await getUserFromRequest(req)
      if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

      const [existing] = await sql`SELECT id FROM orders WHERE id = ${id}`
      if (!existing) return errRes(res, 'Order not found', 404)

      await sql`DELETE FROM orders WHERE id = ${id}`
      return jsonRes(res, { success: true, message: 'Order deleted' })
    } catch (err) {
      return errRes(res, err.message, 500)
    }
  }

  return errRes(res, 'Method not allowed', 405)
}
