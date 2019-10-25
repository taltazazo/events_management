const mongoose = require('mongoose');

module.exports = (_, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid ID');
  next();
};
