const express = require('express');
const crypto = require('crypto');
const { User } = require('../models/user');
const notify = require('../functions/notify');

const router = express.Router();

router.get('/:vertoken', async (req, res) => {
  const user = await User.findOne({
    emailConfirmationToken: req.params.vertoken,
    emailConfirmationExpires: { $gte: Date.now() }
  });

  if (!user) return res.status(404).send('token has expired');
  if (user.isVerified) return res.status(400).send('This user has already been verified');

  user.isVerified = true;
  user.emailConfirmationToken = undefined;
  user.emailConfirmationExpires = undefined;

  await user.save();

  res.status(200).send('The account has been verified. Please log in.');
});

router.post('/resend', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).send('email not found');
  if (user.isVerified) return res.status(400).send('already verified');

  user.emailConfirmationToken = crypto.randomBytes(8).toString('hex');
  user.emailConfirmationExpires = Date.now() + 3600000;

  notify('emailConfirmation', {
    email: user.email,
    userName: user.userName,
    token: user.emailConfirmationToken
  });

  res.status(200).send(`A confirmation email has been sent to ' + ${user.email}`);
});

module.exports = router;
