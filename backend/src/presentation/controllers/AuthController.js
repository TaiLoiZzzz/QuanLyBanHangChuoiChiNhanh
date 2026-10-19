class AuthController {
  constructor(loginByRoleUseCase) {
    this.loginByRoleUseCase = loginByRoleUseCase;
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await this.loginByRoleUseCase.execute({ username, password });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
