require('./logs/logger'); // should be before all for catching unhanled exception
require('dotenv').config();

const net = require('net');
const JsonSocket = require('json-socket');
const Router = require('./router');
const startup = require('./startup');
const logger = require('./logs/logger');

const server = net.createServer(socket => {
  console.log('Server: Client connected');
  const input = new JsonSocket(socket);
  input.on('mesge', message => {
    logger.info(JSON.stringify(message));
    Router[message.operation](message.payload);
  });
  input.on('close', hadError => {
    console.log(hadError);
  });
});
startup(server);
