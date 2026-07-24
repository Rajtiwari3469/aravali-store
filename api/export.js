const { sql, initDB } = require('./db')
const { getUserFromRequest, jsonRes, errRes } = require('./_lib/auth')

module.exports = async function (req, res) {
  if (req.method !== 'GET') return errRes(res, 'Method not allowed', 405)

  await initDB()

  const user = await getUserFromRequest(req)
  if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

  try {
    const products = await sql`SELECT * FROM products ORDER BY created_at DESC`
    const orders = await sql`SELECT * FROM orders ORDER BY order_date DESC`
    const users = await sql`SELECT * FROM users ORDER BY created_at DESC`
    const admins = await sql`SELECT * FROM admins ORDER BY created_at DESC`
    const banners = await sql`SELECT * FROM banners ORDER BY sort_order ASC`
    const catalogs = await sql`SELECT * FROM catalogs ORDER BY sort_order ASC`
    const returns = await sql`SELECT * FROM returns ORDER BY created_at DESC`
    const stock_logs = await sql`SELECT * FROM stock_logs ORDER BY timestamp DESC`
    const settings = await sql`SELECT * FROM settings`
    const addresses = await sql`SELECT * FROM addresses`

    return jsonRes(res, {
      products,
      orders,
      users,
      admins,
      banners,
      catalogs,
      returns,
      stock_logs,
      settings,
      addresses
    })
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
