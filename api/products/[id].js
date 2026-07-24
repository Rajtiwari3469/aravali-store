const { sql, initDB } = require('../../db')
const { getUserFromRequest, jsonRes, errRes } = require('../../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const [product] = await sql`SELECT * FROM products WHERE id = ${id}`
      if (!product) return errRes(res, 'Product not found', 404)
      return jsonRes(res, product)
    } catch (err) {
      return errRes(res, err.message, 500)
    }
  }

  if (req.method === 'PUT') {
    try {
      const user = await getUserFromRequest(req)
      if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

      const [existing] = await sql`SELECT * FROM products WHERE id = ${id}`
      if (!existing) return errRes(res, 'Product not found', 404)

      const body = JSON.parse(req.body)
      const {
        name = existing.name,
        description = existing.description,
        category = existing.category,
        price = existing.price,
        mrp = existing.mrp,
        stock = existing.stock,
        unit = existing.unit,
        image = existing.image,
        badge = existing.badge,
        offer = existing.offer
      } = body

      const [product] = await sql`
        UPDATE products
        SET name = ${name}, description = ${description}, category = ${category},
            price = ${price}, mrp = ${mrp}, stock = ${stock}, unit = ${unit},
            image = ${image}, badge = ${badge}, offer = ${offer}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `

      return jsonRes(res, { success: true, product })
    } catch (err) {
      return errRes(res, err.message, 500)
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await getUserFromRequest(req)
      if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

      const [existing] = await sql`SELECT id FROM products WHERE id = ${id}`
      if (!existing) return errRes(res, 'Product not found', 404)

      await sql`DELETE FROM products WHERE id = ${id}`
      return jsonRes(res, { success: true, message: 'Product deleted' })
    } catch (err) {
      return errRes(res, err.message, 500)
    }
  }

  return errRes(res, 'Method not allowed', 405)
}
