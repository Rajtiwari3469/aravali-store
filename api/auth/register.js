const bcrypt = require('bcryptjs')
const { sql, initDB } = require('../db')
const { signToken, jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  if (req.method !== 'POST') return errRes(res, 'Method not allowed', 405)

  await initDB()

  try {
    const { name, email, password, phone } = JSON.parse(req.body)

    if (!name || !email || !password) {
      return errRes(res, 'Name, email, and password are required', 400)
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      return errRes(res, 'Email already registered', 409)
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const password_hash = await bcrypt.hash(password, 10)

    await sql`INSERT INTO users (id, name, email, password_hash, phone) VALUES (${id}, ${name}, ${email}, ${password_hash}, ${phone || null})`

    const token = signToken({ id, name, email, role: 'user' })

    res.setHeader('Set-Cookie', `aravali_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`)
    return jsonRes(res, { success: true, user: { id, name, email, phone } })
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
