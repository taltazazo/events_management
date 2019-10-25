const multer = require('multer');
const router = require('express').Router();
const validation = require('../middleware/validation');
const ops = require('../functions/ops');

const upload = multer({ dest: 'uploads/' });
const { Channel, ChannelValidation } = require('../models/channel');
const notify = require('../functions/notify');

router.param('id', require('../middleware/id'));

router.get('/', async (req, res) => {
  let { page } = req.query;
  if (!page || page <= 0) page = 1;

  const channels = await Channel.find()
    .skip(5 * (page - 1))
    .limit(5)
    .select('-admins -subscribers');
  return res.status(200).send(channels);
});

router.get('/:id', async (req, res) => {
  const channel = await Channel.findOneAndUpdate(
    { _id: req.params.id },
    { $inc: { 'rates.views': 1 } },
    { new: true }
  );

  if (!channel) return res.status(404).send('channel not found');

  return res.status(200).send(channel);
});

router.post('/', validation(ChannelValidation), upload.single('pic'), async (req, res) => {
  const channel = new Channel(req.body);

  if (req.file) channel.picture = await ops.loadPicture();

  if (channel.admins.length === 0) channel.admins = [req.user.email];

  await channel.save();
  return res.status(200).send(channel);
});

router.patch('/:id', validation(ChannelValidation), async (req, res) => {
  let channel;
  const { query } = req;
  if (query.sub === 'add')
    channel = await ops.addSubscriber(Channel, req.params.id, req.user.email);
  else if (query.sub === 'rm')
    channel = await ops.removeSubscriber(Channel, req.params.id, req.user.email);
  else if (query.like) {
    const value = Number(query.like);
    if (value * value !== 1) return res.status(400).send('Invalid like query');
    channel = await like(req.params.id, value);
  } else if (req.body.comment)
    channel = await ops.addComment(Channel, req.params.id, req.user, req.body);
  else if (req.body.reply)
    channel = await ops.addReply(Channel, req.params.id, req.body.reply, req.user);
  else {
    const doc = await ops.loadDoc(Channel, req.params.id, req.user.email);
    if (typeof doc === 'number') return res.status(doc).send('cannot load channel');

    if (query.admin === 'add')
      channel = await ops.addAdmins(Channel, req.params.id, req.body.admins);
    else if (query.admin === 'rm') {
      channel = await ops.removeAdmin(Channel, req.params.id, req.user.email);
      if (!channel) return res.status(400).send('you are the only admin. just remove the channel');
    } else if (req.body.message) channel = await updateMessage(req.params.id, req.body, query.mess);
    else channel = await Channel.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
  }
  if (!channel) return res.status(404).send('channel not found');

  return res.status(200).send(channel);
});

router.delete('/:id', validation(ChannelValidation), async (req, res) => {
  const channel = await ops.loadDoc(Channel, req.params.id, req.user.email);
  if (typeof channel === 'number') return res.status(channel).send('cannot load channel');

  await channel.remove();

  notify('delete', { name: channel.name, subscribers: channel.subscribers, info: req.body.info });

  return res.status(200).send('channel deleted');
});

async function updateMessage(id, body, query) {
  let channel;
  if (query === 'add') {
    const message = {
      title: body.message.title,
      content: body.message.content
    };
    channel = await Channel.findOneAndUpdate(
      { _id: id },
      {
        $push: { messages: message }
      },
      { new: true }
    );
    notify('newMessage', { channelId: channel._id.toHexString(), message });
    return channel;
  }
  if (query === 'rm') {
    channel = await Channel.findOneAndUpdate(
      { _id: id },
      { $pull: { messages: { title: body.message.title } } },
      { new: true }
    );
    return channel;
  }
}
function like(id, value) {
  return Channel.findOneAndUpdate(
    { _id: id },
    {
      $inc: { 'rates.likes': value }
    },
    { new: true }
  );
}
module.exports = router;
