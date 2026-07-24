const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  const user = await getUserFromRequest(req)
  if (!user) return errRes(res, 'Unauthorized', 401)

  try {
    if (req.method === 'GET') {
      const items = await sql`
        SELECT ci.id, ci.product_id, ci.qty, ci.created_at,
               p.name, p.price, p.mrp, p.image, p.unit, p.stock, p.category
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = ${user.id}
        ORDER BY ci.created_at DESC
      `
      return jsonRes(res, items)
    }

    if (req.method === 'POST') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { productId, qty } = body
      if (!productId) return errRes(res, 'productId is required', 400)

      const existing = await sql`SELECT id, qty FROM cart_items WHERE user_id = ${user.id} AND product_id = ${productId}`
      if (existing.length > 0) {
        const newQty = (existing[0].qty || 1) + (qty || 1)
        await sql`UPDATE cart_items SET qty = ${newQty} WHERE id = ${existing[0].id}`
        return jsonRes(res, { success: true, id: existing[0].id, qty: newQty })
      }

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      await sql`INSERT INTO cart_items (id, user_id, product_id, qty) VALUES (${id}, ${user.id}, ${productId}, ${qty || 1})`
      return jsonRes(res, { success: true, id, qty: qty || 1 })
    }

    if (req.method === 'DELETE') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { productId } = body
      if (!productId) return errRes(res, 'productId is required', 400)

      await sql`DELETE FROM cart_items WHERE user_id = ${user.id} AND product_id = ${productId}`
      return jsonRes(res, { success: true })
    }

    return errRes(res, 'Method not allowed', 405)
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
