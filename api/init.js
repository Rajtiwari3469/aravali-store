const bcrypt = require('bcryptjs')
const { sql, initDB } = require('./db')
const { jsonRes, errRes } = require('./_lib/auth')

module.exports = async function (req, res) {
  if (req.method !== 'POST') return errRes(res, 'Method not allowed', 405)

  await initDB()

  try {
    const { SEED_DATA } = require('../DBMS/data')

    const productCount = await sql`SELECT COUNT(*) as count FROM products`
    if (productCount[0].count > 0) {
      return jsonRes(res, { success: true, message: 'Database already has data' })
    }

    for (const p of SEED_DATA.products) {
      await sql`INSERT INTO products (id, name, description, category, price, mrp, stock, unit, image, badge, offer)
                VALUES (${p.id}, ${p.name}, ${p.description || ''}, ${p.category || ''}, ${p.price || 0}, ${p.mrp || 0}, ${p.stock || 0}, ${p.unit || ''}, ${p.image || ''}, ${p.badge || ''}, ${p.offer || ''})
                ON CONFLICT (id) DO NOTHING`
    }

    const existingAdmin = await sql`SELECT id FROM admins WHERE email = 'admin@gmail.com'`
    if (existingAdmin.length === 0) {
      const adminId = 'admin_main'
      const password_hash = bcrypt.hashSync('gateout@123#', 10)
      await sql`INSERT INTO admins (id, name, email, password_hash, role)
                VALUES (${adminId}, 'Admin', 'admin@gmail.com', ${password_hash}, 'admin')`
    }

    for (const b of SEED_DATA.banners) {
      await sql`INSERT INTO banners (id, title, subtitle, gradient, link, image, active, sort_order)
                VALUES (${b.id}, ${b.title || ''}, ${b.subtitle || ''}, ${b.gradient || ''}, ${b.link || ''}, ${b.image || ''}, ${b.active !== false}, ${b.order || 0})
                ON CONFLICT (id) DO NOTHING`
    }

    for (const c of SEED_DATA.catalogs) {
      await sql`INSERT INTO catalogs (id, name, emoji, description, image, active, sort_order)
                VALUES (${c.id}, ${c.name}, ${c.emoji || ''}, ${c.description || ''}, ${c.image || ''}, ${c.active !== false}, ${c.order || 0})
                ON CONFLICT (id) DO NOTHING`
    }

    return jsonRes(res, { success: true, message: 'Database initialized' })
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
