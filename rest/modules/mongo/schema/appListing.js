const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const appListingSchema = new Schema(
    {
        appname: {
            type: String,
            required: true
        },
        roles: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: 'users'
                },
                status: {
                    type: String,
                    enum: ['Administrator', 'PI', 'Manager'],
                    default: 'Manager'
                }
            }
        ],
        blockedusers: {
            type: [Schema.Types.ObjectId],
            ref: 'users'
        },
        addedby: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('applisting', appListingSchema)