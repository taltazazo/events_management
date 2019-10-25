const mongoose = require('mongoose');
const Joi = require('joi');
const _ = require('lodash');
const { commentSchema } = require('./comment');
const Client = require('../elastic');

const EventSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true
    },

    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place'
    },

    admins: [
      {
        type: String,
        required: true
      }
    ],

    channels: [
      {
        channel: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Channel'
        },
        isPending: {
          type: Boolean,
          default: true
        }
      }
    ],

    name: {
      type: String,
      minlength: 5,
      maxlength: 20,
      required: true
    },

    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 700
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

    picture: {
      contentType: String,
      data: Buffer
    },

    tags: [String],

    comments: [commentSchema],

    views: {
      type: Number,
      default: 0
    },

    subscribers: [String],

    expectedDate: {
      type: Date,
      default: Date.now,
      // expires: '40s',
      required: true
    }
  },
  { timestamps: true, versionKey: false }
);

EventSchema.virtual('notifyOnlySubs')
  .get(() => {
    return this.notifyOnlySubs;
  })
  .set(notifyOnlySubs => {
    this.notifyOnlySubs = notifyOnlySubs;
  });
EventSchema.post('save', async function() {
  await Client.insert(
    _.pick(this, [
      'views',
      'place',
      'admins',
      'channels',
      'category',
      'name',
      'address',
      'location',
      'description',
      'tags',
      'expectedDate'
    ]),
    this._id,
    'events'
  );
});
EventSchema.post('remove', async function(doc) {
  await Client.remove(doc._id, 'events');
});
EventSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    await Client.insert(
      _.pick(doc, [
        'views',
        'place',
        'admins',
        'channels',
        'category',
        'name',
        'address',
        'location',
        'description',
        'tags',
        'expectedDate'
      ]),
      doc._id,
      'events'
    );
  }
});
const Event = mongoose.model('Event', EventSchema);

function validation(event, isRequierd = false) {
  const schema = Joi.object()
    .keys({
      category: Joi.string(),
      channel: Joi.objectId(),
      admins: Joi.array()
        .min(1)
        .items(Joi.string().email()),
      name: Joi.string()
        .min(5)
        .max(20),
      description: Joi.string()
        .min(10)
        .max(700),
      tags: Joi.array().items(Joi.string()),
      comment: {
        title: Joi.string(),
        content: Joi.string()
      },
      reply: {
        parent: Joi.objectId(),
        content: Joi.string()
      },
      views: Joi.number(),
      subscribers: Joi.array().items(Joi.objectId()),
      place: Joi.objectId(),
      notifyOnlySubs: Joi.bool(),
      address: {
        city: Joi.string(),
        street: Joi.string()
      },
      expectedDate: Joi.date(), // .greater('now')
      info: Joi.string()
    })
    .without('place', 'address');
  if (isRequierd) {
    const requiredSchema = schema
      .requiredKeys(['category', 'name', 'description', 'expectedDate'])
      .xor('place', 'address');
    return Joi.validate(event, requiredSchema);
  }
  return Joi.validate(event, schema);
}

module.exports.Event = Event;
module.exports.EventValidation = validation;
