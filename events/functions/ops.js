const axios = require('axios');
const fs = require('fs');
const _ = require('lodash');
const notify = require('./notify');

module.exports.addSubscriber = function(model, id, email) {
  return model.findOneAndUpdate(
    { _id: id },
    {
      $addToSet: { subscribers: email }
    },
    { new: true }
  );
};
module.exports.removeSubscriber = function(model, id, email) {
  return model.findOneAndUpdate(
    { _id: id },
    {
      $pull: { subscribers: email }
    },
    { new: true }
  );
};
module.exports.getLocationCoordinates = async function(city, street) {
  const response = await axios.get(
    `https://nominatim.openstreetmap.org/search?q=${street}+${city},+israel&format=json`
  );
  const coords = _.pick(response.data[0], ['lat', 'lon']);
  if (_.isEmpty(coords)) throw new Error('cant find location');
  return coords;
};
module.exports.loadPicture = async function(file) {
  const img = await fs.readFile(file.path);
  const encoded = img.toString('base64');
  const imgBuffer = Buffer.from(encoded, 'base64');
  return { contentType: file.mimetype, data: imgBuffer };
};
module.exports.loadDoc = async function(model, id, email) {
  const doc = await model.findById(id);
  if (!doc) return 404;

  if (email && doc.admins.indexOf(email) === -1 && !doc.isPublic) return 403;

  return doc;
};
module.exports.addComment = async function(model, id, user, body) {
  const comment = {
    email: user.email,
    userName: user.userName,
    title: body.comment.title,
    content: body.comment.content
  };
  const doc = await model.findOneAndUpdate(
    { _id: id },
    {
      $push: { comments: comment }
    },
    { new: true }
  );
  notify('newComment', {
    time: Date.now(),
    emails: doc.admins
  });
  return doc;
};
module.exports.addReply = async function(model, id, reply, user) {
  const replyDoc = {
    email: user.email,
    userName: user.userName,
    content: reply.content
  };
  const doc = await model.findOneAndUpdate(
    { _id: id, 'comments._id': reply.parent },
    {
      $push: { 'comments.$.replies': replyDoc }
    },
    { new: true }
  );
  notify('newReply', { collection: model.collection.collectionName, parentId: reply.parent });
  return doc;
};
module.exports.addAdmins = function(model, id, admins) {
  return model.findOneAndUpdate(
    { _id: id },
    { $addToSet: { admins: { $each: admins } } },
    { new: true }
  );
};
module.exports.removeAdmin = function(model, id, email) {
  return model.findOneAndUpdate(
    { _id: id, 'admins.1': { $exists: true } },
    { $pull: { admins: email } },
    { new: true }
  );
};
