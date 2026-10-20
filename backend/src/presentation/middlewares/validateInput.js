function invalid(message) { const err = new Error(message); err.status = 422; throw err; }
function validateInput(req, res, next) {
  try {
    if (req.params.id && !/^[1-9]\d*$/.test(req.params.id)) invalid('Mã không hợp lệ.');
    const b = req.body || {};
    const integer = (key, min = 1) => { if (key in b && (!Number.isSafeInteger(b[key]) || b[key] < min || b[key] > 2147483647)) invalid(`${key}: số nguyên không hợp lệ.`); };
    for (const key of ['maDM','maKH','maNV','maCN','maKhoXuat','maKhoNhap','maSP','soLuong','maNVCantXoa','maQLThayThe']) integer(key);
    if (b.maQL != null) integer('maQL');
    for (const key of ['diemTichLuy','diemToiThieu','diemThuongBonus']) integer(key, 0);
    for (const key of ['giaBanHienTai','donGiaBan','luong']) if (key in b && (typeof b[key] !== 'number' || !Number.isFinite(b[key]) || b[key] <= 0 || b[key] > 9999999999.99)) invalid(`${key}: giá trị phải dương.`);
    for (const [key, max] of Object.entries({tenSP:150,hoTen:100,tenCN:100,donViTinh:20,lyDoHuy:200})) if (key in b && (typeof b[key] !== 'string' || !b[key].trim() || b[key].length > max)) invalid(`${key}: nội dung không hợp lệ.`);
    if ('soDT' in b && (typeof b.soDT !== 'string' || !/^\d{10}$/.test(b.soDT))) invalid('Số điện thoại phải có 10 chữ số.');
    if ('loaiKH' in b && ![0,1,2].includes(b.loaiKH)) invalid('Hạng thành viên không hợp lệ.');
    if ('trangThai' in b && ![0,1,2,3,4].includes(b.trangThai)) invalid('Trạng thái không hợp lệ.');
    if (['POST','PUT'].includes(req.method)) {
      const required = req.path === '/products' || req.path.startsWith('/products/') ? ['tenSP','maDM','giaBanHienTai','donViTinh'] : req.path === '/branches' ? ['tenCN','soDT'] : req.path === '/customers' ? ['hoTen','soDT'] : req.path === '/employees' ? ['hoTen','luong','maCN'] : [];
      for (const key of required) if (b[key] == null) invalid(`Thiếu ${key}.`);
    }
    next();
  } catch (err) { next(err); }
}
module.exports = validateInput;
