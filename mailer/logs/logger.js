const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf } = format;

const myFormat = printf(({ level, message }) => {
  const d = new Date(timestamp).toGMTString();
  return `${d}: ${level}: ${message}`;
});
const logger = createLogger({
  level: 'info',
  format: combine(timestamp(), myFormat),
  transports: [
    new transports.File({ filename: `${__dirname}/error.log`, level: 'error' }),
    new transports.File({ filename: `${__dirname}/info.log` })
  ],
  exceptionHandlers: [
    new transports.File({ filename: `${__dirname}/exceptions.log` }),
    new transports.Console()
  ],

  exitOnError: false // default is true
});

process.on('unhandledRejection', err => {
  throw err;
});

module.exports = logger;
