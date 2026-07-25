const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const sql = neon(process.env.NEON_DATABASE_URL);
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'aravali-store-secret-key-2024');

let cloudinary = null;
async function getCloudinary() {
  if (!cloudinary) {
    cloudinary = (await import('cloudinary')).v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }
  return cloudinary;
}
let jose = null;
async function getJose() {
  if (!jose) jose = await import('jose');
  return jose;
}
let resend = null;
async function getResend() {
  if (!resend) {
    const { Resend } = await import('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}
let dbReady = false;
let seedDone = false;

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
  await sql`CREATE TABLE IF NOT EXISTS password_resets (id TEXT PRIMARY KEY, email TEXT NOT NULL, code TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, used BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`;
  dbReady = true;
}

async function ensureSeeded() {
  if (seedDone) return;
  try {
    const adminCount = await sql`SELECT COUNT(*) as cnt FROM admins`;
    if (Number(adminCount[0].cnt) === 0) {
      const ph = await bcrypt.hash('gateout@123#', 10);
      await sql`INSERT INTO admins (id, name, email, password_hash, role) VALUES ('admin_001', 'Admin', 'admin@gmail.com', ${ph}, 'superadmin') ON CONFLICT (id) DO NOTHING`;
    }
    const productCount = await sql`SELECT COUNT(*) as cnt FROM products`;
    if (Number(productCount[0].cnt) === 0) {
      try {
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
      } catch {}
    }
    seedDone = true;
  } catch {}
}

function parseCookies(h) {
  const c = {};
  if (!h) return c;
  h.split(';').forEach(s => { const [k, ...v] = s.split('='); c[k.trim()] = v.join('=').trim(); });
  return c;
}

async function getTokenPayload(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  let token = cookies.aravali_admin_token || cookies.aravali_token;
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace('Bearer ', '');
  }
  if (!token) return null;
  try {
    const j = await getJose();
    const { payload } = await j.jwtVerify(token, SECRET);
    return payload;
  } catch { return null; }
}

async function getUser(req) {
  const payload = await getTokenPayload(req);
  if (!payload) return null;
  if (payload.role === 'admin') return null;
  return payload;
}

async function getAdmin(req) {
  const payload = await getTokenPayload(req);
  if (!payload) return null;
  if (payload.role !== 'admin' && payload.role !== 'superadmin') return null;
  return payload;
}

async function getAuthUser(req) {
  const admin = await getAdmin(req);
  if (admin) return admin;
  const user = await getUser(req);
  if (user) return user;
  return await getTokenPayload(req);
}

function ok(res, data) { res.setHeader('Content-Type', 'application/json'); res.statusCode = 200; res.end(JSON.stringify(data)); }
function okCookies(res, data, cookies) { res.setHeader('Content-Type', 'application/json'); res.setHeader('Set-Cookie', cookies); res.statusCode = 200; res.end(JSON.stringify(data)); }
function err(res, msg, s = 400) { res.setHeader('Content-Type', 'application/json'); res.statusCode = s; res.end(JSON.stringify({ error: msg })); }
function getId(res, id) { return ok(res, { id }); }
function cookieFlags(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return proto === 'https' ? 'Secure; ' : '';
}

const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

async function signToken(payload) {
  const j = await getJose();
  return new j.SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(SECRET);
}

module.exports = async function handler(req, res) {
  await initDB();
  await ensureSeeded();
  const url = new URL(req.url, 'http://localhost');
  let slug = (req.query.slug || []).join('/');
  if (!slug) {
    slug = url.pathname.replace(/^\/api\//, '');
  }
  const method = req.method;
  let body = {};
  if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      body = raw ? JSON.parse(raw) : {};
    } catch { body = {}; }
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
      const token = await signToken({ id, name, email, role: 'user' });
      return ok(res, { success: true, user: { id, name, email, phone }, token });
    }

    if (slug === 'auth/login' && method === 'POST') {
      const { email, password } = body;
      if (!email || !password) return err(res, 'Email and password are required');
      const users = await sql`SELECT id, name, email, password_hash, phone FROM users WHERE email = ${email}`;
      if (users.length === 0) return err(res, 'Invalid email or password', 401);
      const u = users[0];
      if (!(await bcrypt.compare(password, u.password_hash))) return err(res, 'Invalid email or password', 401);
      const token = await signToken({ id: u.id, name: u.name, email: u.email, role: 'user' });
      return ok(res, { success: true, user: { id: u.id, name: u.name, email: u.email, phone: u.phone }, token });
    }

    if (slug === 'auth/admin-login' && method === 'POST') {
      const { email, password } = body;
      if (!email || !password) return err(res, 'Email and password are required');
      const admins = await sql`SELECT id, name, email, password_hash, role FROM admins WHERE email = ${email}`;
      if (admins.length === 0) return err(res, 'Invalid admin credentials', 401);
      const a = admins[0];
      if (!(await bcrypt.compare(password, a.password_hash))) return err(res, 'Invalid admin credentials', 401);
      const token = await signToken({ id: a.id, name: a.name, email: a.email, role: 'admin' });
      return ok(res, { success: true, admin: { id: a.id, name: a.name, email: a.email, role: a.role }, token });
    }

    if (slug === 'auth/me' && method === 'GET') {
      const admin = await getAdmin(req);
      if (admin) {
        const admins = await sql`SELECT id, name, email, role FROM admins WHERE id = ${admin.id}`;
        return ok(res, { admin: admins[0] || null });
      }
      const user = await getAuthUser(req);
      if (!user) return err(res, 'Not authenticated', 401);
      const users = await sql`SELECT id, name, email, phone FROM users WHERE id = ${user.id}`;
      return ok(res, { user: users[0] || null });
    }

    if (slug === 'auth/logout' && method === 'POST') {
      return ok(res, { success: true });
    }

    // ===== CHANGE PASSWORD (admin) =====
    if (slug === 'auth/change-admin-password' && method === 'POST') {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) return err(res, 'Current and new password are required');
      if (newPassword.length < 6) return err(res, 'Password must be at least 6 characters');
      const admin = await getAdmin(req);
      if (!admin) return err(res, 'Admin auth required', 401);
      const admins = await sql`SELECT password_hash FROM admins WHERE id = ${admin.id}`;
      if (admins.length === 0) return err(res, 'Admin not found', 404);
      if (!(await bcrypt.compare(currentPassword, admins[0].password_hash))) return err(res, 'Current password is incorrect');
      const ph = await bcrypt.hash(newPassword, 10);
      await sql`UPDATE admins SET password_hash = ${ph} WHERE id = ${admin.id}`;
      return ok(res, { success: true, message: 'Password updated successfully' });
    }

    // ===== CHANGE PASSWORD (user) =====
    if (slug === 'auth/change-user-password' && method === 'POST') {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) return err(res, 'Current and new password are required');
      if (newPassword.length < 6) return err(res, 'Password must be at least 6 characters');
      const user = await getUser(req);
      if (!user) return err(res, 'Auth required', 401);
      const users = await sql`SELECT password_hash FROM users WHERE id = ${user.id}`;
      if (users.length === 0) return err(res, 'User not found', 404);
      if (!(await bcrypt.compare(currentPassword, users[0].password_hash))) return err(res, 'Current password is incorrect');
      const ph = await bcrypt.hash(newPassword, 10);
      await sql`UPDATE users SET password_hash = ${ph} WHERE id = ${user.id}`;
      return ok(res, { success: true, message: 'Password updated successfully' });
    }

    // ===== FORGOT PASSWORD =====
    if (slug === 'auth/forgot-password' && method === 'POST') {
      const { email } = body;
      if (!email) return err(res, 'Email is required');
      const users = await sql`SELECT id, name FROM users WHERE email = ${email}`;
      if (users.length === 0) return err(res, 'No account found with this email');
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const id = gid();
      await sql`INSERT INTO password_resets (id, email, code, expires_at) VALUES (${id}, ${email}, ${code}, NOW() + INTERVAL '10 minutes')`;
      let emailSent = false;
      let emailError = '';
      try {
        const r = await getResend();
        const result = await r.emails.send({
          from: 'Aravali Store <onboarding@resend.dev>',
          to: email,
          subject: 'Password Reset Code - Aravali Store',
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#2d6b50;">Password Reset</h2>
            <p>Hello ${users[0].name},</p>
            <p>Your password reset code is:</p>
            <div style="background:#f0f7f4;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
              <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#2d6b50;">${code}</span>
            </div>
            <p style="color:#888;font-size:0.9rem;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="color:#aaa;font-size:0.8rem;">© 2026 Aravali Store</p>
          </div>`
        });
        emailSent = true;
      } catch (e) {
        emailError = e.message || String(e);
        console.error('Email send error:', emailError);
      }
      return ok(res, { success: true, message: emailSent ? 'Reset code sent to your email' : 'Check spam folder for the code.', debugCode: code });
    }

    // ===== VERIFY RESET CODE =====
    if (slug === 'auth/verify-reset-code' && method === 'POST') {
      const { email, code } = body;
      if (!email || !code) return err(res, 'Email and code are required');
      const rows = await sql`SELECT id FROM password_resets WHERE email = ${email} AND code = ${code} AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`;
      if (rows.length === 0) return err(res, 'Invalid or expired code');
      return ok(res, { success: true, resetId: rows[0].id });
    }

    // ===== RESET PASSWORD =====
    if (slug === 'auth/reset-password' && method === 'POST') {
      const { resetId, newPassword } = body;
      if (!resetId || !newPassword) return err(res, 'Reset ID and new password are required');
      if (newPassword.length < 6) return err(res, 'Password must be at least 6 characters');
      const rows = await sql`SELECT email FROM password_resets WHERE id = ${resetId} AND used = false AND expires_at > NOW()`;
      if (rows.length === 0) return err(res, 'Invalid or expired reset request');
      const email = rows[0].email;
      const ph = await bcrypt.hash(newPassword, 10);
      await sql`UPDATE users SET password_hash = ${ph} WHERE email = ${email}`;
      await sql`UPDATE password_resets SET used = true WHERE id = ${resetId}`;
      return ok(res, { success: true, message: 'Password updated successfully' });
    }

    // ===== PRODUCTS =====
    if (slug === 'products' && method === 'GET') {
      try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'`; } catch {}
      try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp DECIMAL(10,2) DEFAULT 0`; } catch {}
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
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = gid();
      const { name, description, category, price, mrp, stock, unit, image, badge, offer, images } = body;
      await sql`INSERT INTO products (id, name, description, category, price, mrp, stock, unit, image, images, badge, offer) VALUES (${id}, ${name || ''}, ${description || ''}, ${category || ''}, ${price || 0}, ${mrp || 0}, ${stock || 0}, ${unit || ''}, ${image || ''}, ${JSON.stringify(images || [])}, ${badge || ''}, ${offer || ''})`;
      return ok(res, { success: true, record: { id, name, description, category, price, mrp, stock, unit, image, images, badge, offer } });
    }

    if (slug.startsWith('products/') && method === 'GET') {
      const id = slug.split('/')[1];
      const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
      if (rows.length === 0) return err(res, 'Not found', 404);
      return ok(res, rows[0]);
    }

    if (slug.startsWith('products/') && method === 'PUT') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      const ex = await sql`SELECT * FROM products WHERE id = ${id}`;
      if (ex.length === 0) return err(res, 'Not found', 404);
      const e = ex[0];
      const { name, description, category, price, mrp, stock, unit, image, badge, offer, images } = body;
      await sql`UPDATE products SET name=${name !== undefined ? name : e.name}, description=${description !== undefined ? description : e.description}, category=${category !== undefined ? category : e.category}, price=${price !== undefined ? price : e.price}, mrp=${mrp !== undefined ? mrp : e.mrp}, stock=${stock !== undefined ? stock : e.stock}, unit=${unit !== undefined ? unit : e.unit}, image=${image !== undefined ? image : e.image}, images=${images !== undefined ? JSON.stringify(images) : (e.images ? JSON.stringify(e.images) : '[]')}, badge=${badge !== undefined ? badge : e.badge}, offer=${offer !== undefined ? offer : e.offer}, updated_at=NOW() WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug.startsWith('products/') && method === 'DELETE') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      await sql`DELETE FROM products WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    // ===== ORDERS =====
    if (slug === 'orders' && method === 'GET') {
      const user = await getAuthUser(req);
      let rows;
      if (user && user.role === 'admin') {
        rows = await sql`SELECT * FROM orders ORDER BY order_date DESC`;
      } else if (user) {
        rows = await sql`SELECT * FROM orders WHERE user_id = ${user.id} ORDER BY order_date DESC`;
      } else {
        rows = [];
      }
      return ok(res, rows.map(r => ({
        id: r.id,
        user_id: r.user_id,
        userId: r.user_id,
        userName: r.user_name,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
        address: r.address,
        paymentMethod: r.payment_method,
        subtotal: Number(r.subtotal || 0),
        delivery: Number(r.delivery || 0),
        total: Number(r.total || 0),
        status: r.status,
        orderDate: r.order_date,
        createdAt: r.order_date,
        discount: r.discount || 0,
      })));
    }

    if (slug === 'orders' && method === 'POST') {
      const user = await getAuthUser(req);
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
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      const { status } = body;
      await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug.startsWith('orders/') && method === 'DELETE') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      await sql`DELETE FROM orders WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    // ===== CART =====
    if (slug === 'cart' && method === 'GET') {
      const user = await getAuthUser(req);
      if (!user) return ok(res, []);
      const rows = await sql`SELECT c.*, p.name, p.price, p.mrp, p.stock, p.unit, p.image, p.category, p.description, p.badge, p.offer FROM cart_items c LEFT JOIN products p ON c.product_id = p.id WHERE c.user_id = ${user.id}`;
      return ok(res, rows.map(r => ({ id: r.id, productId: r.product_id, qty: r.qty, product: r.name ? { id: r.product_id, name: r.name, price: Number(r.price), mrp: Number(r.mrp), stock: r.stock, unit: r.unit, image: r.image, category: r.category, description: r.description, badge: r.badge, offer: r.offer } : null })));
    }

    if (slug === 'cart' && method === 'POST') {
      const user = await getAuthUser(req);
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
      const user = await getAuthUser(req);
      if (!user) return err(res, 'Login required', 401);
      const { productId } = body;
      await sql`DELETE FROM cart_items WHERE user_id = ${user.id} AND product_id = ${productId}`;
      return ok(res, { success: true });
    }

    // ===== WISHLIST =====
    if (slug === 'wishlist' && method === 'GET') {
      const user = await getAuthUser(req);
      if (!user) return ok(res, []);
      const rows = await sql`SELECT product_id FROM wishlist WHERE user_id = ${user.id}`;
      return ok(res, rows.map(r => r.product_id));
    }

    if (slug === 'wishlist' && method === 'POST') {
      const user = await getAuthUser(req);
      if (!user) return err(res, 'Login required', 401);
      const { productId } = body;
      const ex = await sql`SELECT id FROM wishlist WHERE user_id = ${user.id} AND product_id = ${productId}`;
      if (ex.length === 0) await sql`INSERT INTO wishlist (id, user_id, product_id) VALUES (${gid()}, ${user.id}, ${productId})`;
      return ok(res, { success: true });
    }

    if (slug === 'wishlist' && method === 'DELETE') {
      const user = await getAuthUser(req);
      if (!user) return err(res, 'Login required', 401);
      const { productId } = body;
      await sql`DELETE FROM wishlist WHERE user_id = ${user.id} AND product_id = ${productId}`;
      return ok(res, { success: true });
    }

    // ===== ADDRESSES =====
    if (slug === 'addresses' && method === 'GET') {
      const user = await getAuthUser(req);
      if (!user) return ok(res, []);
      return ok(res, await sql`SELECT * FROM addresses WHERE user_id = ${user.id}`);
    }

    if (slug === 'addresses' && method === 'POST') {
      const user = await getAuthUser(req);
      if (!user) return err(res, 'Login required', 401);
      const { name, phone, line, city, state, pincode, type, isDefault } = body;
      if (isDefault) await sql`UPDATE addresses SET is_default = false WHERE user_id = ${user.id}`;
      const id = gid();
      await sql`INSERT INTO addresses (id, user_id, name, phone, line, city, state, pincode, type, is_default) VALUES (${id}, ${user.id}, ${name || ''}, ${phone || ''}, ${line || ''}, ${city || ''}, ${state || ''}, ${pincode || ''}, ${type || 'home'}, ${isDefault || false})`;
      return ok(res, { success: true, record: { id, name, phone, line, city, state, pincode, type, isDefault } });
    }

    if (slug === 'addresses' && method === 'DELETE') {
      const user = await getAuthUser(req);
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
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = gid();
      const { title, subtitle, gradient, link, image, active, sort_order } = body;
      await sql`INSERT INTO banners (id, title, subtitle, gradient, link, image, active, sort_order) VALUES (${id}, ${title || ''}, ${subtitle || ''}, ${gradient || ''}, ${link || ''}, ${image || ''}, ${active !== false}, ${sort_order || 0})`;
      return ok(res, { success: true, record: { id, title, subtitle, gradient, link, image, active, sort_order } });
    }

    if (slug === 'banners' && method === 'PUT') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id } = body;
      if (!id) return err(res, 'id required');
      const ex = await sql`SELECT * FROM banners WHERE id = ${id}`;
      if (ex.length === 0) return err(res, 'Not found', 404);
      const e = ex[0];
      await sql`UPDATE banners SET title=${body.title !== undefined ? body.title : e.title}, subtitle=${body.subtitle !== undefined ? body.subtitle : e.subtitle}, gradient=${body.gradient !== undefined ? body.gradient : e.gradient}, link=${body.link !== undefined ? body.link : e.link}, image=${body.image !== undefined ? body.image : e.image}, active=${body.active !== undefined ? body.active : e.active}, sort_order=${body.sort_order !== undefined ? body.sort_order : e.sort_order} WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug.startsWith('banners/') && method === 'PUT') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      const ex = await sql`SELECT * FROM banners WHERE id = ${id}`;
      if (ex.length === 0) return err(res, 'Not found', 404);
      const e = ex[0];
      await sql`UPDATE banners SET title=${body.title !== undefined ? body.title : e.title}, subtitle=${body.subtitle !== undefined ? body.subtitle : e.subtitle}, gradient=${body.gradient !== undefined ? body.gradient : e.gradient}, link=${body.link !== undefined ? body.link : e.link}, image=${body.image !== undefined ? body.image : e.image}, active=${body.active !== undefined ? body.active : e.active}, sort_order=${body.sort_order !== undefined ? body.sort_order : e.sort_order} WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug === 'banners' && method === 'DELETE') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id } = body;
      await sql`DELETE FROM banners WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug.startsWith('banners/') && method === 'DELETE') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      await sql`DELETE FROM banners WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    // ===== CATALOGS =====
    if (slug === 'catalogs' && method === 'GET') {
      return ok(res, await sql`SELECT * FROM catalogs ORDER BY sort_order`);
    }

    if (slug === 'catalogs' && method === 'POST') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = gid();
      const { name, emoji, description, image, active, sort_order } = body;
      await sql`INSERT INTO catalogs (id, name, emoji, description, image, active, sort_order) VALUES (${id}, ${name || ''}, ${emoji || ''}, ${description || ''}, ${image || ''}, ${active !== false}, ${sort_order || 0})`;
      return ok(res, { success: true, record: { id, name, emoji, description, image, active, sort_order } });
    }

    if (slug === 'catalogs' && method === 'PUT') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id } = body;
      if (!id) return err(res, 'id required');
      const ex = await sql`SELECT * FROM catalogs WHERE id = ${id}`;
      if (ex.length === 0) return err(res, 'Not found', 404);
      const e = ex[0];
      await sql`UPDATE catalogs SET name=${body.name !== undefined ? body.name : e.name}, emoji=${body.emoji !== undefined ? body.emoji : e.emoji}, description=${body.description !== undefined ? body.description : e.description}, image=${body.image !== undefined ? body.image : e.image}, active=${body.active !== undefined ? body.active : e.active}, sort_order=${body.sort_order !== undefined ? body.sort_order : e.sort_order} WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug.startsWith('catalogs/') && method === 'PUT') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      const ex = await sql`SELECT * FROM catalogs WHERE id = ${id}`;
      if (ex.length === 0) return err(res, 'Not found', 404);
      const e = ex[0];
      await sql`UPDATE catalogs SET name=${body.name !== undefined ? body.name : e.name}, emoji=${body.emoji !== undefined ? body.emoji : e.emoji}, description=${body.description !== undefined ? body.description : e.description}, image=${body.image !== undefined ? body.image : e.image}, active=${body.active !== undefined ? body.active : e.active}, sort_order=${body.sort_order !== undefined ? body.sort_order : e.sort_order} WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug === 'catalogs' && method === 'DELETE') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id } = body;
      await sql`DELETE FROM catalogs WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug.startsWith('catalogs/') && method === 'DELETE') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
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
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { key, value } = body;
      if (key && value !== undefined) {
        await sql`INSERT INTO settings (key, value) VALUES (${key}, ${String(value)}) ON CONFLICT (key) DO UPDATE SET value = ${String(value)}`;
      }
      return ok(res, { success: true });
    }

    // ===== STOCK LOGS =====
    if (slug === 'stock-logs' && method === 'GET') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      return ok(res, await sql`SELECT * FROM stock_logs ORDER BY timestamp DESC`);
    }

    // ===== USERS =====
    if (slug === 'users' && method === 'GET') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      return ok(res, await sql`SELECT id, name, email, phone, created_at FROM users ORDER BY created_at DESC`);
    }

    if (slug === 'users' && method === 'DELETE') {
      const user = await getAuthUser(req);
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
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      return ok(res, await sql`SELECT id, name, email, role, created_at FROM admins ORDER BY created_at DESC`);
    }

    if (slug === 'admins' && method === 'POST') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = gid();
      const { name, email, password, role } = body;
      if (!name || !email || !password) return err(res, 'Name, email, password required');
      const ph = await bcrypt.hash(password, 10);
      await sql`INSERT INTO admins (id, name, email, password_hash, role) VALUES (${id}, ${name}, ${email}, ${ph}, ${role || 'admin'})`;
      return ok(res, { success: true, record: { id, name, email, role: role || 'admin' } });
    }

    if (slug === 'admins' && method === 'DELETE') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { id } = body;
      const main = await sql`SELECT id FROM admins WHERE email = 'admin@gmail.com'`;
      if (main.length > 0 && main[0].id === id) return err(res, 'Cannot delete main admin');
      await sql`DELETE FROM admins WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug.startsWith('admins/') && method === 'DELETE') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      const main = await sql`SELECT id FROM admins WHERE email = 'admin@gmail.com'`;
      if (main.length > 0 && main[0].id === id) return err(res, 'Cannot delete main admin');
      await sql`DELETE FROM admins WHERE id = ${id}`;
      return ok(res, { success: true });
    }

    if (slug === 'admins' && method === 'PUT') {
      const user = await getAuthUser(req);
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

    if (slug.startsWith('admins/') && method === 'PUT') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const id = slug.split('/')[1];
      const { name, email, password } = body;
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
      const user = await getAuthUser(req);
      if (!user) return err(res, 'Auth required', 401);
      if (user.role === 'admin') {
        return ok(res, await sql`SELECT * FROM returns ORDER BY created_at DESC`);
      }
      return ok(res, await sql`SELECT * FROM returns WHERE user_id = ${user.id} ORDER BY created_at DESC`);
    }

    if (slug === 'returns' && method === 'POST') {
      const user = await getAuthUser(req);
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
      const user = await getAuthUser(req);
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
      try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'`; } catch {}
      try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp DECIMAL(10,2) DEFAULT 0`; } catch {}
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
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const data = {};
      for (const t of ['products', 'orders', 'users', 'admins', 'banners', 'catalogs', 'returns', 'stock_logs', 'settings', 'addresses']) {
        data[t] = await sql`SELECT * FROM ${sql(t)}`;
      }
      return ok(res, data);
    }

    // ===== IMPORT =====
    if (slug === 'import' && method === 'POST') {
      const user = await getAuthUser(req);
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

    // ===== UPLOAD (Cloudinary) =====
    if (slug === 'upload' && method === 'POST') {
      const user = await getAuthUser(req);
      if (!user || user.role !== 'admin') return err(res, 'Admin only', 403);
      const { file } = body;
      if (!file) return err(res, 'No file provided');
      const c = await getCloudinary();
      const result = await c.uploader.upload(file, { folder: 'aravali-store', resource_type: 'auto' });
      return ok(res, { url: result.secure_url, public_id: result.public_id });
    }

    return err(res, 'Not found: ' + slug, 404);
  } catch (e) {
    console.error('API Error:', e);
    return err(res, e.message || 'Internal server error', 500);
  }
};
