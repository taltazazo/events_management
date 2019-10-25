const multer = require('multer');
const router = require('express').Router();
const validation = require('../middleware/validation');
const { Place, PlaceValidation } = require('../models/place');
const notify = require('../functions/notify');
const ops = require('../functions/ops');

const upload = multer({ dest: 'uploads/' });

router.param('id', require('../middleware/id'));

router.get('/', async (req, res) => {
  let { page } = req.query;
  if (!page || page <= 0) page = 1;

  const places = await Place.find()
    .skip(5 * (page - 1))
    .limit(5)
    .select('-admins -location -subscribers');
  return res.status(200).send(places);
});

router.get('/:id', async (req, res) => {
  const place = await Place.findOneAndUpdate(
    { _id: req.params.id },
    { $inc: { 'rates.views': 1 } },
    { new: true }
  );

  if (!place) return res.status(404).send('place not found');

  return res.status(200).send(place);
});

router.post('/', validation(PlaceValidation), upload.single('pic'), async (req, res) => {
  const place = new Place(req.body);

  place.location = await ops.getLocationCoordinates(place.address.city, place.address.street);

  if (req.file) place.picture = await ops.loadPicture(req.file);

  if (place.admins.length === 0) place.admins = [req.user.email];

  await place.save();

  return res.status(200).send(place);
});

router.patch('/:id', validation(PlaceValidation), async (req, res) => {
  let place;
  let locationChanged = false;
  const { query } = req;
  if (query.sub === 'add') place = await ops.addSubscriber(Place, req.params.id, req.user.email);
  else if (query.sub === 'rm')
    place = await ops.removeSubscriber(Place, req.params.id, req.user.email);
  else if (query.like) {
    const value = Number(query.like);
    if (value * value !== 1) return res.status(400).send('Invalid like query');
    place = await like(req.params.id, value);
  } else if (req.body.comment)
    place = await ops.addComment(Place, req.params.id, req.user, req.body);
  else if (req.body.reply)
    place = await ops.addReply(Place, req.params.id, req.body.reply, req.user);
  else {
    const doc = await ops.loadDoc(Place, req.params.id, req.user.email);
    if (typeof doc === 'number') return res.status(doc).send('cannot load place');

    if (query.admin === 'add') place = await ops.addAdmins(Place, req.params.id, req.body.admins);
    else if (query.admin === 'rm') {
      place = await ops.removeAdmin(Place, req.params.id, req.user.email);
      if (!place) return res.status(400).send('you are the only admin. just remove the place');
    } else {
      if (req.body.address) {
        locationChanged = true;
        req.body.location = await ops.getLocationCoordinates(
          req.body.address.city,
          req.body.address.street
        );
      }
      place = await Place.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
    }
  }
  if (!place) return res.status(404).send('place not found');
  if (locationChanged) notify('updateLocation', { collection: 'places', id: place._id });
  return res.status(200).send(place);
});

router.delete('/:id', validation(PlaceValidation), async (req, res) => {
  const place = await Place.findById(req.params.id);
  if (!place) return res.status(404).send('place not found');

  if (place.admins.indexOf(req.user.email) === -1)
    return res.status(403).send('Do not have permission');

  await place.remove();

  notify('delete', { name: place.name, subscribers: place.subscribers, info: req.body.info });

  return res.status(200).send('place deleted');
});

function like(id, value) {
  return Place.findOneAndUpdate(
    { _id: id },
    {
      $inc: { 'rates.likes': value }
    },
    { new: true }
  );
}

module.exports = router;
