function authMiddleware(req, res, next) {
  const dbUser = req.headers['x-db-user'];
  const dbPassword = req.headers['x-db-password'];

  if (dbUser && dbPassword) {
    req.userContext = {
      user: dbUser,
      password: dbPassword
    };
  } else {
    // Mặc định chạy dưới tài khoản cấu hình trong .env
    req.userContext = null;
  }

  next();
}

module.exports = authMiddleware;
