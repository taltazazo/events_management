const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { User } = require('../models/user');
const notify = require('../functions/notify');

const router = express.Router();

router.get('/:email', async (req, res) => {
  const user = await User.findOne({ email: req.params.email });
  if (!user) return res.status(404).send('user not found');

  user.passwordResetToken = crypto.randomBytes(8).toString('hex');
  user.passwordResetExpires = Date.now() + 3600000;

  await user.save();
  notify('resetPassword', user.passwordResetToken);
  return res.status(200).send('link has sent');
});
// need to implemment
// router.get('/:psrtoken', async (req, res) => {});
router.post('/:psrtoken', async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: req.params.psrtoken,
    passwordResetExpires: { $gte: Date.now() }
  });
  if (!user) return res.status(404).send('token has expired');

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(req.body.password, salt);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  return res.status(200).send({ user, msg: 'password updated!' });
});

module.exports = router;
