const mongoose = require('mongoose');

const { MONGO_DB } = process.env;
module.exports = async () => {
  mongoose
    .connect(MONGO_DB, {
      useNewUrlParser: true,
      family: 4,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true
    })
    .then(async () => {
      console.log('Connected to Mongo db');
    })
    .catch(err => {
      console.log('could not connect', err);
      process.exit(1);
    });
};
