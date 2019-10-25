const JsonSocket = require('json-socket');

module.exports = (operation, payload) => {
  const message = {
    operation,
    payload
  };
  JsonSocket.sendSingleMessage(process.env.MAILER_PORT, process.env.MAILER_HOST, message);
};
