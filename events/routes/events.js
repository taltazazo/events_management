const multer = require('multer');

const upload = multer({ dest: 'uploads/' });
const _ = require('lodash');
const router = require('express').Router();
const { Event, EventValidation } = require('../models/event');
const { Channel } = require('../models/channel');
const { Place } = require('../models/place');
const validation = require('../middleware/validation');
const notify = require('../functions/notify');
const ops = require('../functions/ops');

router.param('id', require('../middleware/id'));

router.get('/', async (req, res) => {
  let { page } = req.query;
  if (!page || page <= 0) page = 1;

  const events = await Event.find()
    .skip(5 * (page - 1))
    .limit(5)
    .select('-location -subscribers');
  return res.status(200).send(events);
});

router.get('/:id', async (req, res) => {
  const event = await Event.findOneAndUpdate(
    { _id: req.params.id },
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!event) return res.status(404).send('event not found');
  return res.status(200).send(event);
});

router.post('/', validation(EventValidation), upload.single('pic'), async (req, res) => {
  const event = new Event(req.body);
  if (event.place) {
    const doc = await ops.loadDoc(Place, event.place, req.user.email);
    if (typeof doc === 'number') return res.status(doc).send('cannot load place');

    event.address = doc.address;
  }
  event.location = await ops.getLocationCoordinates(event.address.city, event.address.street);
  if (event.admins.length === 0) event.admins.push(req.user.email);

  if (req.file) event.picture = await ops.loadPicture(req.file);

  event.tags = _.uniq(req.body.tags);

  await event.save();

  return res.status(200).send(event);
});

router.patch('/:id', validation(EventValidation), async (req, res) => {
  let event;
  let locationChanged = false;
  if (req.query.sub === 'add')
    event = await ops.addSubscriber(Event, req.params.id, req.user.email);
  else if (req.query.sub === 'rm')
    event = await ops.removeSubscriber(Event, req.params.id, req.user.email);
  else if (req.query.channel === 'ok' || req.query.channel === 'no') {
    const doc = await ops.loadDoc(Channel, req.body.channel, req.user.email);
    if (typeof doc === 'number') return res.status(doc).send('cannot load channel');

    if (req.query.channel === 'ok') event = await activateChannel(req.params.id, req.body.channel);
    else event = await removeChannel(req.params.id, req.body.channel);
  } else if (req.body.comment)
    event = await ops.addComment(Event, req.params.id, req.user, req.body);
  else if (req.body.reply)
    event = await ops.addReply(Event, req.params.id, req.body.reply, req.user);
  else {
    let doc = await ops.loadDoc(Event, req.params.id, req.user.email);
    if (typeof doc === 'number') return res.status(doc).send('cannot load event');

    if (req.body.channel) {
      if (req.query.channel === 'add') {
        doc = await ops.loadDoc(Channel, req.body.channel);
        if (typeof doc === 'number') return res.status(doc).send('cannot load channel');

        event = await addChannel(req.params.id, req.body.channel);
      } else if (req.query.channel === 'rm') {
        event = await removeChannel(req.params.id, req.body.channel);
      }
    } else if (req.query.admin === 'add')
      event = await ops.addAdmins(Event, req.params.id, req.body.admins);
    else if (req.query.admin === 'rm') {
      event = await ops.removeAdmin(Event, req.params.id, req.user.email);
      if (!event) return res.status(400).send('you are the only admin. just remove the event');
    } else {
      if (req.body.place) {
        event.place = req.body.place;

        doc = await ops.loadDoc(Place, event.place, req.user.email);
        if (typeof doc === 'number') return res.status(doc).send('cannot load place');

        locationChanged = true;
        req.body.location = doc.place.location;
        req.body.address = doc.place.address;
      } else if (req.body.address) {
        locationChanged = true;
        req.body.place = null;
        req.body.location = await ops.getLocationCoordinates(
          req.body.address.city,
          req.body.address.street
        );
      }
      event = await Event.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
    }
  }
  if (!event) return res.status(404).send('event not found');
  if (locationChanged) notify('updateLocation', { collection: 'events', id: event._id });
  return res.status(200).send(event);
});

router.delete('/:id', async (req, res) => {
  const event = await ops.loadDoc(Event, req.params.id, req.user.email);
  if (typeof event === 'number') return res.status(event).send('cannot load event');

  await event.remove();
  if (event.expectedDate - Date.now() > 0)
    notify('delete', { name: event.name, subscribers: event.subscribers, info: req.body.info });
  return res.status(200).send('event deleted');
});
router.notify('/:id', async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).send('event not found');

  if (event.admins.indexOf(req.user.email) === -1)
    return res.status(403).send('Do not have permission');

  const payload = { event, notifyOnlySubs: req.body.notifyOnlySubs };
  if (event.place) payload.place = event.place._id.toHexString();
  if (event.channels.length !== 0) {
    const activeChannels = event.channels.map(o => (o.isPending ? null : o.channel));
    payload.channels = activeChannels.filter(o => o !== null);
  }
  notify('newEvent', payload);
  return res.status(200).send('');
});

function activateChannel(eventId, channelId) {
  return Event.findOneAndUpdate(
    { _id: eventId, 'channels.channel': channelId },
    { $set: { 'channels.$.isPending': false } },
    { new: true }
  );
}
function addChannel(eventId, channelId) {
  return Event.findOneAndUpdate(
    { _id: eventId },
    { $addToSet: { channels: { channel: channelId } } },
    { new: true }
  );
}
function removeChannel(eventId, channelId) {
  return Event.findOneAndUpdate(
    { _id: eventId },
    { $pull: { channels: { channel: channelId } } },
    { new: true }
  );
}

module.exports = router;
