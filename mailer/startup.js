const db = require('./db');

module.exports = server => {
  db.connect()
    .then(() => {
      console.log('connected to database');
      server.listen(process.env.NODE_PORT, process.env.HOST, () => {
        console.log('Server: Listening');
      });
    })
    .catch(err => console.log(err.message));
};
