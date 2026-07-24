const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NEON_DATABASE_URL);

let initialized = false;

async function initDB() {
  if (initialized) return;
  try {
    await sql`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT '',
      price NUMERIC DEFAULT 0,
      mrp NUMERIC DEFAULT 0,
      stock INTEGER DEFAULT 0,
      unit TEXT DEFAULT '',
      image TEXT DEFAULT '',
      badge TEXT DEFAULT '',
      offer TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT DEFAULT '',
      items JSONB DEFAULT '[]',
      address TEXT DEFAULT '',
      payment_method TEXT DEFAULT 'cod',
      subtotal NUMERIC DEFAULT 0,
      delivery NUMERIC DEFAULT 0,
      total NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'pending',
      order_date TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      qty INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS wishlist (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS banners (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT '',
      subtitle TEXT DEFAULT '',
      gradient TEXT DEFAULT '',
      link TEXT DEFAULT '',
      image TEXT DEFAULT '',
      active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0
    )`;
    await sql`CREATE TABLE IF NOT EXISTS catalogs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0
    )`;
    await sql`CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      user_id TEXT,
      customer_name TEXT DEFAULT '',
      product_name TEXT DEFAULT '',
      product_id TEXT,
      qty INTEGER DEFAULT 1,
      reason TEXT DEFAULT '',
      additional_info TEXT DEFAULT '',
      refund_amount NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      refunded_at TIMESTAMPTZ,
      reject_reason TEXT
    )`;
    await sql`CREATE TABLE IF NOT EXISTS stock_logs (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      product_name TEXT DEFAULT '',
      change_val INTEGER DEFAULT 0,
      reason TEXT DEFAULT '',
      timestamp TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    )`;
    await sql`CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      line TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      type TEXT DEFAULT 'home',
      is_default BOOLEAN DEFAULT false
    )`;
    initialized = true;
  } catch (err) {
    console.error('DB init error:', err);
    throw err;
  }
}

module.exports = { sql, initDB };
