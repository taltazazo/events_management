const _ = require('lodash');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const router = require('express').Router();
const { User, UserValidation } = require('./../models/user');
const validation = require('../middleware/validation');
const notify = require('../functions/notify');

router.param('id', require('../middleware/id'));

router.get('/', async (req, res) => {
  let { page } = req.query;
  if (!page || page <= 0) page = 1;
  const users = await User.find()
    .skip(5 * (page - 1))
    .limit(5)
    .select('-password')
    .lean();
  return res.status(200).send(users);
});

router.get('/me', async (req, res) => {
  const user = await User.findOne({ email: req.user.email }).select('-password');
  return res.status(200).send(user);
});

router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) return res.status(404).send('user not found');

  return res.status(200).send(user);
});

router.post('/', validation(UserValidation), async (req, res) => {
  let user = await User.findOne({ email: req.body.email });

  if (user) return res.status(400).send('already exists!');

  user = new User(req.body);

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  user.emailConfirmationToken = crypto.randomBytes(8).toString('hex');
  user.emailConfirmationExpires = Date.now() + 3600000;

  await user.save();

  notify('emailConfirmation', {
    email: user.email,
    userName: user.userName,
    token: user.emailConfirmationToken
  });
  res.status(200).send({ user, msg: `A confirmation email has been sent to ' + ${user.email}` });
});

router.put('/me', validation(UserValidation), async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  if (!user) return res.status(404).send('user not found');

  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    req.body.password = await bcrypt.hash(req.body.password, salt);
  }
  user.set(req.body);
  await user.save();

  return res.status(200).send(_.pick(user, ['userName', 'email', 'password']));
});

router.delete('/me', async (req, res) => {
  const user = await User.findOne({ email: req.user.email });

  if (!user) return res.status(404).send('user not found');

  await user.transactionDelete();

  return res.status(200).send('User Deleted!');
});

router.put('/me/logout', async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  if (!user) return res.status(404).send('user not found');

  res
    .header('x-auth-token', '')
    .status(200)
    .send('logged out');
});

module.exports = router;
