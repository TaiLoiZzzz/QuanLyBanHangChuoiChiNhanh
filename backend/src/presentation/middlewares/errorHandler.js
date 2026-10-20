function errorHandler(err, req, res, next) {
  console.error(`[API] ${req.method} ${req.path}:`, err.code || err.number || 'ERROR');
  let status = err.status || 500;
  let message = status < 500 ? err.message : 'Lỗi hệ thống. Vui lòng thử lại.';
  if (err.number === 18456 || err.code === 'ELOGIN') { status = 401; message = 'Tên đăng nhập hoặc mật khẩu không chính xác.'; }
  else if (err.number === 229) { status = 403; message = 'Bạn không có quyền thực hiện thao tác này.'; }
  else if ([547, 515, 8115].includes(err.number) || err.code === 'EVALIDATE') { status = 422; message = 'Dữ liệu không hợp lệ hoặc vi phạm ràng buộc.'; }
  else if ([2601, 2627].includes(err.number)) { status = 409; message = 'Dữ liệu đã tồn tại.'; }
  else if (err.number === 50404) { status = 404; message = err.message; }
  else if (err.number >= 50000) { status = 422; message = err.number === 50000 ? 'Giao dịch không hợp lệ.' : err.message; }
  else if (['ESOCKET', 'ETIMEOUT', 'ECONNREFUSED', 'ECONNCLOSED'].includes(err.code)) { status = 503; message = 'Không thể kết nối CSDL.'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'JSON không hợp lệ.'; }
  res.status(status).json({ success: false, error: message });
}
module.exports = errorHandler;
