class LoginByRoleUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async execute({ username, password }) {
    if (!username || !password) {
      throw new Error('Tên đăng nhập và mật khẩu không được để trống.');
    }
    return await this.authRepository.authenticate(username, password);
  }
}

module.exports = LoginByRoleUseCase;
