const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    title: {
      type: String,
      minlength: 5,
      maxlength: 20,
      required: true
    },
    content: {
      type: String,
      minlength: 1,
      maxlength: 500,
      required: true
    },
    replies: [
      {
        userName: { type: String, required: true },
        email: {
          type: String,
          required: true
        },
        content: { type: String, required: true },
        date: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports.commentSchema = commentSchema;
