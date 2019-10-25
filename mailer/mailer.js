const nodemailer = require('nodemailer');
const Email = require('email-templates');

const { MAILER_HOST, MAILER_PORT, MAILER_USER, MAILER_PASS } = process.env;
const transporter = nodemailer.createTransport({
  host: MAILER_HOST,
  port: MAILER_PORT,
  auth: {
    user: MAILER_USER,
    pass: MAILER_PASS
  }
});

const email = new Email({
  transport: transporter,
  send: true,
  preview: false
});
const sendMail = {
  async welcome(to, userName, token) {
    await email.send({
      template: 'welcome',
      message: {
        from: 'Tazazz 👻',
        to
      },
      locals: {
        userName,
        token
      }
    });
    console.log('email has been sent!');
  },
  async resetPassword(to, token) {
    await email.send({
      template: 'resetPassword',
      message: {
        from: 'Tazazz 👻',
        to
      },
      locals: {
        token
      }
    });
    console.log('email has been sent!');
  },
  async newMessage(to, channelName, message) {
    to.forEach(em => {
      email
        .send({
          template: 'newMessage',
          message: {
            from: 'Tazazz 👻',
            to: em
          },
          locals: {
            message,
            channelName
          }
        })
        .then(() => console.log('email has been sent!'));
    });
  },
  async delete(to, name, info) {
    to.forEach(em => {
      email
        .send({
          template: 'delete',
          message: {
            from: 'Tazazz 👻',
            to: em
          },
          locals: {
            info,
            name
          }
        })
        .then(() => console.log('email has been sent!'));
    });
  },

  async newEvent(to, eventTitle, eventDescription, where) {
    to.forEach(em => {
      email
        .send({
          template: 'newEvent',
          message: {
            from: 'Tazazz 👻',
            to: em
          },
          locals: {
            eventTitle,
            eventDescription,
            where
          }
        })
        .then(() => console.log('email has been sent!'));
    });
  },
  async updateLocation(to, name, where) {
    to.forEach(em => {
      email
        .send({
          template: 'updateLocation',
          message: {
            from: 'Tazazz 👻',
            to: em
          },
          locals: {
            name,
            where
          }
        })
        .then(() => console.log('email has been sent!'));
    });
  },
  async newComment(to, what, when) {
    to.forEach(em => {
      email
        .send({
          template: 'newComment',
          message: {
            from: 'Tazazz 👻',
            to: em
          },
          locals: {
            what,
            when
          }
        })
        .then(() => console.log('email has been sent!'));
    });
  }
};

module.exports = sendMail;
