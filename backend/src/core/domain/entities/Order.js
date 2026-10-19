class Order {
  constructor({ maDH, maKH, maNV, maKhoXuat, ngayDat, trangThai, tongTien, items = [] }) {
    this.maDH = maDH;
    this.maKH = maKH;
    this.maNV = maNV;
    this.maKhoXuat = maKhoXuat;
    this.ngayDat = ngayDat || new Date();
    this.trangThai = trangThai ?? 0;
    this.tongTien = Number(tongTien) || 0;
    this.items = items;
  }

  getTenTrangThai() {
    switch (this.trangThai) {
      case 0: return 'Mới tạo';
      case 1: return 'Đã xác nhận';
      case 2: return 'Đang giao hàng';
      case 3: return 'Giao thành công';
      case 4: return 'Đã hủy';
      default: return 'Không xác định';
    }
  }

  isValid() {
    return Boolean(this.maKH && this.maNV && this.maKhoXuat);
  }
}

module.exports = Order;
