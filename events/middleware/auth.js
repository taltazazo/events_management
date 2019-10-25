const jwt = require('jsonwebtoken');
const logger = require('../logs/logger');

module.exports = (req, res, next) => {
  logger.info(`${req.method}: ${req.url}`);
  if (req.method === 'GET' && req.url !== '/users/me') next();
  else if (req.method === 'POST' && req.url === '/users') next();
  else {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).send('Access denied. No token provided');
    try {
      const payload = jwt.verify(token, process.env.JWT_KEY);
      req.user = payload;
      next();
    } catch (error) {
      return res.status(400).send('Invalid token!');
    }
  }
};
