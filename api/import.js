const { sql, initDB } = require('./db')
const { getUserFromRequest, jsonRes, errRes } = require('./_lib/auth')

const TABLES = ['products', 'orders', 'users', 'admins', 'banners', 'catalogs', 'returns', 'stock_logs', 'settings', 'addresses']

module.exports = async function (req, res) {
  if (req.method !== 'POST') return errRes(res, 'Method not allowed', 405)

  await initDB()

  const user = await getUserFromRequest(req)
  if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

  try {
    let body = {}
    try { body = JSON.parse(req.body) } catch (e) {}
    const data = body.data || body
    if (!data || typeof data !== 'object') return errRes(res, 'data object is required', 400)

    for (const table of TABLES) {
      const rows = data[table]
      if (!Array.isArray(rows)) continue

      await sql.query(`DELETE FROM "${table}"`)

      for (const row of rows) {
        const columns = Object.keys(row)
        if (columns.length === 0) continue

        const values = columns.map(c => row[c])
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
        const cols = columns.map(c => `"${c}"`).join(', ')

        await sql.query(`INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`, values)
      }
    }

    return jsonRes(res, { success: true, message: 'Data imported successfully' })
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
