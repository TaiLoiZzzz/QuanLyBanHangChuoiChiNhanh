function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  // Nhận diện lỗi từ SQL Server RAISERROR hoặc THROW (State/Severity)
  const isDatabaseError = err.number >= 50000 || err.message.includes('Lỗi');
  const statusCode = isDatabaseError ? 400 : 500;

  return res.status(statusCode).json({
    success: false,
    error: err.message || 'Lỗi hệ thống không xác định.',
    code: err.number || 'SERVER_ERROR'
  });
}

module.exports = errorHandler;
