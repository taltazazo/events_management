require('./logs/logger'); // should be before all for catching unhanled exception

require('dotenv').config();

const express = require('express');

const app = express();
require('./startup/db')();
require('./startup/routes')(app);

if (app.get('env') === 'development') {
  app.listen(process.env.NODE_PORT, () => {
    console.log(`listening on port ${process.env.NODE_PORT}`);
  });
}
module.exports = app;
