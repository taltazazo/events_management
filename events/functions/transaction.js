const mongoose = require('mongoose');

module.exports.transaction = async function(handler, obj, req) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await handler(obj, req, session);
    await session.commitTransaction();
    session.endSession();
    return 200;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
