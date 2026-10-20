const crypto = require('crypto');
const sessions = new Map();
const TTL = 8 * 60 * 60 * 1000;
const cookieName = 'retail_session';
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
function tokenFrom(req) {
  return (req.headers.cookie || '').split(';').map(p => p.trim()).find(p => p.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
}
function prune() { for (const [key, s] of sessions) if (s.expires <= Date.now()) sessions.delete(key); }
const timer = setInterval(prune, 60000); timer.unref();
function clear(req, res) {
  const token = tokenFrom(req); if (token) sessions.delete(hash(token));
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`);
}
function create(req, res, user, password) {
  prune();
  if (sessions.size >= 500) { const err = new Error('Hệ thống đang bận.'); err.status = 503; throw err; }
  clear(req, res);
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(hash(token), { user: user.username, password, role: user.role, expires: Date.now() + TTL });
  res.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${TTL / 1000}${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`);
}
function get(req) {
  const token = tokenFrom(req); if (!token || token.length > 100) return null;
  const session = sessions.get(hash(token));
  if (!session || session.expires <= Date.now()) { if (session) sessions.delete(hash(token)); return null; }
  return session;
}
module.exports = { create, get, clear };
