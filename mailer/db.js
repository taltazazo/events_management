require('dotenv').config();

const mongo = require('mongodb').MongoClient;

let db;
module.exports.connect = () =>
  new Promise((resolve, reject) => {
    if (db) resolve(db);
    mongo.connect(process.env.MONGO_DB, { useNewUrlParser: true }, (err, client) => {
      if (err) reject(err);
      db = client.db('test');
      resolve(db);
    });
  });
module.exports.db = () => {
  if (db) return db;
  return new Error('db is disconnected');
};
