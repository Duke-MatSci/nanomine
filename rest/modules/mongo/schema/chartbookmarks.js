const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chartBookmarkSchema = new Schema(
    {
        chart: {
            type: Schema.Types.ObjectId,
            ref: 'chartbackup'
        },
        creator: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('chartbookmark', chartBookmarkSchema)