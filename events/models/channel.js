const mongoose = require('mongoose');
const _ = require('lodash');
const Joi = require('joi');
const Client = require('../elastic');

const ChannelSchema = new mongoose.Schema(
  {
    admins: [String],

    name: {
      type: String,
      minlength: 5,
      maxlength: 20,
      required: true
    },

    description: {
      type: String,
      minlength: 10,
      maxlength: 700,
      required: true
    },

    messages: [
      {
        title: {
          type: String,
          minlength: 5,
          maxlength: 20,
          required: true
        },
        content: {
          type: String,
          minlength: 10,
          maxlength: 500,
          required: true
        }
      }
    ],

    picture: {
      contentType: String,
      data: Buffer
    },

    rates: {
      type: { likes: Number, views: Number },
      default: { likes: 0, views: 0 }
    },

    subscribers: [String]
  },
  { timestamps: true, versionKey: false }
);
ChannelSchema.post('save', async function() {
  await Client.insert(_.pick(this, ['rates', 'name', 'tags', 'description']), this._id, 'channels');
});
ChannelSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    await Client.insert(_.pick(doc, ['rates', 'name', 'tags', 'description']), doc._id, 'channels');
  }
});
ChannelSchema.post('remove', async function(doc) {
  await Client.remove(doc._id, 'channels');
});
const Channel = mongoose.model('Channel', ChannelSchema);

function validation(channel, isRequierd = false) {
  const schema = Joi.object().keys({
    admins: Joi.array().items(Joi.string().email()),
    name: Joi.string()
      .min(5)
      .max(20),
    description: Joi.string()
      .min(10)
      .max(700),
    rates: {
      likes: Joi.number(),
      views: Joi.number()
    },
    message: {
      title: Joi.string()
        .min(5)
        .max(20),
      content: Joi.string()
        .min(10)
        .max(700)
    },
    tags: Joi.array().items(Joi.string()),
    subscribers: Joi.array().items(Joi.objectId()),
    info: Joi.string()
  });
  if (isRequierd) {
    const requiredSchema = schema.requiredKeys(['name', 'description']);
    return Joi.validate(channel, requiredSchema);
  }
  return Joi.validate(channel, schema);
}

module.exports.Channel = Channel;
module.exports.ChannelValidation = validation;
