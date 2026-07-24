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

    const users = await sql`SELECT id, name, email, password_hash, phone FROM users WHERE email = ${email}`
    if (users.length === 0) {
      return errRes(res, 'Invalid email or password', 401)
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return errRes(res, 'Invalid email or password', 401)
    }

    const token = signToken({ id: user.id, name: user.name, email: user.email, role: 'user' })

    res.setHeader('Set-Cookie', `aravali_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`)
    return jsonRes(res, { success: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } })
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
