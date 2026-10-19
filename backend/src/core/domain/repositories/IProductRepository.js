class IProductRepository {
  async searchProducts({ tuKhoa, maDM, giaMin, giaMax }, userRoleContext) {
    throw new Error('Method searchProducts must be implemented');
  }
}

module.exports = IProductRepository;
