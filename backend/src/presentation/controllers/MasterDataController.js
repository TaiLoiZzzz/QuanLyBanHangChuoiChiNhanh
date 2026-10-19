class MasterDataController {
  constructor(masterRepository) {
    this.masterRepository = masterRepository;
  }

  // Chi nhánh
  async getBranches(req, res, next) {
    try {
      const branches = await this.masterRepository.getBranches(req.userContext);
      res.json({ success: true, count: branches.length, branches });
    } catch (err) {
      next(err);
    }
  }

  async createBranch(req, res, next) {
    try {
      const { tenCN, diaChi, soDT } = req.body;
      const branch = await this.masterRepository.createBranch({ tenCN, diaChi, soDT }, req.userContext);
      res.status(201).json({ success: true, message: 'Thêm chi nhánh mới thành công!', branch });
    } catch (err) {
      next(err);
    }
  }

  // Kho hàng
  async getWarehouses(req, res, next) {
    try {
      const warehouses = await this.masterRepository.getWarehouses(req.userContext);
      res.json({ success: true, count: warehouses.length, warehouses });
    } catch (err) {
      next(err);
    }
  }

  // Danh mục
  async getCategories(req, res, next) {
    try {
      const categories = await this.masterRepository.getCategories(req.userContext);
      res.json({ success: true, count: categories.length, categories });
    } catch (err) {
      next(err);
    }
  }

  // Khách hàng
  async getCustomers(req, res, next) {
    try {
      const customers = await this.masterRepository.getCustomers(req.userContext);
      res.json({ success: true, count: customers.length, customers });
    } catch (err) {
      next(err);
    }
  }

  async createCustomer(req, res, next) {
    try {
      const { hoTen, soDT, loaiKH, diemTichLuy } = req.body;
      const customer = await this.masterRepository.createCustomer({ hoTen, soDT, loaiKH, diemTichLuy }, req.userContext);
      res.status(201).json({ success: true, message: 'Thêm khách hàng mới thành công!', customer });
    } catch (err) {
      next(err);
    }
  }

  // Nhân viên
  async getEmployees(req, res, next) {
    try {
      const employees = await this.masterRepository.getEmployees(req.userContext);
      res.json({ success: true, count: employees.length, employees });
    } catch (err) {
      next(err);
    }
  }

  async createEmployee(req, res, next) {
    try {
      const { hoTen, luong, maCN, maQL } = req.body;
      const employee = await this.masterRepository.createEmployee({ hoTen, luong, maCN, maQL }, req.userContext);
      res.status(201).json({ success: true, message: 'Thêm nhân viên mới thành công!', employee });
    } catch (err) {
      next(err);
    }
  }

  // Nhật ký
  async getAuditLogs(req, res, next) {
    try {
      const logs = await this.masterRepository.getAuditLogs(req.userContext);
      res.json({ success: true, count: logs.length, logs });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MasterDataController;
