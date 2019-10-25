const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const express = require('express');
const users = require('../routes/users');
const events = require('../routes/events');
const channels = require('../routes/channels');
const login = require('../routes/login');
const confirmation = require('../routes/confirmation');
const forgot = require('../routes/forgot');
const payload = require('../middleware/auth');
const places = require('../routes/places');
const error = require('../middleware/error');

module.exports = app => {
  app.use(express.json());
  app.use('/login', login);
  app.use('/confirmation', confirmation);
  app.use('/forgot', forgot);
  app.use(payload);
  app.use('/channels', channels);
  app.use('/users', users);
  app.use('/events', events);
  app.use('/places', places);
  app.use(error);
};
