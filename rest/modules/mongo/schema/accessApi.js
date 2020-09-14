const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const apiAccessSchema = new Schema(
  {
    user: {
      type: String,
    },
    key: {
      type: String,
    },
    token: {
      type: String,
    },
    disable: {
      type: Boolean,
      default: false
    }
  }, { timestamps: true }
)

module.exports = mongoose.model('apiaccess', apiAccessSchema)
