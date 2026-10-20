const sessions = require('../middlewares/sessionStore');
class AuthController {
  constructor(loginByRoleUseCase) { this.loginByRoleUseCase = loginByRoleUseCase; }
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      if (typeof username !== 'string' || !username.trim() || username.length > 128 || typeof password !== 'string' || !password || password.length > 256) {
        return res.status(400).json({ success: false, error: 'Thông tin đăng nhập không hợp lệ.' });
      }
      const result = await this.loginByRoleUseCase.execute({ username: username.trim(), password });
      sessions.create(req, res, result, password);
      res.setHeader('Cache-Control', 'no-store'); res.json(result);
    } catch (err) { next(err); }
  }
  me(req, res) { res.setHeader('Cache-Control', 'no-store'); res.json({ success: true, username: req.userContext.user, role: req.userContext.role }); }
  logout(req, res) { sessions.clear(req, res); res.json({ success: true }); }
}
module.exports = AuthController;
