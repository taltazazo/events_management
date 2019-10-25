const mongoose = require('mongoose');

const { MONGO_DB } = process.env;
module.exports = () => {
  mongoose
    .connect(MONGO_DB, {
      useNewUrlParser: true,
      family: 4,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true
    })
    .then(async () => {
      console.log('connected to database');
    })
    .catch(err => console.log('could not connect', err));
};
