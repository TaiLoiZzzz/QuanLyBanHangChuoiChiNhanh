function errorHandler(err, req, res, next) {
  console.error(`[Error Handler] ${req.method} ${req.url}:`, err.message);

  let userFriendlyMessage = err.message || 'Lỗi hệ thống không xác định.';
  let statusCode = 400;

  // 1. Ngoại lệ mất kết nối hoặc không tìm thấy máy chủ CSDL
  if (
    err.code === 'ECONNREFUSED' || 
    err.code === 'ETIMEOUT' || 
    err.code === 'ESOCKET' || 
    err.message?.includes('Failed to connect') ||
    err.message?.includes('Connection lost')
  ) {
    userFriendlyMessage = 'Ngoại lệ kết nối: Mất kết nối tới máy chủ Microsoft SQL Server (Port 14333). Vui lòng kiểm tra Docker Container hoặc dịch vụ SQL Server!';
    statusCode = 503;
  }
  // 2. Ngoại lệ bảo mật phân quyền (Permission Denied - Least Privilege)
  else if (err.number === 229 || err.message?.includes('permission was denied')) {
    userFriendlyMessage = `Ngoại lệ bảo mật: Tài khoản CSDL hiện tại bị từ chối quyền thực thi thao tác này (Chính sách Least Privilege)! Chi tiết: ${err.message}`;
    statusCode = 403;
  }
  // 3. Ngoại lệ vi phạm ràng buộc toàn vẹn (CHECK / FOREIGN KEY / UNIQUE Constraint)
  else if (err.number === 547) {
    userFriendlyMessage = `Ngoại lệ toàn vẹn dữ liệu: Vi phạm ràng buộc toàn vẹn (CHECK hoặc Khóa ngoại FK). Dữ liệu nhập không hợp lệ!`;
    statusCode = 422;
  }
  else if (err.number === 2627 || err.number === 2601) {
    userFriendlyMessage = `Ngoại lệ trùng lặp: Vi phạm ràng buộc duy nhất (UNIQUE hoặc Khóa chính PK). Dữ liệu đã tồn tại!`;
    statusCode = 409;
  }
  // 4. Ngoại lệ nghiệp vụ từ Stored Procedure (RAISERROR / THROW 50000+)
  else if (err.number >= 50000 || err.message?.includes('Lỗi')) {
    userFriendlyMessage = err.message;
    statusCode = 400;
  }

  return res.status(statusCode).json({
    success: false,
    error: userFriendlyMessage,
    code: err.code || err.number || 'DB_ERROR'
  });
}

module.exports = errorHandler;
