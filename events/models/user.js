const mongoose = require('mongoose');
const _ = require('lodash');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const { Place } = require('./place');
const { Event } = require('./event');
const { transaction } = require('../functions/transaction');
const Client = require('../elastic');

const UserSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 1024
    },

    isVerified: { type: Boolean, default: false },
    emailConfirmationToken: String,
    emailConfirmationExpires: Date,

    passwordResetToken: String,
    passwordResetExpires: Date,

    prefs: {
      byCategory: Boolean,
      myCity: String,
      myCategories: [String],
      myTags: [String]
    }
  },
  { timestamps: true, versionKey: false }
);
UserSchema.methods.generateAuthToken = function() {
  return jwt.sign({ email: this.email, userName: this.userName }, process.env.JWT_KEY);
};
UserSchema.methods.transactionDelete = async function() {
  return transaction(deleteUser, this);
};
UserSchema.post('save', async function(doc) {
  await Client.insert(_.pick(doc, ['email', 'prefs']), doc._id, 'users');
});
async function deleteUser(user) {
  await User.findByIdAndRemove(user._id).session(this.session);
  await Event.updateMany(
    { subscribers: user.email },
    {
      $pull: { subscribers: user.email }
    }
  ).session(this.session);
  await Place.updateMany(
    { subscribers: user.email },
    {
      $pull: { subscribers: user.email }
    }
  ).session(this.session);
}
const User = mongoose.model('User', UserSchema);

function validation(user, isRequierd = false) {
  const schema = Joi.object().keys({
    userName: Joi.string()
      .min(2)
      .max(50),
    email: Joi.string().email(),
    password: Joi.string()
      .min(5)
      .max(1024),
    prefs: {
      byCategory: Joi.bool(),
      myCity: Joi.string(),
      myCategories: Joi.array().items(Joi.string()),
      myTags: Joi.array().items(Joi.string())
    }
  });
  if (isRequierd) {
    const requiredSchema = schema.requiredKeys(['userName', 'email', 'password']);
    return Joi.validate(user, requiredSchema);
  }
  return Joi.validate(user, schema);
}
module.exports.User = User;
module.exports.UserValidation = validation;
