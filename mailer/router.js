const _ = require('lodash');
const { ObjectID } = require('mongodb');
const { db } = require('./db');
const Elastic = require('./elastic');
const sendMail = require('./mailer');

const Router = {
  async emailConfirmation(payload) {
    sendMail.welcome(payload.email, payload.userName, payload.token);
  },
  async resetPassword(email, token) {
    sendMail.resetPassword(email, token);
  },
  async newMessage(payload) {
    const channel = await db()
      .collection('channels')
      .findOne({ _id: ObjectID(payload.channelId) });
    const emails = channel.subscribers;
    sendMail.newMessage(emails, channel.name, payload.message);
  },
  async newEvent(payload) {
    let place;
    let channelEmails = [];
    let placeEmails;
    let allEmails;
    if (payload.place) {
      place = await db()
        .collection('places')
        .findOne({ _id: ObjectID(payload.place) });
      placeEmails = place.subscribers;
    }
    if (payload.channels) {
      const series = payload.channels.map(async id => {
        const channel = await db()
          .collection('channels')
          .findOne({ _id: ObjectID(id) });
        channelEmails = channelEmails.concat(channel.subscribers);
      });
      await Promise.all(series);
      channelEmails = _.uniq(channelEmails);
    }
    const allSubsEmails = _.union(placeEmails, channelEmails);

    if (payload.notify_only_subs) {
      allEmails = allSubsEmails;
    } else
      allEmails = await Elastic.getUsersInCity(
        payload.event.address.city,
        payload.event.category,
        allSubsEmails
      );
    sendMail.newEvent(allEmails, payload.event.name, payload.event.description, payload.event.city);
  },
  async updateLocation(payload) {
    const obj = await db()
      .collection(payload.collection)
      .findOne({ _id: ObjectID(payload.id) });
    const emails = obj.subscribers;
    sendMail.updateLocation(emails, obj.name, obj.address);
  },
  async newComment(payload) {
    sendMail.newComment(payload.emails, 'comment', payload.time);
  },
  async newReply(payload) {
    const obj = await db()
      .collection(payload.collection)
      .findOne({ 'comments._id': ObjectID(payload.parentId) }, { 'comments.$': 1 });
    const { email, updatedAt } = obj.comments[0];
    sendMail.newComment(email, 'reply', obj.name, updatedAt);
  },
  async delete(payload) {
    const emails = payload.subscribers;
    sendMail.delete(emails, payload.name, payload.info);
  }
};

module.exports = Router;
