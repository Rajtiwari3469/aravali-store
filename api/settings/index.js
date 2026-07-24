const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT key, value FROM settings`
      const settings = {}
      for (const row of rows) {
        settings[row.key] = row.value
      }
      return jsonRes(res, settings)
    }

    const user = await getUserFromRequest(req)
    if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

    if (req.method === 'PUT') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { key, value } = body

      if (key && typeof key === 'string') {
        await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value || ''}) ON CONFLICT (key) DO UPDATE SET value = ${value || ''}`
        return jsonRes(res, { success: true })
      }

      if (body && typeof body === 'object') {
        for (const [k, v] of Object.entries(body)) {
          await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v || ''}) ON CONFLICT (key) DO UPDATE SET value = ${v || ''}`
        }
        return jsonRes(res, { success: true })
      }

      return errRes(res, 'key/value pair is required', 400)
    }

    return errRes(res, 'Method not allowed', 405)
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
