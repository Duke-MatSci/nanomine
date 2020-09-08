const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const platformApiSchema = new Schema(
    {
        app: {
            type: String,
            required: true
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        secret: {
            type: String
        },
        domain: {
            type: String,
            required: true
        },
        token: {
            type: String
        },
        status: {
            type: Boolean
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('platformapi', platformApiSchema)