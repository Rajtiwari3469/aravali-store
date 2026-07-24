const bcrypt = require('bcryptjs')
const { sql, initDB } = require('../db')
const { signToken, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  if (req.method !== 'POST') return errRes(res, 'Method not allowed', 405)

  await initDB()

  try {
    const { email, password } = JSON.parse(req.body)

    if (!email || !password) {
      return errRes(res, 'Email and password are required', 400)
    }

    const admins = await sql`SELECT id, name, email, password_hash FROM admins WHERE email = ${email}`
    if (admins.length === 0) {
      return errRes(res, 'Invalid email or password', 401)
    }

    const admin = admins[0]
    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) {
      return errRes(res, 'Invalid email or password', 401)
    }

    const token = signToken({ id: admin.id, name: admin.name, email: admin.email, role: 'admin' })

    res.setHeader('Set-Cookie', `aravali_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`)
    return jsonRes(res, { success: true, admin: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' } })
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
