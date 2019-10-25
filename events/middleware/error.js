const logger = require('../logs/logger');

module.exports = (err, _req, res, _next) => {
  logger.error(err.message);
  return res.status(500).send('something failed');
};
