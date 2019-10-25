const Joi = require('joi');
const bcrypt = require('bcrypt');
const express = require('express');
const { User } = require('../models/user');
const validation = require('../middleware/validation');

const router = express.Router();

router.post('/', validation(loginValidation), async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).send('Invalid email or password');

  const isValid = await bcrypt.compare(req.body.password, user.password.toString());
  if (!isValid) return res.status(400).send('Invalid email or password');

  if (!user.isVerified) return res.status(401).send('Your account has not been verified');

  const token = await user.generateAuthToken();

  return res
    .header('x-auth-token', token)
    .status(200)
    .send(`Welcome back ${user.userName}`);
});

function loginValidation(user) {
  const schema = {
    email: Joi.string()
      .email()
      .required(),
    password: Joi.string()
      .min(5)
      .max(1024)
      .required()
  };
  return Joi.validate(user, schema);
}

module.exports = router;
