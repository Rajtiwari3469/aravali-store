const { SignJWT, jwtVerify } = require('jose');

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'aravali-store-secret-key-2024');
const ALG = 'HS256';

function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET);
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [key, ...val] = c.split('=');
    cookies[key.trim()] = val.join('=').trim();
  });
  return cookies;
}

async function getUserFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies.aravali_token;
  if (!token) return null;
  return verifyToken(token);
}

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function errRes(message, status = 400) {
  return jsonRes({ error: message }, status);
}

module.exports = { signToken, verifyToken, parseCookies, getUserFromRequest, jsonRes, errRes, SECRET, ALG };
