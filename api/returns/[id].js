const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  if (req.method !== 'PUT') return errRes(res, 'Method not allowed', 405)

  const user = await getUserFromRequest(req)
  if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

  try {
    const { id } = req.query
    if (!id) return errRes(res, 'id is required', 400)

    let body = {}
    try { body = JSON.parse(req.body) } catch (e) {}
    const { status, rejectReason } = body
    if (!status) return errRes(res, 'status is required', 400)

    const returnRecord = await sql`SELECT * FROM returns WHERE id = ${id}`
    if (returnRecord.length === 0) return errRes(res, 'Return not found', 404)

    const ret = returnRecord[0]

    if (status === 'approved') {
      await sql`UPDATE returns SET status = 'approved', reviewed_at = NOW() WHERE id = ${id}`
      if (ret.order_id) {
        await sql`UPDATE orders SET status = 'returned' WHERE id = ${ret.order_id}`
      }
      if (ret.product_id) {
        await sql`UPDATE products SET stock = stock + ${ret.qty || 1} WHERE id = ${ret.product_id}`
        await sql`INSERT INTO stock_logs (id, product_id, product_name, change_val, reason)
                  VALUES (${Date.now().toString(36) + Math.random().toString(36).slice(2, 8)}, ${ret.product_id}, ${ret.product_name || ''}, ${ret.qty || 1}, 'Return approved')`
      }
    } else if (status === 'rejected') {
      await sql`UPDATE returns SET status = 'rejected', reject_reason = ${rejectReason || ''}, reviewed_at = NOW() WHERE id = ${id}`
    } else {
      await sql`UPDATE returns SET status = ${status} WHERE id = ${id}`
    }

    return jsonRes(res, { success: true })
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
