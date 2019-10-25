const mongoose = require('mongoose');
const _ = require('lodash');
const Joi = require('joi');
const Client = require('../elastic');
const { commentSchema } = require('./comment');

const PlaceSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true
    },

    isPublic: Boolean,

    admins: [String],

    name: {
      type: String,
      minlength: 5,
      maxlength: 20,
      required: true
    },

    address: {
      type: {
        city: String,
        street: String
      },
      required: true
    },

    location: {
      type: {
        lat: Number,
        lon: Number
      },
      required: true
    },

    description: {
      type: String,
      minlength: 10,
      maxlength: 700
    },

    picture: {
      contentType: String,
      data: Buffer
    },

    comments: [commentSchema],

    rates: {
      type: { likes: Number, views: Number },
      default: { likes: 0, views: 0 }
    },

    subscribers: [String]
  },
  { timestamps: true, versionKey: false }
);
PlaceSchema.statics.isExists = async function(placeId) {
  const place = await Place.findById(placeId);
  if (!place) return false;
  return true;
};
PlaceSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    await Client.insert(
      _.pick(doc, ['rates', 'category', 'name', 'address', 'location', 'description']),
      doc._id,
      'places'
    );
  }
});
PlaceSchema.post('save', async function() {
  await Client.insert(
    _.pick(this, ['rates', 'category', 'name', 'address', 'location', 'description']),
    this._id,
    'places'
  );
});
PlaceSchema.post('remove', async function(doc) {
  await Client.remove(doc._id, 'places');
});
const Place = mongoose.model('Place', PlaceSchema);

function validation(place, isRequierd = false) {
  const schema = Joi.object().keys({
    category: Joi.string(),
    admins: Joi.array().items(Joi.string().email()),
    name: Joi.string()
      .min(5)
      .max(20),
    isPublic: Joi.bool(),
    description: Joi.string()
      .min(10)
      .max(700),
    rates: {
      likes: Joi.number(),
      views: Joi.number()
    },
    address: {
      city: Joi.string(),
      street: Joi.string()
    },
    tags: Joi.array().items(Joi.string()),
    comment: {
      title: Joi.string(),
      content: Joi.string()
    },
    reply: {
      parent: Joi.objectId(),
      content: Joi.string()
    },
    subscribers: Joi.array().items(Joi.objectId()),
    info: Joi.string()
  });
  if (isRequierd) {
    const requiredSchema = schema.requiredKeys([
      'category',
      'name',
      'isPublic',
      'description',
      'address'
    ]);
    return Joi.validate(place, requiredSchema);
  }
  return Joi.validate(place, schema);
}

module.exports.Place = Place;
module.exports.PlaceValidation = validation;
