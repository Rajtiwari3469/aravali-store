const bcrypt = require('bcryptjs')
const { sql, initDB } = require('../db')
const { getUserFromRequest, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  await initDB()

  const user = await getUserFromRequest(req)
  if (!user || user.role !== 'admin') return errRes(res, 'Admin access required', 403)

  try {
    if (req.method === 'GET') {
      const admins = await sql`SELECT id, name, email, role, created_at FROM admins ORDER BY created_at ASC`
      return jsonRes(res, admins)
    }

    if (req.method === 'POST') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { name, email, password, role } = body
      if (!name || !email || !password) return errRes(res, 'Name, email, and password are required', 400)

      const existing = await sql`SELECT id FROM admins WHERE email = ${email}`
      if (existing.length > 0) return errRes(res, 'Email already exists', 409)

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      const password_hash = bcrypt.hashSync(password, 10)
      await sql`INSERT INTO admins (id, name, email, password_hash, role) VALUES (${id}, ${name}, ${email}, ${password_hash}, ${role || 'admin'})`
      return jsonRes(res, { success: true, id })
    }

    if (req.method === 'PUT') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { id, name, email, password, role } = body
      if (!id) return errRes(res, 'id is required', 400)

      if (password) {
        const password_hash = bcrypt.hashSync(password, 10)
        await sql`UPDATE admins SET name = ${name}, email = ${email}, password_hash = ${password_hash}, role = ${role} WHERE id = ${id}`
      } else {
        await sql`UPDATE admins SET name = ${name}, email = ${email}, role = ${role} WHERE id = ${id}`
      }
      return jsonRes(res, { success: true })
    }

    if (req.method === 'DELETE') {
      let body = {}
      try { body = JSON.parse(req.body) } catch (e) {}
      const { id } = body
      if (!id) return errRes(res, 'id is required', 400)

      const admin = await sql`SELECT id FROM admins WHERE id = ${id}`
      if (admin.length > 0 && admin[0].id === 'admin_main') {
        return errRes(res, 'Cannot delete main admin', 403)
      }

      await sql`DELETE FROM admins WHERE id = ${id}`
      return jsonRes(res, { success: true })
    }

    return errRes(res, 'Method not allowed', 405)
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
