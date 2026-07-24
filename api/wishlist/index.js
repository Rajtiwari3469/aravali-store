const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  const user = await getUserFromRequest(req)
  if (!user) return errRes(res, 'Unauthorized', 401)

  try {
    if (req.method === 'GET') {
      const items = await sql`
        SELECT w.id, w.product_id, w.created_at,
               p.name, p.price, p.mrp, p.image, p.unit, p.stock, p.category
        FROM wishlist w
        JOIN products p ON w.product_id = p.id
        WHERE w.user_id = ${user.id}
        ORDER BY w.created_at DESC
      `
      return jsonRes(res, items)
    }

    if (req.method === 'POST') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { productId } = body
      if (!productId) return errRes(res, 'productId is required', 400)

      const existing = await sql`SELECT id FROM wishlist WHERE user_id = ${user.id} AND product_id = ${productId}`
      if (existing.length > 0) {
        return errRes(res, 'Already in wishlist', 409)
      }

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      await sql`INSERT INTO wishlist (id, user_id, product_id) VALUES (${id}, ${user.id}, ${productId})`
      return jsonRes(res, { success: true, id })
    }

    if (req.method === 'DELETE') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { productId } = body
      if (!productId) return errRes(res, 'productId is required', 400)

      await sql`DELETE FROM wishlist WHERE user_id = ${user.id} AND product_id = ${productId}`
      return jsonRes(res, { success: true })
    }

    return errRes(res, 'Method not allowed', 405)
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
