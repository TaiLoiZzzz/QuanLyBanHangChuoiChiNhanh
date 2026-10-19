class IAuthRepository {
  async authenticate(username, password) {
    throw new Error('Method authenticate must be implemented');
  }
}

module.exports = IAuthRepository;
