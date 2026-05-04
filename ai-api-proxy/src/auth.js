const jwt = require('jsonwebtoken');

/**
 * 生成 JWT Token
 */
function generateAuthToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

/**
 * 验证 JWT Token
 */
function verifyAuthToken(token, secret) {
  try {
    const decoded = jwt.verify(token, secret);
    return { valid: true, payload: decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * 鉴权中间件
 */
function createAuthMiddleware(config) {
  return (req, res, next) => {
    if (!config.auth || !config.auth.enabled) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const token = parts[1];
    const result = verifyAuthToken(token, config.auth.secret);
    
    if (!result.valid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = result.payload;
    next();
  };
}

module.exports = {
  generateAuthToken,
  verifyAuthToken,
  createAuthMiddleware
};
