const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chartBackupSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },
        backup: {
            type: String,
            required: true
        },
        creator: {
            type: String,
            required: true
        },
        creatorref: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        bookmarked: [
            {
                type: Schema.Types.ObjectId,
                ref: 'chartbookmark'
            }
        ]
    },
    { timestamps: true }
)

module.exports = mongoose.model('chartbackup', chartBackupSchema)