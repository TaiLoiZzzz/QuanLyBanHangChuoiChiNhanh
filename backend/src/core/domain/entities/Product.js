class Product {
  constructor({ maSP, tenSP, maDM, tenDM, giaBanHienTai, donViTinh, daXoa = false, tongTonKho = 0 }) {
    this.maSP = maSP;
    this.tenSP = tenSP;
    this.maDM = maDM;
    this.tenDM = tenDM;
    this.giaBanHienTai = Number(giaBanHienTai) || 0;
    this.donViTinh = donViTinh;
    this.daXoa = Boolean(daXoa);
    this.tongTonKho = Number(tongTonKho) || 0;
  }
}

module.exports = Product;
