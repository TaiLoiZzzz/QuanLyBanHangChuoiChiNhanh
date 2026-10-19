class ProductController {
  constructor(searchProductsUseCase, productRepository) {
    this.searchProductsUseCase = searchProductsUseCase;
    this.productRepository = productRepository;
  }

  async getAll(req, res, next) {
    try {
      const userContext = req.userContext;
      const products = await this.productRepository.getAllProducts(userContext);
      res.json({
        success: true,
        count: products.length,
        products
      });
    } catch (err) {
      next(err);
    }
  }

  async search(req, res, next) {
    try {
      const { tuKhoa, maDM, giaMin, giaMax } = req.query;
      const userContext = req.userContext;
      const products = await this.searchProductsUseCase.execute(
        { tuKhoa, maDM, giaMin, giaMax },
        userContext
      );
      res.json({
        success: true,
        count: products.length,
        products
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { tenSP, maDM, giaBanHienTai, donViTinh } = req.body;
      const userContext = req.userContext;
      const newProduct = await this.productRepository.createProduct(
        { tenSP, maDM, giaBanHienTai, donViTinh },
        userContext
      );
      res.status(201).json({
        success: true,
        message: 'Thêm sản phẩm mới thành công!',
        product: newProduct
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { tenSP, maDM, giaBanHienTai, donViTinh } = req.body;
      const userContext = req.userContext;
      const updatedProduct = await this.productRepository.updateProduct(
        id,
        { tenSP, maDM, giaBanHienTai, donViTinh },
        userContext
      );
      res.json({
        success: true,
        message: 'Cập nhật sản phẩm thành công!',
        product: updatedProduct
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userContext = req.userContext;
      const result = await this.productRepository.deleteProduct(id, userContext);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductController;
