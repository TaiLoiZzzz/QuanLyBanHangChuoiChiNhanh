const sessions = require('./sessionStore');
function authMiddleware(req, res, next) {
  if (!req.path.startsWith('/api/') || (['/api/auth/login','/api/auth/logout'].includes(req.path) && req.method === 'POST')) return next();
  const session = sessions.get(req);
  if (!session) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập.', code: 'UNAUTHENTICATED' });
  req.userContext = { user: session.user, password: session.password, role: session.role };
  next();
}
module.exports = authMiddleware;
