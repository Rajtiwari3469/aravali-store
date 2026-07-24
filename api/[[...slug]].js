const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const { SignJWT, jwtVerify } = require('jose');

const sql = neon(process.env.NEON_DATABASE_URL);
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'aravali-store-secret-key-2024');
let dbReady = false;

async function initDB() {
  if (dbReady) return;
  await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, phone TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'admin', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', category TEXT DEFAULT '', price NUMERIC DEFAULT 0, mrp NUMERIC DEFAULT 0, stock INTEGER DEFAULT 0, unit TEXT DEFAULT '', image TEXT DEFAULT '', badge TEXT DEFAULT '', offer TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, user_id TEXT, user_name TEXT DEFAULT '', items JSONB DEFAULT '[]', address TEXT DEFAULT '', payment_method TEXT DEFAULT 'cod', subtotal NUMERIC DEFAULT 0, delivery NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, status TEXT DEFAULT 'pending', order_date TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS cart_items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, product_id TEXT NOT NULL, qty INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS wishlist (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, product_id TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS banners (id TEXT PRIMARY KEY, title TEXT DEFAULT '', subtitle TEXT DEFAULT '', gradient TEXT DEFAULT '', link TEXT DEFAULT '', image TEXT DEFAULT '', active BOOLEAN DEFAULT true, sort_order INTEGER DEFAULT 0)`;
  await sql`CREATE TABLE IF NOT EXISTS catalogs (id TEXT PRIMARY KEY, name TEXT NOT NULL, emoji TEXT DEFAULT '', description TEXT DEFAULT '', image TEXT DEFAULT '', active BOOLEAN DEFAULT true, sort_order INTEGER DEFAULT 0)`;
  await sql`CREATE TABLE IF NOT EXISTS returns (id TEXT PRIMARY KEY, order_id TEXT, user_id TEXT, customer_name TEXT DEFAULT '', product_name TEXT DEFAULT '', product_id TEXT, qty INTEGER DEFAULT 1, reason TEXT DEFAULT '', additional_info TEXT DEFAULT '', refund_amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW(), reviewed_at TIMESTAMPTZ, refunded_at TIMESTAMPTZ, reject_reason TEXT)`;
  await sql`CREATE TABLE IF NOT EXISTS stock_logs (id TEXT PRIMARY KEY, product_id TEXT, product_name TEXT DEFAULT '', change_val INTEGER DEFAULT 0, reason TEXT DEFAULT '', timestamp TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT DEFAULT '')`;
  await sql`CREATE TABLE IF NOT EXISTS addresses (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT DEFAULT '', phone TEXT DEFAULT '', line TEXT DEFAULT '', city TEXT DEFAULT '', state TEXT DEFAULT '', pincode TEXT DEFAULT '', type TEXT DEFAULT 'home', is_default BOOLEAN DEFAULT false)`;
  dbReady = true;
}

function parseCookies(h) {
  const c = {};
  if (!h) return c;
  h.split(';').forEach(s => { const [k, ...v] = s.split('='); c[k.trim()] = v.join('=').trim(); });
  return c;
}

async function getUser(req) {
  const token = parseCookies(req.headers.cookie || '').aravali_token;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, SECRET); return payload; } catch { return null; }
}

function ok(res, data) { return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
function err(res, msg, s = 400) { return new Response(JSON.stringify({ error: msg }), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function getId(res, id) { return ok(res, { id }); }

const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

module.exports = async function handler(req, res) {
  await initDB();
  const url = new URL(req.url, 'http://localhost');
  const slugParts = req.query.slug || [];
  const slug = Array.isArray(slugParts) ? slugParts.join('/') : slugParts;
  const method = req.method;
  let body = {};
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try { body = JSON.parse(req.body || '{}'); } catch { body = {}; }
  }

  try {
    // ===== AUTH =====
    if (slug === 'auth/register' && method === 'POST') {
      const { name, email, password, phone } = body;
      if (!name || !email || !password) return err(res, 'Name, email, and password are required');
      const ex = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (ex.length > 0) return err(res, 'Email already registered', 409);
      const id = gid();
      const ph = await bcrypt.hash(password, 10);
      await sql`INSERT INTO users (id, name, email, password_hash, phone) VALUES (${id}, ${name}, ${email}, ${ph}, ${phone || ''})`;
      const token = await new SignJWT({ id, name, email, role: 'user' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(SECRET);
      res.setHeader('Set-Cookie', `aravali_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
      return ok(res, { success: true, user: { id, name, email, phone } });
    }

    if (slug === 'auth/login' && method === 'POST') {
      const { email, password } = body;
      if (!email || !password) return err(res, 'Email and password are required');
      const users = await sql`SELECT id, name, email, password_hash, phone FROM users WHERE email = ${email}`;
      if (users.length === 0) return err(res, 'Invalid email or password', 401);
      const u = users[0];
      if (!(await bcrypt.compare(password, u.password_hash))) return err(res, 'Invalid email or password', 401);
      const token = await new SignJWT({ id: u.id, name: u.name, email: u.email, role: 'user' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(SECRET);
      res.setHeader('Set-Cookie', `aravali_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
      return ok(res, { success: true, user: { id: u.id, name: u.name, email: u.email, phone: u.phone } });
    }

    if (slug === 'auth/admin-login' && method === 'POST') {
      const { email, password } = body;
      if (!email || !password) return err(res, 'Email and password are required');
      const admins = await sql`SELECT id, name, email, password_hash, role FROM admins WHERE email = ${email}`;
      if (admins.length === 0) return err(res, 'Invalid admin credentials', 401);
      const a = admins[0];
      if (!(await bcrypt.compare(password, a.password_hash))) return err(res, 'Invalid admin credentials', 401);
      const token = await new SignJWT({ id: a.id, name: a.name, email: a.email, role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(SECRET);
      res.setHeader('Set-Cookie', `aravali_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
      return ok(res, { success: true, admin: { id: a.id, name: a.name, email: a.email, role: a.role } });
    }

    if (slug === 'auth/me' && method === 'GET') {
      const user = await getUser(req);
      if (!user) return err(res, 'Not authenticated', 401);
      if (user.role === 'admin') {
        const admins = await sql`SELECT id, name, email, role FROM admins WHERE id = ${user.id}`;
        return ok(res, { admin: admins[0] || null });
      }
      const users = await sql`SELECT id, name, email, phone FROM users WHERE id = ${user.id}`;
      return ok(res, { user: users[0] || null });
    }

    if (slug === 'auth/logout' && method === 'POST') {
      res.setHeader('Set-Cookie', 'aravali_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      return ok(res, { success: true });
    }

    // ===== PRODUCTS =====
    if (slug === 'products' && method === 'GET') {
      const search = url.searchParams.get('search') || '';
      const category = url.searchParams.get('category') || '';
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '500');
      let rows;
      if (search && category) {
        rows = await sql`SELECT * FROM products WHERE category = ${category} AND (name ILIKE ${'%' + search + '%'} OR description ILIKE ${'%' + search + '%'}) ORDER BY created_at DESC`;
      } else if (search) {
        rows = await sql`SELECT * FROM products WHERE name ILIKE ${'%' + search + '%'} OR description ILIKE ${'%' + search + '%'} ORDER BY created_at DESC`;
      } else if (category) {
        rows = await sql`SELECT * FROM products WHERE category = ${category} ORDER BY created_at DESC`;
      } else {
        rows = await sql`SELECT * FROM products ORDER BY created_at DESC`;
      }
      const total = rows.length;
      const start = (page - 1) * limit;
      return ok(res, rows.slice(start, start + limit));
    }

    if (slug === 'products' && method === 'POST') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = gid();
      const { name, description, category, price, mrp, stock, unit, image, badge, offer, images } = body;
      await sql`INSERT INTO products (id, name, description, category, price, mrp, stock, unit, image, badge, offer) VALUES (${id}, ${name || ''}, ${description || ''}, ${category || ''}, ${price || 0}, ${mrp || 0}, ${stock || 0}, ${unit || ''}, ${image || ''}, ${badge || ''}, ${offer || ''})`;
      return ok(res, { success: true, record: { id, name, description, category, price, mrp, stock, unit, image, badge, offer } });
    }

    if (slug.startsWith('products/') && method === 'GET') {
      const id = slug.split('/')[1];
      const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
      if (rows.length === 0) return err(res, 'Not found', 404);
      return ok(res, rows[0]);
    }

    if (slug.startsWith('products/') && method === 'PUT') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      const { name, description, category, price, mrp, stock, unit, image, badge, offer } = body;
      await sql`UPDATE products SET name=${name}, description=${description || ''}, category=${category || ''}, price=${price || 0}, mrp=${mrp || 0}, stock=${stock || 0}, unit=${unit || ''}, image=${image || ''}, badge=${badge || ''}, offer=${offer || ''}, updated_at=NOW() WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug.startsWith('products/') && method === 'DELETE') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      await sql`DELETE FROM products WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    // ===== ORDERS =====
    if (slug === 'orders' && method === 'GET') {
      const user = await getUser(req);
      let rows;
      if (user && user.role === 'admin') {
        rows = await sql`SELECT * FROM orders ORDER BY order_date DESC`;
      } else if (user) {
        rows = await sql`SELECT * FROM orders WHERE user_id = ${user.id} ORDER BY order_date DESC`;
      } else {
        rows = [];
      }
      return ok(res, rows);
    }

    if (slug === 'orders' && method === 'POST') {
      const user = await getUser(req);
      const id = gid();
      const { items, address, paymentMethod, subtotal, delivery, total, status, orderDate } = body;
      const userId = user ? user.id : 'guest';
      const userName = user ? user.name : 'Guest';
      await sql`INSERT INTO orders (id, user_id, user_name, items, address, payment_method, subtotal, delivery, total, status, order_date) VALUES (${id}, ${userId}, ${userName}, ${JSON.stringify(items || [])}, ${address || ''}, ${paymentMethod || 'cod'}, ${subtotal || 0}, ${delivery || 0}, ${total || 0}, ${status || 'pending'}, ${orderDate || new Date().toISOString()})`;
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.productId) {
            await sql`UPDATE products SET stock = GREATEST(0, stock - ${item.qty || 1}), updated_at = NOW() WHERE id = ${item.productId}`;
            await sql`INSERT INTO stock_logs (id, product_id, product_name, change_val, reason, timestamp) VALUES (${gid()}, ${item.productId}, ${item.name || ''}, ${-(item.qty || 1)}, ${'Order #' + id.slice(-6).toUpperCase()}, ${new Date().toISOString()})`;
          }
        }
      }
      return ok(res, { success: true, record: { id, user_id: userId, items, address, paymentMethod, subtotal, delivery, total, status: status || 'pending' } });
    }

    if (slug.startsWith('orders/') && method === 'PUT') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      const { status } = body;
      await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug.startsWith('orders/') && method === 'DELETE') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      await sql`DELETE FROM orders WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    // ===== CART =====
    if (slug === 'cart' && method === 'GET') {
      const user = await getUser(req);
      if (!user) return ok(res, []);
      const rows = await sql`SELECT c.*, p.name, p.price, p.mrp, p.stock, p.unit, p.image, p.category, p.description, p.badge, p.offer FROM cart_items c LEFT JOIN products p ON c.product_id = p.id WHERE c.user_id = ${user.id}`;
      return ok(res, rows.map(r => ({ id: r.id, productId: r.product_id, qty: r.qty, product: r.name ? { id: r.product_id, name: r.name, price: Number(r.price), mrp: Number(r.mrp), stock: r.stock, unit: r.unit, image: r.image, category: r.category, description: r.description, badge: r.badge, offer: r.offer } : null })));
    }

    if (slug === 'cart' && method === 'POST') {
      const user = await getUser(req);
      if (!user) return err(res, 'Login required', 401);
      const { productId, qty } = body;
      if (!productId) return err(res, 'productId required');
      const existing = await sql`SELECT id, qty FROM cart_items WHERE user_id = ${user.id} AND product_id = ${productId}`;
      if (existing.length > 0) {
        await sql`UPDATE cart_items SET qty = ${qty || existing[0].qty + 1} WHERE id = ${existing[0].id}`;
      } else {
        await sql`INSERT INTO cart_items (id, user_id, product_id, qty) VALUES (${gid()}, ${user.id}, ${productId}, ${qty || 1})`;
      }
      return ok(res, { success: true });
    }

    if (slug === 'cart' && method === 'DELETE') {
      const user = await getUser(req);
      if (!user) return err(res, 'Login required', 401);
      const { productId } = body;
      await sql`DELETE FROM cart_items WHERE user_id = ${user.id} AND product_id = ${productId}`;
      return ok(res, { success: true });
    }

    // ===== WISHLIST =====
    if (slug === 'wishlist' && method === 'GET') {
      const user = await getUser(req);
      if (!user) return ok(res, []);
      const rows = await sql`SELECT product_id FROM wishlist WHERE user_id = ${user.id}`;
      return ok(res, rows.map(r => r.product_id));
    }

    if (slug === 'wishlist' && method === 'POST') {
      const user = await getUser(req);
      if (!user) return err(res, 'Login required', 401);
      const { productId } = body;
      const ex = await sql`SELECT id FROM wishlist WHERE user_id = ${user.id} AND product_id = ${productId}`;
      if (ex.length === 0) await sql`INSERT INTO wishlist (id, user_id, product_id) VALUES (${gid()}, ${user.id}, ${productId})`;
      return ok(res, { success: true });
    }

    if (slug === 'wishlist' && method === 'DELETE') {
      const user = await getUser(req);
      if (!user) return err(res, 'Login required', 401);
      const { productId } = body;
      await sql`DELETE FROM wishlist WHERE user_id = ${user.id} AND product_id = ${productId}`;
      return ok(res, { success: true });
    }

    // ===== ADDRESSES =====
    if (slug === 'addresses' && method === 'GET') {
      const user = await getUser(req);
      if (!user) return ok(res, []);
      return ok(res, await sql`SELECT * FROM addresses WHERE user_id = ${user.id}`);
    }

    if (slug === 'addresses' && method === 'POST') {
      const user = await getUser(req);
      if (!user) return err(res, 'Login required', 401);
      const { name, phone, line, city, state, pincode, type, isDefault } = body;
      if (isDefault) await sql`UPDATE addresses SET is_default = false WHERE user_id = ${user.id}`;
      const id = gid();
      await sql`INSERT INTO addresses (id, user_id, name, phone, line, city, state, pincode, type, is_default) VALUES (${id}, ${user.id}, ${name || ''}, ${phone || ''}, ${line || ''}, ${city || ''}, ${state || ''}, ${pincode || ''}, ${type || 'home'}, ${isDefault || false})`;
      return ok(res, { success: true, record: { id, name, phone, line, city, state, pincode, type, isDefault } });
    }

    if (slug === 'addresses' && method === 'DELETE') {
      const user = await getUser(req);
      if (!user) return err(res, 'Login required', 401);
      const { id } = body;
      await sql`DELETE FROM addresses WHERE id = ${id} AND user_id = ${user.id}`;
      return ok(res, { success: true });
    }

    // ===== BANNERS =====
    if (slug === 'banners' && method === 'GET') {
      return ok(res, await sql`SELECT * FROM banners ORDER BY sort_order`);
    }

    if (slug === 'banners' && method === 'POST') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = gid();
      const { title, subtitle, gradient, link, image, active, sort_order } = body;
      await sql`INSERT INTO banners (id, title, subtitle, gradient, link, image, active, sort_order) VALUES (${id}, ${title || ''}, ${subtitle || ''}, ${gradient || ''}, ${link || ''}, ${image || ''}, ${active !== false}, ${sort_order || 0})`;
      return ok(res, { success: true, record: { id, title, subtitle, gradient, link, image, active, sort_order } });
    }

    if (slug === 'banners' && method === 'PUT') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id, title, subtitle, gradient, link, image, active, sort_order } = body;
      if (!id) return err(res, 'id required');
      await sql`UPDATE banners SET title=${title || ''}, subtitle=${subtitle || ''}, gradient=${gradient || ''}, link=${link || ''}, image=${image || ''}, active=${active !== false}, sort_order=${sort_order || 0} WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug === 'banners' && method === 'DELETE') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id } = body;
      await sql`DELETE FROM banners WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    // ===== CATALOGS =====
    if (slug === 'catalogs' && method === 'GET') {
      return ok(res, await sql`SELECT * FROM catalogs ORDER BY sort_order`);
    }

    if (slug === 'catalogs' && method === 'POST') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = gid();
      const { name, emoji, description, image, active, sort_order } = body;
      await sql`INSERT INTO catalogs (id, name, emoji, description, image, active, sort_order) VALUES (${id}, ${name || ''}, ${emoji || ''}, ${description || ''}, ${image || ''}, ${active !== false}, ${sort_order || 0})`;
      return ok(res, { success: true, record: { id, name, emoji, description, image, active, sort_order } });
    }

    if (slug === 'catalogs' && method === 'PUT') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id, name, emoji, description, image, active, sort_order } = body;
      if (!id) return err(res, 'id required');
      await sql`UPDATE catalogs SET name=${name || ''}, emoji=${emoji || ''}, description=${description || ''}, image=${image || ''}, active=${active !== false}, sort_order=${sort_order || 0} WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug === 'catalogs' && method === 'DELETE') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id } = body;
      await sql`DELETE FROM catalogs WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    // ===== SETTINGS =====
    if (slug === 'settings' && method === 'GET') {
      const rows = await sql`SELECT * FROM settings`;
      const obj = {};
      rows.forEach(r => { obj[r.key] = r.value; });
      return ok(res, obj);
    }

    if (slug === 'settings' && method === 'PUT') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { key, value } = body;
      if (key && value !== undefined) {
        await sql`INSERT INTO settings (key, value) VALUES (${key}, ${String(value)}) ON CONFLICT (key) DO UPDATE SET value = ${String(value)}`;
      }
      return ok(res, { success: true });
    }

    // ===== STOCK LOGS =====
    if (slug === 'stock-logs' && method === 'GET') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      return ok(res, await sql`SELECT * FROM stock_logs ORDER BY timestamp DESC`);
    }

    // ===== USERS =====
    if (slug === 'users' && method === 'GET') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      return ok(res, await sql`SELECT id, name, email, phone, created_at FROM users ORDER BY created_at DESC`);
    }

    if (slug === 'users' && method === 'DELETE') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id } = body;
      await sql`DELETE FROM users WHERE id = ${id}`;
      await sql`DELETE FROM cart_items WHERE user_id = ${id}`;
      await sql`DELETE FROM wishlist WHERE user_id = ${id}`;
      await sql`DELETE FROM addresses WHERE user_id = ${id}`;
      return ok(res, { success: true });
    }

    // ===== ADMINS =====
    if (slug === 'admins' && method === 'GET') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      return ok(res, await sql`SELECT id, name, email, role, created_at FROM admins ORDER BY created_at DESC`);
    }

    if (slug === 'admins' && method === 'POST') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = gid();
      const { name, email, password, role } = body;
      if (!name || !email || !password) return err(res, 'Name, email, password required');
      const ph = await bcrypt.hash(password, 10);
      await sql`INSERT INTO admins (id, name, email, password_hash, role) VALUES (${id}, ${name}, ${email}, ${ph}, ${role || 'admin'})`;
      return ok(res, { success: true, record: { id, name, email, role: role || 'admin' } });
    }

    if (slug === 'admins' && method === 'DELETE') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id } = body;
      const main = await sql`SELECT id FROM admins WHERE email = 'admin@gmail.com'`;
      if (main.length > 0 && main[0].id === id) return err(res, 'Cannot delete main admin');
      await sql`DELETE FROM admins WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug === 'admins' && method === 'PUT') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id, name, email, password } = body;
      if (password) {
        const ph = await bcrypt.hash(password, 10);
        await sql`UPDATE admins SET name=${name || ''}, email=${email || ''}, password_hash=${ph} WHERE id = ${id}`;
      } else {
        await sql`UPDATE admins SET name=${name || ''}, email=${email || ''} WHERE id = ${id}`;
      }
      return ok(res, { success: true });
    }

    // ===== RETURNS =====
    if (slug === 'returns' && method === 'GET') {
      const user = await getUser(req);
      if (!user) return err(res, 'Auth required', 401);
      if (user.role === 'admin') {
        return ok(res, await sql`SELECT * FROM returns ORDER BY created_at DESC`);
      }
      return ok(res, await sql`SELECT * FROM returns WHERE user_id = ${user.id} ORDER BY created_at DESC`);
    }

    if (slug === 'returns' && method === 'POST') {
      const user = await getUser(req);
      if (!user) return err(res, 'Auth required', 401);
      const id = gid();
      const { orderId, reason, additionalInfo } = body;
      const orders = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
      if (orders.length === 0) return err(res, 'Order not found', 404);
      const o = orders[0];
      const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
      const productName = (items[0] && items[0].name) || 'Full Order';
      await sql`INSERT INTO returns (id, order_id, user_id, customer_name, product_name, reason, additional_info, refund_amount) VALUES (${id}, ${orderId}, ${user.id}, ${user.name || ''}, ${productName}, ${reason || ''}, ${additionalInfo || ''}, ${Number(o.total) || 0})`;
      return ok(res, { success: true, record: { id, orderId, reason } });
    }

    if (slug.startsWith('returns/') && method === 'PUT') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      const { status, rejectReason } = body;
      const reviewedAt = status !== 'pending' ? new Date().toISOString() : null;
      const refundedAt = status === 'refunded' ? new Date().toISOString() : null;
      await sql`UPDATE returns SET status = ${status}, reviewed_at = ${reviewedAt}, refunded_at = ${refundedAt}, reject_reason = ${rejectReason || null} WHERE id = ${id}`;
      if (status === 'approved') {
        const ret = await sql`SELECT * FROM returns WHERE id = ${id}`;
        if (ret.length > 0 && ret[0].product_id) {
          await sql`UPDATE products SET stock = stock + ${ret[0].qty || 1}, updated_at = NOW() WHERE id = ${ret[0].product_id}`;
        }
      }
      return ok(res, { success: true });
    }

    // ===== INIT (seed data) =====
    if (slug === 'init' && method === 'POST') {
      const productCount = await sql`SELECT COUNT(*) as cnt FROM products`;
      if (Number(productCount[0].cnt) === 0) {
        const { SEED_DATA } = require('../DBMS/data');
        if (SEED_DATA && SEED_DATA.products) {
          for (const p of SEED_DATA.products) {
            await sql`INSERT INTO products (id, name, description, category, price, mrp, stock, unit, image, badge, offer) VALUES (${p.id}, ${p.name}, ${p.description || ''}, ${p.category || ''}, ${p.price || 0}, ${p.mrp || 0}, ${p.stock || 0}, ${p.unit || ''}, ${p.image || ''}, ${p.badge || ''}, ${p.offer || ''}) ON CONFLICT (id) DO NOTHING`;
          }
        }
        if (SEED_DATA && SEED_DATA.banners) {
          for (const b of SEED_DATA.banners) {
            await sql`INSERT INTO banners (id, title, subtitle, gradient, link, image, active, sort_order) VALUES (${b.id}, ${b.title || ''}, ${b.subtitle || ''}, ${b.gradient || ''}, ${b.link || ''}, ${b.image || ''}, ${b.active !== false}, ${b.order || 0}) ON CONFLICT (id) DO NOTHING`;
          }
        }
        if (SEED_DATA && SEED_DATA.catalogs) {
          for (const c of SEED_DATA.catalogs) {
            await sql`INSERT INTO catalogs (id, name, emoji, description, image, active, sort_order) VALUES (${c.id}, ${c.name}, ${c.emoji || ''}, ${c.description || ''}, ${c.image || ''}, ${c.active !== false}, ${c.order || 0}) ON CONFLICT (id) DO NOTHING`;
          }
        }
      }
      const adminCount = await sql`SELECT COUNT(*) as cnt FROM admins`;
      if (Number(adminCount[0].cnt) === 0) {
        const ph = await bcrypt.hash('gateout@123#', 10);
        await sql`INSERT INTO admins (id, name, email, password_hash, role) VALUES ('admin_001', 'Admin', 'admin@gmail.com', ${ph}, 'superadmin') ON CONFLICT (id) DO NOTHING`;
      }
      return ok(res, { success: true, message: 'Database initialized' });
    }

    // ===== EXPORT =====
    if (slug === 'export' && method === 'GET') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const data = {};
      for (const t of ['products', 'orders', 'users', 'admins', 'banners', 'catalogs', 'returns', 'stock_logs', 'settings', 'addresses']) {
        data[t] = await sql`SELECT * FROM ${sql(t)}`;
      }
      return ok(res, data);
    }

    // ===== IMPORT =====
    if (slug === 'import' && method === 'POST') {
      const user = await getUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const data = body;
      for (const [table, rows] of Object.entries(data)) {
        if (Array.isArray(rows)) {
          await sql`DELETE FROM ${sql(table)}`;
          for (const row of rows) {
            const keys = Object.keys(row);
            if (keys.length > 0) {
              const vals = keys.map(k => row[k]);
              await sql`INSERT INTO ${sql(table)} (${sql(keys.join(','))}) VALUES (${sql.unsafe(vals.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(','))})`;
            }
          }
        }
      }
      return ok(res, { success: true });
    }

    return err(res, 'Not found: ' + slug, 404);
  } catch (e) {
    console.error('API Error:', e);
    return err(res, e.message || 'Internal server error', 500);
  }
};
